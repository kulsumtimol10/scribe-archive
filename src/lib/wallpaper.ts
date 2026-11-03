import type { DragonColours } from '../components/art/Dragon';
import type { TextLine } from './render';
import { COLOURS, type Bond } from './threshing';

export type WallpaperFormat = 'phone' | 'desktop';

/** Export sizes: a large modern phone screen, and 1440p for desktops (both scale down cleanly). */
export const FORMATS: Record<WallpaperFormat, { width: number; height: number; label: string }> = {
  phone: { width: 1290, height: 2796, label: 'Phone' },
  desktop: { width: 2560, height: 1440, label: 'Desktop' },
};

export type DragonId = 'tairn' | 'sgaeyl' | 'andarna' | 'mine';

export interface WallpaperDragon {
  name: string;
  line: string;
  swatch: string;
  colours: DragonColours;
}

export const DRAGONS: Record<DragonId, WallpaperDragon> = {
  tairn: {
    name: 'Tairn',
    line: 'BLACK MORNINGSTARTAIL',
    swatch: '#111418',
    colours: { body: '#04060a', wing: '#070a10', bone: '#1e2738', rim: '#bfc8d6', eye: '#f2c46b' },
  },
  sgaeyl: {
    name: 'Sgaeyl',
    line: 'NAVY DAGGERTAIL',
    swatch: '#173057',
    colours: { body: '#0c1a33', wing: '#10213f', bone: '#24406b', rim: '#7fb2e5', eye: '#f2c46b' },
  },
  andarna: {
    name: 'Andarna',
    line: 'GOLDEN FEATHERTAIL',
    swatch: '#d9a441',
    colours: { body: '#7a5414', wing: '#8a6020', bone: '#b88a3c', rim: '#ffe3a0', eye: '#fff1c4' },
  },
  mine: {
    name: 'My dragon',
    line: 'RED SWORDTAIL',
    swatch: '#9b2a24',
    colours: COLOURS.red.art,
  },
};

/** The wallpaper dragons, with "My dragon" becoming the one that chose this reader at the Threshing. */
export function dragonsFor(bond: Bond | null): Record<DragonId, WallpaperDragon> {
  if (!bond) return DRAGONS;
  const colour = COLOURS[bond.colour];
  return {
    ...DRAGONS,
    mine: {
      name: bond.dragonName,
      line: `${colour.name} ${bond.tail}`.toUpperCase(),
      swatch: colour.glow,
      colours: colour.art,
    },
  };
}

export type SkyId = 'storm' | 'dawn' | 'vale';

export const SKIES: Record<SkyId, { name: string; top: string; mid: string; glow: string; moon: number; lightning: boolean }> = {
  storm: { name: 'Storm', top: '#0a1220', mid: '#22324a', glow: '#8fc4ff', moon: 0, lightning: true },
  dawn: { name: 'Dawn over Basgiath', top: '#1e1428', mid: '#c9744a', glow: '#ffc77a', moon: 0.5, lightning: false },
  vale: { name: 'The Vale', top: '#08130f', mid: '#2c4a3a', glow: '#b8f0d0', moon: 0.35, lightning: false },
};

const MAX_NAME = 18;

/** The rider name as printed: tidy, capitalised and short enough to fit. */
export function riderName(input: string): string {
  const name = input.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
  return name ? name.toUpperCase() : 'CADET';
}

const CINZEL = 'Cinzel, Georgia, serif';

/** The words on a wallpaper. The preview draws them as SVG; the export draws them on a canvas. */
export function wallpaperText(format: WallpaperFormat, name: string, dragonLine: string): TextLine[] {
  const base = { family: CINZEL, colour: '#ffffff' };
  if (format === 'phone') {
    return [
      { ...base, text: riderName(name), x: 645, y: 2606, size: 62, weight: 700, opacity: 0.92, letterSpacing: 21, align: 'center' },
      { ...base, text: dragonLine, x: 645, y: 2690, size: 34, weight: 500, opacity: 0.6, letterSpacing: 12, align: 'center' },
    ];
  }
  return [
    { ...base, text: riderName(name), x: 142, y: 1316, size: 56, weight: 700, opacity: 0.92, letterSpacing: 18, align: 'left' },
    { ...base, text: dragonLine, x: 142, y: 1376, size: 28, weight: 500, opacity: 0.6, letterSpacing: 10, align: 'left' },
  ];
}

export function wallpaperFileName(dragonName: string, sky: SkyId, format: WallpaperFormat): string {
  const slug = dragonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dragon';
  return `scribe-archive-${slug}-${sky}-${format}.jpg`;
}
