import { describe, expect, it } from 'vitest';
import { countdown, EMPTY_COUNTS, feedLine, icsFor, leaderOf, nightIn, nightStatus, SCHEDULE } from './threshingNight';

describe('the schedule', () => {
  it('falls on the first Saturday of each month, 6 pm UTC, for six hours', () => {
    for (let month = 0; month < 24; month++) {
      const night = nightIn(2026, month);
      const start = new Date(night.start);
      expect(start.getUTCDay()).toBe(6);
      expect(start.getUTCDate()).toBeLessThanOrEqual(7);
      expect(start.getUTCHours()).toBe(SCHEDULE.startHourUTC);
      expect(night.end - night.start).toBe(6 * 3_600_000);
    }
    expect(nightIn(2026, 10)).toMatchObject({ id: '2026-11', start: Date.UTC(2026, 10, 7, 18) });
  });

  it('rolls months over into the next and previous years', () => {
    expect(nightIn(2026, 12).id).toBe('2027-01');
    expect(nightIn(2026, -1).id).toBe('2025-12');
  });

  it('knows whether a night is on, and which come before and after', () => {
    const november = nightIn(2026, 10);
    const before = nightStatus(Date.UTC(2026, 10, 3, 12));
    expect(before.live).toBeNull();
    expect(before.next.id).toBe('2026-11');
    expect(before.last.id).toBe('2026-10');

    const during = nightStatus(november.start + 60_000);
    expect(during.live?.id).toBe('2026-11');
    expect(during.next.id).toBe('2026-12');

    const after = nightStatus(november.end);
    expect(after.live).toBeNull();
    expect(after.next.id).toBe('2026-12');
    expect(after.last.id).toBe('2026-11');
  });
});

describe('helpers', () => {
  it('counts down in days, then in hours, minutes and seconds', () => {
    expect(countdown(3 * 86_400_000 + 4 * 3_600_000 + 12 * 60_000)).toBe('3d 4h 12m');
    expect(countdown(2 * 3_600_000 + 14 * 60_000 + 9_000)).toBe('02:14:09');
    expect(countdown(-5)).toBe('00:00:00');
  });

  it('names the leading colour, and nobody before the first bond', () => {
    expect(leaderOf(EMPTY_COUNTS)).toBeNull();
    expect(leaderOf({ ...EMPTY_COUNTS, blue: 3, red: 3, green: 1, total: 7 })).toBe('red');
    expect(leaderOf({ ...EMPTY_COUNTS, black: 2, total: 2 })).toBe('black');
  });

  it('writes the feed', () => {
    expect(feedLine({ riderName: 'violet', colour: 'blue', tail: 'daggertail' })).toBe('violet was chosen by a blue daggertail.');
    expect(feedLine({ riderName: 'Ridoc', colour: 'orange', tail: 'clubtail' })).toBe('Ridoc was chosen by an orange clubtail.');
  });

  it('makes a calendar file for the night', () => {
    const ics = icsFor(nightIn(2026, 10), 'https://example.com/night', Date.UTC(2026, 10, 3));
    expect(ics).toContain('DTSTART:20261107T180000Z');
    expect(ics).toContain('DTEND:20261108T000000Z');
    expect(ics).toContain('URL:https://example.com/night');
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});
