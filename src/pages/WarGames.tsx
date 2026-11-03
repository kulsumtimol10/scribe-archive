import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { DragonButtons, useDragonControls } from '../components/DragonControls';
import { Link } from '../components/Link';
import type { Ride } from '../lib/dragonFlight';
import { readPalette } from '../lib/palette';
import { formatTime } from '../lib/parapet';
import { usePilot } from '../lib/pilot';
import { PATHS } from '../lib/router';
import { useTheme } from '../lib/theme';
import { GATES, GHOST_STEP, loadRecord, recordRun, throughGate, type GhostSample } from '../lib/warGames';

// The 3D engine is large, so it only loads on the pages that use it.
const WarGamesScene = lazy(() => import('../scenes/WarGamesScene').then((m) => ({ default: m.WarGamesScene })));

type Screen = 'menu' | 'racing' | 'finished';

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function WarGamesPage() {
  const theme = useTheme();
  const palette = useMemo(readPalette, [theme]);
  const webgl = useMemo(hasWebGL, []);
  const pilot = usePilot();

  const [screen, setScreen] = useState<Screen>('menu');
  const [attempt, setAttempt] = useState(0);
  const [next, setNext] = useState(0);
  const [record, setRecord] = useState(loadRecord);
  const [result, setResult] = useState<{ time: number; newBest: boolean } | null>(null);

  const gate = useRef(0);
  /** Seconds of flight since the first gate, null before it: race time, not wall time. */
  const raceTime = useRef<number | null>(null);
  const path = useRef<GhostSample[]>([]);
  const clock = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLDivElement>(null);

  const racing = screen === 'racing';
  const controls = useDragonControls(racing, () => setScreen('menu'));

  const begin = () => {
    gate.current = 0;
    raceTime.current = null;
    path.current = [];
    setNext(0);
    setResult(null);
    setAttempt((n) => n + 1);
    setScreen('racing');
  };

  const finish = (ride: Ride) => {
    const time = raceTime.current!;
    path.current.push([ride.x, ride.y, ride.z, ride.heading]);
    const newBest = recordRun(time, path.current);
    setRecord(loadRecord());
    setResult({ time, newBest });
    setScreen('finished');
  };

  /** Every frame of the race: check the next gate, run the clock, and record the run for its ghost. */
  const onFrame = (ride: Ride, flown: number) => {
    // Lets a test autopilot in the browser console see the dragon during development.
    if (import.meta.env.DEV) (window as unknown as { __ride?: Ride }).__ride = ride;
    if (!racing || gate.current >= GATES.length) return;
    if (raceTime.current !== null) raceTime.current += flown;
    const i = gate.current;
    if (throughGate(ride, GATES[i])) {
      if (i === 0) raceTime.current = 0;
      gate.current = i + 1;
      setNext(i + 1);
      if (i + 1 === GATES.length) {
        finish(ride);
        return;
      }
    }
    if (raceTime.current === null) return;
    const t = raceTime.current;
    if (clock.current) clock.current.textContent = formatTime(t);
    // One sample per GHOST_STEP of race time, so the ghost replays in step with the clock.
    while (path.current.length <= t / GHOST_STEP) path.current.push([ride.x, ride.y, ride.z, ride.heading]);
  };

  const upcoming = GATES[Math.min(next, GATES.length - 1)];

  return (
    <div className={racing ? 'race-page racing' : 'race-page'}>
      <section className="race-stage" aria-label="War Games course">
        {webgl ? (
          <Suspense fallback={<p className="map-loading">Readying the course…</p>}>
            <WarGamesScene
              palette={palette}
              calm={calm()}
              racing={racing}
              attempt={attempt}
              next={next}
              input={controls.input}
              onFrame={onFrame}
              ghost={racing ? (record?.ghost ?? []) : []}
              clock={raceTime}
              marker={marker}
              pilot={pilot.colour}
            />
          </Suspense>
        ) : (
          <p className="map-loading">This browser can't draw 3D, so the War Games can't run here.</p>
        )}
        <div className="map-vignette" aria-hidden="true" />

        <div ref={marker} className="gate-marker" aria-hidden="true">
          <span className="gate-arrow" />
        </div>

        {racing && (
          <>
            <div className="ride-hud race-hud">
              <p className="kicker">War Games</p>
              <p className="race-clock">
                <span ref={clock}>0:00.0</span>
              </p>
              <p className="ride-stats" aria-live="polite">
                {next === 0 ? 'Fly through the first gate to start the clock' : `Gate ${next} of ${GATES.length} · next: ${upcoming.name}`}
              </p>
              {record && <p className="ride-stats">Best {formatTime(record.best)} · your ghost flies with you</p>}
            </div>
            <button type="button" className="chip land" onClick={() => setScreen('menu')}>
              Quit
            </button>
            <p className="ride-keys" aria-hidden="true">
              <kbd>A</kbd> <kbd>D</kbd> turn · <kbd>W</kbd> climb · <kbd>S</kbd> dive · <kbd>Shift</kbd> sprint · <kbd>Esc</kbd> quit
            </p>
          </>
        )}

        {screen === 'menu' && (
          <div className="stage-panel" role="dialog" aria-labelledby="war-title">
            <p className="kicker">The Trials · III</p>
            <h1 id="war-title">War Games</h1>
            <p className="lore">
              Twelve gates of light around Navarre: down into the Vale, low through the river gorge, over the northern pass
              and across the cliffs. The clock starts at the first gate.
            </p>
            <p className="muted small">
              Riding {pilot.name}.{' '}
              {!pilot.own && (
                <>
                  <Link href={PATHS.threshing}>Walk the Threshing</Link> to race your own dragon.
                </>
              )}
            </p>
            {record && <p className="race-best">Your best: {formatTime(record.best)}. Your ghost will race you.</p>}
            <ul className="how">
              <li>
                <kbd>A</kbd> <kbd>D</kbd> turn · <kbd>W</kbd> climb · <kbd>S</kbd> dive · <kbd>Shift</kbd> sprint
              </li>
              <li className="how-touch">On a phone: hold the buttons under the course.</li>
            </ul>
            <button type="button" className="button primary wide-button" onClick={begin} disabled={!webgl}>
              Begin the race
            </button>
          </div>
        )}

        {screen === 'finished' && result && (
          <div className="stage-panel" role="dialog" aria-labelledby="finish-title" aria-live="polite">
            <p className="kicker">{result.newBest ? 'New best' : 'Finished'}</p>
            <h1 id="finish-title">{formatTime(result.time)}</h1>
            <p className="lore">
              {result.newBest
                ? 'Your fastest run yet. Next time, its ghost flies the course beside you.'
                : `Your best is ${formatTime(record?.best ?? result.time)}. Race your ghost to beat it.`}
            </p>
            <button type="button" className="button primary wide-button" onClick={begin}>
              Race again
            </button>
            <div className="panel-links">
              <Link href={PATHS.trials} className="text-button">
                Back to the Trials
              </Link>
              <Link href={PATHS.map} className="text-button">
                Explore the map
              </Link>
            </div>
          </div>
        )}
      </section>

      {racing && <DragonButtons hold={controls.hold} />}
    </div>
  );
}
