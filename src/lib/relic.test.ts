import { describe, expect, it } from 'vitest';
import { drawRelic, hookPath, inkFor, normaliseName, RELIC_HEIGHT, RELIC_WIDTH, relicMarkup, smoothPath, type RelicMark } from './relic';

const allPoints = (m: RelicMark) => [...m.stem, ...m.curls.flat(), ...m.flicks.flat(), ...m.dots];

describe('drawRelic', () => {
  it('draws the same mark for the same name, however it is typed', () => {
    expect(drawRelic('Violet Sorrengail')).toEqual(drawRelic('  violet   sorrengail '));
  });

  it('draws different marks for different names and variants', () => {
    expect(drawRelic('Violet')).not.toEqual(drawRelic('Xaden'));
    expect(drawRelic('Violet', 0)).not.toEqual(drawRelic('Violet', 1));
  });

  it('gives a nameless reader a mark too', () => {
    expect(normaliseName('   ')).toBe('rider');
    expect(drawRelic('').stem.length).toBeGreaterThan(5);
  });

  it('stays inside its box, whatever the name', () => {
    for (let i = 0; i < 200; i++) {
      for (const p of allPoints(drawRelic(`rider ${i}`, i % 3))) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(RELIC_WIDTH);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(RELIC_HEIGHT);
      }
    }
  });

  it('climbs from the bottom of the box to the top, always ending in a curl', () => {
    for (let i = 0; i < 50; i++) {
      const mark = drawRelic(`rider ${i}`);
      expect(mark.stem[0].y).toBeGreaterThan(RELIC_HEIGHT * 0.9);
      expect(mark.stem.at(-1)!.y).toBeLessThan(RELIC_HEIGHT * 0.1);
      expect(mark.curls.length).toBeGreaterThanOrEqual(1);
      for (let j = 1; j < mark.stem.length; j++) expect(mark.stem[j].y).toBeLessThan(mark.stem[j - 1].y);
    }
  });
});

describe('paths', () => {
  it('turns points into SVG path data', () => {
    expect(smoothPath([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toMatch(/^M0,0 C[\d.,\s-]+10,10$/);
    expect(smoothPath([{ x: 1, y: 1 }])).toBe('');
    expect(hookPath([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }])).toBe('M0,0 Q5,5 10,0');
  });
});

describe('inkFor', () => {
  it('matches the glow to the dragon', () => {
    expect(inkFor('black')).toBe('ink');
    expect(inkFor('blue')).toBe('storm');
    expect(inkFor(null)).toBe('gold');
  });
});

describe('relicMarkup', () => {
  it('draws every line, with a glow only for coloured inks', () => {
    const mark = drawRelic('Violet');
    const lines = 1 + mark.curls.length + mark.flicks.length;
    const glowing = relicMarkup(mark, 'gold', 300, 800);
    expect(glowing.match(/<path /g)).toHaveLength(lines * 2);
    expect(glowing).toContain('stroke="#f2c46b"');
    expect(glowing).toContain('width="300" height="800"');
    expect(relicMarkup(mark, 'ink', 300, 800)).not.toContain('#f2c46b');
  });
});
