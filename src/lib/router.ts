import { useSyncExternalStore } from 'react';
import { ROUTES, type Route } from './routes';

export type { Route };

/** The folder the site is served from, without a trailing slash: '/scribe-archive' on GitHub Pages. */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Each page's full href, including the hosting folder. */
export const PATHS = Object.fromEntries(
  (Object.keys(ROUTES) as Route[]).map((route) => [route, BASE + ROUTES[route]]),
) as Record<Route, string>;

/** The page a path shows, ignoring the hosting folder and a trailing slash; null for unknown paths. */
export function routeOf(pathname: string, base: string = BASE): Route | null {
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  const inside = pathname.slice(base.length) || '/';
  const path = inside.length > 1 ? inside.replace(/\/+$/, '') : inside;
  const match = (Object.keys(ROUTES) as Route[]).find((route) => ROUTES[route] === path);
  return match ?? null;
}

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

export function usePathname(): string {
  return useSyncExternalStore(subscribe, () => window.location.pathname);
}

/** The address's query string ("?t=abc"), for pages that keep state there. */
export function useSearch(): string {
  return useSyncExternalStore(subscribe, () => window.location.search);
}

/** Moves to another page (or the same page with a new query) without a reload, starting at the top. */
export function navigate(path: string): void {
  if (path === window.location.pathname + window.location.search) return;
  history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo(0, 0);
}
