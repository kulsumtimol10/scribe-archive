import { Dragon } from './Dragon';

const THEMED_DRAGON = {
  body: 'var(--dragon)',
  wing: 'var(--dragon-wing)',
  bone: 'var(--wing-bone)',
  rim: 'var(--rim)',
  eye: 'var(--accent)',
};

/** Lightning over Basgiath, a dragon gliding past, mist in the valleys. Colours follow the reader's sky. */
export function HeroScene() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg className="hero-sky" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="hero-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--sky-top)' }} />
            <stop offset="0.62" style={{ stopColor: 'var(--sky-mid)' }} />
            <stop offset="1" style={{ stopColor: 'var(--bg)' }} />
          </linearGradient>
          <filter id="hero-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="50" />
          </filter>
          <filter id="hero-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="1440" height="900" fill="url(#hero-gradient)" />
        <ellipse cx="1040" cy="290" rx="330" ry="240" style={{ fill: 'var(--glow)' }} opacity="0.24" filter="url(#hero-blur)" />
        <rect className="sky-flash" width="1440" height="900" style={{ fill: 'var(--glow)' }} />

        <g className="bolt">
          <path
            d="M1110,0 L1082,120 L1120,128 L1060,290 L1096,296 L1040,430"
            fill="none"
            style={{ stroke: 'var(--glow)' }}
            strokeWidth="16"
            strokeOpacity="0.25"
            strokeLinejoin="bevel"
          />
          <path
            d="M1110,0 L1082,120 L1120,128 L1060,290 L1096,296 L1040,430"
            fill="none"
            style={{ stroke: 'var(--bolt)' }}
            strokeWidth="3"
            strokeLinejoin="bevel"
          />
          <path d="M1082,120 L1030,180 L1042,240" fill="none" style={{ stroke: 'var(--bolt)' }} strokeWidth="1.5" strokeOpacity="0.7" />
        </g>

        <path
          d="M0,560 L120,470 L210,520 L330,400 L430,480 L560,360 L680,470 L790,410 L900,500 L1040,380 L1160,470 L1290,420 L1440,500 L1440,900 L0,900 Z"
          style={{ fill: 'var(--ridge-1)' }}
        />
        <path
          d="M160,600 L210,520 L240,540 L240,450 L262,420 L284,450 L284,560 L330,505 L366,525 L366,400 L388,358 L410,400 L410,545 L450,500 L490,560 L520,540 L520,620 Z"
          style={{ fill: 'var(--ridge-2)' }}
        />
        <rect x="392" y="420" width="8" height="13" style={{ fill: 'var(--accent)' }} opacity="0.75" />
        <rect x="258" y="470" width="7" height="10" style={{ fill: 'var(--accent)' }} opacity="0.55" />
        <path
          d="M0,640 L140,560 L260,610 L380,520 L520,600 L640,540 L760,620 L900,550 L1030,630 L1180,560 L1300,620 L1440,580 L1440,900 L0,900 Z"
          style={{ fill: 'var(--ridge-2)' }}
        />
        <ellipse className="fog" cx="700" cy="640" rx="760" ry="70" style={{ fill: 'var(--mist)' }} opacity="0.12" filter="url(#hero-blur)" />
        <path
          d="M0,740 L180,680 L300,720 L420,660 L560,730 L700,690 L840,750 L980,700 L1120,760 L1260,710 L1440,740 L1440,900 L0,900 Z"
          style={{ fill: 'var(--ridge-3)' }}
        />
        <rect width="1440" height="900" filter="url(#hero-grain)" opacity="0.07" />
      </svg>

      <svg className="hero-dragon" viewBox="0 0 600 240">
        <defs>
          <filter id="hero-rim" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.5" />
          </filter>
        </defs>
        <g className="glide">
          <Dragon colours={THEMED_DRAGON} rimFilter="hero-rim" />
        </g>
      </svg>
    </div>
  );
}
