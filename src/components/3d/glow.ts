import { CanvasTexture, Color } from 'three';

let soft: CanvasTexture | null = null;

/** A soft white dot fading to nothing, drawn once and shared: moon halo, mist, town glow. */
export function glowTexture(): CanvasTexture {
  if (soft) return soft;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  soft = new CanvasTexture(canvas);
  return soft;
}

export function mix(a: string, b: string, t: number): Color {
  return new Color(a).lerp(new Color(b), t);
}
