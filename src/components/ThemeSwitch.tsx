import { setTheme, THEMES, type ThemeId } from '../lib/theme';

/** The reader's sky switch. `compact` shows swatches only, for phone headers. */
export function ThemeSwitch({ current, compact = false }: { current: ThemeId; compact?: boolean }) {
  return (
    <div className={compact ? 'theme-switch compact' : 'theme-switch'} role="group" aria-label="Theme">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          type="button"
          aria-pressed={theme.id === current}
          aria-label={compact ? theme.name : undefined}
          title={theme.name}
          onClick={() => setTheme(theme.id)}
        >
          <span
            className="swatch"
            style={{ background: `linear-gradient(135deg, ${theme.swatch[0]} 50%, ${theme.swatch[1]} 50%)` }}
          />
          {!compact && theme.name}
        </button>
      ))}
    </div>
  );
}
