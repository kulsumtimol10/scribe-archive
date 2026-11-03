/** The reader's theme colours, read from the CSS variables in styles.css, for drawing outside CSS. */
export interface Palette {
  skyTop: string;
  skyMid: string;
  bg: string;
  panel: string;
  glow: string;
  rim: string;
  bolt: string;
  mist: string;
  rain: string;
  accent: string;
  cool: string;
  ink: string;
  muted: string;
  ridge1: string;
  ridge2: string;
  ridge3: string;
}

export function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    skyTop: v('--sky-top', '#0b1424'),
    skyMid: v('--sky-mid', '#1d2c44'),
    bg: v('--bg', '#07090d'),
    panel: v('--panel', '#0f131b'),
    glow: v('--glow', '#8fc4ff'),
    rim: v('--rim', '#bfe0ff'),
    bolt: v('--bolt', '#e6f2ff'),
    mist: v('--mist', '#c9d6e6'),
    rain: v('--rain', '#9fc4ea'),
    accent: v('--accent', '#e3b15c'),
    cool: v('--cool', '#7fb2e5'),
    ink: v('--ink', '#ede6d6'),
    muted: v('--muted', '#9c9686'),
    ridge1: v('--ridge-1', '#1a2232'),
    ridge2: v('--ridge-2', '#121926'),
    ridge3: v('--ridge-3', '#0a0e16'),
  };
}

/** Adds an alpha to a #rrggbb colour (theme colours are all six-digit hex). */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}
