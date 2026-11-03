import type { CSSProperties, Ref } from 'react';
import { CARD } from '../../lib/card';
import type { TextLine } from '../../lib/render';
import { COLOURS, type Bond } from '../../lib/threshing';
import { Dragon } from './Dragon';
import { SvgText } from './SvgText';

const RELIC = 'M150,548 C166,556 172,572 160,580 C150,586 140,578 146,570 C152,562 166,566 168,576';

/** Faint eyes still watching behind the chosen dragon. */
const WATCHERS: [number, number, string][] = [
  [150, 560, '#ff9a3c'],
  [930, 520, '#6fd39a'],
  [820, 1110, '#8fc4ff'],
  [210, 1080, '#d9a46a'],
];

interface RiderCardProps {
  bond: Bond;
  lines: TextLine[];
  ref?: Ref<SVGSVGElement>;
  className?: string;
}

/**
 * A rider card at full story size (1080×1920). Plain hex colours and fixed ids
 * so the same SVG can be drawn off the page when the card is downloaded.
 */
export function RiderCard({ bond, lines, ref, className }: RiderCardProps) {
  const colour = COLOURS[bond.colour];
  return (
    <svg
      ref={ref}
      className={className}
      style={{ aspectRatio: `${CARD.width} / ${CARD.height}` } as CSSProperties}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${CARD.width} ${CARD.height}`}
      role="img"
      aria-label={`${bond.rider} was chosen by ${bond.dragonName}, a ${colour.name.toLowerCase()} ${bond.tail}`}
    >
      <defs>
        <linearGradient id="rc-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070a" />
          <stop offset="0.55" stopColor="#0c1018" />
          <stop offset="1" stopColor="#020304" />
        </linearGradient>
        <filter id="rc-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="110" />
        </filter>
        <filter id="rc-rim" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="rc-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={CARD.width} height={CARD.height} fill="url(#rc-sky)" />
      <circle cx="540" cy="860" r="430" fill={colour.glow} opacity="0.32" filter="url(#rc-blur)" />

      {WATCHERS.map(([x, y, glow]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(1.6)`} opacity="0.3">
          <ellipse cx="-16" cy="0" rx="9" ry="4" fill={glow} />
          <ellipse cx="16" cy="0" rx="9" ry="4" fill={glow} />
        </g>
      ))}

      <Dragon transform="translate(-10 640) scale(1.82)" colours={colour.art} rimFilter="rc-rim" rimOpacity={0.8} />

      <path d="M0,1180 L120,1130 L260,1165 L400,1110 L560,1155 L700,1115 L860,1160 L1080,1125 L1080,1920 L0,1920 Z" fill="#06080b" />
      <ellipse cx="540" cy="1180" rx="620" ry="50" fill="#ede6d6" opacity="0.05" filter="url(#rc-blur)" />
      <rect x="380" y="1440" width="320" height="1" fill={colour.glow} opacity="0.5" />
      <path transform="translate(197 504) scale(2.2)" d={RELIC} fill="none" stroke={colour.art.rim} strokeWidth="1.6" strokeOpacity="0.85" />

      <rect width={CARD.width} height={CARD.height} filter="url(#rc-grain)" opacity="0.07" />
      <SvgText lines={lines} />
    </svg>
  );
}
