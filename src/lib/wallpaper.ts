import type { DragonColours } from '../components/art/Dragon';

export type WallpaperFormat = 'phone' | 'desktop';

/** Export sizes: a large modern phone screen, and 1440p for desktops (both scale down cleanly). */
export const FORMATS: Record<WallpaperFormat, { width: number; height: number; label: string }> = {
  phone: { width: 1290, height: 2796, label: 'Phone' },
  desktop: { width: 2560, height: 1440, label: 'Desktop' },
};

export type DragonId = 'tairn' | 'sgaeyl' | 'andarna' | 'red';

export const DRAGONS: Record<DragonId, { name: string; line: string; swatch: string; colours: DragonColours }> = {
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
  red: {
    name: 'My red',
    line: 'RED SWORDTAIL',
    swatch: '#9b2a24',
    colours: { body: '#5e1714', wing: '#6e1c18', bone: '#9b3a30', rim: '#ff8a80', eye: '#f2c46b' },
  },
};

export type SkyId = 'storm' | 'dawn' | 'vale';

export const SKIES: Record<SkyId, { name: string; top: string; mid: string; glow: string; moon: number; lightning: boolean }> = {
  storm: { name: 'Storm', top: '#0a1220', mid: '#22324a', glow: '#8fc4ff', moon: 0, lightning: true },
  dawn: { name: 'Dawn over Basgiath', top: '#1e1428', mid: '#c9744a', glow: '#ffc77a', moon: 0.5, lightning: false },
  vale: { name: 'The Vale', top: '#08130f', mid: '#2c4a3a', glow: '#b8f0d0', moon: 0.35, lightning: false },
};

export interface TextLine {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  family: string;
  colour: string;
  opacity: number;
  letterSpacing: number;
  align: 'left' | 'center';
}

const MAX_NAME = 18;

/** The rider name as printed: tidy, capitalised and short enough to fit. */
export function riderName(input: string): string {
  const name = input.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME).trim();
  return name ? name.toUpperCase() : 'CADET';
}

/** The words on a wallpaper. The preview draws them as SVG; the export draws them on a canvas. */
export function wallpaperText(format: WallpaperFormat, name: string, dragon: DragonId): TextLine[] {
  const base = { family: 'Cinzel', colour: '#ffffff' };
  if (format === 'phone') {
    return [
      { ...base, text: riderName(name), x: 645, y: 2606, size: 62, weight: 700, opacity: 0.92, letterSpacing: 21, align: 'center' },
      { ...base, text: DRAGONS[dragon].line, x: 645, y: 2690, size: 34, weight: 500, opacity: 0.6, letterSpacing: 12, align: 'center' },
    ];
  }
  return [
    { ...base, text: riderName(name), x: 142, y: 1316, size: 56, weight: 700, opacity: 0.92, letterSpacing: 18, align: 'left' },
    { ...base, text: DRAGONS[dragon].line, x: 142, y: 1376, size: 28, weight: 500, opacity: 0.6, letterSpacing: 10, align: 'left' },
  ];
}

export function wallpaperFileName(dragon: DragonId, sky: SkyId, format: WallpaperFormat): string {
  return `scribe-archive-${dragon}-${sky}-${format}.jpg`;
}

/** JPEG, not PNG: the film grain makes a lossless file over 5 MB, too heavy for phones. */
export const WALLPAPER_TYPE = 'image/jpeg';
const WALLPAPER_QUALITY = 0.92;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The wallpaper art could not be drawn'));
    image.src = src;
  });
}

/**
 * Draws the preview's art at full size and writes the text on top. Text goes
 * on the canvas because an SVG drawn as an image can't use the page's web fonts.
 */
export async function renderWallpaper(svg: SVGSVGElement, format: WallpaperFormat, lines: TextLine[]): Promise<Blob> {
  const { width, height } = FORMATS[format];
  const art = svg.cloneNode(true) as SVGSVGElement;
  art.querySelectorAll('[data-text]').forEach((node) => node.remove());
  art.setAttribute('width', String(width));
  art.setAttribute('height', String(height));
  art.removeAttribute('class');
  const markup = new XMLSerializer().serializeToString(art);
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot make images');
  ctx.drawImage(image, 0, 0, width, height);

  for (const line of lines) {
    const font = `${line.weight} ${line.size}px ${line.family}, Georgia, serif`;
    await document.fonts.load(font, line.text);
    ctx.font = font;
    ctx.fillStyle = line.colour;
    ctx.globalAlpha = line.opacity;
    ctx.textAlign = line.align;
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${line.letterSpacing}px`;
    // Canvas letter spacing also trails the last letter; nudge centred text back by half of it.
    const x = line.align === 'center' ? line.x + line.letterSpacing / 2 : line.x;
    ctx.fillText(line.text, x, line.y);
  }
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be saved'))),
      WALLPAPER_TYPE,
      WALLPAPER_QUALITY,
    ),
  );
}
