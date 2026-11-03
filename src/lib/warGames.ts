import { heightAt } from './archiveMap';
import type { Ride } from './dragonFlight';

/**
 * War Games: a time trial through glowing gates around the Archive map. The
 * clock starts at the first gate and stops at the last. The best run is kept
 * as a ghost path so the reader can race it next time.
 */

export interface Gate {
  x: number;
  y: number;
  z: number;
  name: string;
}

/** Where each gate hangs: across the ground, height above it, and what the reader is flying past. */
const ROUTE: [number, number, number, string][] = [
  // At take-off height, dead ahead, so the clock starts the moment the reader sets off.
  [0, 36, 14, 'The start'],
  [0, 21, 7, 'The southern shore'],
  [-9, 9, 5, 'Down into the Vale'],
  [-19.5, 3, 3.5, 'The river gorge'],
  [-27, -7, 6, 'Over Calldyr'],
  [-22, -15, 5, 'The northern pass'],
  [-6, -17, 6, 'Montserrat'],
  [3, -9, 5, 'Along the wards'],
  // High before the cliffs and well past them, so there's room to climb over and dive down again.
  [5, 2, 9, 'Before the cliffs'],
  [19, 10, 11, 'Over to Athebyne'],
  [14, 22, 6, 'The eastern coast'],
  [2, 34, 8, 'The finish'],
];

export const GATES: Gate[] = ROUTE.map(([x, z, up, name]) => ({ x, z, y: Math.max(heightAt(x, z), 0) + up, name }));

/** How close to a gate's centre counts as flying through it. Generous: a dragon turns wide. */
export const GATE_RADIUS = 4;

export function throughGate(ride: Pick<Ride, 'x' | 'y' | 'z'>, gate: Gate): boolean {
  return Math.hypot(ride.x - gate.x, ride.y - gate.y, ride.z - gate.z) < GATE_RADIUS;
}

/* Ghosts: the best run, sampled ten times a second. */

export const GHOST_STEP = 0.1;

/** A sample: x, y, z and heading. */
export type GhostSample = [number, number, number, number];

/** Where the ghost is `t` seconds into its run, smoothly between samples; null once it has finished. */
export function ghostAt(path: GhostSample[], t: number): GhostSample | null {
  if (path.length === 0 || t < 0) return null;
  const i = t / GHOST_STEP;
  const a = Math.floor(i);
  if (a >= path.length - 1) return null;
  const f = i - a;
  const [ax, ay, az, ah] = path[a];
  const [bx, by, bz, bh] = path[a + 1];
  const turn = Math.atan2(Math.sin(bh - ah), Math.cos(bh - ah));
  return [ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f, ah + turn * f];
}

/* The reader's record, kept in the browser. */

export interface Record {
  best: number;
  ghost: GhostSample[];
}

const RECORD_KEY = 'scribe-archive:war-games';

export function parseRecord(raw: string | null | undefined): Record | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (typeof value !== 'object' || value === null) return null;
    const { best, ghost } = value as { best: unknown; ghost: unknown };
    if (typeof best !== 'number' || !Number.isFinite(best) || best <= 0 || !Array.isArray(ghost)) return null;
    const samples = ghost.filter(
      (s): s is GhostSample => Array.isArray(s) && s.length === 4 && s.every((n) => typeof n === 'number' && Number.isFinite(n)),
    );
    return { best, ghost: samples };
  } catch {
    return null;
  }
}

export function loadRecord(): Record | null {
  try {
    return parseRecord(localStorage.getItem(RECORD_KEY));
  } catch {
    return null;
  }
}

/** Saves a run if it beats the record; returns true when it does. */
export function recordRun(time: number, ghost: GhostSample[]): boolean {
  const current = loadRecord();
  if (current && current.best <= time) return false;
  try {
    // Two decimals is plenty and keeps the saved ghost small.
    const rounded = ghost.map((s) => s.map((n) => Math.round(n * 100) / 100) as GhostSample);
    localStorage.setItem(RECORD_KEY, JSON.stringify({ best: time, ghost: rounded }));
  } catch {
    // Still a best for this visit.
  }
  return true;
}
