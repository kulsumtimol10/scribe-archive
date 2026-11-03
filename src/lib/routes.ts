export type Route = 'home' | 'map' | 'threshing' | 'trials' | 'parapet' | 'gauntlet' | 'warGames' | 'read' | 'wallpapers';

/**
 * Each page's path inside the site, before the folder it is hosted under.
 * The build reads this too (vite.config.ts), so keep it free of browser code.
 */
export const ROUTES: Record<Route, string> = {
  home: '/',
  map: '/map',
  threshing: '/threshing',
  trials: '/trials',
  parapet: '/trials/parapet',
  gauntlet: '/trials/gauntlet',
  warGames: '/trials/war-games',
  read: '/read',
  wallpapers: '/wallpapers',
};
