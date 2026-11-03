/** A line of text drawn on an exported image. */
export interface TextLine {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: number;
  /** A full CSS font stack, e.g. "Cinzel, Georgia, serif". */
  family: string;
  italic?: boolean;
  colour: string;
  opacity: number;
  letterSpacing: number;
  align: 'left' | 'center';
}

/** JPEG, not PNG: the film grain makes lossless files over 5 MB, too heavy for phones. */
export const IMAGE_TYPE = 'image/jpeg';
const IMAGE_QUALITY = 0.92;

/** Where to draw a line's x so letter-spaced, centred text sits truly centred. */
export function textX(line: TextLine): number {
  // Letter spacing also trails the last letter; nudge centred text back by half of it.
  return line.align === 'center' ? line.x + line.letterSpacing / 2 : line.x;
}

export function fontOf(line: TextLine): string {
  return `${line.italic ? 'italic ' : ''}${line.weight} ${line.size}px ${line.family}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The artwork could not be drawn'));
    image.src = src;
  });
}

/**
 * Draws an on-page SVG at full size and writes its text on top. Text goes on
 * the canvas because an SVG drawn as an image can't use the page's web fonts,
 * so the SVG's own preview text (marked data-text) is left out of the drawing.
 */
export async function renderImage(
  svg: SVGSVGElement,
  size: { width: number; height: number },
  lines: TextLine[],
): Promise<Blob> {
  const { width, height } = size;
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
    const font = fontOf(line);
    await document.fonts.load(font, line.text);
    ctx.font = font;
    ctx.fillStyle = line.colour;
    ctx.globalAlpha = line.opacity;
    ctx.textAlign = line.align;
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${line.letterSpacing}px`;
    ctx.fillText(line.text, textX(line), line.y);
  }
  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The image could not be saved'))),
      IMAGE_TYPE,
      IMAGE_QUALITY,
    ),
  );
}
