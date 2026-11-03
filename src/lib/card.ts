import type { TextLine } from './render';
import { COLOURS, type Bond } from './threshing';

/** A phone story: what readers post to TikTok and Instagram. */
export const CARD = { width: 1080, height: 1920 };

const CINZEL = 'Cinzel, Georgia, serif';
const LORE = "'Cormorant Garamond', Georgia, serif";
const UI = 'Inter, system-ui, sans-serif';
const INK = '#f2eee6';
const RARE_GOLD = '#f2c46b';

/** Long names shrink so they never run off the card. */
export function riderSize(rider: string): number {
  return Math.min(92, Math.floor(980 / (Math.max(rider.length, 1) * 0.82)));
}

/** The words on a rider card. `site` is where friends can find their own dragon. */
export function cardText(bond: Bond, site: string): TextLine[] {
  const glow = COLOURS[bond.colour].glow;
  const line = (text: string, y: number, rest: Partial<TextLine> = {}): TextLine => ({
    text,
    x: CARD.width / 2,
    y,
    size: 40,
    weight: 700,
    family: CINZEL,
    colour: INK,
    opacity: 1,
    letterSpacing: 0,
    align: 'center',
    ...rest,
  });
  const rider = bond.rider.toUpperCase();
  return [
    line('THE THRESHING', 200, { size: 34, colour: glow, letterSpacing: 14 }),
    line(rider, 330, { size: riderSize(rider), weight: 900, letterSpacing: 4 }),
    line('was chosen by', 410, { size: 50, weight: 500, family: LORE, italic: true, opacity: 0.8 }),
    line(bond.dragonName, 1290, { size: 140, weight: 900, letterSpacing: 4 }),
    line(`${COLOURS[bond.colour].name} ${bond.tail}`.toUpperCase(), 1370, { size: 36, weight: 500, letterSpacing: 12, opacity: 0.75 }),
    line(bond.rare ? 'RARE SIGNET' : 'SIGNET', 1500, { size: 24, weight: 600, family: UI, colour: bond.rare ? RARE_GOLD : glow, letterSpacing: 8 }),
    line(bond.signet.name.toUpperCase(), 1570, { size: 52, letterSpacing: 6, colour: bond.rare ? RARE_GOLD : INK }),
    line(bond.wing.toUpperCase(), 1640, { size: 28, weight: 500, letterSpacing: 8, opacity: 0.65 }),
    line(`Find your dragon · ${site}`, 1850, { size: 28, weight: 400, family: UI, opacity: 0.6, letterSpacing: 1 }),
  ];
}

export function cardFileName(bond: Bond): string {
  const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cadet';
  return `scribe-archive-${slug(bond.rider)}-${slug(bond.dragonName)}.jpg`;
}
