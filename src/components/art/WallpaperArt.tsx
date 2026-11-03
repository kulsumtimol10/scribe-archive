import type { CSSProperties, Ref } from 'react';
import type { TextLine } from '../../lib/render';
import { FORMATS, SKIES, type SkyId, type WallpaperDragon, type WallpaperFormat } from '../../lib/wallpaper';
import { Dragon } from './Dragon';
import { SvgText } from './SvgText';

interface WallpaperArtProps {
  format: WallpaperFormat;
  dragon: WallpaperDragon;
  sky: SkyId;
  relic: boolean;
  lines: TextLine[];
  ref?: Ref<SVGSVGElement>;
  className?: string;
  style?: CSSProperties;
}

const RELIC = 'M150,548 C166,556 172,572 160,580 C150,586 140,578 146,570 C152,562 166,566 168,576';

/**
 * A wallpaper at full export size. Colours are plain hex (never CSS variables)
 * so the same SVG can be drawn off the page when it is downloaded.
 */
export function WallpaperArt({ format, dragon, sky, relic, lines, ref, className, style }: WallpaperArtProps) {
  const { width, height } = FORMATS[format];
  const s = SKIES[sky];
  const d = dragon;

  return (
    <svg
      ref={ref}
      className={className}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${d.name} over ${s.name}`}
    >
      <defs>
        <linearGradient id="wp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="0.68" stopColor={s.mid} />
          <stop offset="1" stopColor="#030406" />
        </linearGradient>
        <filter id="wp-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="28" />
        </filter>
        <filter id="wp-rim" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
        <filter id="wp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={width} height={height} fill="url(#wp-sky)" />

      {format === 'phone' ? (
        <g transform="scale(4.3)">
          <circle cx="200" cy="300" r="120" fill={s.glow} opacity="0.35" filter="url(#wp-blur)" />
          <circle cx="200" cy="300" r="46" fill={s.glow} opacity={s.moon} />
          {s.lightning && (
            <>
              <path d="M250,40 L236,110 L254,114 L226,210 L244,214 L218,290" fill="none" stroke={s.glow} strokeWidth="10" strokeOpacity="0.25" />
              <path d="M250,40 L236,110 L254,114 L226,210 L244,214 L218,290" fill="none" stroke="#e6f2ff" strokeWidth="2" />
            </>
          )}
          <Dragon transform="translate(-30 250) scale(0.56)" colours={d.colours} rimFilter="wp-rim" rimOpacity={0.75} />
          <path d="M0,500 L40,460 L70,480 L110,430 L150,470 L190,440 L230,480 L270,450 L300,470 L300,660 L0,660 Z" fill="#0a0d13" />
          <ellipse cx="150" cy="520" rx="200" ry="24" fill="#ede6d6" opacity="0.07" filter="url(#wp-blur)" />
          <path d="M0,550 L60,520 L120,545 L180,515 L240,542 L300,525 L300,660 L0,660 Z" fill="#05070a" />
          {relic && <path d={RELIC} fill="none" stroke={d.colours.rim} strokeWidth="1.6" strokeOpacity="0.85" />}
        </g>
      ) : (
        <g transform={`scale(${2560 / 1440})`}>
          <ellipse cx="1010" cy="300" rx="260" ry="200" fill={s.glow} opacity="0.3" filter="url(#wp-blur)" />
          <circle cx="1010" cy="300" r="70" fill={s.glow} opacity={s.moon} />
          {s.lightning && (
            <>
              <path d="M1080,0 L1052,120 L1090,128 L1030,290 L1066,296 L1010,430" fill="none" stroke={s.glow} strokeWidth="14" strokeOpacity="0.25" />
              <path d="M1080,0 L1052,120 L1090,128 L1030,290 L1066,296 L1010,430" fill="none" stroke="#e6f2ff" strokeWidth="3" />
            </>
          )}
          <Dragon transform="translate(560 120) scale(1.25)" colours={d.colours} rimFilter="wp-rim" rimOpacity={0.7} />
          <g transform="translate(0 -90)">
            <path d="M0,560 L120,470 L210,520 L330,400 L430,480 L560,360 L680,470 L790,410 L900,500 L1040,380 L1160,470 L1290,420 L1440,500 L1440,900 L0,900 Z" fill="#141b28" />
            <path d="M0,640 L140,560 L260,610 L380,520 L520,600 L640,540 L760,620 L900,550 L1030,630 L1180,560 L1300,620 L1440,580 L1440,900 L0,900 Z" fill="#0c111b" />
            <ellipse cx="700" cy="650" rx="700" ry="60" fill="#ede6d6" opacity="0.07" filter="url(#wp-blur)" />
            <path d="M0,740 L180,680 L300,720 L420,660 L560,730 L700,690 L840,750 L980,700 L1120,760 L1260,710 L1440,740 L1440,900 L0,900 Z" fill="#05070a" />
          </g>
          {relic && <path transform="translate(-70 92)" d={RELIC} fill="none" stroke={d.colours.rim} strokeWidth="1.6" strokeOpacity="0.85" />}
        </g>
      )}

      <rect width={width} height={height} filter="url(#wp-grain)" opacity="0.07" />

      <SvgText lines={lines} />
    </svg>
  );
}
