import type { Book } from './spoilers';
import type { DragonColour, Tail } from './threshing';
import type { NightBond, NightCounts } from './threshingNight';

/**
 * The Commons: fan discussion, spoiler-shielded by book. This file holds the
 * shapes, the posting rules and the store interface; where the posts live is
 * up to the store (Firebase once connected, this browser in preview).
 * firestore.rules enforces the same limits on the server.
 */

/** 0 means spoiler free; otherwise the latest book a post discusses. */
export type SpoilerLevel = 0 | Book;

export type HallId = 'fourth-wing' | 'iron-flame' | 'onyx-storm' | 'theories' | 'reviews' | 'fan-art' | 'buddy-reads';

export const HALLS: { id: HallId; name: string; book?: Book }[] = [
  { id: 'fourth-wing', name: 'Fourth Wing', book: 1 },
  { id: 'iron-flame', name: 'Iron Flame', book: 2 },
  { id: 'onyx-storm', name: 'Onyx Storm', book: 3 },
  { id: 'theories', name: 'Theories' },
  { id: 'reviews', name: 'Reviews' },
  { id: 'fan-art', name: 'Fan art' },
  { id: 'buddy-reads', name: 'Buddy reads' },
];

export const hallName = (id: HallId) => HALLS.find((h) => h.id === id)?.name ?? 'The Commons';

export const SPOILER_NAMES: Record<SpoilerLevel, string> = { 0: 'Spoiler free', 1: 'Book I', 2: 'Book II', 3: 'Book III' };

export const RIDER_COLOURS: DragonColour[] = ['red', 'green', 'blue', 'orange', 'brown', 'black'];

export const LIMITS = {
  name: [2, 24],
  title: [4, 140],
  body: [1, 5000],
  reply: [1, 3000],
} as const;

/** Seconds a rider waits between posts; the server rules hold the same line. */
export const POST_GAP = 20;

export interface Rider {
  uid: string;
  name: string;
  colour: DragonColour;
}

/** Who is signed in, before and after they pick a rider name. */
export interface Account {
  uid: string;
  /** Null until they choose a rider name. */
  rider: Rider | null;
  moderator: boolean;
}

export interface Thread {
  id: string;
  hall: HallId;
  title: string;
  body: string;
  spoiler: SpoilerLevel;
  authorId: string;
  authorName: string;
  authorColour: DragonColour;
  /** Milliseconds since 1970; null for a moment while the server stamps a new post. */
  createdAt: number | null;
  lastActivity: number | null;
  replyCount: number;
  scaleCount: number;
  hidden: boolean;
}

export interface Reply {
  id: string;
  body: string;
  spoiler: SpoilerLevel;
  authorId: string;
  authorName: string;
  authorColour: DragonColour;
  createdAt: number | null;
  hidden: boolean;
}

export interface NewThread {
  hall: HallId;
  title: string;
  body: string;
  spoiler: SpoilerLevel;
}

export interface NewReply {
  body: string;
  spoiler: SpoilerLevel;
}

export type ReportReason = 'spoiler' | 'unkind' | 'spam' | 'other';

export const REPORT_REASONS: { id: ReportReason; name: string }[] = [
  { id: 'spoiler', name: 'Untagged spoilers' },
  { id: 'unkind', name: 'Unkind to a rider' },
  { id: 'spam', name: 'Spam' },
  { id: 'other', name: 'Something else' },
];

export interface Report {
  id: string;
  /** The reported post: "threads/abc" or "threads/abc/replies/xyz". */
  path: string;
  reason: ReportReason;
  createdAt: number | null;
}

export interface Rating {
  /** Average scales, 1 to 5; null before anyone has rated. */
  average: number | null;
  count: number;
  mine: number | null;
}

export type Ratings = Record<Book, Rating>;

export const EMPTY_RATINGS: Ratings = {
  1: { average: null, count: 0, mine: null },
  2: { average: null, count: 0, mine: null },
  3: { average: null, count: 0, mine: null },
};

/** Where posts live. Every watch returns a function that stops watching. */
export interface CommonsStore {
  /** "preview" keeps everything in this browser; "firebase" is the real Commons. */
  readonly kind: 'preview' | 'firebase';
  watchAccount(cb: (account: Account | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  /** Emails a sign-in link; finishing happens when the reader comes back through it. */
  sendEmailLink(email: string): Promise<void>;
  signOut(): Promise<void>;
  saveRider(name: string, colour: DragonColour): Promise<void>;

  watchThreads(hall: HallId | null, cb: (threads: Thread[]) => void, onError?: (err: Error) => void): () => void;
  watchThread(id: string, cb: (thread: Thread | null) => void): () => void;
  watchReplies(threadId: string, cb: (replies: Reply[]) => void): () => void;
  watchMyScales(cb: (threadIds: Set<string>) => void): () => void;
  watchRatings(cb: (ratings: Ratings) => void): () => void;
  watchReports(cb: (reports: Report[]) => void): () => void;

  postThread(input: NewThread): Promise<string>;
  postReply(threadId: string, input: NewReply): Promise<void>;
  toggleScale(threadId: string, on: boolean): Promise<void>;
  rate(book: Book, scales: number): Promise<void>;
  report(path: string, reason: ReportReason): Promise<void>;
  /** Moderators hide or restore anything; authors can take down their own. */
  setHidden(path: string, hidden: boolean): Promise<void>;
  dismissReport(id: string): Promise<void>;

  /* Threshing Night shares the Commons' accounts and store. */
  watchNight(nightId: string, cb: (counts: NightCounts) => void): () => void;
  /** The latest bonds, newest first, for the feed. */
  watchBonds(nightId: string, cb: (bonds: NightBond[]) => void): () => void;
  watchMyBond(nightId: string, cb: (bond: NightBond | null) => void): () => void;
  /** Adds the reader's Threshing dragon to a night's count, once per night. */
  addBond(nightId: string, dragon: { dragonName: string; colour: DragonColour; tail: Tail }): Promise<void>;
  /** Moderators only: empties the practice field. */
  resetPractice(): Promise<void>;
}

const tidy = (text: string) => text.replace(/\r\n/g, '\n').trim();

/** Why a rider name won't do, or null if it's fine. */
export function checkName(name: string): string | null {
  const n = tidy(name);
  if (n.length < LIMITS.name[0]) return 'Pick a rider name of at least two letters.';
  if (n.length > LIMITS.name[1]) return `Keep your rider name under ${LIMITS.name[1] + 1} characters.`;
  return null;
}

export function checkThread(input: NewThread): string | null {
  const title = tidy(input.title);
  const body = tidy(input.body);
  if (!HALLS.some((h) => h.id === input.hall)) return 'Choose a hall for your thread.';
  if (title.length < LIMITS.title[0]) return 'Give your thread a title.';
  if (title.length > LIMITS.title[1]) return `Titles stay under ${LIMITS.title[1] + 1} characters.`;
  if (body.length < LIMITS.body[0]) return 'Say a little more in the post itself.';
  if (body.length > LIMITS.body[1]) return `Posts stay under ${LIMITS.body[1].toLocaleString('en-US')} characters.`;
  if (![0, 1, 2, 3].includes(input.spoiler)) return 'Tag which book your thread spoils.';
  return null;
}

export function checkReply(input: NewReply): string | null {
  const body = tidy(input.body);
  if (body.length < LIMITS.reply[0]) return 'Write a reply first.';
  if (body.length > LIMITS.reply[1]) return `Replies stay under ${LIMITS.reply[1].toLocaleString('en-US')} characters.`;
  if (![0, 1, 2, 3].includes(input.spoiler)) return 'Tag which book your reply spoils.';
  return null;
}

/** Clean text as it will be saved. */
export const clean = tidy;

/** A post is sealed when it spoils a book past the reader's shield and they haven't chosen to look. */
export function isSealed(spoiler: SpoilerLevel, shield: Book, revealed: boolean): boolean {
  return spoiler > shield && !revealed;
}

/** A new thread in a book's hall starts tagged with that book's spoilers. */
export function defaultSpoiler(hall: HallId): SpoilerLevel {
  return HALLS.find((h) => h.id === hall)?.book ?? 0;
}

/** "now", "5m", "3h", "2d", then a date. */
export function timeAgo(at: number | null, now = Date.now()): string {
  if (at === null) return 'now';
  const seconds = Math.max(0, (now - at) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export type Piece = { text: string } | { url: string };

/** Splits text so web links can be shown as links and everything else as plain text. */
export function linkify(text: string): Piece[] {
  const pieces: Piece[] = [];
  const pattern = /https?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]'"]/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) pieces.push({ text: text.slice(last, at) });
    pieces.push({ url: match[0] });
    last = at + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

/** The first couple of lines of a post, for the thread list. */
export function excerpt(body: string, max = 220): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export const RATING_WORDS = [
  'Tap a scale to rate.',
  'One scale. Brave.',
  'Two scales.',
  'Three scales, respectable.',
  'Four scales, nearly perfect.',
  'Five scales. Of course.',
];
