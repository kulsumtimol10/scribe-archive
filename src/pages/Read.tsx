import { useEffect, useRef, useState } from 'react';
import { formatRemaining, PRESETS, presetOf, Soundscape, TRACKS, type PresetName, type TrackId, type Volumes } from '../lib/soundscape';

const TIMERS = [0, 15, 25, 45, 60];

/** Rain on the window gets heavier with the rain slider; the candle glows with the hearth. */
function WindowScene({ volumes, playing }: { volumes: Volumes; playing: boolean }) {
  const drops = Array.from({ length: 46 }, (_, i) => ({ x: 190 + ((i * 97) % 440), y: 120 + ((i * 151) % 700) }));
  return (
    <svg className="window-scene" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <clipPath id="window-glass">
          <path d="M200,820 L200,330 C200,200 300,130 400,130 C500,130 600,200 600,330 L600,820 Z" />
        </clipPath>
        <filter id="window-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
      </defs>
      <rect width="800" height="900" style={{ fill: 'var(--panel)' }} />
      <g clipPath="url(#window-glass)">
        <rect x="180" y="120" width="440" height="720" style={{ fill: 'var(--sky-mid)' }} />
        <ellipse cx="470" cy="260" rx="160" ry="120" style={{ fill: 'var(--glow)' }} opacity={0.18 + volumes.thunder * 0.2} filter="url(#window-glow)" />
        <path
          d="M180,640 L240,520 L270,540 L270,440 L300,410 L330,440 L330,560 L380,500 L420,520 L420,380 L445,340 L470,380 L470,540 L520,490 L560,560 L620,520 L620,840 L180,840 Z"
          style={{ fill: 'var(--ridge-3)' }}
        />
        <rect x="440" y="420" width="10" height="16" style={{ fill: 'var(--accent)' }} opacity="0.7" />
        <rect x="300" y="470" width="8" height="12" style={{ fill: 'var(--accent)' }} opacity="0.5" />
        <g className={playing ? 'rain falling' : 'rain'} opacity={0.12 + volumes.rain * 0.88}>
          {drops.map((d) => (
            <path key={`${d.x}-${d.y}`} d={`M${d.x},${d.y} l-6,26`} style={{ stroke: 'var(--rain)' }} strokeOpacity="0.5" strokeWidth="1.2" />
          ))}
        </g>
      </g>
      <path d="M200,820 L200,330 C200,200 300,130 400,130 C500,130 600,200 600,330 L600,820" fill="none" style={{ stroke: 'var(--frame)' }} strokeWidth="28" />
      <path d="M400,130 L400,820 M200,480 L600,480" style={{ stroke: 'var(--frame)' }} strokeWidth="10" />
      <rect x="150" y="820" width="500" height="30" style={{ fill: 'var(--frame)' }} />
      <ellipse cx="560" cy="790" rx="130" ry="85" style={{ fill: 'var(--accent)' }} opacity={0.05 + volumes.hearth * 0.22} filter="url(#window-glow)" />
      <rect x="548" y="770" width="24" height="50" rx="3" style={{ fill: 'var(--ink)' }} />
      <path className="flame" d="M560,770 C552,758 556,744 560,736 C564,744 568,758 560,770 Z" style={{ fill: 'var(--flame)' }} />
      <path d="M260,820 L330,800 L400,812 L470,800 L540,820" style={{ fill: 'var(--soft)' }} />
    </svg>
  );
}

export function ReadPage() {
  const engine = useRef<Soundscape | null>(null);
  const [volumes, setVolumes] = useState<Volumes>(PRESETS['Storm night']);
  const [playing, setPlaying] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Leaving the page stops the sound.
  useEffect(() => () => engine.current?.dispose(), []);

  // The reading timer ticks once a second and fades the sound out when it ends.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= endsAt) {
        void engine.current?.fadeOut(8);
        engine.current = null;
        setPlaying(false);
        setEndsAt(null);
      }
    }, 1000);
    return () => window.clearInterval(tick);
  }, [endsAt]);

  const preset = presetOf(volumes);

  const changeVolume = (id: TrackId, value: number) => {
    setVolumes((v) => ({ ...v, [id]: value }));
    engine.current?.setVolume(id, value);
  };

  const choosePreset = (name: PresetName) => {
    setVolumes(PRESETS[name]);
    engine.current?.setVolumes(PRESETS[name]);
  };

  const startTimer = (minutes: number) => {
    setTimerMinutes(minutes);
    setNow(Date.now());
    setEndsAt(minutes > 0 ? Date.now() + minutes * 60_000 : null);
  };

  const toggle = () => {
    if (playing) {
      void engine.current?.fadeOut(1.2);
      engine.current = null;
      setPlaying(false);
      setEndsAt(null);
      return;
    }
    const sound = Soundscape.create(volumes);
    if (!sound) {
      setUnsupported(true);
      return;
    }
    engine.current = sound;
    setPlaying(true);
    if (timerMinutes > 0) startTimer(timerMinutes);
  };

  return (
    <div className="read-page">
      <section className="read-scene">
        <WindowScene volumes={volumes} playing={playing} />
        <p className="read-scene-caption">Now playing · {playing ? (preset ?? 'Your own mix') : 'Paused'}</p>
      </section>

      <section className="read-panel" aria-labelledby="read-title">
        <div className="stack-tight">
          <p className="kicker">Read with Basgiath</p>
          <h1 id="read-title">Keep the storm on while you read.</h1>
          <p className="lore">Mix your own Basgiath. Every sound is made live in your browser, so it never repeats.</p>
        </div>

        <div className="chips" role="group" aria-label="Presets">
          {(Object.keys(PRESETS) as PresetName[]).map((name) => (
            <button key={name} type="button" className="chip" aria-pressed={preset === name} onClick={() => choosePreset(name)}>
              {name}
            </button>
          ))}
        </div>

        <div className="mixer">
          {TRACKS.map((track) => (
            <label key={track.id} className="mixer-row">
              <span className="mixer-label">
                <span>{track.name}</span>
                <span className="muted">{Math.round(volumes[track.id] * 100)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volumes[track.id] * 100)}
                onChange={(e) => changeVolume(track.id, Number(e.target.value) / 100)}
              />
            </label>
          ))}
        </div>

        <button type="button" className="button primary wide-button play" aria-pressed={playing} onClick={toggle}>
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="3" y="2" width="3.5" height="12" />
              <rect x="9.5" y="2" width="3.5" height="12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M4 2l10 6-10 6z" />
            </svg>
          )}
          {playing ? 'Pause' : 'Play'}
        </button>
        {unsupported && <p className="notice">This browser can't play generated sound. Try Chrome, Safari or Firefox.</p>}

        <div className="timer">
          <label className="timer-pick">
            <span className="kicker muted-kicker">Reading timer</span>
            <select value={timerMinutes} onChange={(e) => (playing ? startTimer(Number(e.target.value)) : setTimerMinutes(Number(e.target.value)))}>
              {TIMERS.map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Off' : `${m} minutes`}
                </option>
              ))}
            </select>
          </label>
          <p className="timer-left" aria-live="polite">
            {endsAt !== null ? formatRemaining(endsAt - now) : timerMinutes > 0 ? formatRemaining(timerMinutes * 60_000) : '—'}
          </p>
        </div>
        <p className="muted small">Sound fades out gently when the timer ends.</p>
      </section>
    </div>
  );
}
