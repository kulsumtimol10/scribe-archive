import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from '../components/Link';
import {
  checkName,
  defaultSpoiler,
  excerpt,
  hallName,
  HALLS,
  isSealed,
  linkify,
  RATING_WORDS,
  REPORT_REASONS,
  RIDER_COLOURS,
  SPOILER_NAMES,
  timeAgo,
  type Account,
  type CommonsStore,
  type HallId,
  type Ratings,
  type Reply,
  type Report,
  type ReportReason,
  type SpoilerLevel,
  type Thread,
} from '../lib/commons';
import { getCommonsStore } from '../lib/commonsStore';
import { navigate, PATHS, useSearch } from '../lib/router';
import { BOOK_NAMES, loadBook, saveBook, type Book } from '../lib/spoilers';
import { choose, COLOURS, loadBond, type DragonColour } from '../lib/threshing';

const BOOK_TITLES: Record<Book, string> = { 1: 'Fourth Wing', 2: 'Iron Flame', 3: 'Onyx Storm' };
const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));
const threadHref = (id: string) => `${PATHS.commons}?t=${encodeURIComponent(id)}`;
const hallHref = (hall: HallId | null) => (hall ? `${PATHS.commons}?hall=${hall}` : PATHS.commons);
const dot = (colour: DragonColour) => ({ '--rider': COLOURS[colour].art.rim }) as CSSProperties;

function Scale({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 1 L14 5 L12 13 L8 15 L4 13 L2 5 Z" />
    </svg>
  );
}

/** Post text with paragraphs kept and links made clickable (opened safely, never trusted). */
function Body({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {linkify(para).map((piece, j) =>
            'url' in piece ? (
              <a key={j} href={piece.url} target="_blank" rel="noopener noreferrer nofollow ugc">
                {piece.url}
              </a>
            ) : (
              <span key={j}>{piece.text}</span>
            ),
          )}
        </p>
      ))}
    </>
  );
}

function SpoilerTag({ level }: { level: SpoilerLevel }) {
  return <span className={level ? 'spoiler-tag spoils' : 'spoiler-tag'}>{level ? `Spoilers · ${SPOILER_NAMES[level]}` : 'Spoiler free'}</span>;
}

function SpoilerSelect({ value, onChange, id }: { value: SpoilerLevel; onChange: (v: SpoilerLevel) => void; id: string }) {
  return (
    <label className="commons-inline" htmlFor={id}>
      Spoils up to
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value) as SpoilerLevel)}>
        {([0, 1, 2, 3] as SpoilerLevel[]).map((n) => (
          <option key={n} value={n}>
            {n ? SPOILER_NAMES[n] : 'No spoilers'}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Report, take down and moderator controls for one post. */
function PostTools({ store, account, path, authorId }: { store: CommonsStore; account: Account | null; path: string; authorId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!account?.rider) return null;
  const mine = authorId === account.uid;
  const act = async (run: () => Promise<void>, done: string) => {
    try {
      await run();
      setNote(done);
      setOpen(false);
    } catch (err) {
      setNote(errorText(err));
    }
  };
  return (
    <div className="post-tools">
      {!mine && (
        <button type="button" className="text-button small" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          Report
        </button>
      )}
      {mine && (
        <button type="button" className="text-button small" onClick={() => act(() => store.setHidden(path, true), 'Taken down.')}>
          Take down
        </button>
      )}
      {account.moderator && !mine && (
        <button type="button" className="text-button small" onClick={() => act(() => store.setHidden(path, true), 'Hidden from the Commons.')}>
          Hide
        </button>
      )}
      {open && (
        <div className="report-menu" role="group" aria-label="Why are you reporting this?">
          {REPORT_REASONS.map((r) => (
            <button key={r.id} type="button" className="chip" onClick={() => act(() => store.report(path, r.id as ReportReason), 'Thanks. A moderator will take a look.')}>
              {r.name}
            </button>
          ))}
        </div>
      )}
      {note && (
        <span className="muted small" role="status">
          {note}
        </span>
      )}
    </div>
  );
}

function SignIn({ store }: { store: CommonsStore }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ kind: 'idle' | 'sent' | 'error'; text?: string }>({ kind: 'idle' });
  const preview = store.kind === 'preview';
  const google = async () => {
    try {
      await store.signInWithGoogle();
    } catch (err) {
      setStatus({ kind: 'error', text: errorText(err) });
    }
  };
  const sendLink = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await store.sendEmailLink(email);
      setStatus({ kind: 'sent' });
    } catch (err) {
      setStatus({ kind: 'error', text: errorText(err) });
    }
  };
  return (
    <div className="commons-card sign-in">
      <p className="legend">Join the Commons</p>
      <p className="small">Sign in to post, reply and give scales. Other riders only ever see the rider name you choose.</p>
      {preview ? (
        <button type="button" className="button primary" onClick={google}>
          Try it as a test rider
        </button>
      ) : (
        <>
          <button type="button" className="button primary" onClick={google}>
            Continue with Google
          </button>
          <form className="email-link" onSubmit={sendLink}>
            <label className="visually-hidden" htmlFor="commons-email">
              Email
            </label>
            <input id="commons-email" type="email" required autoComplete="email" placeholder="Or your email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit" className="button">
              Email me a link
            </button>
          </form>
        </>
      )}
      {status.kind === 'sent' && (
        <p className="small" role="status">
          Check your inbox for a sign-in link, then open it on this device.
        </p>
      )}
      {status.kind === 'error' && (
        <p className="notice error" role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}

function RiderSetup({ store, onDone }: { store: CommonsStore; onDone?: () => void }) {
  const bond = useMemo(() => {
    const saved = loadBond();
    return saved ? choose(saved.answers, saved.rider) : null;
  }, []);
  const [name, setName] = useState(bond?.rider ?? '');
  const [colour, setColour] = useState<DragonColour>(bond?.colour ?? 'black');
  const [problem, setProblem] = useState('');
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const issue = checkName(name);
    if (issue) return setProblem(issue);
    try {
      await store.saveRider(name, colour);
      onDone?.();
    } catch (err) {
      setProblem(errorText(err));
    }
  };
  return (
    <form className="commons-card rider-setup" onSubmit={save}>
      <p className="legend">Choose your rider name</p>
      <input type="text" value={name} maxLength={24} placeholder="Cadet name" onChange={(e) => setName(e.target.value)} aria-label="Rider name" />
      <div className="chips" role="group" aria-label="Your dragon's colour">
        {RIDER_COLOURS.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={colour === c} onClick={() => setColour(c)}>
            <span className="dot" style={{ background: COLOURS[c].art.body, borderColor: COLOURS[c].art.rim }} />
            {COLOURS[c].name}
          </button>
        ))}
      </div>
      {problem && (
        <p className="notice error" role="status">
          {problem}
        </p>
      )}
      <button type="submit" className="button primary">
        Save
      </button>
    </form>
  );
}

function Composer({ store, account, hall }: { store: CommonsStore; account: Account | null; hall: HallId | null }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [where, setWhere] = useState<HallId>(hall ?? 'fourth-wing');
  const [spoiler, setSpoiler] = useState<SpoilerLevel>(defaultSpoiler(hall ?? 'fourth-wing'));
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hall) return;
    setWhere(hall);
    setSpoiler(defaultSpoiler(hall));
  }, [hall]);

  if (!account) return <SignIn store={store} />;
  if (!account.rider) return <RiderSetup store={store} />;

  const post = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    try {
      const id = await store.postThread({ hall: where, title, body, spoiler });
      setTitle('');
      setBody('');
      setOpen(false);
      navigate(threadHref(id));
    } catch (err) {
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="commons-card composer" onSubmit={post}>
      <label className="legend" htmlFor="thread-title">
        Start a thread
      </label>
      <input
        id="thread-title"
        type="text"
        value={title}
        maxLength={140}
        placeholder="A theory, a review, or the line that wrecked you…"
        onFocus={() => setOpen(true)}
        onChange={(e) => setTitle(e.target.value)}
      />
      {open && (
        <>
          <label className="visually-hidden" htmlFor="thread-body">
            Your post
          </label>
          <textarea id="thread-body" rows={5} value={body} maxLength={5000} placeholder="Say more…" onChange={(e) => setBody(e.target.value)} />
          <div className="composer-row">
            <label className="commons-inline" htmlFor="thread-hall">
              Hall
              <select
                id="thread-hall"
                value={where}
                onChange={(e) => {
                  const next = e.target.value as HallId;
                  setWhere(next);
                  setSpoiler(defaultSpoiler(next));
                }}
              >
                {HALLS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
            <SpoilerSelect id="thread-spoiler" value={spoiler} onChange={setSpoiler} />
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </>
      )}
      {problem && (
        <p className="notice error" role="status">
          {problem}
        </p>
      )}
    </form>
  );
}

interface CardProps {
  thread: Thread;
  shield: Book;
  revealed: boolean;
  scaled: boolean;
  canScale: boolean;
  onReveal: () => void;
  onScale: () => void;
}

function ScaleButton({ count, on, enabled, onClick }: { count: number; on: boolean; enabled: boolean; onClick: () => void }) {
  return (
    <div className="scale-count">
      <button
        type="button"
        className="scale-button"
        aria-pressed={on}
        aria-label={on ? 'Take back your dragon scale' : 'Give a dragon scale'}
        disabled={!enabled}
        title={enabled ? undefined : 'Sign in to give scales'}
        onClick={onClick}
      >
        <Scale />
      </button>
      <span>{count.toLocaleString('en-US')}</span>
    </div>
  );
}

function ThreadCard({ thread, shield, revealed, scaled, canScale, onReveal, onScale }: CardProps) {
  const sealed = isSealed(thread.spoiler, shield, revealed);
  return (
    <article className={sealed ? 'thread-card sealed' : 'thread-card'}>
      <ScaleButton count={thread.scaleCount} on={scaled} enabled={canScale} onClick={onScale} />
      <div className="thread-main">
        <div className="post-meta">
          <span className="rider-dot" style={dot(thread.authorColour)} aria-hidden="true" />
          <span className="rider-name">{thread.authorName}</span>
          <span>
            · {hallName(thread.hall)} · {timeAgo(thread.lastActivity)}
          </span>
          <SpoilerTag level={thread.spoiler} />
        </div>
        <h2 className="thread-title">
          <Link href={threadHref(thread.id)} tabIndex={sealed ? -1 : undefined} aria-hidden={sealed || undefined}>
            {thread.title}
          </Link>
        </h2>
        <p className="thread-excerpt" aria-hidden={sealed || undefined}>
          {excerpt(thread.body)}
        </p>
        <div className="thread-foot">
          <span>
            {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
          </span>
          {sealed && (
            <button type="button" className="reveal" onClick={onReveal}>
              Spoilers for {SPOILER_NAMES[thread.spoiler]}. Reveal anyway
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ThreadView({ store, account, id, shield, revealed, onReveal, scales, onScale }: {
  store: CommonsStore;
  account: Account | null;
  id: string;
  shield: Book;
  revealed: Set<string>;
  onReveal: (key: string) => void;
  scales: Set<string>;
  onScale: (id: string) => void;
}) {
  const [thread, setThread] = useState<Thread | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState('');
  const [spoiler, setSpoiler] = useState<SpoilerLevel>(0);
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => store.watchThread(id, setThread), [store, id]);
  useEffect(() => store.watchReplies(id, setReplies), [store, id]);
  // A reply starts with its thread's spoiler tag; set once per thread so a rider's own choice sticks.
  const opened = thread?.id;
  const threadSpoiler = thread?.spoiler;
  useEffect(() => {
    if (threadSpoiler !== undefined) setSpoiler(threadSpoiler);
  }, [opened]);

  if (thread === undefined) return <p className="muted">Opening the thread…</p>;
  if (thread === null || thread.hidden) {
    return (
      <div className="commons-card">
        <p className="lore">This thread isn't here any more. It may have been taken down.</p>
        <Link href={PATHS.commons} className="text-button">
          Back to the Commons
        </Link>
      </div>
    );
  }

  const sealed = isSealed(thread.spoiler, shield, revealed.has(thread.id));
  const reply = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setProblem('');
    try {
      await store.postReply(thread.id, { body, spoiler });
      setBody('');
    } catch (err) {
      setProblem(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="thread-view">
      <Link href={hallHref(thread.hall)} className="text-button back-link">
        ← {hallName(thread.hall)}
      </Link>
      <article className={sealed ? 'commons-card thread-full sealed' : 'commons-card thread-full'}>
        <div className="post-meta">
          <span className="rider-dot" style={dot(thread.authorColour)} aria-hidden="true" />
          <span className="rider-name">{thread.authorName}</span>
          <span>· {timeAgo(thread.createdAt)}</span>
          <SpoilerTag level={thread.spoiler} />
        </div>
        <h1 className="thread-heading">
          {sealed && <span className="visually-hidden">A sealed thread with spoilers for {SPOILER_NAMES[thread.spoiler]}</span>}
          <span aria-hidden={sealed || undefined}>{thread.title}</span>
        </h1>
        {sealed ? (
          <button type="button" className="reveal" onClick={() => onReveal(thread.id)}>
            This thread discusses {SPOILER_NAMES[thread.spoiler]}. Reveal anyway
          </button>
        ) : (
          <div className="post-body">
            <Body text={thread.body} />
          </div>
        )}
        <div className="thread-foot">
          <ScaleButton
            count={thread.scaleCount}
            on={scales.has(thread.id)}
            enabled={Boolean(account?.rider)}
            onClick={() => onScale(thread.id)}
          />
          <PostTools store={store} account={account} path={`threads/${thread.id}`} authorId={thread.authorId} />
        </div>
      </article>

      <section aria-label="Replies" className="replies">
        <h2 className="legend">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </h2>
        {replies.map((r) => {
          const key = `${thread.id}/${r.id}`;
          const hidden = isSealed(r.spoiler, shield, revealed.has(key)) && !sealed;
          return (
            <div key={r.id} className={hidden ? 'reply sealed' : 'reply'}>
              <span className="rider-avatar" style={dot(r.authorColour)} aria-hidden="true">
                {r.authorName.slice(0, 1).toUpperCase()}
              </span>
              <div className="reply-main">
                <div className="post-meta">
                  <span className="rider-name">{r.authorName}</span>
                  <span>· {timeAgo(r.createdAt)}</span>
                  {r.spoiler > 0 && <SpoilerTag level={r.spoiler} />}
                </div>
                {hidden ? (
                  <button type="button" className="reveal" onClick={() => onReveal(key)}>
                    Mentions {SPOILER_NAMES[r.spoiler]}. Tap to reveal
                  </button>
                ) : (
                  <div className="post-body">
                    <Body text={r.body} />
                  </div>
                )}
                <PostTools store={store} account={account} path={`threads/${thread.id}/replies/${r.id}`} authorId={r.authorId} />
              </div>
            </div>
          );
        })}
        {replies.length === 0 && <p className="muted">No replies yet. Say something.</p>}
      </section>

      {account?.rider ? (
        <form className="commons-card reply-form" onSubmit={reply}>
          <label className="visually-hidden" htmlFor="reply-body">
            Your reply
          </label>
          <textarea id="reply-body" rows={3} value={body} maxLength={3000} placeholder="Reply to the hall…" onChange={(e) => setBody(e.target.value)} />
          <div className="composer-row">
            <SpoilerSelect id="reply-spoiler" value={spoiler} onChange={setSpoiler} />
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Sending…' : 'Reply'}
            </button>
          </div>
          {problem && (
            <p className="notice error" role="status">
              {problem}
            </p>
          )}
        </form>
      ) : account ? (
        <RiderSetup store={store} />
      ) : (
        <SignIn store={store} />
      )}
    </div>
  );
}

function RatingCard({ store, account, ratings, shield }: { store: CommonsStore; account: Account | null; ratings: Ratings; shield: Book }) {
  const [book, setBook] = useState<Book>(1);
  const [problem, setProblem] = useState('');
  const shown = Math.min(book, shield) as Book;
  const r = ratings[shown];
  const rate = async (n: number) => {
    setProblem('');
    try {
      await store.rate(shown, n);
    } catch (err) {
      setProblem(errorText(err));
    }
  };
  return (
    <div className="commons-card rating-card">
      <p className="legend">Rate the books</p>
      {shield > 1 && (
        <div className="chips" role="group" aria-label="Which book">
          {([1, 2, 3] as Book[])
            .filter((b) => b <= shield)
            .map((b) => (
              <button key={b} type="button" className="chip book-chip" aria-pressed={shown === b} onClick={() => setBook(b)}>
                {BOOK_NAMES[b]}
              </button>
            ))}
        </div>
      )}
      <p className="rating-book">{BOOK_TITLES[shown]}</p>
      <div className="scale-row" role="group" aria-label={`Rate ${BOOK_TITLES[shown]}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={r.mine !== null && n <= r.mine ? 'rate-scale on' : 'rate-scale'}
            aria-label={`${n} ${n === 1 ? 'scale' : 'scales'}`}
            aria-pressed={r.mine === n}
            disabled={!account?.rider}
            onClick={() => void rate(n)}
          >
            <Scale size={28} />
          </button>
        ))}
      </div>
      <p className="rating-words">{account?.rider ? RATING_WORDS[r.mine ?? 0] : 'Sign in to rate.'}</p>
      <p className="muted small">
        {r.count ? `Riders' average: ${r.average!.toFixed(1)} scales from ${r.count.toLocaleString('en-US')} ${r.count === 1 ? 'rider' : 'riders'}` : 'No ratings yet.'}
      </p>
      {problem && (
        <p className="notice error" role="status">
          {problem}
        </p>
      )}
    </div>
  );
}

function Moderation({ store, reports }: { store: CommonsStore; reports: Report[] }) {
  const reason = (id: ReportReason) => REPORT_REASONS.find((r) => r.id === id)?.name ?? id;
  const threadOf = (path: string) => path.split('/')[1];
  return (
    <div className="commons-card moderation">
      <p className="legend">Reports · {reports.length}</p>
      {reports.length === 0 && <p className="muted small">Nothing to review.</p>}
      {reports.slice(0, 20).map((r) => (
        <div key={r.id} className="report-row">
          <span className="small">
            {reason(r.reason)} · {timeAgo(r.createdAt)}
          </span>
          <div className="report-actions">
            <Link href={threadHref(threadOf(r.path))} className="text-button small">
              View
            </Link>
            <button type="button" className="text-button small" onClick={() => void store.setHidden(r.path, true).then(() => store.dismissReport(r.id))}>
              Hide post
            </button>
            <button type="button" className="text-button small" onClick={() => void store.dismissReport(r.id)}>
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommonsPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const threadId = params.get('t');
  const hallParam = params.get('hall') as HallId | null;
  const hall = HALLS.some((h) => h.id === hallParam) ? hallParam : null;

  const [store, setStore] = useState<CommonsStore | null>(null);
  const [failed, setFailed] = useState('');
  const [account, setAccount] = useState<Account | null>(null);
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [listError, setListError] = useState('');
  const [scales, setScales] = useState<Set<string>>(() => new Set());
  const [ratings, setRatings] = useState<Ratings | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [shield, setShield] = useState<Book>(loadBook);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [renaming, setRenaming] = useState(false);
  const [scaleProblem, setScaleProblem] = useState('');

  useEffect(() => {
    getCommonsStore().then(setStore, (err) => setFailed(errorText(err)));
  }, []);
  useEffect(() => store?.watchAccount(setAccount), [store]);
  useEffect(() => store?.watchMyScales(setScales), [store, account?.uid]);
  useEffect(() => store?.watchRatings(setRatings), [store, account?.uid]);
  useEffect(() => (store && account?.moderator ? store.watchReports(setReports) : undefined), [store, account?.moderator]);
  useEffect(() => {
    if (!store || threadId) return;
    setThreads(null);
    setListError('');
    return store.watchThreads(hall, setThreads, (err) => setListError(err.message));
  }, [store, hall, threadId]);

  const chooseShield = (book: Book) => {
    setShield(book);
    saveBook(book);
    setRevealed(new Set());
  };
  const reveal = (key: string) => setRevealed((s) => new Set(s).add(key));
  const scale = (id: string) => {
    if (!store || !account?.rider) return;
    setScaleProblem('');
    store.toggleScale(id, !scales.has(id)).catch((err) => {
      console.warn('[Commons] scale failed', err);
      setScaleProblem('Your scale didn’t save. Try again in a moment.');
    });
  };

  return (
    <div className="commons">
      {store?.kind === 'preview' && (
        <p className="commons-preview" role="note">
          <strong>Preview.</strong> The Commons isn't connected yet, so anything you post stays in this browser and nobody else
          can see it.
        </p>
      )}

      <div className="commons-layout">
        <aside className="commons-side" aria-label="Halls and spoiler shield">
          <nav className="halls" aria-label="Halls">
            <p className="legend">Halls</p>
            <Link href={hallHref(null)} className="hall" aria-current={!hall && !threadId ? 'page' : undefined}>
              All halls
            </Link>
            {HALLS.map((h) => (
              <Link key={h.id} href={hallHref(h.id)} className="hall" aria-current={hall === h.id && !threadId ? 'page' : undefined}>
                {h.name}
              </Link>
            ))}
          </nav>
          <div className="commons-card shield-card">
            <p className="legend" id="commons-shield">
              Spoiler shield
            </p>
            <p className="small">I've read up to</p>
            <div className="chips" role="group" aria-labelledby="commons-shield">
              {([1, 2, 3] as Book[]).map((b) => (
                <button key={b} type="button" className="chip book-chip" aria-pressed={shield === b} onClick={() => chooseShield(b)}>
                  {['', 'I', 'II', 'III'][b]}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="commons-main" aria-labelledby={threadId ? undefined : 'commons-title'}>
          {failed && <p className="notice error">{failed}</p>}
          {scaleProblem && (
            <p className="notice error" role="status">
              {scaleProblem}
            </p>
          )}
          {!store && !failed && <p className="muted">Opening the Commons…</p>}
          {store && threadId && (
            <ThreadView store={store} account={account} id={threadId} shield={shield} revealed={revealed} onReveal={reveal} scales={scales} onScale={scale} />
          )}
          {store && !threadId && (
            <>
              <div className="stack-tight">
                <h1 id="commons-title" className="commons-title">
                  {hall ? hallName(hall) : 'The Commons'}
                </h1>
                <p className="lore">Where riders argue, theorise and scream about chapter endings together.</p>
              </div>
              <Composer store={store} account={account} hall={hall} />
              {listError && <p className="notice error">{listError}</p>}
              {threads === null && !listError && <p className="muted">Gathering the threads…</p>}
              {threads?.length === 0 && (
                <div className="commons-card empty-hall">
                  <p className="lore">{hall ? `Nobody has started a thread in ${hallName(hall)} yet.` : 'The Commons is quiet.'} Be the first.</p>
                </div>
              )}
              {threads?.map((t) => (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  shield={shield}
                  revealed={revealed.has(t.id)}
                  scaled={scales.has(t.id)}
                  canScale={Boolean(account?.rider)}
                  onReveal={() => reveal(t.id)}
                  onScale={() => scale(t.id)}
                />
              ))}
            </>
          )}
        </main>

        <aside className="commons-side right" aria-label="Your account and ratings">
          {store && account?.rider && (
            <div className="commons-card account-card">
              <span className="rider-avatar large" style={dot(account.rider.colour)} aria-hidden="true">
                {account.rider.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="account-text">
                <span className="rider-name">{account.rider.name}</span>
                <span className="muted small">{account.moderator ? 'Moderator' : 'Rider'}</span>
              </div>
              <div className="account-actions">
                <button type="button" className="text-button small" onClick={() => setRenaming((r) => !r)}>
                  {renaming ? 'Cancel' : 'Rename'}
                </button>
                <button type="button" className="text-button small" onClick={() => void store.signOut()}>
                  Sign out
                </button>
              </div>
            </div>
          )}
          {store && renaming && <RiderSetup store={store} onDone={() => setRenaming(false)} />}
          {store && account?.moderator && <Moderation store={store} reports={reports} />}
          {store && ratings && <RatingCard store={store} account={account} ratings={ratings} shield={shield} />}
          <div className="commons-card conduct">
            <p className="legend">Codex of conduct</p>
            <p className="small">Tag spoilers by book.</p>
            <p className="small">Argue with ideas, never riders.</p>
            <p className="small">Credit every artist, and link to their post.</p>
            <p className="small muted">Moderators remove anything that breaks these.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
