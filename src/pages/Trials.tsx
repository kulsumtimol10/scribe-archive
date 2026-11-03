import { Link } from '../components/Link';
import { dailySeed, loadRecords } from '../lib/gauntlet';
import { formatTime, loadBest, WEATHER, type Weather } from '../lib/parapet';
import { PATHS } from '../lib/router';
import { loadRecord } from '../lib/warGames';

export function TrialsPage() {
  const best = loadBest();
  const records = (Object.keys(WEATHER) as Weather[]).filter((w) => best[w] !== undefined);
  const race = loadRecord();
  const climbs = loadRecords();

  return (
    <section className="page-section trials" aria-labelledby="trials-title">
      <div className="stack-tight">
        <p className="kicker">The Trials</p>
        <h1 id="trials-title">Survive Basgiath.</h1>
        <p className="lore">Every rider has to earn their place. Start with the bridge, end in the sky.</p>
      </div>

      <div className="trial-grid">
        <Link href={PATHS.parapet} className="trial-card open">
          <span className="trial-numeral" aria-hidden="true">
            I
          </span>
          <span className="kicker">Balance · 1–2 minutes</span>
          <span className="feature-name">Cross the Parapet</span>
          <span className="lore">Wind, rain and a long drop. Keep your balance across the bridge.</span>
          <span className="trial-best">
            {records.length > 0
              ? records.map((w) => `${WEATHER[w].name} ${formatTime(best[w]!)}`).join(' · ')
              : 'Not yet crossed'}
          </span>
        </Link>
        <Link href={PATHS.gauntlet} className="trial-card open">
          <span className="trial-numeral" aria-hidden="true">
            II
          </span>
          <span className="kicker">Timed climb · a new wall daily</span>
          <span className="feature-name">The Gauntlet</span>
          <span className="lore">Forty-eight holds through the wall, the rockfall and the swinging log. Every grip counts.</span>
          <span className="trial-best">
            {climbs.days[String(dailySeed())] !== undefined
              ? `Today ${formatTime(climbs.days[String(dailySeed())])}`
              : "Today's wall not yet climbed"}
            {climbs.best !== undefined && ` · ever ${formatTime(climbs.best)}`}
          </span>
        </Link>
        <Link href={PATHS.warGames} className="trial-card open">
          <span className="trial-numeral" aria-hidden="true">
            III
          </span>
          <span className="kicker">Flight race · under a minute</span>
          <span className="feature-name">War Games</span>
          <span className="lore">Twelve gates of light around Navarre, and the ghost of your best run to beat.</span>
          <span className="trial-best">{race ? `Best ${formatTime(race.best)}` : 'Not yet flown'}</span>
        </Link>
      </div>
    </section>
  );
}
