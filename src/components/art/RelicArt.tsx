import { INKS, RELIC_HEIGHT, RELIC_WIDTH, relicStrokes, type InkId, type RelicMark } from '../../lib/relic';

/**
 * A relic mark on the page. Each line draws itself in, one after another, and
 * the glow blooms once the lines are down. Remount it (with a new key) to
 * replay the drawing.
 */
export function RelicArt({ mark, ink }: { mark: RelicMark; ink: InkId }) {
  const { line, glow } = INKS[ink];
  const { lines, dots } = relicStrokes(mark);
  const delay = (i: number) => ({ animationDelay: `${i === 0 ? 0 : 0.5 + i * 0.12}s` });

  return (
    <svg viewBox={`0 0 ${RELIC_WIDTH} ${RELIC_HEIGHT}`} className={glow ? 'relic-art glowing' : 'relic-art'} aria-hidden="true">
      <defs>
        <filter id="relic-soft" x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation={glow ? 6 : 1.4} />
        </filter>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g className="relic-under" filter="url(#relic-soft)" stroke={glow ?? line} fill={glow ?? line}>
          {lines.map((s, i) => (
            <path key={i} d={s.d} strokeWidth={s.width * (glow ? 2.6 : 1.6)} fill="none" />
          ))}
          {dots.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r + (glow ? 3 : 1)} />
          ))}
        </g>
        <g className="relic-lines" stroke={line} fill={line}>
          {lines.map((s, i) => (
            <path key={i} d={s.d} strokeWidth={s.width} pathLength={1} className="relic-line" style={delay(i)} fill="none" />
          ))}
          {dots.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={p.r} className="relic-dot" />
          ))}
        </g>
      </g>
    </svg>
  );
}

export const SKINS = [
  { name: 'Light', base: '#f1c9a8', shade: '#c99c7e' },
  { name: 'Medium', base: '#c99a7a', shade: '#9c6e52' },
  { name: 'Brown', base: '#8d5b3e', shade: '#5e3a26' },
  { name: 'Deep', base: '#5a3825', shade: '#38221a' },
];

/** A forearm reaching up from the bottom left, for trying a mark on without a camera. */
export function PracticeArm({ skin }: { skin: (typeof SKINS)[number] }) {
  return (
    <svg className="relic-backdrop" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="arm-room" cx="60%" cy="40%" r="80%">
          <stop offset="0" stopColor="#3a2d24" />
          <stop offset="0.7" stopColor="#15100c" />
        </radialGradient>
        <linearGradient id="arm-skin" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor={skin.shade} />
          <stop offset="0.55" stopColor={skin.base} />
          <stop offset="1" stopColor={skin.shade} />
        </linearGradient>
      </defs>
      <rect width="390" height="520" fill="url(#arm-room)" />
      <path
        d="M-40,470 C40,400 160,286 262,196 C284,176 306,160 336,152 L420,142 L420,236 C386,240 364,250 346,266 C252,352 146,452 80,560 L-40,560 Z"
        fill="url(#arm-skin)"
      />
      <path d="M336,152 C356,128 384,118 420,120 L420,142 Z" fill={skin.shade} />
      <path d="M20,500 C100,420 200,330 300,232" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="36" strokeLinecap="round" />
    </svg>
  );
}
