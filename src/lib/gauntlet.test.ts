import { describe, expect, it } from 'vitest';
import {
  currentHazard,
  dailySeed,
  finished,
  grab,
  hazardAt,
  HOLDS,
  KNOCK_DROP,
  KNOCK_STUN,
  makeCourse,
  parseRecords,
  recordClimb,
  SECTIONS,
  sectionOf,
  SLIP_STUN,
  startClimb,
  tick,
  type Climb,
  type Side,
} from './gauntlet';

const SEED = 20261103;
const other = (side: Side): Side => (side === 'left' ? 'right' : 'left');

/** Lets time pass in small steps, as frames would (one tick can't jump more than 0.1 s). */
function wait(c: Climb, seconds: number): Climb {
  for (let t = 0; t < seconds - 1e-9; t += 0.05) c = tick(c, 0.05);
  return c;
}

/** A careful climber: grabs the right side, but waits out any danger on it. */
function climbCarefully(seed: number, limit = 120): Climb {
  let c = startClimb(seed);
  while (!finished(c) && c.time < limit) {
    c = tick(c, 1 / 30);
    const side = c.course[c.index].side;
    const hazard = currentHazard(c);
    // Wait through a warning or danger on the side we need.
    if (hazard && hazard.side === side) continue;
    if (c.time >= c.stunnedUntil) c = grab(c, side);
  }
  return c;
}

describe('the course', () => {
  it('is the same wall all day and a new wall each day', () => {
    expect(makeCourse(SEED)).toEqual(makeCourse(SEED));
    expect(makeCourse(SEED)).not.toEqual(makeCourse(SEED + 1));
  });

  it('has three sections in order', () => {
    const course = makeCourse(SEED);
    expect(course).toHaveLength(HOLDS);
    expect(course[0].section).toBe('wall');
    expect(course[SECTIONS[1].from].section).toBe('rockfall');
    expect(course[HOLDS - 1].section).toBe('log');
  });

  it('never asks for the same side more than twice in a row', () => {
    for (const seed of [1, 2, 3, SEED]) {
      const sides = makeCourse(seed).map((h) => h.side).join('');
      expect(sides).not.toMatch(/(left){3}|(right){3}/);
    }
  });

  it('dates the daily seed', () => {
    expect(dailySeed(new Date(2026, 10, 3))).toBe(20261103);
  });
});

describe('climbing', () => {
  it('climbs one hold per correct grab', () => {
    const c = startClimb(SEED);
    const next = grab(c, c.course[0].side);
    expect(next.index).toBe(1);
    expect(next.last).toBe('grab');
  });

  it('slips back on a wrong grab and ignores grabs while recovering', () => {
    let c = startClimb(SEED);
    c = wait(grab(c, c.course[0].side), 0.3);
    c = grab(c, other(c.course[1].side));
    expect(c.index).toBe(0);
    expect(c.slips).toBe(1);
    expect(grab(c, c.course[0].side)).toBe(c);
    const recovered = wait(c, SLIP_STUN + 0.05);
    expect(recovered.time).toBeGreaterThanOrEqual(SLIP_STUN);
    expect(grab(recovered, c.course[0].side).index).toBe(1);
  });

  it('ignores grabs while still pulling up to the last hold', () => {
    const c = grab(startClimb(SEED), makeCourse(SEED)[0].side);
    expect(grab(c, c.course[1].side)).toBe(c);
    expect(grab(wait(c, 0.25), c.course[1].side).index).toBe(2);
  });

  it('knocks a climber down when they grab into danger', () => {
    // Climb to the start of the rockfall.
    let c = startClimb(SEED);
    while (c.index < SECTIONS[1].from + KNOCK_DROP + 1) {
      c = tick(c, 0.05);
      const side = c.course[c.index].side;
      const hazard = currentHazard(c);
      if (hazard && hazard.side === side) continue;
      c = grab(c, side);
    }
    // Wait for rocks to fall on one side, then grab straight into them.
    while (currentHazard(c)?.phase !== 'danger') c = tick(c, 0.05);
    const hit = grab(c, currentHazard(c)!.side);
    expect(hit.last).toBe('knock');
    expect(hit.index).toBe(c.index - KNOCK_DROP);
    expect(hit.stunnedUntil).toBeCloseTo(c.time + KNOCK_STUN);
  });

  it('never knocks a climber below the start of their section', () => {
    let c = startClimb(SEED);
    while (c.index < SECTIONS[1].from + 1) c = grab(tick(c, 0.01), c.course[c.index].side);
    while (currentHazard(c)?.phase !== 'danger') c = tick(c, 0.05);
    expect(grab(c, currentHazard(c)!.side).index).toBeGreaterThanOrEqual(SECTIONS[1].from);
  });

  it('can be climbed every day by a careful climber', () => {
    for (const seed of [20261101, 20261102, 20261103, 20261104]) {
      const c = climbCarefully(seed);
      expect(finished(c), String(seed)).toBe(true);
      expect(c.knocks).toBe(0);
      // 48 holds at the fastest reach, plus waiting out the rocks and the log.
      expect(c.time).toBeGreaterThan(48 * 0.22);
      expect(c.time).toBeLessThan(40);
    }
  });

  it('stops the clock at the top', () => {
    const c = climbCarefully(SEED);
    expect(tick(c, 1).time).toBe(c.time);
  });
});

describe('hazards', () => {
  it('leaves the plain wall alone', () => {
    for (let t = 0; t < 10; t += 0.1) expect(hazardAt('wall', t, SEED)).toBeNull();
  });

  it('always warns before danger', () => {
    for (const section of ['rockfall', 'log'] as const) {
      let previous = hazardAt(section, 0, SEED);
      for (let t = 0.01; t < 20; t += 0.01) {
        const now = hazardAt(section, t, SEED);
        if (now?.phase === 'danger' && previous?.phase !== 'danger') expect(previous?.phase, `${section} at ${t}`).toBe('warning');
        previous = now;
      }
    }
  });

  it('sweeps the log left then right in rhythm', () => {
    const sides = new Set<string>();
    for (let t = 0; t < 2.4; t += 0.05) {
      const h = hazardAt('log', t, SEED);
      if (h?.phase === 'danger') sides.add(h.side);
    }
    expect([...sides].sort()).toEqual(['left', 'right']);
  });

  it('names sections by hold', () => {
    expect(sectionOf(0)).toBe('wall');
    expect(sectionOf(16)).toBe('rockfall');
    expect(sectionOf(47)).toBe('log');
  });
});

describe('records', () => {
  it('keeps today and the all-time best, and only a fortnight of days', () => {
    let records = parseRecords(null);
    for (let day = 1; day <= 20; day++) records = recordClimb(20261100 + day, 30 - day / 10, records).records;
    expect(Object.keys(records.days)).toHaveLength(14);
    expect(records.best).toBeCloseTo(28);
    const again = recordClimb(20261120, 50, records);
    expect(again.today).toBe(false);
    expect(again.ever).toBe(false);
  });

  it('ignores broken records', () => {
    expect(parseRecords('{"days":{"x":3,"20261103":-1},"best":"fast"}')).toEqual({ days: {}, best: undefined });
    expect(parseRecords('nonsense')).toEqual({ days: {} });
  });
});
