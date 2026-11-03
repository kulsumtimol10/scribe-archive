export type Route = 'home' | 'threshing' | 'read' | 'wallpapers';

/**
 * Each page's path inside the site, before the folder it is hosted under.
 * The build reads this too (vite.config.ts), so keep it free of browser code.
 */
export const ROUTES: Record<Route, string> = {
  home: '/',
  threshing: '/threshing',
  read: '/read',
  wallpapers: '/wallpapers',
};
