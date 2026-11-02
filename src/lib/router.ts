import { useSyncExternalStore } from 'react';

export type Route = 'home' | 'read' | 'wallpapers';

export const PATHS: Record<Route, string> = {
  home: '/',
  read: '/read',
  wallpapers: '/wallpapers',
};

/** The page a path shows, ignoring a trailing slash; null for unknown paths. */
export function routeOf(pathname: string): Route | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  const match = (Object.keys(PATHS) as Route[]).find((route) => PATHS[route] === path);
  return match ?? null;
}

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

/** Moves to another page without a reload and starts it at the top. */
export function navigate(path: string): void {
  if (path === window.location.pathname) return;
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
