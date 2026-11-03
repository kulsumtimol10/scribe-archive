import type { CSSProperties } from 'react';

/** Watching eyes scattered across the field: [x, y, scale, glow]. */
const EYES: [number, number, number, string][] = [
  [140, 380, 0.8, '#ff6a4d'],
  [260, 300, 0.6, '#6fd39a'],
  [420, 250, 0.5, '#d9a46a'],
  [560, 330, 0.65, '#8fc4ff'],
  [880, 260, 0.55, '#ff9a3c'],
  [1010, 340, 0.75, '#6fd39a'],
  [1180, 290, 0.6, '#ff6a4d'],
  [1320, 400, 0.85, '#8fc4ff'],
  [210, 520, 1.0, '#ff9a3c'],
  [380, 470, 0.85, '#8fc4ff'],
  [1080, 500, 1.0, '#d9a46a'],
  [1260, 560, 1.1, '#6fd39a'],
  [90, 610, 1.15, '#8fc4ff'],
  [1380, 650, 1.2, '#ff6a4d'],
];

function EyePair({ glow, scale = 1 }: { glow: string; scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx="-16" cy="0" rx="20" ry="10" fill={glow} opacity="0.18" />
      <ellipse cx="16" cy="0" rx="20" ry="10" fill={glow} opacity="0.18" />
      <ellipse cx="-16" cy="0" rx="9" ry="4" fill={glow} />
      <ellipse cx="16" cy="0" rx="9" ry="4" fill={glow} />
      <rect x="-17" y="-3" width="2" height="6" fill="#05070a" />
      <rect x="15" y="-3" width="2" height="6" fill="#05070a" />
    </g>
  );
}

/**
 * The Threshing field at night. Eyes blink out of step; once a dragon chooses,
 * the others fade and one pair opens wide in the middle of the field.
 */
export function ThreshingField({ chosenGlow }: { chosenGlow: string | null }) {
  return (
    <svg
      className={chosenGlow ? 'threshing-field revealing' : 'threshing-field'}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="field-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#030407" />
          <stop offset="0.7" stopColor="#0b0e14" />
          <stop offset="1" stopColor="#14110c" />
        </linearGradient>
        <filter id="field-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
      </defs>
      <rect width="1440" height="900" fill="url(#field-sky)" />
      <ellipse cx="720" cy="900" rx="640" ry="260" fill="#3a2a14" opacity="0.35" filter="url(#field-blur)" />

      {EYES.map(([x, y, scale, glow], i) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <g className="eye-pair" style={{ animationDelay: `${(i * 1.7) % 7}s` } as CSSProperties}>
            <EyePair glow={glow} scale={scale} />
          </g>
        </g>
      ))}

      {chosenGlow && (
        <g transform="translate(720 430)">
          <circle r="190" fill={chosenGlow} opacity="0.16" filter="url(#field-blur)" />
          <g className="chosen-eyes">
            <EyePair glow={chosenGlow} scale={2.6} />
          </g>
        </g>
      )}

      <path d="M0,640 C180,610 320,630 450,620 C600,610 760,630 900,620 C1080,610 1260,630 1440,615 L1440,900 L0,900 Z" fill="#0b0c0e" />
      <path d="M0,720 C200,700 340,720 460,710 C620,700 760,720 900,710 C1100,700 1280,725 1440,712 L1440,900 L0,900 Z" fill="#070809" />
      <ellipse className="fog" cx="720" cy="660" rx="760" ry="60" fill="#d8cfbe" opacity="0.06" filter="url(#field-blur)" />
    </svg>
  );
}
