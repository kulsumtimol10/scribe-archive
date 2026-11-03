import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../components/Link';
import {
  dailySeed,
  finished,
  grab,
  HOLDS,
  loadRecords,
  recordClimb,
  SECTIONS,
  sectionOf,
  startClimb,
  tick,
  type Climb,
  type Side,
} from '../lib/gauntlet';
import { drawGauntlet, makeView } from '../lib/gauntletScene';
import { readPalette } from '../lib/palette';
import { formatTime } from '../lib/parapet';
import { PATHS } from '../lib/router';
import { useTheme } from '../lib/theme';

type Screen = 'menu' | 'countdown' | 'climbing' | 'paused' | 'top';

const KEYS: Record<string, Side> = { a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };

interface Result {
  time: number;
  slips: number;
  knocks: number;
  today: boolean;
  ever: boolean;
}

export function GauntletPage() {
  const theme = useTheme();
  const seed = useMemo(() => dailySeed(), []);
  const today = useMemo(() => new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' }), []);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const climb = useRef<Climb>(startClimb(seed));
  const view = useRef(makeView());
  const palette = useRef(readPalette());
  const clock = useRef<HTMLSpanElement>(null);
  const height = useRef<HTMLSpanElement>(null);

  const [screen, setScreen] = useState<Screen>('menu');
  const [count, setCount] = useState(3);
  const [section, setSection] = useState(SECTIONS[0].name);
  const [message, setMessage] = useState('');
  const [records, setRecords] = useState(loadRecords);
  const [result, setResult] = useState<Result | null>(null);

  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    palette.current = readPalette();
  }, [theme]);

  const begin = () => {
    climb.current = startClimb(seed);
    view.current = makeView();
    setResult(null);
    setMessage('');
    setSection(SECTIONS[0].name);
    setCount(3);
    setScreen('countdown');
    stage.current?.focus();
  };

  // 3, 2, 1, climb.
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (count === 0) {
      setScreen('climbing');
      return;
    }
    const timer = window.setTimeout(() => setCount((n) => n - 1), 700);
    return () => window.clearTimeout(timer);
  }, [screen, count]);

  /** The climber reaches for a hold. */
  const reach = (side: Side) => {
    if (screenRef.current !== 'climbing') return;
    const before = climb.current;
    const after = grab(before, side);
    if (after === before) return;
    climb.current = after;
    if (after.last === 'slip') {
      view.current.shake = 8;
      setMessage('Slipped!');
    } else if (after.last === 'knock') {
      view.current.shake = 18;
      setMessage('Knocked down three holds!');
    } else {
      setMessage('');
    }
    const name = SECTIONS.find((s) => s.id === sectionOf(Math.min(after.index, HOLDS - 1)))!.name;
    setSection(name);
    if (finished(after)) {
      const saved = recordClimb(seed, after.time);
      setRecords(saved.records);
      setResult({ time: after.time, slips: after.slips, knocks: after.knocks, today: saved.today, ever: saved.ever });
      setScreen('top');
    }
  };

  // Keep the canvas sharp at any size and pixel density.
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(el.clientWidth * ratio);
      el.height = Math.round(el.clientHeight * ratio);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // One loop for the page's lifetime: run the clock while climbing, always draw.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (screenRef.current === 'climbing') {
        climb.current = tick(climb.current, dt);
        if (clock.current) clock.current.textContent = formatTime(climb.current.time);
      }
      // Lets a test in the browser console read (and in a pinch, replace) the climb during development.
      if (import.meta.env.DEV) {
        const w = window as unknown as { __climb?: Climb; __setClimb?: (c: Climb) => void };
        w.__climb = climb.current;
        w.__setClimb = (c) => {
          climb.current = c;
        };
      }
      if (height.current) height.current.textContent = `${climb.current.index} / ${HOLDS}`;
      const el = canvas.current;
      const ctx = el?.getContext('2d');
      if (el && ctx && el.width > 0) {
        const ratio = el.width / el.clientWidth || 1;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        drawGauntlet(ctx, el.clientWidth, el.clientHeight, climb.current, view.current, palette.current, dt, now / 1000);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // Everything the loop reads is a ref.
  }, []);

  // Keyboard: A/D or the arrows grab; P or Esc pauses. Holding a key down doesn't repeat grabs.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((key === 'p' || key === 'escape') && (screenRef.current === 'climbing' || screenRef.current === 'paused')) {
        setScreen(screenRef.current === 'climbing' ? 'paused' : 'climbing');
        return;
      }
      if (!(key in KEYS) || screenRef.current !== 'climbing') return;
      e.preventDefault();
      if (!e.repeat) reach(KEYS[key]);
    };
    const hidden = () => {
      if (document.hidden && screenRef.current === 'climbing') setScreen('paused');
    };
    window.addEventListener('keydown', down);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      document.removeEventListener('visibilitychange', hidden);
    };
    // reach only uses refs and stable setters.
  }, []);

  /** Grab on press, not release, so taps feel instant; a keyboard click still works. */
  const tapped = useRef(false);
  const touchButton = (side: Side) => ({
    onPointerDown: () => {
      tapped.current = true;
      reach(side);
    },
    onClick: () => {
      if (tapped.current) tapped.current = false;
      else reach(side);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const todayBest = records.days[String(seed)];
  const live = screen === 'climbing' || screen === 'paused';

  return (
    <div className="parapet-page">
      <div ref={stage} className="stage gauntlet-stage" tabIndex={-1} aria-label="The Gauntlet. Press A or D, or the arrow keys, to grab left and right holds.">
        <canvas ref={canvas} className="stage-canvas" role="img" aria-label="A cadet climbing a rock face at night" />

        <div className="hud" aria-hidden={!live}>
          <div className="hud-stats">
            <div>
              <span className="hud-label">Time</span>
              <span ref={clock} className="hud-value">
                0:00.0
              </span>
            </div>
            <div>
              <span className="hud-label">Hold</span>
              <span ref={height} className="hud-value">
                0 / {HOLDS}
              </span>
            </div>
            <div>
              <span className="hud-label">Section</span>
              <span className="hud-value hud-word">{section}</span>
            </div>
          </div>
          {screen === 'climbing' && (
            <button type="button" className="pause" aria-label="Pause" onClick={() => setScreen('paused')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="3" y="2" width="3.5" height="12" />
                <rect x="9.5" y="2" width="3.5" height="12" />
              </svg>
            </button>
          )}
        </div>

        <p className={message ? 'gust-alert show danger' : 'gust-alert'} aria-live="assertive">
          {screen === 'climbing' ? message : ''}
        </p>

        {screen === 'countdown' && (
          <p className="countdown" aria-live="assertive">
            {count > 0 ? count : 'Climb!'}
          </p>
        )}

        {screen === 'menu' && (
          <div className="stage-panel" role="dialog" aria-labelledby="gauntlet-title">
            <p className="kicker">The Trials · II</p>
            <h1 id="gauntlet-title">The Gauntlet</h1>
            <p className="lore">
              Forty-eight holds up a cliff in three sections: the bare wall, the rockfall and the swinging log. Grab the
              glowing hold, left or right. Wrong grabs slip. Grab into rock or log and you fall three holds.
            </p>
            <p className="race-best">
              Today's wall · {today}
              {todayBest !== undefined && ` · your best ${formatTime(todayBest)}`}
              {records.best !== undefined && ` · ever ${formatTime(records.best)}`}
            </p>
            <ul className="how">
              <li>
                <kbd>A</kbd> or <kbd>←</kbd> grab left · <kbd>D</kbd> or <kbd>→</kbd> grab right · wait out the red
              </li>
              <li className="how-touch">On a phone: tap the left and right buttons under the wall.</li>
            </ul>
            <button type="button" className="button primary wide-button" onClick={begin}>
              Begin the climb
            </button>
          </div>
        )}

        {screen === 'paused' && (
          <div className="stage-panel" role="dialog" aria-labelledby="climb-paused">
            <h1 id="climb-paused">Paused</h1>
            <p className="lore">Hold on. The rock will wait.</p>
            <button type="button" className="button primary wide-button" onClick={() => setScreen('climbing')}>
              Keep climbing
            </button>
            <button type="button" className="button wide-button" onClick={() => setScreen('menu')}>
              Let go and start over
            </button>
          </div>
        )}

        {screen === 'top' && result && (
          <div className="stage-panel" role="dialog" aria-labelledby="top-title" aria-live="polite">
            <p className="kicker">{result.ever ? 'Fastest ever' : result.today ? "Today's best" : 'At the top'}</p>
            <h1 id="top-title">{formatTime(result.time)}</h1>
            <p className="lore">
              {result.slips === 0 && result.knocks === 0
                ? 'A clean climb: not one slip.'
                : `${result.slips} slip${result.slips === 1 ? '' : 's'} and ${result.knocks} knock${result.knocks === 1 ? '' : 's'} on the way up.`}{' '}
              A new wall rises tomorrow.
            </p>
            <button type="button" className="button primary wide-button" onClick={begin}>
              Climb again
            </button>
            <div className="panel-links">
              <Link href={PATHS.trials} className="text-button">
                Back to the Trials
              </Link>
              <Link href={PATHS.warGames} className="text-button">
                On to the War Games
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="touch-controls gauntlet-controls" aria-label="Controls">
        <button type="button" className="hold" aria-label="Grab left" {...touchButton('left')}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 4l-7 7 7 7" />
          </svg>
          Left
        </button>
        <button type="button" className="hold" aria-label="Grab right" {...touchButton('right')}>
          Right
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M8 4l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
