export type Route = 'home' | 'map' | 'fly' | 'threshing' | 'codex' | 'trials' | 'parapet' | 'gauntlet' | 'warGames' | 'read' | 'relic' | 'commons' | 'wallpapers';

/**
 * Each page's path inside the site, before the folder it is hosted under.
 * The build reads this too (vite.config.ts), so keep it free of browser code.
 */
export const ROUTES: Record<Route, string> = {
  home: '/',
  map: '/map',
  fly: '/fly',
  threshing: '/threshing',
  codex: '/codex',
  trials: '/trials',
  parapet: '/trials/parapet',
  gauntlet: '/trials/gauntlet',
  warGames: '/trials/war-games',
  read: '/read',
  relic: '/relic',
  commons: '/commons',
  wallpapers: '/wallpapers',
};
