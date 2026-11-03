import { hash, seeded } from './seeded';
import type { DragonColour } from './threshing';

/**
 * Relic marks: a swirling mark drawn from the reader's name, to try on with
 * the camera. The same name always draws the same mark; "Redraw" steps to the
 * next variant. The design is the Archive's own, not a copy of any book art.
 */

/** The mark's own box: tall and narrow, to run along a forearm. */
export const RELIC_WIDTH = 240;
export const RELIC_HEIGHT = 640;
/** Room kept clear at the edges so the glow isn't clipped. */
const MARGIN = 14;

export interface Point {
  x: number;
  y: number;
}

export interface RelicMark {
  /** The main line, bottom to top. */
  stem: Point[];
  /** Spirals curling off the stem. */
  curls: Point[][];
  /** Short hooked strokes. */
  flicks: Point[][];
  dots: (Point & { r: number })[];
}

/** Names are matched loosely, so "Violet " and "violet" share a mark. */
export function normaliseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase() || 'rider';
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const inside = (p: Point): Point => ({
  x: clamp(p.x, MARGIN, RELIC_WIDTH - MARGIN),
  y: clamp(p.y, MARGIN, RELIC_HEIGHT - MARGIN),
});

/** A spiral that leaves `start` heading outward on `side`, then rolls in on itself. */
function curl(start: Point, side: 1 | -1, size: number, turns: number): Point[] {
  const centre = {
    x: clamp(start.x + side * size, MARGIN + size, RELIC_WIDTH - MARGIN - size),
    y: start.y - size * 0.35,
  };
  const startAngle = Math.atan2(start.y - centre.y, start.x - centre.x);
  const radius0 = Math.hypot(start.x - centre.x, start.y - centre.y);
  const steps = 56;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Turning against the side it leaves on makes the curl roll up, not down.
    const angle = startAngle - side * t * turns * Math.PI * 2;
    const r = radius0 * (1 - 0.86 * t);
    points.push(inside({ x: centre.x + Math.cos(angle) * r, y: centre.y + Math.sin(angle) * r }));
  }
  return points;
}

export function drawRelic(name: string, variant = 0): RelicMark {
  const random = seeded(hash(`${normaliseName(name)}#${variant}`));
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);

  // The stem sways from side to side as it climbs.
  const count = 6 + Math.floor(random() * 2);
  let side: 1 | -1 = random() < 0.5 ? 1 : -1;
  const stem: Point[] = [];
  for (let i = 0; i < count; i++) {
    const y = RELIC_HEIGHT - 36 - (i / (count - 1)) * (RELIC_HEIGHT - 80);
    const sway = i === 0 || i === count - 1 ? between(0, 12) : between(14, 40);
    stem.push(inside({ x: RELIC_WIDTH / 2 + side * sway, y }));
    side = side === 1 ? -1 : 1;
  }

  // Curls leave from the stem's bends, toward the open side.
  const curls: Point[][] = [];
  const flicks: Point[][] = [];
  const dots: (Point & { r: number })[] = [];
  for (let i = 1; i < count; i++) {
    const p = stem[i];
    const out: 1 | -1 = p.x >= RELIC_WIDTH / 2 ? 1 : -1;
    const top = i === count - 1;
    if (top || random() < 0.7) {
      const size = top ? between(18, 26) : between(22, 40);
      const spiral = curl(p, out, size, top ? between(1.1, 1.4) : between(1.2, 1.75));
      curls.push(spiral);
      const end = spiral[spiral.length - 1];
      if (random() < 0.6) dots.push({ ...inside({ x: end.x + out * between(14, 22), y: end.y - between(8, 18) }), r: between(2.4, 4) });
    } else {
      // A quick hook on the other side.
      const back = -out as 1 | -1;
      flicks.push([p, inside({ x: p.x + back * between(16, 24), y: p.y - between(10, 18) }), inside({ x: p.x + back * between(26, 36), y: p.y - between(0, 8) })]);
    }
  }
  // A hook near the base, where the mark starts.
  const base = stem[0];
  flicks.push([base, inside({ x: base.x - 18, y: base.y + 4 }), inside({ x: base.x - 26, y: base.y - 10 })]);

  return { stem, curls, flicks, dots };
}

const f = (n: number) => Math.round(n * 10) / 10;

/** A smooth line through every point (Catmull-Rom as cubic Béziers). */
export function smoothPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M${f(points[0].x)},${f(points[0].y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)},${f(c1.y)} ${f(c2.x)},${f(c2.y)} ${f(p2.x)},${f(p2.y)}`;
  }
  return d;
}

/** A three-point hook as one quadratic curve. */
export function hookPath([a, b, c]: Point[]): string {
  return `M${f(a.x)},${f(a.y)} Q${f(b.x)},${f(b.y)} ${f(c.x)},${f(c.y)}`;
}

export type InkId = 'ink' | 'gold' | 'storm' | 'red' | 'green';

export const INKS: Record<InkId, { name: string; line: string; glow: string | null }> = {
  ink: { name: 'Ink', line: '#15110e', glow: null },
  gold: { name: 'Ember', line: '#ffd88a', glow: '#f2c46b' },
  storm: { name: 'Storm', line: '#cdeaff', glow: '#7fb2e5' },
  red: { name: 'Red', line: '#ffb3a8', glow: '#ff6b5e' },
  green: { name: 'Green', line: '#c4f2d6', glow: '#7fe0a6' },
};

/** A glow to match the reader's Threshing dragon; black dragons get true ink. */
export function inkFor(colour: DragonColour | null): InkId {
  switch (colour) {
    case 'black':
      return 'ink';
    case 'blue':
      return 'storm';
    case 'red':
      return 'red';
    case 'green':
      return 'green';
    default:
      return 'gold';
  }
}

export interface Stroke {
  d: string;
  width: number;
}

/** Every line of a mark as SVG path data, thickest first; shared by the page and the photo. */
export function relicStrokes(mark: RelicMark): { lines: Stroke[]; dots: (Point & { r: number })[] } {
  return {
    lines: [
      { d: smoothPath(mark.stem), width: 6 },
      ...mark.curls.map((c) => ({ d: smoothPath(c), width: 4 })),
      ...mark.flicks.map((h) => ({ d: hookPath(h), width: 3.2 })),
    ],
    dots: mark.dots,
  };
}

/**
 * The mark as a standalone SVG document, for drawing onto a photo: a soft
 * glow under the lines for the coloured inks, a faint bleed for plain ink.
 */
export function relicMarkup(mark: RelicMark, ink: InkId, width: number, height: number): string {
  const { line, glow } = INKS[ink];
  const { lines, dots } = relicStrokes(mark);
  const paths = (scale: number) => lines.map((s) => `<path d="${s.d}" stroke-width="${f(s.width * scale)}"/>`).join('');
  const circles = (grow: number) => dots.map((p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r + grow)}"/>`).join('');
  const under = glow
    ? `<g filter="url(#soft)" stroke="${glow}" fill="${glow}" opacity="0.9">${paths(2.6)}${circles(3)}</g>`
    : `<g filter="url(#soft)" stroke="${line}" fill="${line}" opacity="0.35">${paths(1.6)}${circles(1)}</g>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${RELIC_WIDTH} ${RELIC_HEIGHT}" width="${Math.round(width)}" height="${Math.round(height)}">` +
    `<defs><filter id="soft" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="${glow ? 6 : 1.4}"/></filter></defs>` +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${under}` +
    `<g stroke="${line}" fill="${line}" opacity="${glow ? 1 : 0.88}">${paths(1)}${circles(0)}</g></g></svg>`
  );
}
