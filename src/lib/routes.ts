export type Route = 'home' | 'read' | 'wallpapers';

/**
 * Each page's path inside the site, before the folder it is hosted under.
 * The build reads this too (vite.config.ts), so keep it free of browser code.
 */
export const ROUTES: Record<Route, string> = {
  home: '/',
  read: '/read',
  wallpapers: '/wallpapers',
};
