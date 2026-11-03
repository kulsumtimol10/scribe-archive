import type { DragonColour, Tail } from './threshing';
import { COLOURS } from './threshing';

/**
 * Threshing Night: once a month, every reader adds the dragon that chose them
 * to one shared count, at the same time. This file holds the schedule and the
 * small helpers the page needs; the counts live in the Commons' store.
 */

/** The first Saturday of every month, 6 pm to midnight UTC. Change it here. */
export const SCHEDULE = { weekday: 6, startHourUTC: 18, hours: 6 } as const;

/** Moderators can try the whole flow on this field at any time; it never counts. */
export const PRACTICE_ID = 'practice';

export interface Night {
  /** "2026-11" */
  id: string;
  /** Milliseconds since 1970. */
  start: number;
  end: number;
}

/** That month's night. Months outside 0–11 roll into the next or previous year. */
export function nightIn(year: number, month: number): Night {
  const first = new Date(Date.UTC(year, month, 1));
  const y = first.getUTCFullYear();
  const m = first.getUTCMonth();
  const offset = (SCHEDULE.weekday - first.getUTCDay() + 7) % 7;
  const start = Date.UTC(y, m, 1 + offset, SCHEDULE.startHourUTC);
  return { id: `${y}-${String(m + 1).padStart(2, '0')}`, start, end: start + SCHEDULE.hours * 3_600_000 };
}

/** Whether a night is on now, which comes next, and which was the last one. */
export function nightStatus(now = Date.now()): { live: Night | null; next: Night; last: Night } {
  const d = new Date(now);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const current = nightIn(year, month);
  const before = nightIn(year, month - 1);
  const after = nightIn(year, month + 1);
  if (now < current.start) return { live: null, next: current, last: before };
  if (now < current.end) return { live: current, next: after, last: before };
  return { live: null, next: after, last: current };
}

/** "3d 4h 12m" when days away, "02:14:09" on the day. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export const NIGHT_COLOURS: DragonColour[] = ['red', 'green', 'blue', 'orange', 'brown', 'black'];

export type NightCounts = Record<DragonColour, number> & { total: number };

export const EMPTY_COUNTS: NightCounts = { red: 0, green: 0, blue: 0, orange: 0, brown: 0, black: 0, total: 0 };

/** The colour with the most bonds, or null before anyone has bonded. Ties go to the earlier colour. */
export function leaderOf(counts: NightCounts): DragonColour | null {
  let best: DragonColour | null = null;
  for (const colour of NIGHT_COLOURS) if (counts[colour] > (best ? counts[best] : 0)) best = colour;
  return best;
}

export interface NightBond {
  uid: string;
  riderName: string;
  dragonName: string;
  colour: DragonColour;
  tail: Tail;
  at: number | null;
}

/** "violet was chosen by a blue daggertail." */
export function feedLine(bond: Pick<NightBond, 'riderName' | 'colour' | 'tail'>): string {
  const colour = COLOURS[bond.colour].name.toLowerCase();
  return `${bond.riderName} was chosen by ${colour === 'orange' ? 'an' : 'a'} ${colour} ${bond.tail}.`;
}

/** "Saturday 7 November, 18:00" in the reader's own time zone. */
export function localWhen(at: number, locale?: string): string {
  return new Date(at).toLocaleString(locale, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
}

const icsTime = (at: number) => new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** A calendar file for one night, so readers can set a reminder. */
export function icsFor(night: Night, url: string, now = Date.now()): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Scribe Archive//Threshing Night//EN',
    'BEGIN:VEVENT',
    `UID:threshing-night-${night.id}@scribe-archive`,
    `DTSTAMP:${icsTime(now)}`,
    `DTSTART:${icsTime(night.start)}`,
    `DTEND:${icsTime(night.end)}`,
    'SUMMARY:Threshing Night at the Scribe Archive',
    'DESCRIPTION:Walk the field with every other reader and add your dragon to the count.',
    `URL:${url}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Threshing Night opens in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
