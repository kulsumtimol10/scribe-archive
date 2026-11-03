import { PATHS, type Route } from '../lib/router';
import type { ThemeId } from '../lib/theme';
import { Link } from './Link';
import { ThemeSwitch } from './ThemeSwitch';

const NAV: { route: Route; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'map', label: 'Map' },
  { route: 'threshing', label: 'Threshing' },
  { route: 'trials', label: 'Trials' },
  { route: 'read', label: 'Read' },
  { route: 'wallpapers', label: 'Wallpapers' },
];

/** Phones fit five tabs; the logo in the header already goes home. */
const TABS = NAV.filter((item) => item.route !== 'home');

/** Marks the nav item for this page; a game counts as being in the Trials. */
function current(item: Route, route: Route | null): 'page' | undefined {
  return item === route || (item === 'trials' && (route === 'parapet' || route === 'gauntlet' || route === 'warGames')) ? 'page' : undefined;
}

export function Header({ route, theme }: { route: Route | null; theme: ThemeId }) {
  return (
    <header className="site-header">
      <Link href={PATHS.home} className="brand" aria-label="The Scribe Archive, home">
        <svg width="26" height="26" viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2 L26 14 L14 26 L2 14 Z" />
          <path d="M14 8 L20 14 L14 20 L8 14 Z" />
        </svg>
        <span>The Scribe Archive</span>
      </Link>
      <nav className="site-nav" aria-label="Main">
        {NAV.map((item) => (
          <Link key={item.route} href={PATHS[item.route]} aria-current={current(item.route, route)}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="header-theme wide">
        <ThemeSwitch current={theme} />
      </div>
      <div className="header-theme narrow">
        <ThemeSwitch current={theme} compact />
      </div>
    </header>
  );
}

/** Bottom tabs for phones, where the header nav is hidden. */
export function TabBar({ route }: { route: Route | null }) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map((tab) => (
        <Link key={tab.route} href={PATHS[tab.route]} aria-current={current(tab.route, route)}>
          <span className="tab-dot" aria-hidden="true" />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <p>
        An unofficial, fan-made project. Not affiliated with or endorsed by Rebecca Yarros, Entangled Publishing or Red
        Tower Books. The Empyrean series and its characters belong to their author.
      </p>
      <p className="muted">Made with love by readers. No AI art, no book text, nothing for sale.</p>
    </footer>
  );
}
