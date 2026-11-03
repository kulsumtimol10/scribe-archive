import { seeded } from './seeded';
import type { Volumes } from './soundscape';

/**
 * Fly with Tairn: a flight told by scrolling. The page's scroll position is
 * one number from 0 to 1, and everything on screen (sky, weather, height,
 * sound) is read from it here, blended between six chapters. The words are the
 * Archive's own.
 */

export interface Chapter {
  id: string;
  name: string;
  title: string;
  text: string;
  /** Sky from the top of the screen to the horizon. */
  sky: [string, string, string];
  /** Rain, cloud and lightning, from 0 to 1. */
  storm: number;
  stars: number;
  /** How much the sunrise glows on the horizon, from 0 to 1. */
  dawn: number;
  /** Metres, for the readout and how far below the ground sits. */
  altitude: number;
  wind: string;
  status: string;
  sound: Pick<Volumes, 'wind' | 'wings' | 'rain' | 'thunder'>;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'basgiath',
    name: 'Basgiath',
    title: 'Hold on.',
    text: 'The war college falls away beneath you, towers first, then the walls. Every cadet down there is looking up.',
    sky: ['#0a1220', '#16233a', '#2c3a52'],
    storm: 0,
    stars: 1,
    dawn: 0,
    altitude: 120,
    wind: 'Calm',
    status: 'Clear night',
    sound: { wind: 0.25, wings: 0.7, rain: 0, thunder: 0 },
  },
  {
    id: 'vale',
    name: 'The Vale',
    title: 'Every eye is open.',
    text: 'The valley opens out below, dark with pines and darker with dragons. Not one of them looks away from you.',
    sky: ['#0b1424', '#1a2840', '#33415a'],
    storm: 0.05,
    stars: 0.9,
    dawn: 0,
    altitude: 300,
    wind: 'Light, westerly',
    status: 'Clear night',
    sound: { wind: 0.35, wings: 0.6, rain: 0, thunder: 0 },
  },
  {
    id: 'parapet',
    name: 'The Parapet',
    title: "Don't look down.",
    text: 'The bridge you crossed on foot is a thread from up here. Below it, the gorge. Ahead, the storm.',
    sky: ['#0a1220', '#121c2c', '#1c2433'],
    storm: 0.3,
    stars: 0.5,
    dawn: 0,
    altitude: 450,
    wind: 'North-east',
    status: 'Storm ahead',
    sound: { wind: 0.5, wings: 0.5, rain: 0.15, thunder: 0.2 },
  },
  {
    id: 'storm',
    name: 'The storm',
    title: 'Into the white.',
    text: 'Rain like gravel, wind like a wall. Lightning finds the clouds around you, and for a heartbeat everything goes white.',
    sky: ['#05070c', '#0c1018', '#161b25'],
    storm: 1,
    stars: 0,
    dawn: 0,
    altitude: 900,
    wind: 'Gale',
    status: 'In the storm',
    sound: { wind: 0.85, wings: 0.3, rain: 0.9, thunder: 0.9 },
  },
  {
    id: 'cliffs',
    name: 'The cliffs',
    title: 'Fold in. Dive.',
    text: 'The cliffs drop away in one long fall. Tuck in close and let the dragon do what dragons were made for.',
    sky: ['#0d1422', '#1e2a3e', '#3a4458'],
    storm: 0.25,
    stars: 0.3,
    dawn: 0.2,
    altitude: 250,
    wind: 'Gusting',
    status: 'Storm behind',
    sound: { wind: 0.7, wings: 0.2, rain: 0.15, thunder: 0.1 },
  },
  {
    id: 'border',
    name: 'The border',
    title: 'First light.',
    text: 'The wards hum at the edge of the kingdom, a shimmer across the whole sky. Beyond them, the sun is coming up.',
    sky: ['#1a2238', '#5a4a5e', '#d8915a'],
    storm: 0,
    stars: 0,
    dawn: 1,
    altitude: 600,
    wind: 'Easing',
    status: 'First light',
    sound: { wind: 0.3, wings: 0.6, rain: 0, thunder: 0 },
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Which chapter the reader is in, and how far through it (0 to just under 1). */
export function chapterAt(progress: number): { index: number; local: number } {
  const scaled = clamp01(progress) * CHAPTERS.length;
  const index = Math.min(CHAPTERS.length - 1, Math.floor(scaled));
  return { index, local: Math.min(0.9999, scaled - index) };
}

/** Where a chapter starts, as progress; used to scroll to it. */
export function chapterStart(index: number): number {
  return index / CHAPTERS.length;
}

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

/** Mixes two #rrggbb colours. */
export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const out = [0, 1, 2].map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * k));
  return `#${out.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export interface Moment {
  sky: [string, string, string];
  storm: number;
  stars: number;
  dawn: number;
  altitude: number;
  sound: Chapter['sound'];
}

/**
 * Everything on screen at one point of the flight. Each chapter's values hold
 * at its middle; between middles they ease from one to the next.
 */
export function momentAt(progress: number): Moment {
  const n = CHAPTERS.length;
  const position = clamp01(progress) * n - 0.5;
  const i = Math.max(0, Math.min(n - 2, Math.floor(position)));
  const t = smooth(clamp01(position - i));
  const a = CHAPTERS[i];
  const b = CHAPTERS[i + 1];
  const lerp = (x: number, y: number) => x + (y - x) * t;
  return {
    sky: [0, 1, 2].map((k) => mixHex(a.sky[k], b.sky[k], t)) as [string, string, string],
    storm: lerp(a.storm, b.storm),
    stars: lerp(a.stars, b.stars),
    dawn: lerp(a.dawn, b.dawn),
    altitude: lerp(a.altitude, b.altitude),
    sound: {
      wind: lerp(a.sound.wind, b.sound.wind),
      wings: lerp(a.sound.wings, b.sound.wings),
      rain: lerp(a.sound.rain, b.sound.rain),
      thunder: lerp(a.sound.thunder, b.sound.thunder),
    },
  };
}

/**
 * A mountain ridge as a closed SVG path across `width`, its peaks between
 * `top` and `bottom` and filled down to `floor`. The same seed draws the same ridge.
 */
export function ridgePath(seed: number, width: number, top: number, bottom: number, floor: number, step = 80): string {
  const random = seeded(seed);
  const points: string[] = [`M0,${floor}`];
  for (let x = 0; x <= width; x += step) {
    const jitter = x === 0 || x >= width ? 0 : (random() - 0.5) * step * 0.6;
    const y = top + random() * (bottom - top);
    points.push(`L${Math.round(Math.min(width, x + jitter))},${Math.round(y)}`);
  }
  points.push(`L${width},${floor}`, 'Z');
  return points.join(' ');
}
