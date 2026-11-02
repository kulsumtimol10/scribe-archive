import { describe, expect, it } from 'vitest';
import { loadTheme, parseTheme, saveTheme, THEME_KEY } from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

describe('parseTheme', () => {
  it('accepts the two skies', () => {
    expect(parseTheme('night')).toBe('night');
    expect(parseTheme('storm')).toBe('storm');
  });

  it('rejects anything else', () => {
    expect(parseTheme('blood')).toBeNull();
    expect(parseTheme(null)).toBeNull();
    expect(parseTheme(3)).toBeNull();
  });
});

describe('loadTheme and saveTheme', () => {
  it('is null on a first visit', () => {
    expect(loadTheme(memoryStorage())).toBeNull();
  });

  it('round-trips a choice', () => {
    const storage = memoryStorage();
    saveTheme('storm', storage);
    expect(storage.data[THEME_KEY]).toBe('storm');
    expect(loadTheme(storage)).toBe('storm');
  });

  it('survives storage that throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadTheme(broken)).toBeNull();
    expect(() => saveTheme('night', broken)).not.toThrow();
  });

  it('works with no storage at all', () => {
    expect(loadTheme(undefined)).toBeNull();
  });
});
