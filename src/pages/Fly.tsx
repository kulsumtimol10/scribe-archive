import { useEffect, useMemo, useRef, useState } from 'react';
import { Dragon } from '../components/art/Dragon';
import { FlightWorld, PARALLAX, SHIFT } from '../components/art/FlightWorld';
import { Link } from '../components/Link';
import { PATHS } from '../lib/router';
import { CHAPTERS, chapterAt, momentAt } from '../lib/scrollFlight';
import { Soundscape, type Volumes } from '../lib/soundscape';
import { choose, COLOURS, loadBond } from '../lib/threshing';

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** How far each layer sinks per metre climbed, so the ground drops away as the dragon rises. */
const SINK = { far: 0.08, mid: 0.2, near: 0.42, mist: 0.3 } as const;

const volumesAt = (progress: number): Volumes => ({ ...momentAt(progress).sound, hearth: 0, quills: 0 });

export function FlyPage() {
  const bond = useMemo(() => {
    const saved = loadBond();
    return saved ? choose(saved.answers, saved.rider) : null;
  }, []);
  const [own, setOwn] = useState(false);
  const dragonName = own && bond ? bond.dragonName : 'Tairn';
  const colours = own && bond ? COLOURS[bond.colour].art : COLOURS.black.art;

  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragon = useRef<HTMLDivElement>(null);
  const altitude = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const engine = useRef<Soundscape | null>(null);
  const [chapter, setChapter] = useState(0);
  const [started, setStarted] = useState(false);
  const [sound, setSound] = useState(false);

  /** How far through the flight the page is scrolled, from 0 to 1. */
  const progressOf = () => {
    const el = track.current;
    if (!el) return 0;
    const total = el.offsetHeight - window.innerHeight;
    return total > 0 ? clamp(-el.getBoundingClientRect().top / total, 0, 1) : 0;
  };

  // One loop for the page's lifetime: read the scroll, move the world, bank the dragon.
  useEffect(() => {
    const svg = stage.current?.querySelector<SVGSVGElement>('svg.fly-world');
    if (!svg) return;
    const layer = (name: string) => svg.querySelector<SVGElement>(`[data-layer="${name}"]`)!;
    const moving = { far: layer('far'), mid: layer('mid'), near: layer('near'), mist: layer('mist') };
    const [stars, moon, dawn, sun, clouds, rain, bolt, flash] = ['stars', 'moon', 'dawn', 'sun', 'clouds', 'rain', 'bolt', 'flash'].map(layer);
    const stops = [...svg.querySelectorAll<SVGStopElement>('[data-stop]')];
    const still = calm();

    let frame = 0;
    let lastProgress = -1;
    let lastChapter = -1;
    let lastY = window.scrollY;
    let bank = 0;
    let heard = '';
    let nextStrike = performance.now() + 2500;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const p = progressOf();
      const climb = window.scrollY - lastY;
      lastY = window.scrollY;

      if (p !== lastProgress) {
        lastProgress = p;
        const m = momentAt(p);
        for (const key of Object.keys(moving) as (keyof typeof moving)[]) {
          moving[key].setAttribute('transform', `translate(${(-p * SHIFT * PARALLAX[key]).toFixed(1)} ${((m.altitude - 300) * SINK[key]).toFixed(1)})`);
        }
        m.sky.forEach((colour, i) => stops[i]?.setAttribute('stop-color', colour));
        stars.setAttribute('opacity', m.stars.toFixed(3));
        moon.setAttribute('opacity', ((1 - m.storm * 0.9) * (1 - m.dawn)).toFixed(3));
        dawn.setAttribute('opacity', m.dawn.toFixed(3));
        sun.setAttribute('transform', `translate(0 ${((1 - m.dawn) * 160).toFixed(1)})`);
        clouds.setAttribute('opacity', (m.storm * 0.95).toFixed(3));
        rain.setAttribute('opacity', m.storm.toFixed(3));
        if (altitude.current) altitude.current.textContent = `${Math.round(m.altitude)} m`;
        if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`;
        const { index } = chapterAt(p);
        if (index !== lastChapter) {
          lastChapter = index;
          setChapter(index);
        }
        if (p > 0.004) setStarted(true);

        const mix = volumesAt(p);
        const key = Object.values(mix).map((v) => v.toFixed(2)).join();
        if (engine.current && key !== heard) {
          heard = key;
          engine.current.setVolumes(mix);
        }
      }

      // Nose down while the flight descends, up while it climbs, and a little lean with the scroll.
      const ahead = momentAt(clamp(p + 0.01, 0, 1)).altitude;
      const behind = momentAt(clamp(p - 0.01, 0, 1)).altitude;
      const target = clamp((behind - ahead) * 0.12, -14, 14) + clamp(climb * 0.04, -4, 4);
      bank += (target - bank) * 0.08;
      if (dragon.current) dragon.current.style.transform = `rotate(${bank.toFixed(2)}deg)`;

      // Lightning, now and then, while the storm is heavy.
      const storm = momentAt(p).storm;
      if (!still && storm > 0.6 && now > nextStrike) {
        nextStrike = now + 2500 + Math.random() * 4500;
        for (const el of [bolt, flash]) {
          el.classList.remove('striking');
          void el.getBoundingClientRect();
          el.classList.add('striking');
        }
        const sky = engine.current;
        if (sky) window.setTimeout(() => sky.strike(), 350);
      }
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Let go of the audio device when the reader leaves.
  useEffect(() => () => engine.current?.dispose(), []);

  const toggleSound = () => {
    if (engine.current) {
      void engine.current.fadeOut(1);
      engine.current = null;
      setSound(false);
      return;
    }
    engine.current = Soundscape.create(volumesAt(progressOf()));
    setSound(Boolean(engine.current));
  };

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY + ((i + 0.5) / CHAPTERS.length) * total;
    window.scrollTo({ top, behavior: calm() ? 'auto' : 'smooth' });
  };

  const c = CHAPTERS[chapter];

  return (
    <div className="fly">
      <div ref={track} className="fly-track" style={{ height: `${(CHAPTERS.length + 1) * 100}svh` }}>
        <div ref={stage} className="fly-stage">
          <FlightWorld />

          <div ref={dragon} className="fly-dragon" aria-hidden="true">
            <div className="fly-bob">
              <svg viewBox="0 0 600 240">
                <Dragon colours={colours} rimOpacity={0.7} />
              </svg>
            </div>
          </div>

          <div className="fly-tools">
            <h1 className="fly-title">Fly with {dragonName}</h1>
            <div className="fly-buttons">
              {bond && (
                <div className="chips" role="group" aria-label="Your dragon for this flight">
                  <button type="button" className="chip" aria-pressed={!own} onClick={() => setOwn(false)}>
                    Tairn
                  </button>
                  <button type="button" className="chip" aria-pressed={own} onClick={() => setOwn(true)}>
                    {bond.dragonName}
                  </button>
                </div>
              )}
              <button type="button" className="fly-sound" aria-pressed={sound} onClick={toggleSound}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 7h3l4-3v10l-4-3H3z" />
                  {sound ? <path d="M13 6c1.2 1.6 1.2 4.4 0 6" /> : <path d="M13 7l4 4M17 7l-4 4" />}
                </svg>
                {sound ? 'Sound on' : 'Sound off'}
              </button>
            </div>
          </div>

          <div key={c.id} className="fly-copy" aria-live="polite">
            <p className="kicker">
              Chapter {String(chapter + 1).padStart(2, '0')} · {c.name}
            </p>
            <h2>{c.title}</h2>
            <p className="lore">{c.text}</p>
          </div>

          <nav className="fly-chapters" aria-label="Chapters">
            {CHAPTERS.map((ch, i) => (
              <button
                key={ch.id}
                type="button"
                className={i === chapter ? 'fly-chapter current' : i < chapter ? 'fly-chapter passed' : 'fly-chapter'}
                aria-current={i === chapter ? 'step' : undefined}
                onClick={() => goTo(i)}
              >
                <span className="fly-chapter-name">{ch.name}</span>
                <span className="fly-dot" aria-hidden="true" />
              </button>
            ))}
          </nav>

          {!started && (
            <p className="fly-hint" aria-hidden="true">
              <svg width="18" height="28" viewBox="0 0 18 28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="16" height="26" rx="8" />
                <path className="fly-hint-wheel" d="M9 7v6" />
              </svg>
              Scroll to fly
            </p>
          )}

          <div className="fly-hud">
            <div className="fly-readouts">
              <span>
                Altitude · <span ref={altitude}>{CHAPTERS[0].altitude} m</span>
              </span>
              <span>Wind · {c.wind}</span>
              <span className={c.storm > 0.5 ? 'fly-status stormy' : 'fly-status'}>{c.status}</span>
            </div>
            <div className="fly-bar" aria-hidden="true">
              <span ref={bar} />
            </div>
          </div>
        </div>
      </div>

      <section className="page-section fly-end" aria-labelledby="fly-end-title">
        <p className="kicker">The end of the flight</p>
        <h2 id="fly-end-title" className="section-title">
          You crossed the whole kingdom.
        </h2>
        <p className="lore">Next time, take the reins yourself.</p>
        <div className="actions">
          <Link href={PATHS.map} className="button primary">
            Fly the map yourself
          </Link>
          {bond ? (
            <Link href={PATHS.warGames} className="button">
              Race the War Games
            </Link>
          ) : (
            <Link href={PATHS.threshing} className="button">
              Find your own dragon
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
