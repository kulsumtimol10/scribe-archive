import { HeroScene } from '../components/art/HeroScene';
import { Link } from '../components/Link';
import { PATHS } from '../lib/router';
import { localWhen, nightStatus } from '../lib/threshingNight';

const OPEN = [
  {
    href: PATHS.threshing,
    kicker: 'The Threshing',
    name: 'Find your dragon',
    text: 'Six steps across the field. One dragon chooses you, and you leave with a rider card made for your stories.',
  },
  {
    href: PATHS.codex,
    kicker: 'The Dragon Codex',
    name: 'Tairn vs Sgaeyl',
    text: 'Set any two dragons side by side, turn them in 3D, and see how your own Threshing dragon measures up.',
  },
  {
    href: PATHS.fly,
    kicker: 'Fly with Tairn',
    name: 'Six chapters, one flight',
    text: 'Scroll from Basgiath through the storm to the border at dawn, with the wind and the thunder turned on.',
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
    href: PATHS.commons,
    kicker: 'The Commons',
    name: 'Talk with other riders',
    text: 'Theories, reviews in dragon scales and chapter-ending screaming, all behind a spoiler shield set to your book.',
  },
  {
    href: PATHS.read,
    kicker: 'Soundscapes',
    name: 'Read with Basgiath',
    text: 'Rain on the Parapet, wind through the Vale, a hearth in the dorms. Mix your own storm and keep it on while you read.',
  },
  {
    href: PATHS.relic,
    kicker: 'The relic',
    name: 'Wear your mark',
    text: 'A swirling mark drawn from your name. Place it on your arm with your camera and keep the photo.',
  },
  {
    href: PATHS.wallpapers,
    kicker: 'Wallpaper studio',
    name: 'Carry your dragon',
    text: 'Pick a dragon and a sky, add your rider name, and save a lock screen made just for you.',
  },
];

export function HomePage() {
  const night = nightStatus();
  return (
    <>
      <section className="hero">
        <HeroScene />
        <div className="hero-copy">
          <p className="kicker">An unofficial, fan-made world for riders</p>
          <h1>The Scribe Archive</h1>
          <p className="lore">
            For everyone who crossed the Parapet with Violet. Find your dragon, fly with Tairn, argue in the Commons, and
            come back every month for Threshing Night.
          </p>
          <div className="actions">
            <Link href={PATHS.threshing} className="button primary">
              Find your dragon
            </Link>
            <Link href={PATHS.fly} className="button">
              Fly with Tairn
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

      <section className="page-section" aria-labelledby="night-band">
        <Link href={PATHS.night} className={night.live ? 'night-band live' : 'night-band'}>
          <span className="kicker">{night.live ? 'Live now' : 'Once a month · everyone at once'}</span>
          <span id="night-band" className="feature-name">
            Threshing Night
          </span>
          <span className="lore">
            {night.live
              ? 'The field is open. Add the dragon that chose you and watch every other rider’s arrive.'
              : `Next on ${localWhen(night.next.start)}, your time. Every reader walks the field together.`}
          </span>
          <span className="feature-go" aria-hidden="true">
            {night.live ? 'Join the field' : 'See the field'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </span>
        </Link>
      </section>
    </>
  );
}
