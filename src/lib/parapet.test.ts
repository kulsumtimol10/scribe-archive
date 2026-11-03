import { describe, expect, it } from 'vitest';
import { advance, FALL_AT, formatTime, IDLE, parseBest, start, type Crossing, type Input, type Weather } from './parapet';

/** A repeatable stand-in for Math.random. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays until the crossing ends or time runs out. */
function play(weather: Weather, seed: number, decide: (c: Crossing) => Input, limit = 120, fps = 60): Crossing {
  const random = seeded(seed);
  let c = start(weather, random);
  for (let frame = 0; frame < limit * fps && c.status === 'playing'; frame++) {
    c = advance(c, decide(c), 1 / fps, random);
  }
  return c;
}

/** A careless player: reacts a quarter of a second late and never braces. */
function careless(): (c: Crossing) => Input {
  const seen: Crossing[] = [];
  return (c) => {
    seen.push(c);
    const late = seen[Math.max(0, seen.length - 15)];
    const lean = late.lean > 0.05 ? -1 : late.lean < -0.05 ? 1 : 0;
    return { lean, walk: true, brace: false };
  };
}

/** A steady player: lean against the tilt, brace through gusts, otherwise walk. */
function steady(c: Crossing): Input {
  const tilt = c.lean + 0.35 * c.spin;
  const lean = tilt > 0.02 ? -1 : tilt < -0.02 ? 1 : 0;
  const brace = c.gust.phase === 'blowing';
  return { lean, walk: !brace, brace };
}

describe('the crossing', () => {
  it('starts upright at the near cliff', () => {
    const c = start('storm', seeded(1));
    expect(c.status).toBe('playing');
    expect(c.progress).toBe(0);
    expect(Math.abs(c.lean)).toBeLessThan(0.05);
  });

  it('topples a cadet who does nothing', () => {
    const c = play('clear', 2, () => IDLE, 30);
    expect(c.status).toBe('fallen');
    expect(Math.abs(c.lean)).toBeGreaterThan(FALL_AT);
  });

  it('never moves forward without walking', () => {
    const c = play('clear', 3, (s) => ({ ...steady(s), walk: false }), 10);
    expect(c.progress).toBe(0);
  });

  it('can be crossed in every weather by a steady player', () => {
    for (const weather of ['clear', 'rain', 'storm'] as const) {
      for (const seed of [4, 5, 6]) {
        const c = play(weather, seed, steady);
        expect(c.status, `${weather} seed ${seed}`).toBe('crossed');
        expect(c.time).toBeGreaterThan(27);
      }
    }
  });

  it('warns before every gust blows', () => {
    const random = seeded(7);
    let c = start('storm', random);
    let lastPhase = c.gust.phase;
    for (let frame = 0; frame < 60 * 30; frame++) {
      c = advance(c, steady(c), 1 / 60, random);
      if (c.gust.phase === 'blowing' && lastPhase !== 'blowing') expect(lastPhase).toBe('warning');
      lastPhase = c.gust.phase;
      if (c.status !== 'playing') break;
    }
  });

  it('plays the same on slow and fast screens', () => {
    expect(play('rain', 8, steady, 120, 30).status).toBe('crossed');
    expect(play('rain', 8, steady, 120, 144).status).toBe('crossed');
  });

  it('usually throws a careless player in a storm', () => {
    const falls = [10, 11, 12, 13, 14, 15, 16, 17].filter((seed) => play('storm', seed, careless()).status === 'fallen');
    expect(falls.length).toBeGreaterThanOrEqual(5);
  });

  it('stops changing once it has ended', () => {
    const fallen = play('clear', 2, () => IDLE, 30);
    expect(advance(fallen, steady(fallen), 1, seeded(9))).toBe(fallen);
  });
});

describe('formatTime', () => {
  it('shows minutes, seconds and tenths', () => {
    expect(formatTime(47.36)).toBe('0:47.3');
    expect(formatTime(61.05)).toBe('1:01.0');
    expect(formatTime(3)).toBe('0:03.0');
  });
});

describe('parseBest', () => {
  it('keeps valid times and drops the rest', () => {
    expect(parseBest(JSON.stringify({ storm: 41.2, rain: -1, clear: 'fast', hail: 3 }))).toEqual({ storm: 41.2 });
    expect(parseBest('nonsense')).toEqual({});
    expect(parseBest(null)).toEqual({});
  });
});
