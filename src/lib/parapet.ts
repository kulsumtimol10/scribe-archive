/**
 * Cross the Parapet: keep your balance on a narrow bridge over a gorge while
 * gusts try to knock you off. Pure simulation, no drawing: the page feeds it
 * input and time, then draws whatever state comes back.
 *
 * Lean is in radians, positive to the right. Left alone, any lean grows (the
 * bridge is narrow); leaning the other way pulls you back; walking wobbles.
 */

export type Weather = 'clear' | 'rain' | 'storm';

export const WEATHER: Record<
  Weather,
  { name: string; gustEvery: [number, number]; gustForce: number; wobble: number; rain: number; lightning: boolean }
> = {
  clear: { name: 'Clear', gustEvery: [8, 12], gustForce: 2.6, wobble: 0.6, rain: 0, lightning: false },
  rain: { name: 'Rain', gustEvery: [5.5, 9], gustForce: 3.1, wobble: 0.9, rain: 0.55, lightning: false },
  storm: { name: 'Storm', gustEvery: [3.5, 6.5], gustForce: 3.7, wobble: 1.2, rain: 1, lightning: true },
};

export interface Input {
  /** -1 lean left, 1 lean right. */
  lean: -1 | 0 | 1;
  walk: boolean;
  /** Plant your feet: you stop walking, but gusts and wobbles barely move you. */
  brace: boolean;
}

export const IDLE: Input = { lean: 0, walk: false, brace: false };

export type Gust =
  | { phase: 'calm'; next: number }
  | { phase: 'warning'; dir: -1 | 1; left: number }
  | { phase: 'blowing'; dir: -1 | 1; left: number };

export interface Crossing {
  weather: Weather;
  status: 'playing' | 'fallen' | 'crossed';
  /** 0 at the near cliff, 1 at the far one. */
  progress: number;
  lean: number;
  spin: number;
  /** Seconds since the start. */
  time: number;
  /** Phase of the walking step cycle, for drawing legs and the sway it causes. */
  stride: number;
  /** The wind pushing right now, after bracing. */
  wind: number;
  gust: Gust;
}

const TOPPLE = 2.4;
const CONTROL = 6;
const DAMPING = 1.8;
const WALK_SPEED = 1 / 28;
export const FALL_AT = 0.95;
const WARNING = 1.6;
const BLOW = 1.5;
const STEP = 1 / 120;

const between = (random: () => number, [min, max]: [number, number]) => min + random() * (max - min);

export function start(weather: Weather, random: () => number): Crossing {
  return {
    weather,
    status: 'playing',
    progress: 0,
    lean: (random() - 0.5) * 0.06,
    spin: 0,
    time: 0,
    stride: 0,
    wind: 0,
    gust: { phase: 'calm', next: between(random, WEATHER[weather].gustEvery) },
  };
}

function nextGust(gust: Gust, dt: number, weather: Weather, random: () => number): Gust {
  if (gust.phase === 'calm') {
    const next = gust.next - dt;
    return next > 0 ? { ...gust, next } : { phase: 'warning', dir: random() < 0.5 ? -1 : 1, left: WARNING };
  }
  const left = gust.left - dt;
  if (left > 0) return { ...gust, left };
  return gust.phase === 'warning'
    ? { phase: 'blowing', dir: gust.dir, left: BLOW }
    : { phase: 'calm', next: between(random, WEATHER[weather].gustEvery) };
}

/** Runs the crossing forward by `dt` seconds, in small fixed steps so it behaves the same at any frame rate. */
export function advance(crossing: Crossing, input: Input, dt: number, random: () => number): Crossing {
  let c = crossing;
  let remaining = Math.min(dt, 0.1);
  while (remaining > 1e-9 && c.status === 'playing') {
    const h = Math.min(STEP, remaining);
    remaining -= h;

    const w = WEATHER[c.weather];
    const gust = nextGust(c.gust, h, c.weather, random);
    // A gust swells and fades rather than switching on and off.
    const swell = gust.phase === 'blowing' ? Math.sin((Math.PI * (BLOW - gust.left)) / BLOW) : 0;
    const wind = gust.phase === 'blowing' ? gust.dir * w.gustForce * swell * (input.brace ? 0.35 : 1) : 0;

    const walking = input.walk && !input.brace;
    const stride = walking ? c.stride + h * 7 : c.stride;
    const wobble = walking
      ? (Math.sin(stride) * 0.8 + (random() - 0.5) * 2.4) * w.wobble
      : (random() - 0.5) * 0.4 * w.wobble * (input.brace ? 0.3 : 1);

    const accel =
      TOPPLE * Math.sin(c.lean) +
      wind +
      wobble +
      CONTROL * input.lean * (input.brace ? 0.6 : 1) -
      DAMPING * (input.brace ? 2.5 : 1) * c.spin;
    const spin = c.spin + accel * h;
    const lean = c.lean + spin * h;
    const progress = Math.min(1, c.progress + (walking ? WALK_SPEED * h : 0));

    const status = Math.abs(lean) > FALL_AT ? 'fallen' : progress >= 1 ? 'crossed' : 'playing';
    c = { ...c, status, progress, lean, spin, stride, wind, gust, time: c.time + h };
  }
  return c;
}

/** "0:47.3" */
export function formatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths % 600) / 10;
  return `${minutes}:${rest.toFixed(1).padStart(4, '0')}`;
}

/* Best crossing times per weather, kept in the browser. */

export type BestTimes = Partial<Record<Weather, number>>;
const BEST_KEY = 'scribe-archive:parapet';

export function parseBest(raw: string | null | undefined): BestTimes {
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (typeof value !== 'object' || value === null) return {};
    const best: BestTimes = {};
    for (const weather of Object.keys(WEATHER) as Weather[]) {
      const time = (value as Record<string, unknown>)[weather];
      if (typeof time === 'number' && Number.isFinite(time) && time > 0) best[weather] = time;
    }
    return best;
  } catch {
    return {};
  }
}

export function loadBest(): BestTimes {
  try {
    return parseBest(localStorage.getItem(BEST_KEY));
  } catch {
    return {};
  }
}

/** Records a crossing; returns true if it beat the previous best for that weather. */
export function recordCrossing(weather: Weather, seconds: number): boolean {
  const best = loadBest();
  const previous = best[weather];
  if (previous !== undefined && previous <= seconds) return false;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify({ ...best, [weather]: seconds }));
  } catch {
    // Still a new best for this visit.
  }
  return true;
}
