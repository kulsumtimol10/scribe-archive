import type { Book } from './spoilers';
import type { Bond } from './threshing';

/**
 * The Dragon Codex: the books' dragons, set side by side. Only plain facts
 * (colour, tail, rider) are kept here, written in the Archive's own words and
 * checked against fan wikis. Riders' signets stay sealed until a reader asks.
 */

export type CodexTail = 'morningstartail' | 'clubtail' | 'daggertail' | 'swordtail' | 'scorpiontail' | 'feathertail';
export type CodexColour = 'black' | 'navy' | 'blue' | 'green' | 'red' | 'orange' | 'brown' | 'gold' | 'iridescent';

export interface Look {
  /** The book this look starts in; a dragon can change as it grows. */
  from: Book;
  colour: CodexColour;
  /** Null when the Archive has no record of the tail. */
  tail: CodexTail | null;
}

export interface CodexEntry {
  id: string;
  name: string;
  fullName?: string;
  rider: string;
  /** The book the dragon first flies in. */
  from: Book;
  /** In book order, the first starting at `from`. */
  looks: Look[];
  /** What the bond gave the rider, sealed until the reader breaks the seal. */
  signet?: { label: string; text: string };
  /** The reader's own dragon from the Threshing. */
  own?: boolean;
}

export const COLOUR_INFO: Record<CodexColour, { name: string; body: string; rim: string }> = {
  black: { name: 'Black', body: '#16191f', rim: '#bfc8d6' },
  navy: { name: 'Navy blue', body: '#132a52', rim: '#7fb2e5' },
  blue: { name: 'Blue', body: '#1a3a6b', rim: '#8cc0f0' },
  green: { name: 'Green', body: '#1d5238', rim: '#8fe0b0' },
  red: { name: 'Red', body: '#7a1f1a', rim: '#ff8a80' },
  orange: { name: 'Orange', body: '#a3511a', rim: '#ffb070' },
  brown: { name: 'Brown', body: '#5a4027', rim: '#d9b48a' },
  gold: { name: 'Gold', body: '#b8862b', rim: '#ffe08a' },
  iridescent: { name: 'Iridescent', body: '#241c3a', rim: '#c7b8ff' },
};

export const TAIL_INFO: Record<CodexTail, { name: string; text: string }> = {
  morningstartail: { name: 'Morningstartail', text: 'A spiked ball at the end of the tail, swung like a mace.' },
  clubtail: { name: 'Clubtail', text: 'A heavy knot of bone, built for crushing blows.' },
  daggertail: { name: 'Daggertail', text: 'A short, sharp point: quick, light and precise.' },
  swordtail: { name: 'Swordtail', text: 'A long flat blade that cuts on every swing.' },
  scorpiontail: { name: 'Scorpiontail', text: 'Curled high over the back, striking down with a barbed tip.' },
  feathertail: { name: 'Feathertail', text: 'No weapon at all: a fan of soft plates.' },
};

const SIGNET = "Rider's signet";

export const DRAGONS: CodexEntry[] = [
  {
    id: 'tairn',
    name: 'Tairn',
    fullName: 'Tairneanach',
    rider: 'Violet Sorrengail',
    from: 1,
    looks: [{ from: 1, colour: 'black', tail: 'morningstartail' }],
    signet: { label: SIGNET, text: 'Lightning wielding' },
  },
  {
    id: 'sgaeyl',
    name: 'Sgaeyl',
    rider: 'Xaden Riorson',
    from: 1,
    looks: [{ from: 1, colour: 'navy', tail: 'daggertail' }],
    signet: { label: SIGNET, text: 'Shadow wielding' },
  },
  {
    id: 'andarna',
    name: 'Andarna',
    rider: 'Violet Sorrengail',
    from: 1,
    looks: [
      { from: 1, colour: 'gold', tail: 'feathertail' },
      { from: 2, colour: 'iridescent', tail: 'scorpiontail' },
    ],
    signet: { label: 'Her gift to her rider', text: 'Stopping time' },
  },
  {
    id: 'teine',
    name: 'Teine',
    rider: 'Mira Sorrengail',
    from: 1,
    looks: [{ from: 1, colour: 'green', tail: 'clubtail' }],
    signet: { label: SIGNET, text: 'Extending wards' },
  },
  {
    id: 'cath',
    name: 'Cath',
    rider: 'Dain Aetos',
    from: 1,
    looks: [{ from: 1, colour: 'red', tail: 'swordtail' }],
    signet: { label: SIGNET, text: 'Reading memories by touch' },
  },
  {
    id: 'deigh',
    name: 'Deigh',
    rider: 'Liam Mairi',
    from: 1,
    looks: [{ from: 1, colour: 'red', tail: 'daggertail' }],
    signet: { label: SIGNET, text: 'Farsight' },
  },
  {
    id: 'feirge',
    name: 'Feirge',
    rider: 'Rhiannon Matthias',
    from: 1,
    looks: [{ from: 1, colour: 'green', tail: 'daggertail' }],
    signet: { label: SIGNET, text: 'Summoning' },
  },
  {
    id: 'aotrom',
    name: 'Aotrom',
    rider: 'Ridoc Gamlyn',
    from: 1,
    looks: [{ from: 1, colour: 'brown', tail: 'swordtail' }],
    signet: { label: SIGNET, text: 'Ice wielding' },
  },
  {
    id: 'sliseag',
    name: 'Sliseag',
    rider: 'Sawyer Henrick',
    from: 1,
    looks: [{ from: 1, colour: 'red', tail: 'swordtail' }],
  },
  {
    id: 'codagh',
    name: 'Codagh',
    rider: 'General Melgren',
    from: 1,
    looks: [{ from: 1, colour: 'black', tail: 'swordtail' }],
    signet: { label: SIGNET, text: "Foreseeing a battle's outcome" },
  },
  {
    id: 'aimsir',
    name: 'Aimsir',
    rider: 'General Lilith Sorrengail',
    from: 1,
    looks: [{ from: 1, colour: 'brown', tail: null }],
    signet: { label: SIGNET, text: 'Storm wielding' },
  },
  {
    id: 'baide',
    name: 'Baide',
    rider: 'Jack Barlowe',
    from: 1,
    looks: [{ from: 1, colour: 'orange', tail: 'scorpiontail' }],
  },
  {
    id: 'chradh',
    name: 'Chradh',
    rider: 'Garrick Tavis',
    from: 1,
    looks: [{ from: 1, colour: 'brown', tail: 'scorpiontail' }],
  },
  {
    id: 'glane',
    name: 'Glane',
    rider: 'Imogen Cardulo',
    from: 1,
    looks: [{ from: 1, colour: 'orange', tail: 'daggertail' }],
  },
  {
    id: 'thoirt',
    name: 'Thoirt',
    rider: 'Sloane Mairi',
    from: 2,
    looks: [{ from: 2, colour: 'red', tail: 'daggertail' }],
  },
];

export const OWN_ID = 'yours';

/** The reader's own Threshing dragon, as a Codex entry. */
export function fromBond(bond: Bond): CodexEntry {
  return {
    id: OWN_ID,
    name: bond.dragonName,
    rider: bond.rider || 'You',
    from: 1,
    looks: [{ from: 1, colour: bond.colour, tail: bond.tail }],
    signet: { label: SIGNET, text: bond.signet.name },
    own: true,
  };
}

/** How a dragon looks to a reader who has read up to `book`. */
export function lookAt(entry: CodexEntry, book: Book): Look {
  let look = entry.looks[0];
  for (const next of entry.looks) if (next.from <= book) look = next;
  return look;
}

/** "Black morningstartail", or just "Brown" when the tail isn't recorded. */
export function breed(look: Look): string {
  const colour = COLOUR_INFO[look.colour].name;
  return look.tail ? `${colour} ${TAIL_INFO[look.tail].name.toLowerCase()}` : colour;
}

/** The dragons a reader at `book` can see, their own first. */
export function roster(book: Book, own: CodexEntry | null): CodexEntry[] {
  const open = DRAGONS.filter((d) => d.from <= book);
  return own ? [own, ...open] : open;
}

export const DEFAULT_PAIR: [string, string] = ['tairn', 'sgaeyl'];

/**
 * The two dragons to compare, from `?a=…&b=…`. Unknown or sealed ids fall back
 * to the defaults, and the two sides never show the same dragon.
 */
export function pickPair(search: string, list: CodexEntry[]): [CodexEntry, CodexEntry] {
  const params = new URLSearchParams(search);
  const find = (id: string | null) => list.find((d) => d.id === id);
  const fallback = (not?: CodexEntry) => list.find((d) => d !== not && DEFAULT_PAIR.includes(d.id) && !d.own) ?? list.find((d) => d !== not)!;
  const a = find(params.get('a')) ?? fallback();
  let b = find(params.get('b'));
  if (!b || b === a) b = fallback(a);
  return [a, b];
}
