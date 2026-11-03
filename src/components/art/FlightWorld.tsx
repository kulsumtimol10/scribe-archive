import { useMemo } from 'react';
import { CHAPTERS, ridgePath } from '../../lib/scrollFlight';
import { seeded } from '../../lib/seeded';
import { Dragon } from './Dragon';

/**
 * The land under Fly with Tairn, drawn once. The page moves its layers as the
 * reader scrolls, finding them by their data-layer names; nothing in here
 * changes on its own except the rain and the shimmer of the wards.
 *
 * The near layer travels SHIFT units across the whole flight, so each
 * chapter's landmark sits at the screen's centre when that chapter is.
 */

export const VIEW_WIDTH = 1440;
export const VIEW_HEIGHT = 900;
export const SHIFT = 4320;
/** How far each layer travels compared with the ground right below. */
export const PARALLAX = { far: 0.2, mid: 0.5, near: 1, mist: 1.35 } as const;

/** Where chapter i's landmark stands on the near layer. */
const landmarkX = (i: number) => VIEW_WIDTH / 2 + ((i + 0.5) / CHAPTERS.length) * SHIFT;
const widthOf = (layer: keyof typeof PARALLAX) => VIEW_WIDTH + PARALLAX[layer] * SHIFT + 200;

const FLOOR = 1300;
const VALE_DRAGON = { body: '#05070b', wing: '#070a10', bone: '#111722', rim: '#4a5a74', eye: '#f2c46b' };

function Stars() {
  const stars = useMemo(() => {
    const random = seeded(41);
    return Array.from({ length: 80 }, () => ({ x: random() * VIEW_WIDTH, y: random() * 460, r: 0.6 + random() * 1.3, o: 0.3 + random() * 0.7 }));
  }, []);
  return (
    <g data-layer="stars">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ede6d6" opacity={s.o} />
      ))}
    </g>
  );
}

function Basgiath({ x }: { x: number }) {
  const ground = 690;
  const towers = [
    [-150, 120, 26],
    [-95, 190, 34],
    [-30, 150, 30],
    [30, 230, 40],
    [100, 170, 30],
    [160, 110, 24],
  ];
  return (
    <g transform={`translate(${x} 0)`}>
      <path d={`M-320,${ground + 60} L-220,${ground - 10} L230,${ground - 20} L320,${ground + 60} Z`} fill="#0b0f17" />
      <rect x={-180} y={ground - 90} width={370} height={90} fill="#0b0f17" />
      {towers.map(([dx, h, w], i) => (
        <g key={i}>
          <rect x={dx - w / 2} y={ground - h} width={w} height={h} fill="#0b0f17" />
          <path d={`M${dx - w / 2 - 6},${ground - h} L${dx},${ground - h - w * 1.4} L${dx + w / 2 + 6},${ground - h} Z`} fill="#0b0f17" />
          <rect x={dx - 3} y={ground - h + 22} width={6} height={10} fill="#e3b15c" opacity={0.8} />
        </g>
      ))}
      {[-120, -60, 10, 70, 130].map((dx) => (
        <rect key={dx} x={dx} y={ground - 54} width={7} height={10} fill="#e3b15c" opacity={0.55} />
      ))}
    </g>
  );
}

function Vale({ x }: { x: number }) {
  const pines = useMemo(() => {
    const random = seeded(77);
    return Array.from({ length: 46 }, () => ({ dx: (random() - 0.5) * 820, h: 26 + random() * 40, y: 0 }));
  }, []);
  return (
    <g transform={`translate(${x} 0)`}>
      {pines.map((p, i) => {
        const base = 728 + Math.abs(p.dx) * 0.05;
        return <path key={i} d={`M${p.dx - p.h * 0.28},${base} L${p.dx},${base - p.h} L${p.dx + p.h * 0.28},${base} Z`} fill="#070b12" />;
      })}
      {[
        [-240, 640, 0.13, 0],
        [160, 600, 0.1, 0],
        [40, 676, 0.16, 1],
        [300, 660, 0.12, 1],
      ].map(([dx, y, s, flip], i) => (
        <g key={i} transform={`translate(${dx} ${y}) scale(${flip ? -s : s} ${s})`}>
          <Dragon colours={VALE_DRAGON} rimOpacity={0.5} />
        </g>
      ))}
    </g>
  );
}

function Parapet({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      {/* The gorge: two walls of rock with the river far below. */}
      <path d="M-420,640 L-160,600 L-120,640 L-140,760 L-110,900 L-420,900 Z" fill="#0b0f17" />
      <path d="M420,630 L170,596 L130,640 L150,760 L120,900 L420,900 Z" fill="#0b0f17" />
      <path d="M-120,880 C-40,860 40,890 130,868" fill="none" stroke="#5b6880" strokeWidth="3" opacity={0.7} />
      {/* The bridge, a thread of stone across the drop. */}
      <path d="M-160,604 L170,600" stroke="#1e2738" strokeWidth="7" />
      <path d="M-160,598 L170,594" stroke="#5b6880" strokeWidth="1.5" strokeDasharray="5 7" opacity={0.8} />
    </g>
  );
}

function Cliffs({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M-360,900 L-330,420 L-290,400 L-262,460 L-230,430 L-200,500 L-190,900 Z" fill="#0b0f17" />
      <path d="M120,900 L140,380 L176,350 L200,410 L236,372 L262,460 L280,900 Z" fill="#090d14" />
      <path d="M-330,420 L-300,600 M150,380 L170,560" stroke="#1e2738" strokeWidth="2" />
    </g>
  );
}

function Wards({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect className="fly-ward" x={-60} y={60} width={120} height={700} fill="url(#fly-ward)" />
      <rect className="fly-ward slow" x={-180} y={120} width={360} height={640} fill="url(#fly-ward)" opacity={0.5} />
    </g>
  );
}

export function FlightWorld() {
  const far = useMemo(() => ridgePath(11, widthOf('far'), 430, 560, FLOOR, 120), []);
  const mid = useMemo(() => ridgePath(23, widthOf('mid'), 520, 640, FLOOR, 90), []);
  const near = useMemo(() => ridgePath(37, widthOf('near'), 690, 760, FLOOR, 70), []);
  const mist = useMemo(() => {
    const random = seeded(5);
    return Array.from({ length: 16 }, (_, i) => ({ x: i * 420 + random() * 200, y: 520 + random() * 240, rx: 220 + random() * 200 }));
  }, []);
  const rain = useMemo(() => {
    const random = seeded(9);
    return Array.from({ length: 110 }, () => ({ x: random() * (VIEW_WIDTH + 200) - 100, y: random() * VIEW_HEIGHT, l: 18 + random() * 22 }));
  }, []);

  return (
    <svg className="fly-world" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="fly-sky" x1="0" y1="0" x2="0" y2="1">
          <stop data-stop="0" offset="0" stopColor={CHAPTERS[0].sky[0]} />
          <stop data-stop="1" offset="0.55" stopColor={CHAPTERS[0].sky[1]} />
          <stop data-stop="2" offset="1" stopColor={CHAPTERS[0].sky[2]} />
        </linearGradient>
        <radialGradient id="fly-dawn" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="#e08a5a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#e08a5a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fly-ward" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8fc4ff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#bfe0ff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#8fc4ff" stopOpacity="0" />
        </linearGradient>
        <filter id="fly-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="40" />
        </filter>
        <filter id="fly-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#fly-sky)" />
      <Stars />
      <g data-layer="moon">
        <circle cx="300" cy="170" r="90" fill="#ede6d6" opacity="0.08" filter="url(#fly-blur)" />
        <circle cx="300" cy="170" r="32" fill="#ede6d6" opacity="0.9" />
      </g>
      <g data-layer="dawn">
        <ellipse cx="1080" cy="600" rx="720" ry="300" fill="url(#fly-dawn)" />
        <circle data-layer="sun" cx="1080" cy="560" r="46" fill="#ffd9a0" />
      </g>

      <g data-layer="far">
        <path d={far} fill="var(--ridge-1, #1a2232)" />
      </g>
      <g data-layer="clouds" opacity="0">
        {[
          [200, 260, 520],
          [760, 200, 600],
          [1260, 300, 520],
          [520, 420, 700],
        ].map(([cx, cy, rx], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={rx * 0.32} fill="#0d1119" filter="url(#fly-blur)" />
        ))}
      </g>
      <g data-layer="mid">
        <path d={mid} fill="var(--ridge-2, #121926)" />
      </g>
      <g data-layer="near">
        <path d={near} fill="var(--ridge-3, #0a0e16)" />
        <Basgiath x={landmarkX(0)} />
        <Vale x={landmarkX(1)} />
        <Parapet x={landmarkX(2)} />
        <Cliffs x={landmarkX(4)} />
        <Wards x={landmarkX(5)} />
      </g>
      <g data-layer="mist">
        {mist.map((m, i) => (
          <ellipse key={i} cx={m.x} cy={m.y} rx={m.rx} ry={m.rx * 0.16} fill="#c9d6e6" opacity="0.07" filter="url(#fly-blur)" />
        ))}
      </g>
      <g data-layer="rain" opacity="0">
        <g className="fly-rain">
          {rain.map((d, i) => (
            <path key={i} d={`M${d.x},${d.y} l-7,${d.l}`} stroke="#9fc4ea" strokeOpacity="0.5" strokeWidth="1.3" />
          ))}
        </g>
      </g>
      <g data-layer="bolt" opacity="0">
        <path d="M1010,0 L982,130 L1022,138 L960,300 L998,306 L938,450" fill="none" stroke="#7fb2e5" strokeWidth="16" strokeOpacity="0.25" strokeLinejoin="bevel" />
        <path d="M1010,0 L982,130 L1022,138 L960,300 L998,306 L938,450" fill="none" stroke="#e6f2ff" strokeWidth="3.5" strokeLinejoin="bevel" />
        <path d="M982,130 L930,190 L942,250" fill="none" stroke="#e6f2ff" strokeWidth="1.6" strokeOpacity="0.7" />
      </g>
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} filter="url(#fly-grain)" opacity="0.06" />
      <rect data-layer="flash" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#e6f2ff" opacity="0" />
    </svg>
  );
}
