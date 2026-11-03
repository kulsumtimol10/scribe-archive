import { useEffect, useRef, useState } from 'react';
import { HoldButton } from '../components/HoldButton';
import { Link } from '../components/Link';
import {
  advance,
  FALL_AT,
  formatTime,
  IDLE,
  loadBest,
  recordCrossing,
  start,
  WEATHER,
  type Crossing,
  type Gust,
  type Input,
  type Weather,
} from '../lib/parapet';
import { readPalette } from '../lib/palette';
import { drawScene, makeEffects } from '../lib/parapetScene';
import { PATHS } from '../lib/router';
import { useTheme } from '../lib/theme';

type Screen = 'menu' | 'playing' | 'paused' | 'fallen' | 'crossed';
type Control = 'left' | 'right' | 'walk' | 'brace';

const KEYS: Record<string, Control> = {
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  w: 'walk',
  arrowup: 'walk',
  ' ': 'brace',
  s: 'brace',
  arrowdown: 'brace',
};

const FALL_LINES = ['The gorge takes another.', 'Your name joins the roll.', 'The wind wins this one.', 'Not today, cadet.'];

interface Result {
  time: number;
  progress: number;
  newBest: boolean;
  line: string;
}

function gustMessage(gust: Gust): string {
  if (gust.phase === 'warning') return `Gust from the ${gust.dir > 0 ? 'left' : 'right'}. Brace!`;
  if (gust.phase === 'blowing') return 'Hold on!';
  return '';
}

export function ParapetPage() {
  const theme = useTheme();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const distance = useRef<HTMLSpanElement>(null);
  const clock = useRef<HTMLSpanElement>(null);
  const needle = useRef<HTMLDivElement>(null);

  const crossing = useRef<Crossing | null>(null);
  const keysDown = useRef(new Set<string>());
  const touchDown = useRef(new Set<Control>());
  const palette = useRef(readPalette());
  const effects = useRef(makeEffects());

  const [screen, setScreen] = useState<Screen>('menu');
  const [weather, setWeather] = useState<Weather>('rain');
  const [attempts, setAttempts] = useState(0);
  const [gust, setGust] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [best, setBest] = useState(loadBest);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;

  // The theme can change mid-crossing; repaint in the new colours.
  useEffect(() => {
    palette.current = readPalette();
  }, [theme]);

  const held = (control: Control) =>
    touchDown.current.has(control) || [...keysDown.current].some((key) => KEYS[key] === control);

  const currentInput = (): Input => ({
    lean: ((held('right') ? 1 : 0) - (held('left') ? 1 : 0)) as Input['lean'],
    walk: held('walk'),
    brace: held('brace'),
  });

  const begin = () => {
    crossing.current = start(weatherRef.current, Math.random);
    effects.current.falling = 0;
    setAttempts((n) => n + 1);
    setResult(null);
    setGust('');
    setScreen('playing');
    stage.current?.focus();
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

  // One loop for the page's lifetime: run the crossing while playing, always draw.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const finish = (c: Crossing) => {
      if (c.status === 'crossed') {
        const newBest = recordCrossing(c.weather, c.time);
        setBest(loadBest());
        setResult({ time: c.time, progress: 1, newBest, line: 'You crossed the Parapet.' });
      } else {
        const line = FALL_LINES[Math.floor(Math.random() * FALL_LINES.length)];
        setResult({ time: c.time, progress: c.progress, newBest: false, line });
      }
      setGust('');
      setScreen(c.status === 'crossed' ? 'crossed' : 'fallen');
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const input = currentInput();
      const before = crossing.current;

      if (before && screenRef.current === 'playing') {
        const after = advance(before, input, dt, Math.random);
        crossing.current = after;
        if (distance.current) distance.current.textContent = `${Math.round(after.progress * 100)}%`;
        if (clock.current) clock.current.textContent = formatTime(after.time);
        if (needle.current) {
          needle.current.style.left = `${50 + (Math.max(-FALL_AT, Math.min(FALL_AT, after.lean)) / FALL_AT) * 50}%`;
          needle.current.classList.toggle('danger', Math.abs(after.lean) > FALL_AT * 0.6);
        }
        if (after.gust.phase !== before.gust.phase) setGust(gustMessage(after.gust));
        if (after.status !== 'playing') finish(after);
      }

      const el = canvas.current;
      const ctx = el?.getContext('2d');
      if (el && ctx && el.width > 0) {
        const ratio = el.width / el.clientWidth || 1;
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        const w = WEATHER[crossing.current?.weather ?? weatherRef.current];
        drawScene(
          ctx,
          el.clientWidth,
          el.clientHeight,
          { crossing: crossing.current, input, rain: w.rain, lightning: w.lightning, dt, calm },
          palette.current,
          effects.current,
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // The loop reads everything through refs, so it never needs restarting.
  }, []);

  // Keyboard controls, plus pausing when the reader switches away.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((key === 'p' || key === 'escape') && (screenRef.current === 'playing' || screenRef.current === 'paused')) {
        setScreen(screenRef.current === 'playing' ? 'paused' : 'playing');
        return;
      }
      if (!(key in KEYS)) return;
      if (screenRef.current === 'playing') e.preventDefault();
      keysDown.current.add(key);
    };
    const up = (e: KeyboardEvent) => keysDown.current.delete(e.key.toLowerCase());
    const release = () => {
      keysDown.current.clear();
      touchDown.current.clear();
    };
    const hidden = () => {
      if (document.hidden && screenRef.current === 'playing') setScreen('paused');
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  const touch = (control: Control) => (isDown: boolean) => {
    if (isDown) touchDown.current.add(control);
    else touchDown.current.delete(control);
  };

  const playing = screen === 'playing';

  return (
    <div className="parapet-page">
      <div
        ref={stage}
        className="stage"
        tabIndex={-1}
        aria-label="Cross the Parapet. Hold W to walk, A and D to lean, Space to brace, P to pause."
      >
        <canvas ref={canvas} className="stage-canvas" role="img" aria-label="A cadet on a narrow stone bridge high above a gorge" />

        <div className="hud" aria-hidden={!playing}>
          <div className="hud-stats">
            <div>
              <span className="hud-label">Distance</span>
              <span ref={distance} className="hud-value">
                0%
              </span>
            </div>
            <div>
              <span className="hud-label">Time</span>
              <span ref={clock} className="hud-value">
                0:00.0
              </span>
            </div>
            <div>
              <span className="hud-label">Attempt</span>
              <span className="hud-value">{Math.max(attempts, 1)}</span>
            </div>
          </div>
          {playing && (
            <button type="button" className="pause" aria-label="Pause" onClick={() => setScreen('paused')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <rect x="3" y="2" width="3.5" height="12" />
                <rect x="9.5" y="2" width="3.5" height="12" />
              </svg>
            </button>
          )}
        </div>

        <p className={gust ? 'gust-alert show' : 'gust-alert'} aria-live="assertive">
          {playing ? gust : ''}
        </p>

        <div className="balance" aria-hidden="true">
          <div className="balance-labels">
            <span>Fall left</span>
            <span>Balance</span>
            <span>Fall right</span>
          </div>
          <div className="balance-track">
            <div ref={needle} className="balance-needle" />
          </div>
        </div>

        {screen === 'menu' && (
          <div className="stage-panel" role="dialog" aria-labelledby="parapet-title">
            <p className="kicker">The Trials · I</p>
            <h1 id="parapet-title">Cross the Parapet</h1>
            <p className="lore">
              The only way into the riders' quadrant is a narrow stone bridge high over a gorge. The wind doesn't care
              that it's your first day.
            </p>
            <div className="chips" role="group" aria-label="Weather">
              {(Object.keys(WEATHER) as Weather[]).map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={weather === id} onClick={() => setWeather(id)}>
                  {WEATHER[id].name}
                  {best[id] !== undefined && <span className="chip-note">{formatTime(best[id]!)}</span>}
                </button>
              ))}
            </div>
            <ul className="how">
              <li>
                <kbd>W</kbd> walk · <kbd>A</kbd> <kbd>D</kbd> lean · <kbd>Space</kbd> brace for gusts
              </li>
              <li className="how-touch">On a phone: hold the buttons under the bridge.</li>
            </ul>
            <button type="button" className="button primary wide-button" onClick={begin}>
              Begin the crossing
            </button>
          </div>
        )}

        {screen === 'paused' && (
          <div className="stage-panel" role="dialog" aria-labelledby="paused-title">
            <h1 id="paused-title">Paused</h1>
            <p className="lore">The wind waits for no one, but this time it will.</p>
            <button type="button" className="button primary wide-button" onClick={() => setScreen('playing')}>
              Keep going
            </button>
            <button type="button" className="button wide-button" onClick={() => setScreen('menu')}>
              Give up and go back
            </button>
          </div>
        )}

        {(screen === 'fallen' || screen === 'crossed') && result && (
          <div className="stage-panel" role="dialog" aria-labelledby="result-title" aria-live="polite">
            <p className="kicker">{screen === 'crossed' ? 'Crossed' : 'Fallen'}</p>
            <h1 id="result-title">{result.line}</h1>
            {screen === 'crossed' ? (
              <p className="lore">
                {formatTime(result.time)} in {WEATHER[weather].name.toLowerCase()} weather.{' '}
                {result.newBest ? 'Your best yet.' : `Your best is ${formatTime(best[weather] ?? result.time)}.`} A dragon may
                have noticed.
              </p>
            ) : (
              <p className="lore">
                You made it {Math.round(result.progress * 100)}% of the way across in {formatTime(result.time)}.
              </p>
            )}
            <button type="button" className="button primary wide-button" onClick={begin}>
              {screen === 'crossed' ? 'Cross again' : 'Try again'}
            </button>
            <div className="panel-links">
              <button type="button" className="text-button" onClick={() => setScreen('menu')}>
                Change the weather
              </button>
              {screen === 'crossed' && (
                <Link href={PATHS.threshing} className="text-button">
                  Walk the Threshing next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="touch-controls" aria-label="Controls">
        <HoldButton label="Lean left" onHold={touch('left')}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M14 4l-7 7 7 7" />
          </svg>
          Lean
        </HoldButton>
        <HoldButton label="Walk" onHold={touch('walk')} wide>
          Walk
        </HoldButton>
        <HoldButton label="Brace" onHold={touch('brace')} wide>
          Brace
        </HoldButton>
        <HoldButton label="Lean right" onHold={touch('right')}>
          Lean
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M8 4l7 7-7 7" />
          </svg>
        </HoldButton>
      </div>
    </div>
  );
}
