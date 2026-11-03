import { describe, expect, it } from 'vitest';
import { forestSpots, heightAt, isUnsealed, landness, PLACES, ridgeX, riverDistance, RIVER, SEA_LEVEL, slopeAt, wardX } from './archiveMap';
import { parseBook } from './spoilers';

describe('the terrain', () => {
  it('puts every place on dry land, below the clifftops and away from the river', () => {
    for (const place of PLACES) {
      expect(landness(place.x, place.z), place.name).toBeGreaterThan(0.1);
      const h = heightAt(place.x, place.z);
      expect(h, place.name).toBeGreaterThan(SEA_LEVEL);
      expect(h, place.name).toBeLessThan(8);
      expect(riverDistance(place.x, place.z), place.name).toBeGreaterThan(2);
    }
  });

  it('is sea beyond the coast', () => {
    expect(heightAt(52, 0)).toBeLessThan(SEA_LEVEL);
    expect(heightAt(0, 30)).toBeLessThan(SEA_LEVEL);
    expect(heightAt(-50, -20)).toBeLessThan(SEA_LEVEL);
  });

  it('raises the cliffs and the northern range well above the lowlands', () => {
    for (const z of [-10, 0, 10]) {
      expect(heightAt(ridgeX(z), z)).toBeGreaterThan(heightAt(-22, z) + 3);
    }
    expect(heightAt(-25, -16)).toBeGreaterThan(heightAt(-25, -4) + 2);
  });

  it('cuts the river below sea level so water shows along its course', () => {
    const [x, z] = RIVER[2];
    expect(heightAt(x, z)).toBeLessThan(SEA_LEVEL);
    expect(riverDistance(x, z)).toBe(0);
  });

  it('measures slope: gentle in the lowlands, steep on the cliffs', () => {
    expect(slopeAt(-28, 2)).toBeLessThan(0.25);
    const steepest = Math.max(...[-6, -3, 0, 3, 6].map((dz) => slopeAt(ridgeX(0) - 2, dz)));
    expect(steepest).toBeGreaterThan(0.4);
  });

  it('keeps the ward line on the Navarre side of the cliffs', () => {
    for (const z of [-15, 0, 15]) expect(wardX(z)).toBeLessThan(ridgeX(z));
  });

  it('is the same every time', () => {
    expect(heightAt(3.3, -7.1)).toBe(heightAt(3.3, -7.1));
  });
});

describe('the forests', () => {
  const trees = forestSpots();

  it('grows a real forest, the same every time', () => {
    expect(trees.length).toBeGreaterThan(600);
    expect(forestSpots()).toEqual(trees);
  });

  it('keeps trees on land, off the river and out of the towns', () => {
    for (const t of trees) {
      expect(heightAt(t.x, t.z)).toBeGreaterThan(0.5);
      expect(riverDistance(t.x, t.z)).toBeGreaterThan(1.7);
      for (const p of PLACES) expect(Math.hypot(p.x - t.x, p.z - t.z)).toBeGreaterThan(2.5);
    }
  });
});

describe('the spoiler shield', () => {
  it('seals later-book places until the reader gets there', () => {
    const aretia = PLACES.find((p) => p.id === 'aretia')!;
    expect(isUnsealed(aretia, 1)).toBe(false);
    expect(isUnsealed(aretia, 2)).toBe(true);
    expect(PLACES.filter((p) => isUnsealed(p, 1)).length).toBeGreaterThan(3);
  });

  it('reads a saved book, falling back to the first', () => {
    expect(parseBook('2')).toBe(2);
    expect(parseBook('3')).toBe(3);
    expect(parseBook('7')).toBe(1);
    expect(parseBook(null)).toBe(1);
  });
});
