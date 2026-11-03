import type { DragonColours } from '../components/art/Dragon';

/**
 * The Threshing: six questions, then a dragon chooses you. The result depends
 * only on the answers and the rider's name, so a saved bond can be rebuilt
 * exactly, and two friends who answer alike can still be chosen differently.
 * The colour notes and signets are this Archive's own, not quotes from the books.
 */

export type DragonColour = 'red' | 'green' | 'blue' | 'orange' | 'brown' | 'black';
export type Tail = 'swordtail' | 'clubtail' | 'daggertail' | 'scorpiontail' | 'morningstartail';

interface Answer {
  text: string;
  /** The colour this answer pulls hardest toward, then a weaker second. */
  colours: [DragonColour, DragonColour?];
  tail: Tail;
}

export interface Question {
  prompt: string;
  answers: Answer[];
}

export const QUESTIONS: Question[] = [
  {
    prompt: 'The Parapet is slick with rain. How do you cross?',
    answers: [
      { text: 'Fast and sure, before fear can catch me', colours: ['red', 'orange'], tail: 'swordtail' },
      { text: 'Slowly. I test every step', colours: ['green', 'brown'], tail: 'clubtail' },
      { text: 'I watch who falls and learn from them', colours: ['black', 'blue'], tail: 'scorpiontail' },
      { text: 'I help the cadet frozen in front of me', colours: ['brown', 'green'], tail: 'clubtail' },
    ],
  },
  {
    prompt: 'Someone threatens your squad. You…',
    answers: [
      { text: 'Strike first', colours: ['red', 'blue'], tail: 'swordtail' },
      { text: 'Make a plan they never see coming', colours: ['green', 'black'], tail: 'scorpiontail' },
      { text: 'Stand in front of them', colours: ['brown', 'blue'], tail: 'clubtail' },
      { text: 'Do something nobody expects, including me', colours: ['orange'], tail: 'daggertail' },
    ],
  },
  {
    prompt: 'Where would we find you on a free evening at Basgiath?',
    answers: [
      { text: 'In the Archives, long after midnight', colours: ['green', 'black'], tail: 'scorpiontail' },
      { text: 'On the flight field, watching the sky', colours: ['blue', 'red'], tail: 'daggertail' },
      { text: 'On the sparring mat', colours: ['red', 'orange'], tail: 'swordtail' },
      { text: 'In the infirmary, helping out', colours: ['brown', 'green'], tail: 'clubtail' },
    ],
  },
  {
    prompt: 'What do you want a dragon to see in you?',
    answers: [
      { text: 'Courage', colours: ['red', 'blue'], tail: 'swordtail' },
      { text: 'Cunning', colours: ['black', 'green'], tail: 'scorpiontail' },
      { text: 'Loyalty', colours: ['brown', 'blue'], tail: 'clubtail' },
      { text: 'Fire', colours: ['orange', 'red'], tail: 'daggertail' },
    ],
  },
  {
    prompt: 'A storm breaks over the cliffs. You feel…',
    answers: [
      { text: 'Alive', colours: ['orange', 'blue'], tail: 'daggertail' },
      { text: 'Focused', colours: ['green', 'black'], tail: 'scorpiontail' },
      { text: 'Ready to fight it', colours: ['blue', 'red'], tail: 'swordtail' },
      { text: 'Calm. Storms pass.', colours: ['brown', 'green'], tail: 'clubtail' },
    ],
  },
  {
    prompt: 'The field goes silent. A dragon lowers its head toward you. You…',
    answers: [
      { text: 'Hold its gaze', colours: ['black', 'red'], tail: 'morningstartail' },
      { text: 'Bow', colours: ['brown', 'green'], tail: 'clubtail' },
      { text: 'Step closer', colours: ['blue', 'orange'], tail: 'daggertail' },
      { text: 'Speak first', colours: ['orange', 'red'], tail: 'swordtail' },
    ],
  },
];

export interface ColourInfo {
  name: string;
  note: string;
  /** Glow for the eyes, the card and accents. */
  glow: string;
  art: DragonColours;
}

export const COLOURS: Record<DragonColour, ColourInfo> = {
  red: {
    name: 'Red',
    note: 'Fierce and proud. Reds choose riders who move before fear can catch them.',
    glow: '#ff6a4d',
    art: { body: '#5e1714', wing: '#6e1c18', bone: '#9b3a30', rim: '#ff8a80', eye: '#f2c46b' },
  },
  green: {
    name: 'Green',
    note: 'Clear-headed and patient. Greens choose riders who think three moves ahead.',
    glow: '#6fd39a',
    art: { body: '#123826', wing: '#174430', bone: '#2e6b4c', rim: '#8fe0b0', eye: '#f2c46b' },
  },
  blue: {
    name: 'Blue',
    note: 'Strong and steady in a fight. Blues choose riders who never break formation.',
    glow: '#8fc4ff',
    art: { body: '#0c1a33', wing: '#10213f', bone: '#24406b', rim: '#7fb2e5', eye: '#f2c46b' },
  },
  orange: {
    name: 'Orange',
    note: 'Wild and impossible to predict. Oranges choose riders who are a little dangerous.',
    glow: '#ff9a3c',
    art: { body: '#6b3410', wing: '#7c3d14', bone: '#b0622c', rim: '#ffb070', eye: '#f2c46b' },
  },
  brown: {
    name: 'Brown',
    note: 'Loyal to the bone. Browns choose riders who would stand in front of anyone.',
    glow: '#d9a46a',
    art: { body: '#3b2a1a', wing: '#46321f', bone: '#6e5236', rim: '#d9b48a', eye: '#f2c46b' },
  },
  black: {
    name: 'Black',
    note: 'Rare and ancient. Blacks almost never choose. When one does, the whole field notices.',
    glow: '#c9d2e0',
    art: { body: '#04060a', wing: '#070a10', bone: '#1e2738', rim: '#bfc8d6', eye: '#f2c46b' },
  },
};

export interface Signet {
  name: string;
  text: string;
}

export const SIGNETS: Signet[] = [
  { name: 'Wind wielding', text: 'You can call a gust strong enough to knock a rider from the sky.' },
  { name: 'Water wielding', text: 'You pull rain from the clouds and turn it into a wall.' },
  { name: 'Stone shaping', text: 'Rock bends like clay for you. Walls rise in a heartbeat.' },
  { name: 'Ember calling', text: 'You draw fire out of nothing and shape it in your hands.' },
  { name: 'Mending', text: 'You close wounds and set bones with a touch.' },
  { name: 'Farsight', text: 'You see through the eyes of the wind, miles from where you stand.' },
  { name: 'Mind shielding', text: 'No one reads your thoughts unless you let them.' },
  { name: 'Beast speaking', text: 'Every creature in the Vale understands you.' },
  { name: 'Frost forming', text: 'Rivers and breath alike freeze at your command.' },
  { name: 'Truthsense', text: 'You always know when someone is lying to you.' },
];

/** About one rider in twenty. */
export const RARE_SIGNET: Signet = {
  name: 'Storm calling',
  text: 'Lightning answers when you call it. The Archive holds only a handful of records like yours.',
};
const RARE_CHANCE = 0.05;

const WINGS = ['First Wing', 'Second Wing', 'Third Wing', 'Fourth Wing'];
const SECTIONS = ['Flame Section', 'Claw Section', 'Tail Section'];

const NAME_STARTS = ['Fa', 'Cael', 'Mor', 'Dub', 'Ruai', 'Bran', 'Lir', 'Eith', 'Gorm', 'Niam', 'Aod', 'Ciar', 'Fion', 'Tor', 'Sea', 'Ul'];
const NAME_ENDS = ['nn', 'ach', 'ir', 'eal', 'agh', 'ra', 'wyn', 'dh', 'th', 'an', 'aen', 'oth'];
/** Generated names must never collide with a dragon from the books. */
const BOOK_DRAGONS = new Set(['tairn', 'sgaeyl', 'andarna', 'teine', 'cath', 'deigh', 'codagh', 'tauri', 'molvic', 'sliseag', 'aimsir', 'chradh', 'fuil', 'kaori']);

export interface Bond {
  rider: string;
  colour: DragonColour;
  tail: Tail;
  dragonName: string;
  signet: Signet;
  rare: boolean;
  wing: string;
}

/** FNV-1a: a small, stable string hash. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: a seeded random generator, so results repeat exactly. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isComplete(answers: number[]): boolean {
  return (
    answers.length === QUESTIONS.length &&
    answers.every((a, i) => Number.isInteger(a) && a >= 0 && a < QUESTIONS[i].answers.length)
  );
}

/** Highest score wins; small seeded jitter (always under one point) settles ties. */
function winner<K extends string>(scores: Record<K, number>, random: () => number): K {
  const keys = Object.keys(scores) as K[];
  return keys
    .map((key) => ({ key, score: scores[key] + random() * 0.5 }))
    .sort((a, b) => b.score - a.score)[0].key;
}

function dragonName(random: () => number): string {
  for (;;) {
    const name = NAME_STARTS[Math.floor(random() * NAME_STARTS.length)] + NAME_ENDS[Math.floor(random() * NAME_ENDS.length)];
    if (!BOOK_DRAGONS.has(name.toLowerCase())) return name;
  }
}

export function tidyRider(input: string): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, 24).trim();
}

/** Which dragon chooses this rider. Answers are indexes into each question's answers. */
export function choose(answers: number[], riderInput: string): Bond {
  if (!isComplete(answers)) throw new Error('Every question needs an answer');
  const rider = tidyRider(riderInput) || 'Cadet';
  const random = seeded(hash(`${rider.toLowerCase()}|${answers.join(',')}`));

  const colours: Record<DragonColour, number> = { red: 0, green: 0, blue: 0, orange: 0, brown: 0, black: 0 };
  const tails: Record<Tail, number> = { swordtail: 0, clubtail: 0, daggertail: 0, scorpiontail: 0, morningstartail: 0 };
  answers.forEach((pick, i) => {
    const answer = QUESTIONS[i].answers[pick];
    colours[answer.colours[0]] += 2;
    if (answer.colours[1]) colours[answer.colours[1]] += 1;
    tails[answer.tail] += 1;
  });

  const colour = winner(colours, random);
  const tail = winner(tails, random);
  const name = dragonName(random);
  const rare = random() < RARE_CHANCE;
  const signet = rare ? RARE_SIGNET : SIGNETS[Math.floor(random() * SIGNETS.length)];
  const wing = `${WINGS[Math.floor(random() * WINGS.length)]} · ${SECTIONS[Math.floor(random() * SECTIONS.length)]}`;

  return { rider, colour, tail, dragonName: name, signet, rare, wing };
}

/** "a red swordtail" / "an orange daggertail" */
export function describe(bond: Pick<Bond, 'colour' | 'tail'>): string {
  const colour = COLOURS[bond.colour].name.toLowerCase();
  return `${colour === 'orange' ? 'an' : 'a'} ${colour} ${bond.tail}`;
}

/* Remembering a bond between visits: only the inputs are stored, and the bond is rebuilt. */

export const BOND_KEY = 'scribe-archive:bond';

export interface SavedBond {
  rider: string;
  answers: number[];
}

export function parseSavedBond(raw: string | null | undefined): SavedBond | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { rider, answers } = value as Record<string, unknown>;
    if (typeof rider !== 'string' || !Array.isArray(answers)) return null;
    const picks = answers.map(Number);
    return isComplete(picks) ? { rider, answers: picks } : null;
  } catch {
    return null;
  }
}

export function loadBond(): SavedBond | null {
  try {
    return parseSavedBond(localStorage.getItem(BOND_KEY));
  } catch {
    return null;
  }
}

export function saveBond(saved: SavedBond | null): void {
  try {
    if (saved) localStorage.setItem(BOND_KEY, JSON.stringify(saved));
    else localStorage.removeItem(BOND_KEY);
  } catch {
    // The bond still shows for this visit.
  }
}
