import { useEffect, useRef, useState } from 'react';
import { PATHS, type Route } from '../lib/router';
import type { ThemeId } from '../lib/theme';
import { Link } from './Link';
import { ThemeSwitch } from './ThemeSwitch';

/** The header's own links; the logo already goes home. */
const NAV: { route: Route; label: string }[] = [
  { route: 'map', label: 'Map' },
  { route: 'fly', label: 'Fly' },
  { route: 'threshing', label: 'Threshing' },
  { route: 'codex', label: 'Codex' },
  { route: 'trials', label: 'Trials' },
  { route: 'commons', label: 'Commons' },
];

interface MoreItem {
  route: Route;
  label: string;
  note: string;
}

/** Behind "More" in the header: the quieter pages. */
const MORE: MoreItem[] = [
  { route: 'night', label: 'Threshing Night', note: 'Once a month, everyone at once' },
  { route: 'read', label: 'Read with Basgiath', note: 'Soundscapes for reading' },
  { route: 'relic', label: 'The relic', note: 'Wear your mark' },
  { route: 'wallpapers', label: 'Wallpapers', note: 'Carry your dragon' },
];

/** Phones get four tabs and More, whose sheet also holds the pages that share a tab on desktop. */
const TABS: { route: Route; label: string }[] = [
  { route: 'map', label: 'Map' },
  { route: 'threshing', label: 'Threshing' },
  { route: 'trials', label: 'Trials' },
  { route: 'commons', label: 'Commons' },
];
const SHEET: MoreItem[] = [
  { route: 'fly', label: 'Fly with Tairn', note: 'A flight in six chapters' },
  { route: 'codex', label: 'Dragon Codex', note: 'Compare any two dragons' },
  ...MORE,
];

/** Marks the nav item for this page; a game counts as being in the Trials. */
function current(item: Route, route: Route | null): 'page' | undefined {
  if (item === route) return 'page';
  if (item === 'trials' && (route === 'parapet' || route === 'gauntlet' || route === 'warGames')) return 'page';
  return undefined;
}

/** Open/closed for a menu that closes on Escape, on a click elsewhere and when the page changes. */
function useMenu(route: Route | null) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const away = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('pointerdown', away);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('pointerdown', away);
    };
  }, [open]);
  return { open, setOpen, box };
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  );
}

function MoreLinks({ items, route, close }: { items: MoreItem[]; route: Route | null; close: () => void }) {
  return (
    <ul className="more-list">
      {items.map((item) => (
        <li key={item.route}>
          <Link href={PATHS[item.route]} aria-current={current(item.route, route)} onClick={close}>
            <span className="more-label">{item.label}</span>
            <span className="more-note">{item.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Header({ route, theme }: { route: Route | null; theme: ThemeId }) {
  const more = useMenu(route);
  const inMore = MORE.some((item) => item.route === route);
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
        <div ref={more.box} className="nav-more">
          <button
            type="button"
            className={inMore ? 'nav-more-button current' : 'nav-more-button'}
            aria-expanded={more.open}
            aria-controls="nav-more-menu"
            onClick={() => more.setOpen((o) => !o)}
          >
            More <Chevron />
          </button>
          {more.open && (
            <div id="nav-more-menu" className="more-menu">
              <MoreLinks items={MORE} route={route} close={() => more.setOpen(false)} />
            </div>
          )}
        </div>
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

/** Bottom tabs for phones, where the header nav is hidden. Fly and the Codex light up their nearest tab. */
export function TabBar({ route }: { route: Route | null }) {
  const sheet = useMenu(route);
  const tabFor: Partial<Record<Route, Route>> = { fly: 'map', codex: 'threshing' };
  const lit = (tab: Route) => current(tab, route) ?? (route && tabFor[route] === tab ? 'page' : undefined);
  const inSheet = MORE.some((item) => item.route === route);
  return (
    <div ref={sheet.box}>
      {sheet.open && (
        <div id="tab-sheet" className="tab-sheet">
          <MoreLinks items={SHEET} route={route} close={() => sheet.setOpen(false)} />
        </div>
      )}
      <nav className="tab-bar" aria-label="Main">
        {TABS.map((tab) => (
          <Link key={tab.route} href={PATHS[tab.route]} aria-current={lit(tab.route)}>
            <span className="tab-dot" aria-hidden="true" />
            {tab.label}
          </Link>
        ))}
        <button
          type="button"
          className={inSheet ? 'tab-more current' : 'tab-more'}
          aria-expanded={sheet.open}
          aria-controls="tab-sheet"
          onClick={() => sheet.setOpen((o) => !o)}
        >
          <span className="tab-dot" aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
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
