import { currentHazard, HOLDS, logSwing, SECTIONS, sectionOf, type Climb, type Side } from './gauntlet';
import { withAlpha, type Palette } from './palette';

/**
 * Draws the Gauntlet on a 2D canvas: a night rock face with its holds, the
 * climber, ledges between sections, rocks falling and the log swinging. The
 * camera rises with the climber. Visual only; the rules are in gauntlet.ts.
 */

export interface GauntletView {
  /** Where the camera is, in holds climbed (eases toward the climber). */
  camera: number;
  /** Where the climber is drawn, in holds (eases up to the hold just grabbed). */
  climber: number;
  /** Screen shake left after a slip or a knock, in pixels. */
  shake: number;
}

export function makeView(): GauntletView {
  return { camera: 0, climber: 0, shake: 0 };
}

/** A repeatable 0..1 value for a row of rock, so cracks stay put as the wall scrolls. */
function rowNoise(row: number, salt: number): number {
  let h = Math.imul(row + 101, 374761393) ^ Math.imul(salt + 7, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

interface Layout {
  x0: number;
  width: number;
  spacing: number;
  /** Screen y of a hold index (fractional allowed). */
  y(index: number): number;
  /** Screen x of a side's column. */
  x(side: Side): number;
}

function layoutOf(w: number, h: number, view: GauntletView): Layout {
  const width = Math.min(w * 0.64, 460);
  const x0 = (w - width) / 2;
  const spacing = Math.max(52, h * 0.085);
  return {
    x0,
    width,
    spacing,
    y: (index) => h * 0.68 - (index - view.camera) * spacing,
    x: (side) => x0 + width * (side === 'left' ? 0.3 : 0.7),
  };
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, view: GauntletView, p: Palette) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, p.skyTop);
  sky.addColorStop(1, p.skyMid);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Distant peaks drift slowly as the climber rises.
  const drift = view.camera * 3;
  ctx.fillStyle = p.ridge2;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * w;
    const y = h * 0.55 + drift + Math.sin(i * 1.7) * h * 0.08 + (i % 2) * h * 0.06;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function drawWall(ctx: CanvasRenderingContext2D, w: number, h: number, L: Layout, climb: Climb, p: Palette) {
  const top = L.y(HOLDS + 1.2);
  // The face, with a ragged edge row by row.
  const rows = Math.ceil(h / 18) + 2;
  const startRow = Math.floor(-L.y(0) / 18) - 1;
  const face = ctx.createLinearGradient(L.x0, 0, L.x0 + L.width, 0);
  face.addColorStop(0, p.ridge2);
  face.addColorStop(0.5, p.ridge1);
  face.addColorStop(1, p.ridge2);
  ctx.fillStyle = face;
  ctx.beginPath();
  for (let r = 0; r <= rows; r++) {
    const worldRow = startRow + r;
    const y = L.y(0) + worldRow * 18;
    ctx.lineTo(L.x0 - 6 - rowNoise(worldRow, 1) * 18, Math.max(top, y));
  }
  for (let r = rows; r >= 0; r--) {
    const worldRow = startRow + r;
    const y = L.y(0) + worldRow * 18;
    ctx.lineTo(L.x0 + L.width + 6 + rowNoise(worldRow, 2) * 18, Math.max(top, y));
  }
  ctx.closePath();
  ctx.fill();

  // Cracks and seams.
  ctx.strokeStyle = withAlpha(p.bg, 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let r = 0; r <= rows; r++) {
    const worldRow = startRow + r;
    const y = L.y(0) + worldRow * 18;
    if (y < top || rowNoise(worldRow, 3) < 0.55) continue;
    const x = L.x0 + rowNoise(worldRow, 4) * L.width;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rowNoise(worldRow, 5) - 0.5) * 40, y + 14 + rowNoise(worldRow, 6) * 16);
  }
  ctx.stroke();

  // Ledges between sections, each with its name.
  ctx.font = `700 ${Math.round(Math.min(14, w / 40))}px Cinzel, Georgia, serif`;
  ctx.textAlign = 'right';
  for (const section of SECTIONS.slice(1)) {
    const y = L.y(section.from - 0.5);
    if (y < -40 || y > h + 40) continue;
    ctx.fillStyle = p.ridge1;
    ctx.fillRect(L.x0 - 20, y - 4, L.width + 40, 9);
    ctx.fillStyle = withAlpha(p.ink, 0.2);
    ctx.fillRect(L.x0 - 20, y - 4, L.width + 40, 1.5);
    ctx.fillStyle = withAlpha(p.ink, climb.index >= section.from ? 0.35 : 0.7);
    ctx.fillText(section.name.toUpperCase(), L.x0 + L.width - 8, y - 10);
  }

  // The summit: a ledge with a pennant.
  const summit = L.y(HOLDS);
  if (summit > -80) {
    ctx.fillStyle = p.ridge1;
    ctx.fillRect(L.x0 - 30, summit - 10, L.width + 60, 14);
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.x0 + L.width * 0.5, summit - 10);
    ctx.lineTo(L.x0 + L.width * 0.5, summit - 56);
    ctx.stroke();
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.moveTo(L.x0 + L.width * 0.5, summit - 56);
    ctx.lineTo(L.x0 + L.width * 0.5 + 30, summit - 47);
    ctx.lineTo(L.x0 + L.width * 0.5, summit - 38);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHolds(ctx: CanvasRenderingContext2D, h: number, L: Layout, climb: Climb, p: Palette, time: number) {
  const size = Math.min(30, L.spacing * 0.5);
  for (let i = 0; i < HOLDS; i++) {
    const y = L.y(i);
    if (y < -30 || y > h + 30) continue;
    const x = L.x(climb.course[i].side);
    const next = i === climb.index;
    if (next) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 8);
      const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.6);
      glow.addColorStop(0, withAlpha(p.accent, 0.45 + 0.25 * pulse));
      glow.addColorStop(1, withAlpha(p.accent, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
    }
    ctx.fillStyle = next ? p.accent : i < climb.index ? withAlpha(p.muted, 0.35) : withAlpha(p.ink, 0.7);
    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 4, size, size / 2, size / 4);
    ctx.fill();
  }
}

function drawClimber(ctx: CanvasRenderingContext2D, L: Layout, climb: Climb, view: GauntletView, p: Palette, time: number) {
  const reached = Math.max(0, Math.floor(view.climber) - 1);
  const handA = climb.course[Math.min(reached, HOLDS - 1)];
  const handB = climb.course[Math.max(0, Math.min(reached - 1, HOLDS - 1))];
  const H = L.spacing * 1.25;
  const hipY = L.y(view.climber - 1) + H * 0.55;
  const cx = L.x0 + L.width / 2 + (handA.side === 'left' ? -1 : 1) * L.width * 0.04;
  const shoulderY = hipY - H * 0.42;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = p.ink;
  ctx.fillStyle = p.ink;

  // Arms up to the last two holds grabbed.
  ctx.lineWidth = H * 0.07;
  for (const [hold, index] of [
    [handA, reached],
    [handB, reached - 1],
  ] as const) {
    if (index < 0) continue;
    ctx.beginPath();
    ctx.moveTo(cx, shoulderY);
    ctx.lineTo(L.x(hold.side), L.y(index));
    ctx.stroke();
  }

  // Legs pushing off the rock below, kicking a little as they climb.
  const kick = Math.sin(time * 6 + view.climber * 3) * H * 0.05;
  ctx.lineWidth = H * 0.08;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx, hipY);
    ctx.lineTo(cx + side * H * 0.18, hipY + H * 0.22 + side * kick);
    ctx.lineTo(cx + side * H * 0.12, hipY + H * 0.45);
    ctx.stroke();
  }

  // Torso, pack and head.
  ctx.lineWidth = H * 0.12;
  ctx.beginPath();
  ctx.moveTo(cx, hipY);
  ctx.lineTo(cx, shoulderY);
  ctx.stroke();
  ctx.fillStyle = p.accent;
  ctx.fillRect(cx - H * 0.09, shoulderY + H * 0.02, H * 0.18, H * 0.26);
  ctx.fillStyle = p.ink;
  ctx.beginPath();
  ctx.arc(cx, shoulderY - H * 0.12, H * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHazards(ctx: CanvasRenderingContext2D, h: number, L: Layout, climb: Climb, p: Palette) {
  const hazard = currentHazard(climb);
  const section = sectionOf(Math.min(climb.index, HOLDS - 1));
  const climberY = L.y(climb.index - 0.5);
  const entered = climb.entered[section];
  const t = entered === undefined ? 0 : climb.time - entered;

  if (hazard) {
    // A red warning down the column that's about to be hit.
    const x = L.x(hazard.side);
    const band = ctx.createLinearGradient(0, 0, 0, h);
    const strength = hazard.phase === 'danger' ? 0.32 : 0.16;
    band.addColorStop(0, withAlpha('#ff5a4a', 0));
    band.addColorStop(Math.max(0, Math.min(1, climberY / h)), withAlpha('#ff5a4a', strength));
    band.addColorStop(1, withAlpha('#ff5a4a', 0));
    ctx.fillStyle = band;
    ctx.fillRect(x - L.width * 0.17, 0, L.width * 0.34, h);
  }

  if (section === 'rockfall' && hazard) {
    const x = L.x(hazard.side);
    ctx.fillStyle = p.ridge3;
    ctx.strokeStyle = withAlpha(p.ink, 0.35);
    const count = hazard.phase === 'danger' ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const fall = ((t * (hazard.phase === 'danger' ? 900 : 260) + i * 160) % (h + 200)) - 100;
      const size = hazard.phase === 'danger' ? 16 + (i % 2) * 10 : 5;
      const rx = x + (i - count / 2) * size * 0.9;
      ctx.beginPath();
      ctx.moveTo(rx, fall - size);
      ctx.lineTo(rx + size, fall - size * 0.2);
      ctx.lineTo(rx + size * 0.5, fall + size);
      ctx.lineTo(rx - size * 0.8, fall + size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (section === 'log' && entered !== undefined) {
    // A log on two ropes, swinging across the face at the climber's height.
    const swing = logSwing(t);
    const cx = L.x0 + L.width / 2 + swing * L.width * 0.4;
    const anchorY = Math.max(-40, climberY - L.spacing * 5);
    ctx.strokeStyle = withAlpha(p.ink, 0.6);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L.x0 + L.width / 2 - 30, anchorY);
    ctx.lineTo(cx - 40, climberY);
    ctx.moveTo(L.x0 + L.width / 2 + 30, anchorY);
    ctx.lineTo(cx + 40, climberY);
    ctx.stroke();
    ctx.fillStyle = '#5a3a1e';
    ctx.strokeStyle = '#2a1a0c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - L.width * 0.2, climberY - 14, L.width * 0.4, 28, 14);
    ctx.fill();
    ctx.stroke();
  }
}

/** Draws one frame. `view` eases toward the climb and is updated in place. */
export function drawGauntlet(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  climb: Climb,
  view: GauntletView,
  p: Palette,
  dt: number,
  time: number,
) {
  const ease = 1 - Math.exp(-dt * 10);
  view.climber += (climb.index - view.climber) * ease;
  view.camera += (climb.index - 0.5 - view.camera) * (1 - Math.exp(-dt * 4));
  view.shake = Math.max(0, view.shake - dt * 30);

  const L = layoutOf(w, h, view);
  ctx.save();
  if (view.shake > 0) ctx.translate((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake);
  drawBackdrop(ctx, w, h, view, p);
  drawWall(ctx, w, h, L, climb, p);
  drawHolds(ctx, h, L, climb, p, time);
  drawHazards(ctx, h, L, climb, p);
  drawClimber(ctx, L, climb, view, p, time);
  ctx.restore();

  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}
