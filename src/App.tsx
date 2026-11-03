import { Footer, Header, TabBar } from './components/Chrome';
import { Link } from './components/Link';
import { ArchiveMapPage } from './pages/ArchiveMap';
import { CodexPage } from './pages/Codex';
import { CommonsPage } from './pages/Commons';
import { FlyPage } from './pages/Fly';
import { HomePage } from './pages/Home';
import { ReadPage } from './pages/Read';
import { RelicPage } from './pages/Relic';
import { SkyChooser } from './pages/SkyChooser';
import { GauntletPage } from './pages/Gauntlet';
import { ParapetPage } from './pages/Parapet';
import { ThreshingPage } from './pages/Threshing';
import { TrialsPage } from './pages/Trials';
import { WarGamesPage } from './pages/WarGames';
import { WallpapersPage } from './pages/Wallpapers';
import { PATHS, routeOf, usePathname, type Route } from './lib/router';
import { useTheme } from './lib/theme';

function Page({ route }: { route: Route | null }) {
  switch (route) {
    case 'home':
      return <HomePage />;
    case 'map':
      return <ArchiveMapPage />;
    case 'fly':
      return <FlyPage />;
    case 'threshing':
      return <ThreshingPage />;
    case 'codex':
      return <CodexPage />;
    case 'trials':
      return <TrialsPage />;
    case 'parapet':
      return <ParapetPage />;
    case 'gauntlet':
      return <GauntletPage />;
    case 'warGames':
      return <WarGamesPage />;
    case 'read':
      return <ReadPage />;
    case 'relic':
      return <RelicPage />;
    case 'commons':
      return <CommonsPage />;
    case 'wallpapers':
      return <WallpapersPage />;
    default:
      return (
        <section className="page-section lost">
          <h1>This scroll isn't in the Archive</h1>
          <p className="lore">The page you were looking for doesn't exist, or hasn't been written yet.</p>
          <Link href={PATHS.home} className="button primary">
            Back to the Archive
          </Link>
        </section>
      );
  }
}

export function App() {
  const theme = useTheme();
  const route = routeOf(usePathname());

  // First visit: the reader chooses a sky, then lands on the page they came for.
  if (theme === null) return <SkyChooser />;

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header route={route} theme={theme} />
      <main id="main" className="main">
        <Page route={route} />
      </main>
      <Footer />
      <TabBar route={route} />
    </div>
  );
}
