import { describe, expect, it } from 'vitest';
import { CHAPTERS, chapterAt, chapterStart, mixHex, momentAt, ridgePath } from './scrollFlight';

const middle = (i: number) => (i + 0.5) / CHAPTERS.length;

describe('chapterAt', () => {
  it('starts in Basgiath and ends at the border', () => {
    expect(chapterAt(0)).toEqual({ index: 0, local: 0 });
    expect(chapterAt(1).index).toBe(CHAPTERS.length - 1);
    expect(chapterAt(1).local).toBeLessThan(1);
  });

  it('clamps scrolling past either end', () => {
    expect(chapterAt(-0.5).index).toBe(0);
    expect(chapterAt(2).index).toBe(CHAPTERS.length - 1);
  });

  it('agrees with where each chapter starts', () => {
    CHAPTERS.forEach((_, i) => expect(chapterAt(chapterStart(i) + 0.001).index).toBe(i));
  });
});

describe('momentAt', () => {
  it("holds each chapter's own sky and weather at its middle", () => {
    CHAPTERS.forEach((c, i) => {
      const m = momentAt(middle(i));
      expect(m.sky).toEqual(c.sky);
      expect(m.storm).toBeCloseTo(c.storm);
      expect(m.altitude).toBeCloseTo(c.altitude);
    });
  });

  it('peaks in the storm and is clear by the border', () => {
    const storm = CHAPTERS.findIndex((c) => c.id === 'storm');
    const peak = momentAt(middle(storm)).storm;
    expect(peak).toBe(1);
    for (let k = 0; k <= 100; k++) expect(momentAt(k / 100).storm).toBeLessThanOrEqual(peak);
    expect(momentAt(1).storm).toBe(0);
    expect(momentAt(1).dawn).toBe(1);
  });

  it('eases between chapters with no jumps', () => {
    for (let k = 0; k < 1000; k++) {
      const a = momentAt(k / 1000);
      const b = momentAt((k + 1) / 1000);
      expect(Math.abs(a.altitude - b.altitude)).toBeLessThan(15);
      expect(Math.abs(a.storm - b.storm)).toBeLessThan(0.02);
    }
  });
});

describe('mixHex', () => {
  it('mixes colours', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#102030', '#102030', 0.3)).toBe('#102030');
  });
});

describe('ridgePath', () => {
  it('draws the same ridge from the same seed, edge to edge and within its band', () => {
    const d = ridgePath(7, 2880, 300, 500, 900);
    expect(d).toBe(ridgePath(7, 2880, 300, 500, 900));
    expect(d).not.toBe(ridgePath(8, 2880, 300, 500, 900));
    expect(d.startsWith('M0,900 L0,')).toBe(true);
    expect(d.endsWith('L2880,900 Z')).toBe(true);
    const peaks = [...d.matchAll(/L(-?\d+),(-?\d+)/g)].slice(0, -1).map((m) => [Number(m[1]), Number(m[2])]);
    for (const [x, y] of peaks) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(2880);
      expect(y).toBeGreaterThanOrEqual(300);
      expect(y).toBeLessThanOrEqual(500);
    }
  });
});
