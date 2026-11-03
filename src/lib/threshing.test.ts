import { describe as group, expect, it } from 'vitest';
import { choose, describe, isComplete, parseSavedBond, QUESTIONS, RARE_SIGNET, SIGNETS } from './threshing';

// Answer indexes per question that lean hard toward one colour.
const GREEN = [1, 1, 0, 1, 1, 1];
const RED = [0, 0, 2, 0, 2, 3];

group('choose', () => {
  it('gives the same bond for the same answers and name', () => {
    expect(choose(GREEN, 'Violet')).toEqual(choose(GREEN, 'Violet'));
  });

  it('ignores case and spacing in the name when seeding', () => {
    expect(choose(GREEN, '  violet ')).toEqual({ ...choose(GREEN, 'Violet'), rider: 'violet' });
  });

  it('follows the answers to a colour', () => {
    expect(choose(GREEN, 'Violet').colour).toBe('green');
    expect(choose(RED, 'Violet').colour).toBe('red');
  });

  it('picks the tail most answers point to', () => {
    // Five of the six RED answers vote swordtail.
    expect(choose(RED, 'Violet').tail).toBe('swordtail');
  });

  it('always names the dragon, never after one from the books', () => {
    for (const name of ['Violet', 'Xaden', 'Rhiannon', 'Ridoc', 'Sawyer', 'Liam', 'Mira', 'Brennan']) {
      const bond = choose(RED, name);
      expect(bond.dragonName).toMatch(/^[A-Z][a-z]+$/);
      expect(['tairn', 'sgaeyl', 'andarna']).not.toContain(bond.dragonName.toLowerCase());
    }
  });

  it('gives a known signet, and the rare one only now and then', () => {
    let rare = 0;
    for (let i = 0; i < 400; i++) {
      const bond = choose(RED, `rider ${i}`);
      expect([...SIGNETS, RARE_SIGNET]).toContainEqual(bond.signet);
      if (bond.rare) rare++;
    }
    expect(rare).toBeGreaterThan(5);
    expect(rare).toBeLessThan(45);
  });

  it('falls back to Cadet without a name', () => {
    expect(choose(GREEN, '   ').rider).toBe('Cadet');
  });

  it('refuses unfinished answers', () => {
    expect(() => choose([0, 1], 'Violet')).toThrow();
  });
});

group('isComplete', () => {
  it('needs one valid answer per question', () => {
    expect(isComplete(GREEN)).toBe(true);
    expect(isComplete(GREEN.slice(1))).toBe(false);
    expect(isComplete([...GREEN.slice(1), 9])).toBe(false);
    expect(QUESTIONS).toHaveLength(6);
  });
});

group('describe', () => {
  it('uses the right article', () => {
    expect(describe({ colour: 'red', tail: 'swordtail' })).toBe('a red swordtail');
    expect(describe({ colour: 'orange', tail: 'daggertail' })).toBe('an orange daggertail');
  });
});

group('parseSavedBond', () => {
  it('reads a saved bond back', () => {
    expect(parseSavedBond(JSON.stringify({ rider: 'Violet', answers: GREEN }))).toEqual({ rider: 'Violet', answers: GREEN });
  });

  it('ignores anything broken or tampered with', () => {
    expect(parseSavedBond(null)).toBeNull();
    expect(parseSavedBond('not json')).toBeNull();
    expect(parseSavedBond(JSON.stringify({ rider: 'Violet', answers: [0, 1] }))).toBeNull();
    expect(parseSavedBond(JSON.stringify({ rider: 5, answers: GREEN }))).toBeNull();
  });
});
