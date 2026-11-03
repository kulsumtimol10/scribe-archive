import { withAlpha, type Palette } from './palette';
import type { Crossing, Input } from './parapet';

/**
 * Draws the Parapet on a 2D canvas: sky, Basgiath on the far cliff, the gorge,
 * the bridge, the cadet, rain, gusts and lightning. Colours come from the
 * reader's theme. Weather effects are visual only and use Math.random freely.
 */

interface Drop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

/** Visual state that lives between frames but isn't part of the game. */
export interface Effects {
  drops: Drop[];
  streak: number;
  flash: number;
  boltX: number;
  nextBolt: number;
  /** Seconds since the cadet fell, for the drop into the gorge. */
  falling: number;
}

export function makeEffects(): Effects {
  return { drops: [], streak: 0, flash: 0, boltX: 0.7, nextBolt: 4, falling: 0 };
}

export interface Bridge {
  x0: number;
  x1: number;
  y: number;
  sag: number;
  thickness: number;
  /** Height of the bridge's walking surface at x. */
  at(x: number): number;
}

export function bridgeOf(w: number, h: number): Bridge {
  const x0 = w * 0.07;
  const x1 = w * 0.93;
  const y = h * 0.56;
  const sag = h * 0.025;
  return {
    x0,
    x1,
    y,
    sag,
    thickness: Math.max(6, h * 0.018),
    at: (x) => y + sag * Math.sin((Math.PI * (x - x0)) / (x1 - x0)),
  };
}

function cadetSize(h: number): number {
  return Math.min(110, Math.max(46, h * 0.15));
}

/** Where the cadet stands, in canvas pixels. */
export function cadetSpot(c: Pick<Crossing, 'progress'>, w: number, h: number): { x: number; y: number } {
  const bridge = bridgeOf(w, h);
  const margin = cadetSize(h) * 0.35;
  const x = bridge.x0 + margin + (bridge.x1 - bridge.x0 - 2 * margin) * c.progress;
  return { x, y: bridge.at(x) };
}

interface Pose {
  stride: number;
  lean: number;
  armTilt: number;
  brace: boolean;
}

/** A cadet in silhouette, feet at the origin, facing right with a pack on their back. */
function drawCadet(ctx: CanvasRenderingContext2D, size: number, pose: Pose, p: Palette, alpha = 1) {
  const H = size;
  const swing = Math.sin(pose.stride) * 0.35;
  const hipY = pose.brace ? -0.36 * H : -0.45 * H;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.rotate(pose.lean);
  ctx.strokeStyle = p.ink;
  ctx.fillStyle = p.ink;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs: a bent knee when bracing, a stride when walking.
  ctx.lineWidth = H * 0.075;
  for (const side of [1, -1]) {
    const footX = pose.brace ? side * 0.2 * H : Math.sin(swing * side) * 0.45 * H;
    const kneeX = pose.brace ? side * 0.16 * H : footX * 0.4;
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(kneeX, hipY * 0.5);
    ctx.lineTo(footX, 0);
    ctx.stroke();
  }

  // Torso, leaning in a little when braced.
  const shoulderX = pose.brace ? 0.06 * H : 0;
  const shoulderY = hipY - 0.33 * H;
  ctx.lineWidth = H * 0.11;
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Pack.
  ctx.fillStyle = p.accent;
  ctx.globalAlpha *= 0.85;
  ctx.fillRect(shoulderX - 0.17 * H, shoulderY + 0.02 * H, 0.1 * H, 0.24 * H);
  ctx.globalAlpha /= 0.85;
  ctx.fillStyle = p.ink;

  // Arms out for balance, tipping the way the reader leans.
  ctx.lineWidth = H * 0.06;
  const tilt = pose.armTilt * 0.12 * H;
  ctx.beginPath();
  ctx.moveTo(-0.4 * H + shoulderX, shoulderY + 0.06 * H + tilt);
  ctx.lineTo(shoulderX, shoulderY + 0.03 * H);
  ctx.lineTo(0.4 * H + shoulderX, shoulderY + 0.06 * H - tilt);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(shoulderX + 0.02 * H, shoulderY - 0.12 * H, 0.085 * H, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(0.6, p.skyMid);
  sky.addColorStop(1, p.bg);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.72, h * 0.22, 0, w * 0.72, h * 0.22, Math.max(w, h) * 0.45);
  glow.addColorStop(0, withAlpha(p.glow, 0.22));
  glow.addColorStop(1, withAlpha(p.glow, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

function drawMountains(ctx: CanvasRenderingContext2D, w: number, h: number, p: Palette) {
  const peaks = [0, 0.62, 0.08, 0.52, 0.15, 0.58, 0.23, 0.45, 0.3, 0.53, 0.39, 0.4, 0.47, 0.52, 0.55, 0.44, 0.63, 0.55, 0.72, 0.42, 0.8, 0.5, 0.88, 0.46, 1, 0.56];
  ctx.fillStyle = p.ridge1;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i < peaks.length; i += 2) ctx.lineTo(peaks[i] * w, peaks[i + 1] * h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function drawCliffs(ctx: CanvasRenderingContext2D, w: number, h: number, bridge: Bridge, p: Palette) {
  const top = bridge.y - bridge.thickness * 0.2;

  // The gorge between the cliffs, falling away into darkness.
  const gorge = ctx.createLinearGradient(0, top, 0, h);
  gorge.addColorStop(0, withAlpha(p.ridge3, 0.4));
  gorge.addColorStop(1, p.bg);
  ctx.fillStyle = gorge;
  ctx.fillRect(bridge.x0, top, bridge.x1 - bridge.x0, h - top);

  const mist = ctx.createLinearGradient(0, h * 0.72, 0, h);
  mist.addColorStop(0, withAlpha(p.mist, 0));
  mist.addColorStop(0.5, withAlpha(p.mist, 0.08));
  mist.addColorStop(1, withAlpha(p.mist, 0.02));
  ctx.fillStyle = mist;
  ctx.fillRect(bridge.x0, h * 0.72, bridge.x1 - bridge.x0, h * 0.28);

  ctx.fillStyle = p.ridge2;
  // Near cliff.
  ctx.beginPath();
  ctx.moveTo(0, top - h * 0.01);
  ctx.lineTo(bridge.x0 + 4, top);
  ctx.lineTo(bridge.x0 - w * 0.01, h * 0.75);
  ctx.lineTo(bridge.x0 + w * 0.012, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  // Far cliff, with Basgiath's towers.
  ctx.beginPath();
  ctx.moveTo(w, top - h * 0.015);
  ctx.lineTo(bridge.x1 - 4, top);
  ctx.lineTo(bridge.x1 + w * 0.012, h * 0.7);
  ctx.lineTo(bridge.x1 - w * 0.008, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const tower = (x: number, width: number, height: number) => {
    ctx.fillRect(x, top - height, width, height);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.15, top - height);
    ctx.lineTo(x + width / 2, top - height - width * 0.9);
    ctx.lineTo(x + width * 1.15, top - height);
    ctx.closePath();
    ctx.fill();
  };
  const unit = Math.min(w * 0.03, h * 0.05);
  tower(bridge.x1 + unit * 0.4, unit * 0.9, unit * 3.2);
  tower(bridge.x1 + unit * 1.6, unit * 1.2, unit * 4.6);
  tower(bridge.x1 + unit * 3.1, unit * 0.8, unit * 2.6);
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(bridge.x1 + unit * 2.0, top - unit * 3.4, unit * 0.28, unit * 0.45);
  ctx.fillRect(bridge.x1 + unit * 0.75, top - unit * 2.2, unit * 0.22, unit * 0.36);
  ctx.globalAlpha = 1;
}

function drawBridge(ctx: CanvasRenderingContext2D, bridge: Bridge, p: Palette) {
  const steps = 40;
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = bridge.x0 + ((bridge.x1 - bridge.x0) * i) / steps;
      const y = bridge.at(x) + bridge.thickness / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  };
  ctx.lineCap = 'butt';
  ctx.strokeStyle = p.ridge1;
  ctx.lineWidth = bridge.thickness;
  path();
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -bridge.thickness / 2);
  ctx.strokeStyle = withAlpha(p.ink, 0.28);
  ctx.lineWidth = 1.5;
  path();
  ctx.stroke();
  ctx.restore();
}

function drawRain(ctx: CanvasRenderingContext2D, w: number, h: number, fx: Effects, amount: number, wind: number, dt: number, p: Palette) {
  const target = Math.round(amount * Math.min(260, (w * h) / 4000));
  while (fx.drops.length < target) {
    fx.drops.push({ x: Math.random() * w, y: Math.random() * h, speed: 700 + Math.random() * 500, length: 12 + Math.random() * 14 });
  }
  fx.drops.length = target;
  const drift = wind * 90 - 120;
  ctx.strokeStyle = withAlpha(p.rain, 0.45);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const drop of fx.drops) {
    drop.y += drop.speed * dt;
    drop.x += drift * dt;
    if (drop.y > h) {
      drop.y -= h + drop.length;
      drop.x = Math.random() * w;
    }
    if (drop.x < -20) drop.x += w + 40;
    if (drop.x > w + 20) drop.x -= w + 40;
    const slant = (drift / drop.speed) * drop.length;
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x + slant, drop.y + drop.length);
  }
  ctx.stroke();
}

function drawGust(ctx: CanvasRenderingContext2D, w: number, h: number, c: Crossing, fx: Effects, dt: number, p: Palette) {
  if (c.gust.phase === 'calm') return;
  const blowing = c.gust.phase === 'blowing';
  fx.streak += dt * (blowing ? 900 : 260) * c.gust.dir;
  ctx.strokeStyle = withAlpha(p.ink, blowing ? 0.28 : 0.1);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 9; i++) {
    const y = h * (0.18 + i * 0.065);
    const length = w * (0.08 + (i % 3) * 0.04);
    const x = (((fx.streak + i * 211) % (w + length)) + w + length) % (w + length) - length;
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + length / 2, y - 6, x + length, y);
  }
  ctx.stroke();
}

function drawLightning(ctx: CanvasRenderingContext2D, w: number, h: number, fx: Effects, dt: number, p: Palette) {
  fx.nextBolt -= dt;
  if (fx.nextBolt <= 0) {
    fx.flash = 1;
    fx.boltX = 0.45 + Math.random() * 0.45;
    fx.nextBolt = 5 + Math.random() * 7;
  }
  if (fx.flash <= 0) return;
  ctx.fillStyle = withAlpha(p.glow, fx.flash * 0.16);
  ctx.fillRect(0, 0, w, h);
  const x = fx.boltX * w;
  ctx.strokeStyle = withAlpha(p.bolt, fx.flash);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x - w * 0.02, h * 0.12);
  ctx.lineTo(x + w * 0.012, h * 0.14);
  ctx.lineTo(x - w * 0.03, h * 0.3);
  ctx.lineTo(x - w * 0.005, h * 0.31);
  ctx.lineTo(x - w * 0.04, h * 0.44);
  ctx.stroke();
  fx.flash = Math.max(0, fx.flash - dt * 2.4);
}

export interface Frame {
  crossing: Crossing | null;
  input: Input;
  rain: number;
  lightning: boolean;
  /** Seconds since the last frame. */
  dt: number;
  /** Fewer moving effects for readers who ask for reduced motion. */
  calm: boolean;
}

export function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, frame: Frame, p: Palette, fx: Effects) {
  const { crossing: c, dt } = frame;
  const bridge = bridgeOf(w, h);
  const size = cadetSize(h);

  drawSky(ctx, w, h, p);
  if (frame.lightning && !frame.calm) drawLightning(ctx, w, h, fx, dt, p);
  drawMountains(ctx, w, h, p);
  drawCliffs(ctx, w, h, bridge, p);
  drawBridge(ctx, bridge, p);

  // A cadet still waiting their turn on the near cliff.
  ctx.save();
  ctx.translate(bridge.x0 - size * 0.45, bridge.y - bridge.thickness * 0.2);
  drawCadet(ctx, size * 0.85, { stride: 0, lean: 0, armTilt: 0, brace: false }, { ...p, ink: p.muted }, 0.55);
  ctx.restore();

  const at = cadetSpot(c ?? { progress: 0 }, w, h);
  ctx.save();
  if (c?.status === 'fallen') {
    fx.falling += dt;
    const t = fx.falling;
    ctx.translate(at.x + Math.sign(c.lean) * t * size * 0.8, at.y + 0.5 * (h * 2.2) * t * t);
    drawCadet(ctx, size, { stride: c.stride, lean: c.lean + Math.sign(c.lean) * t * 3, armTilt: 0, brace: false }, p, Math.max(0, 1 - t / 1.4));
  } else {
    fx.falling = 0;
    ctx.translate(at.x, at.y);
    drawCadet(
      ctx,
      size,
      {
        stride: c?.stride ?? 0,
        lean: c?.lean ?? 0,
        armTilt: frame.input.lean,
        brace: frame.input.brace && c?.status === 'playing',
      },
      p,
    );
  }
  ctx.restore();

  if (frame.rain > 0) drawRain(ctx, w, h, fx, frame.calm ? frame.rain * 0.4 : frame.rain, c?.wind ?? 0, dt, p);
  if (c && !frame.calm) drawGust(ctx, w, h, c, fx, dt, p);

  const vignette = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
