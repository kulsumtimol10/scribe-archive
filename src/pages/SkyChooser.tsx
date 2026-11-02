import { useEffect, useState } from 'react';
import { Dragon } from '../components/art/Dragon';
import { paintTheme, setTheme, THEMES, type ThemeId } from '../lib/theme';

/** Each card shows its own sky, whatever the page is painted in. */
const PREVIEW: Record<ThemeId, { top: string; bottom: string; glow: string; rim: string; accent: string }> = {
  night: { top: '#16263f', bottom: '#07090d', glow: '#8fc4ff', rim: '#bfe0ff', accent: '#e3b15c' },
  storm: { top: '#221a40', bottom: '#0a0912', glow: '#b9a6ff', rim: '#e6e0ff', accent: '#b9a6ff' },
};

function SkyPreview({ id }: { id: ThemeId }) {
  const sky = PREVIEW[id];
  return (
    <svg viewBox="0 0 350 230" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`chooser-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
        <filter id={`chooser-blur-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="26" />
        </filter>
      </defs>
      <rect width="350" height="230" fill={`url(#chooser-${id})`} />
      <circle cx="250" cy="80" r="80" fill={sky.glow} opacity="0.4" filter={`url(#chooser-blur-${id})`} />
      <Dragon
        transform="translate(30 30) scale(0.45)"
        colours={{ body: '#030304', wing: '#050506', bone: '#14161c', rim: sky.rim, eye: sky.accent }}
        rimOpacity={0.65}
      />
      <path d="M0,170 L50,145 L95,160 L150,128 L205,158 L260,138 L310,160 L350,148 L350,230 L0,230 Z" fill={sky.bottom} opacity="0.92" />
    </svg>
  );
}

/** First visit: the reader picks how Basgiath looks before entering. */
export function SkyChooser() {
  const [pick, setPick] = useState<ThemeId>('night');

  // Preview the whole page in the highlighted sky; it is only remembered on Enter.
  useEffect(() => paintTheme(pick), [pick]);

  return (
    <main className="chooser">
      <div className="chooser-inner">
        <header className="chooser-head">
          <p className="kicker">Before you enter</p>
          <h1>Choose your sky</h1>
          <p className="lore">Pick how Basgiath looks for you. You can switch anytime from the menu.</p>
        </header>
        <div className="chooser-options">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className="sky-card"
              aria-pressed={theme.id === pick}
              onClick={() => setPick(theme.id)}
            >
              <SkyPreview id={theme.id} />
              <span className="sky-card-text">
                <span className="sky-card-name">{theme.name}</span>
                <span className="sky-card-mood">{theme.mood}</span>
              </span>
              <span className="sky-card-check" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2 7.5l3 3 7-7" />
                </svg>
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="button primary wide-button" onClick={() => setTheme(pick)}>
          Enter Basgiath
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
