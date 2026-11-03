/**
 * Riding a dragon over the Archive map. Pure simulation: the scene feeds it
 * input and time each frame and draws the result. The dragon always flies
 * forward; the reader banks to turn, pitches to climb or dive, and can sprint.
 *
 * Heading is the yaw in radians, with the dragon facing (sin h, 0, cos h);
 * heading π points north (−z).
 */

export interface FlightInput {
  /** −1 turn left … 1 turn right. */
  turn: number;
  /** −1 dive … 1 climb. */
  climb: number;
  boost: boolean;
}

export const STILL: FlightInput = { turn: 0, climb: 0, boost: false };

export interface Ride {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  bank: number;
  speed: number;
  /** True while the wards are turning the dragon back toward the island. */
  turnedBack: boolean;
}

const CRUISE = 9;
const SPRINT = 17;
const TURN_RATE = 1.15;
const MAX_PITCH = 0.55;
const MAX_BANK = 0.65;
/** Height kept above the ground or sea, so the dragon never clips the land. */
export const CLEARANCE = 2.4;
export const CEILING = 46;
/** Beyond this distance from the island's centre the dragon is steered home. */
export const EDGE = 60;

/** Starts out over the southern sea, heading north toward the island. */
export function takeOff(): Ride {
  return { x: 0, y: 14, z: 50, heading: Math.PI, pitch: 0, bank: 0, speed: CRUISE, turnedBack: false };
}

const approach = (value: number, target: number, rate: number, dt: number) => value + (target - value) * Math.min(1, rate * dt);

/** Wraps an angle into −π…π. */
function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** The most flight one frame can cover; a long stall (a backgrounded tab) can't fling the dragon across the map. */
export const MAX_STEP = 0.1;

/** Advances the ride by `dt` seconds. `groundAt` gives the land height (sea is 0). */
export function fly(ride: Ride, input: FlightInput, dt: number, groundAt: (x: number, z: number) => number): Ride {
  const step = Math.min(dt, MAX_STEP);
  const turn = Math.max(-1, Math.min(1, input.turn));
  const climb = Math.max(-1, Math.min(1, input.climb));

  let heading = ride.heading - turn * TURN_RATE * step;
  const bank = approach(ride.bank, turn * MAX_BANK, 4, step);
  let pitch = approach(ride.pitch, climb * MAX_PITCH, 3, step);
  const speed = approach(ride.speed, input.boost ? SPRINT : CRUISE, 2, step);

  // Out past the edge, the wards ease the dragon round to face home.
  const distance = Math.hypot(ride.x, ride.z);
  const turnedBack = distance > EDGE;
  if (turnedBack) {
    const home = Math.atan2(-ride.x, -ride.z);
    heading += wrap(home - heading) * Math.min(1, ((distance - EDGE) / 8) * 1.6 * step);
  }

  let x = ride.x + Math.sin(heading) * Math.cos(pitch) * speed * step;
  let z = ride.z + Math.cos(heading) * Math.cos(pitch) * speed * step;
  let y = ride.y + Math.sin(pitch) * speed * step;

  const floor = Math.max(groundAt(x, z), 0) + CLEARANCE;
  if (y < floor) {
    y = floor;
    pitch = Math.max(pitch, 0.15);
  }
  if (y > CEILING) {
    y = CEILING;
    pitch = Math.min(pitch, 0);
  }
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    x = ride.x;
    z = ride.z;
  }

  return { x, y, z, heading: wrap(heading), pitch, bank, speed, turnedBack };
}

/** The place within reach of the dragon, if any (measured across the ground, ignoring height). */
export function placeInReach<P extends { id: string; x: number; z: number }>(ride: Ride, places: P[], reach = 7): P | null {
  let best: P | null = null;
  let bestDistance = reach;
  for (const place of places) {
    const d = Math.hypot(place.x - ride.x, place.z - ride.z);
    if (d < bestDistance) {
      best = place;
      bestDistance = d;
    }
  }
  return best;
}

/* Which places a reader has found from the air, kept between visits. */

const FOUND_KEY = 'scribe-archive:found';

export function parseFound(raw: string | null | undefined, known: string[]): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && known.includes(id)))] : [];
  } catch {
    return [];
  }
}

export function loadFound(known: string[]): string[] {
  try {
    return parseFound(localStorage.getItem(FOUND_KEY), known);
  } catch {
    return [];
  }
}

export function saveFound(found: string[]): void {
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify(found));
  } catch {
    // Still counted for this visit.
  }
}
