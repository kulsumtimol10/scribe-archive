import { lazy, Suspense, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Dragon } from '../components/art/Dragon';
import { TailIcon } from '../components/art/TailIcon';
import { Link } from '../components/Link';
import {
  breed,
  COLOUR_INFO,
  DRAGONS,
  fromBond,
  lookAt,
  pickPair,
  roster,
  TAIL_INFO,
  type CodexEntry,
  type CodexTail,
  type Look,
} from '../lib/codex';
import { PATHS } from '../lib/router';
import { BOOK_NAMES, loadBook, saveBook, type Book } from '../lib/spoilers';
import { choose, loadBond } from '../lib/threshing';
import { hasWebGL } from '../lib/webgl';

const CodexScene = lazy(() => import('../scenes/CodexScene').then((m) => ({ default: m.CodexScene })));

const smooth = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

/** The flat side-on dragon from the wallpapers, for browsers without 3D (and while it loads). */
function FlatDragon({ look }: { look: Look }) {
  const c = COLOUR_INFO[look.colour];
  return (
    <svg className="codex-flat" viewBox="0 0 600 240" aria-hidden="true">
      <Dragon colours={{ body: c.body, wing: c.body, bone: c.rim, rim: c.rim, eye: '#f2c46b' }} rimOpacity={0.8} />
    </svg>
  );
}

/** Draws only while the stage is on screen, so two dragons don't drain a phone battery off-screen. */
function useOnScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setOn(entry.isIntersecting), { rootMargin: '120px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, on] as const;
}

interface CardProps {
  side: 'a' | 'b';
  entry: CodexEntry;
  book: Book;
  list: CodexEntry[];
  webgl: boolean;
  unsealed: boolean;
  onPick: (id: string) => void;
  onUnseal: () => void;
}

function CodexCard({ side, entry, book, list, webgl, unsealed, onPick, onUnseal }: CardProps) {
  const look = lookAt(entry, book);
  const colour = COLOUR_INFO[look.colour];
  const grown = look.from > entry.from;
  const [stage, onScreen] = useOnScreen();
  const titleId = `codex-${side}`;

  return (
    <article className="codex-card" aria-labelledby={titleId} style={{ '--dragon-rim': colour.rim } as CSSProperties}>
      <div ref={stage} className="codex-stage" role="img" aria-label={`${entry.name}, ${breed(look).toLowerCase()}`}>
        {webgl ? (
          <Suspense fallback={<FlatDragon look={look} />}>
            <CodexScene look={look} active={onScreen} />
          </Suspense>
        ) : (
          <FlatDragon look={look} />
        )}
        <span className="codex-tag">{entry.own ? 'Your dragon' : BOOK_NAMES[entry.from]}</span>
        {webgl && (
          <span className="codex-hint" aria-hidden="true">
            Drag to turn
          </span>
        )}
      </div>

      <div className="codex-body">
        <label className="codex-pick">
          <span className="legend">{side === 'a' ? 'Left' : 'Right'} dragon</span>
          <select value={entry.id} onChange={(e) => onPick(e.target.value)}>
            {list.map((d) => (
              <option key={d.id} value={d.id}>
                {d.own ? `${d.name} (your dragon)` : d.name}
              </option>
            ))}
          </select>
        </label>

        <div className="codex-title">
          <h2 id={titleId}>{entry.name}</h2>
          <p className="codex-breed">{breed(look)}</p>
        </div>

        <dl className="codex-facts">
          <div>
            <dt>Rider</dt>
            <dd>{entry.rider}</dd>
          </div>
          <div>
            <dt>Colour</dt>
            <dd>{colour.name}</dd>
          </div>
          <div>
            <dt>Tail</dt>
            <dd>{look.tail ? TAIL_INFO[look.tail].name : 'Not recorded'}</dd>
          </div>
          <div>
            <dt>First flies in</dt>
            <dd>{entry.own ? 'Your Threshing' : BOOK_NAMES[entry.from]}</dd>
          </div>
          {entry.fullName && (
            <div>
              <dt>Full name</dt>
              <dd>{entry.fullName}</dd>
            </div>
          )}
          {entry.signet && (
            <div className="codex-signet">
              <dt>{entry.signet.label}</dt>
              <dd>
                {unsealed || entry.own ? (
                  entry.signet.text
                ) : (
                  <button type="button" className="seal" onClick={onUnseal}>
                    <span aria-hidden="true" className="seal-mark" />
                    Break the seal
                    <span className="visually-hidden"> on {entry.name}'s {entry.signet.label.toLowerCase()}</span>
                  </button>
                )}
              </dd>
            </div>
          )}
        </dl>
        {grown && <p className="muted small">As of {BOOK_NAMES[look.from]}. Dragons change as they grow.</p>}
      </div>
    </article>
  );
}

export function CodexPage() {
  const [book, setBook] = useState<Book>(loadBook);
  const [own] = useState<CodexEntry | null>(() => {
    const saved = loadBond();
    return saved ? fromBond(choose(saved.answers, saved.rider)) : null;
  });
  const list = useMemo(() => roster(book, own), [book, own]);
  const [ids, setIds] = useState(() => window.location.search);
  // Re-checked against the roster each time, so raising or lowering the shield never shows a sealed dragon.
  const [a, b] = pickPair(ids, list);
  const [unsealed, setUnsealed] = useState<Set<string>>(() => new Set());
  const webgl = useMemo(hasWebGL, []);
  const compare = useRef<HTMLDivElement>(null);
  const sealedCount = DRAGONS.filter((d) => d.from > book).length;

  // Keep the address shareable: /codex?a=tairn&b=sgaeyl.
  useEffect(() => {
    const url = `${window.location.pathname}?a=${a.id}&b=${b.id}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, '', url);
  }, [a.id, b.id]);

  const show = (left: string, right: string) => setIds(`?a=${left}&b=${right}`);
  const pickSide = (side: 'a' | 'b', id: string) => {
    if (side === 'a') show(id, id === b.id ? a.id : b.id);
    else show(id === a.id ? b.id : a.id, id);
  };
  const fromRoster = (id: string) => {
    if (id !== a.id && id !== b.id) pickSide('b', id);
    compare.current?.scrollIntoView({ behavior: smooth(), block: 'start' });
  };
  const chooseBook = (next: Book) => {
    setBook(next);
    saveBook(next);
  };

  return (
    <div className="codex">
      <section className="page-section codex-head" aria-labelledby="codex-title">
        <div className="stack-tight">
          <p className="kicker">The Dragon Codex</p>
          <h1 id="codex-title" className="codex-h1">
            {a.name} <span className="codex-vs">vs</span> {b.name}
          </h1>
          <p className="lore">Set any two dragons side by side. Riders' signets stay sealed until you break the seal.</p>
        </div>
        <div className="codex-tools">
          <div className="field">
            <span className="legend" id="codex-shield">
              Spoiler shield · I have read up to
            </span>
            <div className="chips" role="group" aria-labelledby="codex-shield">
              {([1, 2, 3] as Book[]).map((n) => (
                <button key={n} type="button" className="chip book-chip" aria-pressed={book === n} onClick={() => chooseBook(n)}>
                  {BOOK_NAMES[n]}
                </button>
              ))}
            </div>
          </div>
          <button type="button" className="button" onClick={() => show(b.id, a.id)}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M3 6h11l-3-3 M15 12H4l3 3" />
            </svg>
            Swap sides
          </button>
        </div>
      </section>

      <div ref={compare} className="codex-compare">
        <CodexCard
          side="a"
          entry={a}
          book={book}
          list={list}
          webgl={webgl}
          unsealed={unsealed.has(a.id)}
          onPick={(id) => pickSide('a', id)}
          onUnseal={() => setUnsealed((s) => new Set(s).add(a.id))}
        />
        <CodexCard
          side="b"
          entry={b}
          book={book}
          list={list}
          webgl={webgl}
          unsealed={unsealed.has(b.id)}
          onPick={(id) => pickSide('b', id)}
          onUnseal={() => setUnsealed((s) => new Set(s).add(b.id))}
        />
      </div>

      <section className="page-section codex-roster" aria-labelledby="roster-title">
        <div className="stack-tight">
          <h2 id="roster-title" className="section-title">
            Every dragon in the Archive
          </h2>
          <p className="muted">Pick one to set it beside {a.name}.</p>
        </div>
        <ul className="roster-grid">
          {list.map((d) => {
            const look = lookAt(d, book);
            const c = COLOUR_INFO[look.colour];
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className="roster-card"
                  aria-pressed={d.id === a.id || d.id === b.id}
                  onClick={() => fromRoster(d.id)}
                  style={{ '--swatch': c.body, '--swatch-rim': c.rim } as CSSProperties}
                >
                  <span className="roster-swatch">
                    <TailIcon tail={look.tail} size={40} />
                  </span>
                  <span className="roster-name">{d.name}</span>
                  <span className="roster-meta">{d.own ? 'Your dragon' : d.rider}</span>
                </button>
              </li>
            );
          })}
          {!own && (
            <li>
              <Link href={PATHS.threshing} className="roster-card roster-invite">
                <span className="roster-name">Your dragon?</span>
                <span className="roster-meta">Walk the Threshing and yours joins the Codex.</span>
              </Link>
            </li>
          )}
        </ul>
        {sealedCount > 0 && (
          <p className="muted small">
            {sealedCount} more {sealedCount === 1 ? 'dragon stays' : 'dragons stay'} sealed until you read further.
          </p>
        )}
      </section>

      <section className="page-section tail-guide" aria-labelledby="tails-title">
        <div className="stack-tight">
          <h2 id="tails-title" className="section-title">
            Six tails
          </h2>
          <p className="muted">Every dragon fights with what grows at the end of its tail. Some don't fight with it at all.</p>
        </div>
        <ul className="tail-grid">
          {(Object.keys(TAIL_INFO) as CodexTail[]).map((tail) => (
            <li key={tail} className="tail-card">
              <TailIcon tail={tail} size={72} />
              <span className="tail-name">{TAIL_INFO[tail].name}</span>
              <span className="muted">{TAIL_INFO[tail].text}</span>
            </li>
          ))}
        </ul>
        <p className="muted small">Facts checked against fan wikis and kept short. Nothing here is quoted from the books.</p>
      </section>
    </div>
  );
}
