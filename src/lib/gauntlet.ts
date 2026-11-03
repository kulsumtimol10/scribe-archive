/**
 * The Gauntlet: a timed climb up a rock face in three sections. The climber
 * grabs holds one at a time, left or right. A wrong grab slips back a hold;
 * grabbing into falling rock or the swinging log knocks them down three.
 * Each day has its own wall, so there's a new course (and a new best) daily.
 * Pure rules, no drawing.
 */

export type Side = 'left' | 'right';
export type Section = 'wall' | 'rockfall' | 'log';

export interface Hold {
  side: Side;
  section: Section;
}

export const SECTIONS: { id: Section; name: string; from: number }[] = [
  { id: 'wall', name: 'The wall', from: 0 },
  { id: 'rockfall', name: 'Rockfall', from: 16 },
  { id: 'log', name: 'The log', from: 32 },
];

export const HOLDS = 48;

/** Mulberry32: repeatable randomness from a seed. */
function seeded(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's wall, by local date: 20261103 for 3 November 2026. */
export function dailySeed(date: Date = new Date()): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export function sectionOf(index: number): Section {
  return [...SECTIONS].reverse().find((s) => index >= s.from)!.id;
}

/** The day's holds: mostly alternating, with the occasional double so nobody climbs on autopilot. */
export function makeCourse(seed: number): Hold[] {
  const random = seeded(seed);
  const holds: Hold[] = [];
  let side: Side = random() < 0.5 ? 'left' : 'right';
  let run = 1;
  for (let i = 0; i < HOLDS; i++) {
    if (i > 0) {
      const repeat = run < 2 && random() < 0.3;
      if (repeat) run++;
      else {
        side = side === 'left' ? 'right' : 'left';
        run = 1;
      }
    }
    holds.push({ side, section: sectionOf(i) });
  }
  return holds;
}

export interface Hazard {
  side: Side;
  phase: 'warning' | 'danger';
}

const ROCK_CYCLE = 2.2;
const ROCK_WARNING = 0.9;
const ROCK_DANGER = 0.6;
const LOG_PERIOD = 2.4;
const LOG_WARNING = 0.5;
const LOG_DANGER = 0.5;

/**
 * What threatens the climber `t` seconds after they entered a section.
 * Rockfall: a warning, then rocks down one side, then a breath of quiet.
 * The log: a steady pendulum, sweeping the left then the right.
 */
export function hazardAt(section: Section, t: number, seed: number): Hazard | null {
  if (t < 0 || section === 'wall') return null;
  if (section === 'rockfall') {
    const cycle = Math.floor(t / ROCK_CYCLE);
    const into = t - cycle * ROCK_CYCLE;
    const side: Side = seeded(seed + cycle * 7919)() < 0.5 ? 'left' : 'right';
    if (into < ROCK_WARNING) return { side, phase: 'warning' };
    if (into < ROCK_WARNING + ROCK_DANGER) return { side, phase: 'danger' };
    return null;
  }
  const into = t % LOG_PERIOD;
  const half = LOG_PERIOD / 2;
  for (const [side, at] of [
    ['left', 0.6],
    ['right', 0.6 + half],
  ] as [Side, number][]) {
    if (into >= at - LOG_WARNING && into < at) return { side, phase: 'warning' };
    if (into >= at && into < at + LOG_DANGER) return { side, phase: 'danger' };
  }
  return null;
}

/** Where the log is in its swing, −1 (far left) … 1 (far right), for drawing. */
export function logSwing(t: number): number {
  return -Math.cos((2 * Math.PI * (t - 0.6)) / LOG_PERIOD);
}

export interface Climb {
  seed: number;
  course: Hold[];
  /** The next hold to grab; HOLDS when at the top. */
  index: number;
  time: number;
  /** No grabs count until this time: the climber is recovering from a slip or a knock. */
  stunnedUntil: number;
  /** Still pulling up to the last hold; grabs before this are ignored rather than counted as slips. */
  reachingUntil: number;
  /** When the climber first reached each section, for timing its hazards. */
  entered: Partial<Record<Section, number>>;
  slips: number;
  knocks: number;
  /** The last thing that happened, for the drawing and the screen reader. */
  last: 'start' | 'grab' | 'slip' | 'knock' | 'top';
}

export function startClimb(seed: number): Climb {
  return { seed, course: makeCourse(seed), index: 0, time: 0, stunnedUntil: 0, reachingUntil: 0, entered: { wall: 0 }, slips: 0, knocks: 0, last: 'start' };
}

/** How long pulling up to a hold takes: the fastest anyone can climb. */
export const REACH = 0.22;
export const SLIP_STUN = 0.5;
export const KNOCK_STUN = 1;
export const KNOCK_DROP = 3;

export function finished(climb: Climb): boolean {
  return climb.index >= HOLDS;
}

/** The hazard the climber faces right now, if any. */
export function currentHazard(climb: Climb): Hazard | null {
  if (finished(climb)) return null;
  const section = sectionOf(climb.index);
  const entered = climb.entered[section];
  return entered === undefined ? null : hazardAt(section, climb.time - entered, climb.seed);
}

export function tick(climb: Climb, dt: number): Climb {
  return finished(climb) ? climb : { ...climb, time: climb.time + Math.min(dt, 0.1) };
}

/** The climber reaches for a hold on one side. */
export function grab(climb: Climb, side: Side): Climb {
  if (finished(climb) || climb.time < climb.stunnedUntil || climb.time < climb.reachingUntil) return climb;
  const hazard = currentHazard(climb);
  if (hazard?.phase === 'danger' && hazard.side === side) {
    const floor = SECTIONS.find((s) => s.id === sectionOf(climb.index))!.from;
    return {
      ...climb,
      index: Math.max(floor, climb.index - KNOCK_DROP),
      stunnedUntil: climb.time + KNOCK_STUN,
      knocks: climb.knocks + 1,
      last: 'knock',
    };
  }
  if (climb.course[climb.index].side !== side) {
    return {
      ...climb,
      index: Math.max(0, climb.index - 1),
      stunnedUntil: climb.time + SLIP_STUN,
      slips: climb.slips + 1,
      last: 'slip',
    };
  }
  const index = climb.index + 1;
  const entered = { ...climb.entered };
  if (index < HOLDS) {
    const section = sectionOf(index);
    if (entered[section] === undefined) entered[section] = climb.time;
  }
  return { ...climb, index, entered, reachingUntil: climb.time + REACH, last: index >= HOLDS ? 'top' : 'grab' };
}

/* Best times: today's wall, and the fastest ever. */

export interface GauntletRecords {
  /** Best time per daily seed; only the last fortnight is kept. */
  days: Record<string, number>;
  best?: number;
}

const RECORDS_KEY = 'scribe-archive:gauntlet';

export function parseRecords(raw: string | null | undefined): GauntletRecords {
  try {
    const value = raw ? (JSON.parse(raw) as unknown) : null;
    if (typeof value !== 'object' || value === null) return { days: {} };
    const { days, best } = value as { days?: unknown; best?: unknown };
    const clean: Record<string, number> = {};
    if (typeof days === 'object' && days !== null) {
      for (const [seed, time] of Object.entries(days)) {
        if (/^\d{8}$/.test(seed) && typeof time === 'number' && Number.isFinite(time) && time > 0) clean[seed] = time;
      }
    }
    return { days: clean, best: typeof best === 'number' && Number.isFinite(best) && best > 0 ? best : undefined };
  } catch {
    return { days: {} };
  }
}

export function loadRecords(): GauntletRecords {
  try {
    return parseRecords(localStorage.getItem(RECORDS_KEY));
  } catch {
    return { days: {} };
  }
}

/** Records a finished climb; says whether it beat today's best and the all-time best. */
export function recordClimb(seed: number, time: number, records: GauntletRecords = loadRecords()): { today: boolean; ever: boolean; records: GauntletRecords } {
  const key = String(seed);
  const today = records.days[key] === undefined || time < records.days[key];
  const ever = records.best === undefined || time < records.best;
  const days = { ...records.days, [key]: today ? time : records.days[key] };
  const kept = Object.fromEntries(
    Object.entries(days)
      .sort(([a], [b]) => Number(b) - Number(a))
      .slice(0, 14),
  );
  const next = { days: kept, best: ever ? time : records.best };
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
  } catch {
    // Still counted for this visit.
  }
  return { today, ever, records: next };
}
