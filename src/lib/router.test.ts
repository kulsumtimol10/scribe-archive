import { describe, expect, it } from 'vitest';
import { routeOf } from './router';

describe('routeOf', () => {
  it('finds each page', () => {
    expect(routeOf('/')).toBe('home');
    expect(routeOf('/read')).toBe('read');
    expect(routeOf('/wallpapers')).toBe('wallpapers');
  });

  it('ignores a trailing slash', () => {
    expect(routeOf('/read/')).toBe('read');
  });

  it('returns null for unknown pages', () => {
    expect(routeOf('/threshing')).toBeNull();
    expect(routeOf('/read/more')).toBeNull();
  });
});
