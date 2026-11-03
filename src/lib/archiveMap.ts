import type { Book } from './spoilers';

/**
 * The Archive map: a stylised, fan-made Navarre and Poromiel, not the books'
 * official map. Everything is in map units: x runs west to east (about −45 to
 * 45), z north to south (about −25 to 27), and height is y. The land is shaped
 * by a few smooth functions so the terrain, the ward line and the pins all
 * agree on where the ground is.
 */

export interface Place {
  id: string;
  name: string;
  kind: string;
  x: number;
  z: number;
  /** The book a reader must reach before this place is unsealed. */
  from: Book;
  text: string;
}

export const PLACES: Place[] = [
  {
    id: 'basgiath',
    name: 'Basgiath War College',
    kind: 'War college',
    x: -16,
    z: 1,
    from: 1,
    text: 'Where riders are made, or buried. Home of the Parapet, the Threshing and the Gauntlet.',
  },
  {
    id: 'calldyr',
    name: 'Calldyr',
    kind: 'Capital',
    x: -30,
    z: -9,
    from: 1,
    text: 'The seat of the crown, far from the border and the things that come across it.',
  },
  { id: 'montserrat', name: 'Montserrat', kind: 'Border outpost', x: -3, z: -14, from: 1, text: 'A northern outpost on the edge of Navarre.' },
  {
    id: 'vale',
    name: 'The Vale',
    kind: 'Dragon territory',
    x: -10,
    z: 8,
    from: 1,
    text: 'Where the dragons live. Cadets do not walk in uninvited.',
  },
  { id: 'athebyne', name: 'Athebyne', kind: 'Eastern outpost', x: 14, z: 6, from: 1, text: 'An outpost past the cliffs. Remember the name.' },
  { id: 'aretia', name: 'Aretia', kind: 'City', x: 0, z: 17, from: 2, text: 'A city that was supposed to be gone.' },
  { id: 'samara', name: 'Samara', kind: 'Outpost', x: -25, z: 12, from: 2, text: 'Another station on the long defensive line.' },
];

export const WARD_STATUS: Record<Book, string> = {
  1: 'The wards hold.',
  2: 'Something gets through.',
  3: 'Read Onyx Storm first.',
};

export function isUnsealed(place: Place, book: Book): boolean {
  return book >= place.from;
}

/* Terrain */

/** A repeatable pseudo-random value for each grid cell. */
function cell(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fz = smooth(z - iz);
  const a = cell(ix, iz);
  const b = cell(ix + 1, iz);
  const c = cell(ix, iz + 1);
  const d = cell(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Layered noise in 0..1: broad shapes plus finer detail. */
function fbm(x: number, z: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    sum += amp * valueNoise(x * freq, z * freq);
    amp /= 2;
    freq *= 2;
  }
  return sum / 0.9375;
}

/** The spine of the cliffs that split Navarre from Poromiel, as an x for each z. */
export function ridgeX(z: number): number {
  return 8 + 2.5 * Math.sin(z * 0.16) + 1.2 * Math.sin(z * 0.45 + 1);
}

/** The ward line runs just west of the cliffs. */
export function wardX(z: number): number {
  return ridgeX(z) - 3.2;
}

/** Positive on land, negative at sea; roughly how far inland a point is. */
export function landness(x: number, z: number): number {
  const dx = x / 44;
  const dz = (z - 1) / 25;
  const angle = Math.atan2(dz, dx);
  const wobble = 1 + 0.1 * Math.sin(3 * angle + 1) + 0.07 * Math.sin(5 * angle + 2) + 0.06 * (fbm(x * 0.12, z * 0.12) - 0.5);
  return 1 - (dx * dx + dz * dz) * wobble;
}

export const SEA_LEVEL = 0;
const SHORE = 0.15;

/** Sharp-crested noise for mountain peaks: 1 along ridges, falling away either side. */
function ridged(x: number, z: number): number {
  const n = 1 - Math.abs(2 * fbm(x, z) - 1);
  return n * n;
}

/** The northern range: a band of peaks across the west, fading out before Montserrat. */
function northRange(x: number, z: number): number {
  const spine = -16 + 3 * Math.sin(x * 0.1);
  const across = Math.exp(-((z - spine) ** 2) / (2 * 3.2 * 3.2));
  const along = smooth(Math.max(0, Math.min(1, (-x - 6) / 10)));
  return across * along * (4 + 5 * ridged(x * 0.18 + 7, z * 0.18));
}

/** The river's course, from the northern range past the Vale to the southern sea. */
export const RIVER: [number, number][] = [
  [-26, -12],
  [-21, -4],
  [-19, 6],
  [-17, 14],
  [-14, 22],
  [-12, 30],
];

/** Distance from a point to the river's centre line. */
export function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i];
    const [bx, bz] = RIVER[i + 1];
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)));
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), z - (az + t * (bz - az))));
  }
  return best;
}

/**
 * Ground height at a point: sea floor offshore; rolling hills inland; the
 * northern range and the cliffs high; the Vale sunk low; and a river bed cut
 * just below sea level, so the sea shows through it as water.
 */
export function heightAt(x: number, z: number): number {
  const land = landness(x, z);
  if (land <= 0) return Math.max(-3, land * 8) - 0.2;
  const coast = smooth(Math.min(1, land / 0.18));
  const hills = coast * (0.4 + 2.6 * fbm(x * 0.07 + 3, z * 0.07 - 2));
  const d = x - ridgeX(z);
  const cliffs = coast * Math.exp(-(d * d) / (2 * 2.4 * 2.4)) * (8 + 6 * ridged(z * 0.22, 1.3));
  const north = coast * northRange(x, z);
  const vale = -2.6 * Math.exp(-((x + 10) ** 2 + (z - 8) ** 2) / 40);
  const ground = Math.max(SHORE, hills + cliffs + north + vale);
  const bed = smooth(Math.max(0, 1 - riverDistance(x, z) / 1.1));
  return ground - bed * (ground + 0.35);
}

/** Fine 0..1 variation for colouring the ground, so no two hillsides are quite the same shade. */
export function grain(x: number, z: number): number {
  return fbm(x * 0.55 + 11, z * 0.55 - 4);
}

/** How steep the ground is: 0 flat, approaching 1 for cliff faces. */
export function slopeAt(x: number, z: number): number {
  const e = 0.35;
  const dx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e);
  const dz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
  return 1 - 1 / Math.sqrt(1 + dx * dx + dz * dz);
}

/** Where pines grow: patches of forest on gentle, dry, lowland ground, kept clear of towns and the river. */
export function forestSpots(): { x: number; z: number; scale: number; shade: number }[] {
  const spots: { x: number; z: number; scale: number; shade: number }[] = [];
  const step = 0.85;
  for (let gx = -46; gx <= 46; gx += step) {
    for (let gz = -26; gz <= 28; gz += step) {
      const jx = gx + (cell(Math.round(gx * 10), Math.round(gz * 10)) - 0.5) * step;
      const jz = gz + (cell(Math.round(gz * 10) + 7, Math.round(gx * 10)) - 0.5) * step;
      if (landness(jx, jz) < 0.08) continue;
      if (fbm(jx * 0.11 + 20, jz * 0.11) < 0.52) continue;
      const h = heightAt(jx, jz);
      if (h < 0.6 || h > 5.5) continue;
      if (slopeAt(jx, jz) > 0.22) continue;
      if (riverDistance(jx, jz) < 1.8) continue;
      if (PLACES.some((p) => Math.hypot(p.x - jx, p.z - jz) < 2.6)) continue;
      const r = cell(Math.round(jx * 31), Math.round(jz * 17));
      spots.push({ x: jx, z: jz, scale: 0.7 + r * 0.6, shade: r });
    }
  }
  return spots;
}
