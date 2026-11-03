import { fontOf, IMAGE_QUALITY, IMAGE_TYPE, textX, type TextLine } from './render';
import { RELIC_HEIGHT, RELIC_WIDTH, relicMarkup, type InkId, type RelicMark } from './relic';

/** Where the mark sits on the stage: centre as fractions of its size, height as a fraction of its height. */
export interface Placement {
  x: number;
  y: number;
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
}

export type Backdrop =
  | { kind: 'camera'; video: HTMLVideoElement; mirrored: boolean }
  | { kind: 'photo'; image: HTMLImageElement }
  | { kind: 'practice'; svg: SVGSVGElement };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The mark could not be drawn'));
    image.src = src;
  });
}

const svgSource = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

/** Draws a picture to fill the frame, cropping the overflow, as CSS object-fit: cover does. */
function drawCover(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sw: number, sh: number, w: number, h: number) {
  const scale = Math.max(w / sw, h / sh);
  const cw = w / scale;
  const ch = h / scale;
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
}

const CREDIT: Omit<TextLine, 'x' | 'y'> = {
  text: 'THE SCRIBE ARCHIVE',
  size: 22,
  weight: 700,
  family: 'Cinzel, Georgia, serif',
  colour: '#ede6d6',
  opacity: 0.75,
  letterSpacing: 5,
  align: 'center',
};

/**
 * Takes the photo: the backdrop as the reader sees it (mirrored for a selfie
 * camera), the mark on top where they placed it, and a small credit.
 */
export async function captureRelic(
  backdrop: Backdrop,
  mark: RelicMark,
  ink: InkId,
  placement: Placement,
  aspect: number,
): Promise<Blob> {
  const width = 1080;
  const height = Math.round(width / aspect);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot make images');

  if (backdrop.kind === 'camera') {
    ctx.save();
    if (backdrop.mirrored) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    drawCover(ctx, backdrop.video, backdrop.video.videoWidth, backdrop.video.videoHeight, width, height);
    ctx.restore();
  } else if (backdrop.kind === 'photo') {
    drawCover(ctx, backdrop.image, backdrop.image.naturalWidth, backdrop.image.naturalHeight, width, height);
  } else {
    const art = backdrop.svg.cloneNode(true) as SVGSVGElement;
    art.setAttribute('width', String(width));
    art.setAttribute('height', String(height));
    art.removeAttribute('class');
    const image = await loadImage(svgSource(new XMLSerializer().serializeToString(art)));
    ctx.drawImage(image, 0, 0, width, height);
  }

  const markHeight = placement.scale * height;
  const markWidth = (markHeight * RELIC_WIDTH) / RELIC_HEIGHT;
  const art = await loadImage(svgSource(relicMarkup(mark, ink, markWidth, markHeight)));
  ctx.save();
  ctx.translate(placement.x * width, placement.y * height);
  ctx.rotate((placement.rotation * Math.PI) / 180);
  // Plain ink sinks into the skin; the glowing inks sit on top of it.
  ctx.globalCompositeOperation = ink === 'ink' ? 'multiply' : 'source-over';
  ctx.drawImage(art, -markWidth / 2, -markHeight / 2, markWidth, markHeight);
  ctx.restore();

  const credit: TextLine = { ...CREDIT, x: width / 2, y: height - 40 };
  await document.fonts.load(fontOf(credit), credit.text);
  ctx.font = fontOf(credit);
  ctx.fillStyle = credit.colour;
  ctx.globalAlpha = credit.opacity;
  ctx.textAlign = credit.align;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${credit.letterSpacing}px`;
  ctx.fillText(credit.text, textX(credit), credit.y);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be saved'))), IMAGE_TYPE, IMAGE_QUALITY),
  );
}
