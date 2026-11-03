import { describe, expect, it } from 'vitest';
import { routeOf } from './router';

describe('routeOf at the site root', () => {
  it('finds each page', () => {
    expect(routeOf('/', '')).toBe('home');
    expect(routeOf('/map', '')).toBe('map');
    expect(routeOf('/fly', '')).toBe('fly');
    expect(routeOf('/threshing', '')).toBe('threshing');
    expect(routeOf('/codex', '')).toBe('codex');
    expect(routeOf('/trials', '')).toBe('trials');
    expect(routeOf('/trials/parapet', '')).toBe('parapet');
    expect(routeOf('/trials/gauntlet', '')).toBe('gauntlet');
    expect(routeOf('/trials/war-games', '')).toBe('warGames');
    expect(routeOf('/read', '')).toBe('read');
    expect(routeOf('/relic', '')).toBe('relic');
    expect(routeOf('/commons', '')).toBe('commons');
    expect(routeOf('/night', '')).toBe('night');
    expect(routeOf('/wallpapers', '')).toBe('wallpapers');
  });

  it('ignores a trailing slash', () => {
    expect(routeOf('/read/', '')).toBe('read');
  });

  it('returns null for unknown pages', () => {
    expect(routeOf('/the-commons', '')).toBeNull();
    expect(routeOf('/read/more', '')).toBeNull();
  });
});

describe('routeOf under the GitHub Pages folder', () => {
  const base = '/scribe-archive';

  it('finds home with or without the trailing slash', () => {
    expect(routeOf('/scribe-archive/', base)).toBe('home');
    expect(routeOf('/scribe-archive', base)).toBe('home');
  });

  it('finds pages, including the folder form Pages redirects to', () => {
    expect(routeOf('/scribe-archive/read', base)).toBe('read');
    expect(routeOf('/scribe-archive/wallpapers/', base)).toBe('wallpapers');
    expect(routeOf('/scribe-archive/trials/parapet/', base)).toBe('parapet');
  });

  it('rejects paths outside the folder', () => {
    expect(routeOf('/read', base)).toBeNull();
    expect(routeOf('/scribe-archive-old/read', base)).toBeNull();
  });
});
