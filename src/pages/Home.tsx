import { HeroScene } from '../components/art/HeroScene';
import { Link } from '../components/Link';
import { PATHS } from '../lib/router';

const OPEN = [
  {
    href: PATHS.threshing,
    kicker: 'The Threshing',
    name: 'Find your dragon',
    text: 'Six steps across the field. One dragon chooses you, and you leave with a rider card made for your stories.',
  },
  {
    href: PATHS.map,
    kicker: 'The Archive map',
    name: 'Fly over Navarre',
    text: 'A 3D map you can turn and zoom, with a spoiler shield that keeps later books sealed until you get there.',
  },
  {
    href: PATHS.trials,
    kicker: 'The Trials',
    name: 'Survive Basgiath',
    text: 'Cross the Parapet in a storm, climb a new Gauntlet every day, and race your own ghost through the War Games.',
  },
  {
    href: PATHS.read,
    kicker: 'Soundscapes',
    name: 'Read with Basgiath',
    text: 'Rain on the Parapet, wind through the Vale, a hearth in the dorms. Mix your own storm and keep it on while you read.',
  },
  {
    href: PATHS.wallpapers,
    kicker: 'Wallpaper studio',
    name: 'Carry your dragon',
    text: 'Pick a dragon and a sky, add your rider name, and save a lock screen made just for you.',
  },
];

const FORGING = [
  { name: 'Threshing Night', text: 'Once a month, every reader walks the field at the same time.' },
  { name: 'The Commons', text: 'Theories, reviews and spoiler-shielded talk with other riders.' },
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <HeroScene />
        <div className="hero-copy">
          <p className="kicker">An unofficial, fan-made world for riders</p>
          <h1>The Scribe Archive</h1>
          <p className="lore">
            For everyone who crossed the Parapet with Violet. Read with Basgiath's storms, carry your dragon with you, and
            come back for what's being forged next.
          </p>
          <div className="actions">
            <Link href={PATHS.threshing} className="button primary">
              Find your dragon
            </Link>
            <Link href={PATHS.read} className="button">
              Read with Basgiath
            </Link>
          </div>
        </div>
      </section>

      <section className="page-section" aria-labelledby="open-now">
        <h2 id="open-now" className="section-title">
          Open now
        </h2>
        <div className="feature-grid">
          {OPEN.map((item) => (
            <Link key={item.href} href={item.href} className="feature-card">
              <span className="kicker">{item.kicker}</span>
              <span className="feature-name">{item.name}</span>
              <span className="lore">{item.text}</span>
              <span className="feature-go" aria-hidden="true">
                Enter
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-section" aria-labelledby="forging">
        <h2 id="forging" className="section-title">
          Being forged
        </h2>
        <ul className="forge-list">
          {FORGING.map((item) => (
            <li key={item.name} className="forge-card">
              <span className="forge-name">{item.name}</span>
              <span className="muted">{item.text}</span>
              <span className="soon">Soon</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
