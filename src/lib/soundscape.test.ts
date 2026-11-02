import { describe, expect, it } from 'vitest';
import { formatRemaining, PRESETS, presetOf } from './soundscape';

describe('formatRemaining', () => {
  it('shows minutes and seconds', () => {
    expect(formatRemaining(25 * 60 * 1000)).toBe('25:00');
    expect(formatRemaining(61 * 1000)).toBe('1:01');
  });

  it('rounds partial seconds up, so the last second still shows', () => {
    expect(formatRemaining(400)).toBe('0:01');
  });

  it('adds hours only when needed', () => {
    expect(formatRemaining(60 * 60 * 1000)).toBe('1:00:00');
  });

  it('never goes negative', () => {
    expect(formatRemaining(-5000)).toBe('0:00');
  });
});

describe('presetOf', () => {
  it('recognises each preset', () => {
    expect(presetOf(PRESETS['The Vale'])).toBe('The Vale');
  });

  it('is null once a slider moves', () => {
    expect(presetOf({ ...PRESETS['Storm night'], rain: 0.5 })).toBeNull();
  });
});
