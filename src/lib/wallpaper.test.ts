import { describe, expect, it } from 'vitest';
import { choose } from './threshing';
import { DRAGONS, dragonsFor, FORMATS, riderName, wallpaperFileName, wallpaperText } from './wallpaper';

describe('riderName', () => {
  it('capitalises and tidies spaces', () => {
    expect(riderName('  violet   sorrengail ')).toBe('VIOLET SORRENGAIL');
  });

  it('falls back to CADET when empty', () => {
    expect(riderName('   ')).toBe('CADET');
  });

  it('cuts long names to fit, without a dangling space', () => {
    expect(riderName('wingleader of the eastern sky')).toBe('WINGLEADER OF THE');
    expect(riderName('abcdefghijklmnopqrstuvwxyz')).toHaveLength(18);
  });
});

describe('wallpaperText', () => {
  it('keeps every line inside the image', () => {
    for (const format of ['phone', 'desktop'] as const) {
      const { width, height } = FORMATS[format];
      for (const line of wallpaperText(format, 'Violet', DRAGONS.tairn.line)) {
        expect(line.x).toBeGreaterThan(0);
        expect(line.x).toBeLessThan(width);
        expect(line.y).toBeGreaterThan(line.size);
        expect(line.y).toBeLessThan(height);
      }
    }
  });

  it('prints the dragon line under the name', () => {
    const [name, line] = wallpaperText('phone', 'Violet', DRAGONS.sgaeyl.line);
    expect(name.text).toBe('VIOLET');
    expect(line.text).toBe('NAVY DAGGERTAIL');
    expect(line.y).toBeGreaterThan(name.y);
  });
});

describe('dragonsFor', () => {
  it('keeps the default dragons without a bond', () => {
    expect(dragonsFor(null)).toBe(DRAGONS);
  });

  it('turns "My dragon" into the one that chose the reader', () => {
    const bond = choose([1, 1, 0, 1, 1, 1], 'Violet');
    const mine = dragonsFor(bond).mine;
    expect(mine.name).toBe(bond.dragonName);
    expect(mine.line).toBe(`GREEN ${bond.tail.toUpperCase()}`);
    expect(dragonsFor(bond).tairn).toBe(DRAGONS.tairn);
  });
});

describe('wallpaperFileName', () => {
  it('names the download after the choices', () => {
    expect(wallpaperFileName('Andarna', 'dawn', 'phone')).toBe('scribe-archive-andarna-dawn-phone.jpg');
    expect(wallpaperFileName('My dragon', 'vale', 'desktop')).toBe('scribe-archive-my-dragon-vale-desktop.jpg');
  });
});
