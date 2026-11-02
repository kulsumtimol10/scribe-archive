import { useSyncExternalStore } from 'react';

export type ThemeId = 'night' | 'storm';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  mood: string;
  /** Ground and accent, for the little split swatch on theme buttons. */
  swatch: [string, string];
}

export const THEMES: ThemeInfo[] = [
  { id: 'night', name: 'Night & gold', mood: 'Lamplight, lightning and old gold.', swatch: ['#07090d', '#e3b15c'] },
  { id: 'storm', name: 'Storm & silver', mood: 'Moonlight, signet magic and cold steel.', swatch: ['#0a0912', '#b9a6ff'] },
];

/** Must match the key the inline script in index.html reads. */
export const THEME_KEY = 'scribe-archive:theme';

export function parseTheme(value: unknown): ThemeId | null {
  return value === 'night' || value === 'storm' ? value : null;
}

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'setItem'>;

/** localStorage can be missing or throw (private windows, blocked site data). */
function browserStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/** The sky a returning reader chose, or null on a first visit. */
export function loadTheme(storage: ReadStorage | undefined = browserStorage()): ThemeId | null {
  try {
    return parseTheme(storage?.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

export function saveTheme(id: ThemeId, storage: WriteStorage | undefined = browserStorage()): void {
  try {
    storage?.setItem(THEME_KEY, id);
  } catch {
    // The choice still applies for this visit.
  }
}

/** Repaints the page in a theme without remembering it (the chooser previews this way). */
export function paintTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  const ground = THEMES.find((t) => t.id === id)?.swatch[0];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ground ?? '#07090d');
}

let current: ThemeId | null = loadTheme();
const listeners = new Set<() => void>();

/** Paints and remembers the reader's sky. */
export function setTheme(id: ThemeId): void {
  current = id;
  saveTheme(id);
  paintTheme(id);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The reader's chosen sky, or null until they pick one. */
export function useTheme(): ThemeId | null {
  return useSyncExternalStore(subscribe, () => current);
}
