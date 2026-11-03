import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from '../components/Link';
import type { Account, CommonsStore } from '../lib/commons';
import { getCommonsStore } from '../lib/commonsStore';
import { PATHS } from '../lib/router';
import { saveFile } from '../lib/share';
import { choose, COLOURS, describe, loadBond } from '../lib/threshing';
import {
  countdown,
  EMPTY_COUNTS,
  feedLine,
  icsFor,
  leaderOf,
  localWhen,
  NIGHT_COLOURS,
  nightStatus,
  PRACTICE_ID,
  type Night,
  type NightBond,
  type NightCounts,
} from '../lib/threshingNight';
import { RiderSetup, SignIn } from './Commons';

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const monthName = (night: Night) => new Date(night.start).toLocaleDateString(undefined, { month: 'long' });

function ago(at: number | null, now: number): string {
  if (at === null) return 'just now';
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

/** Ticks once a second, for the countdown and the feed's "sec ago". */
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Bars({ counts }: { counts: NightCounts }) {
  const max = Math.max(1, ...NIGHT_COLOURS.map((c) => counts[c]));
  return (
    <div className="night-bars">
      {NIGHT_COLOURS.map((c) => (
        <div key={c} className="night-bar" style={{ '--bar': COLOURS[c].art.rim } as CSSProperties}>
          <div className="night-bar-label">
            <span>{COLOURS[c].name}</span>
            <span className="night-bar-count">{counts[c].toLocaleString('en-US')}</span>
          </div>
          <div className="night-bar-track" aria-hidden="true">
            <span style={{ width: `${Math.max(counts[c] ? 3 : 0, (counts[c] / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Feed({ bonds, now, open }: { bonds: NightBond[]; now: number; open: boolean }) {
  if (bonds.length === 0) return <p className="muted">{open ? 'Nobody has stepped onto the field yet.' : 'On the night, every dragon that arrives appears here.'}</p>;
  return (
    <ol className="night-feed" aria-live="polite">
      {bonds.map((b, i) => (
        <li key={b.uid} style={{ opacity: 1 - i * 0.09 }}>
          <span className="night-feed-dot" style={{ background: COLOURS[b.colour].art.rim }} aria-hidden="true" />
          <div>
            <p className="night-feed-text">{feedLine(b)}</p>
            <p className="muted small">
              {b.dragonName} · {ago(b.at, now)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Adding the reader's dragon: every step they might still need, in order. */
function JoinField({ store, account, night, mine, practice }: {
  store: CommonsStore;
  account: Account | null;
  night: Night;
  mine: NightBond | null;
  practice: boolean;
}) {
  const bond = useMemo(() => {
    const saved = loadBond();
    return saved ? choose(saved.answers, saved.rider) : null;
  }, []);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');

  if (mine) {
    return (
      <p className="night-joined">
        You're on the field: <strong>{mine.dragonName}</strong>, {describe(mine)}, is counted {practice ? 'in practice' : 'tonight'}.
      </p>
    );
  }
  if (!bond) {
    return (
      <div className="stack-tight">
        <p className="small">Walk the Threshing first, then come back to add the dragon that chooses you.</p>
        <Link href={PATHS.threshing} className="button primary">
          Step into the field
        </Link>
      </div>
    );
  }
  if (!account) return <SignIn store={store} lead={`Sign in to add ${bond.dragonName} to the count.`} />;
  if (!account.rider) return <RiderSetup store={store} />;

  const add = async () => {
    setBusy(true);
    setProblem('');
    try {
      await store.addBond(practice ? PRACTICE_ID : night.id, { dragonName: bond.dragonName, colour: bond.colour, tail: bond.tail });
    } catch (err) {
      console.warn('[Threshing Night] bond failed', err);
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="stack-tight">
      <button type="button" className="button primary" onClick={add} disabled={busy}>
        {busy ? 'Stepping onto the field…' : `Add ${bond.dragonName} to ${practice ? 'the practice field' : 'tonight'}`}
      </button>
      <p className="muted small">
        {bond.dragonName}, {describe(bond)}, chose you in the Threshing. You can add one dragon each night.
      </p>
      {problem && (
        <p className="notice error" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}

export function NightPage() {
  const now = useNow();
  const status = nightStatus(now);
  const [store, setStore] = useState<CommonsStore | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [practice, setPractice] = useState(false);
  const [counts, setCounts] = useState<NightCounts>(EMPTY_COUNTS);
  const [bonds, setBonds] = useState<NightBond[]>([]);
  const [mine, setMine] = useState<NightBond | null>(null);
  const [resetNote, setResetNote] = useState('');

  // While a night is on, show it; between nights, show how the last one went.
  const shown: Night = status.live ?? status.last;
  const fieldId = practice ? PRACTICE_ID : shown.id;
  const open = practice || Boolean(status.live);

  useEffect(() => {
    void getCommonsStore().then(setStore);
  }, []);
  useEffect(() => store?.watchAccount(setAccount), [store]);
  useEffect(() => store?.watchNight(fieldId, setCounts), [store, fieldId]);
  useEffect(() => store?.watchBonds(fieldId, setBonds), [store, fieldId]);
  useEffect(() => store?.watchMyBond(fieldId, setMine), [store, fieldId, account?.uid]);
  useEffect(() => {
    if (!account?.moderator) setPractice(false);
  }, [account?.moderator]);

  const leader = leaderOf(counts);
  // Between nights with nothing to look back on, the countdown takes the big number's place.
  const quiet = !open && counts.total === 0;
  const remind = () => {
    const url = `${window.location.origin}${PATHS.night}`;
    saveFile(new File([icsFor(status.next, url)], `threshing-night-${status.next.id}.ics`, { type: 'text/calendar' }));
  };
  const reset = async () => {
    if (!store) return;
    try {
      await store.resetPractice();
      setResetNote('The practice field is empty again.');
    } catch (err) {
      setResetNote(errorText(err));
    }
  };

  return (
    <div className="night">
      <div className={open ? 'night-strip live' : 'night-strip'}>
        <p className="night-strip-title">
          {open && <span className="live-dot" aria-hidden="true" />}
          Threshing Night{practice ? ' · Practice' : status.live ? ' · Live' : ''}
        </p>
        <p className="night-strip-clock">
          {practice ? (
            'Only moderators can see this field'
          ) : status.live ? (
            <>
              Field closes in <span className="tabular">{countdown(status.live.end - now)}</span>
            </>
          ) : (
            <>
              Opens {localWhen(status.next.start)} · in <span className="tabular">{countdown(status.next.start - now)}</span>
            </>
          )}
        </p>
      </div>

      <div className="night-grid">
        <section className="night-intro" aria-labelledby="night-title">
          <p className="kicker">Once a month · everyone at once</p>
          <h1 id="night-title" className="night-title">
            Walk the field together.
          </h1>
          <div className="night-total">
            <span className={quiet ? 'night-total-number tabular night-countdown' : 'night-total-number tabular'}>{quiet ? countdown(status.next.start - now) : counts.total.toLocaleString('en-US')}</span>
            <span className="lore">
              {quiet
                ? 'until the field opens'
                : practice
                  ? 'practice bonds'
                  : status.live
                    ? 'riders bonded tonight'
                    : `riders bonded in ${monthName(shown)}`}
            </span>
          </div>
          {store && open ? (
            <JoinField store={store} account={account} night={shown} mine={mine} practice={practice} />
          ) : (
            <div className="stack-tight">
              <p className="small">
                The field opens on the first Saturday of every month. Walk the Threshing any time; on the night, add the dragon
                that chose you and watch every other rider's dragon arrive.
              </p>
              <div className="night-actions">
                <button type="button" className="button primary" onClick={remind}>
                  Add it to my calendar
                </button>
                <Link href={PATHS.threshing} className="button">
                  Walk the Threshing
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="commons-card night-panel" aria-labelledby="night-choosing">
          <div className="night-panel-head">
            <h2 id="night-choosing" className="night-panel-title">
              {open ? 'Who is choosing tonight' : quiet ? 'Who will choose' : `Who chose in ${monthName(shown)}`}
            </h2>
            {leader && (
              <span className="night-leader" style={{ color: COLOURS[leader].art.rim }}>
                {COLOURS[leader].name}s lead
              </span>
            )}
          </div>
          <Bars counts={counts} />
        </section>

        <section className="night-feed-panel" aria-labelledby="night-feed-title">
          <h2 id="night-feed-title" className="night-panel-title">
            From the field
          </h2>
          <Feed bonds={bonds} now={now} open={open} />
        </section>
      </div>

      {account?.moderator && (
        <div className="commons-card night-mod">
          <p className="legend">Moderator</p>
          <p className="small">
            The practice field works exactly like the real one but never counts. Use it to check everything before the night.
          </p>
          <div className="night-actions">
            <button type="button" className="button" aria-pressed={practice} onClick={() => setPractice((p) => !p)}>
              {practice ? 'Back to the real field' : 'Open the practice field'}
            </button>
            {practice && (
              <button type="button" className="text-button" onClick={() => void reset()}>
                Empty the practice field
              </button>
            )}
          </div>
          {resetNote && (
            <p className="muted small" role="status">
              {resetNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
