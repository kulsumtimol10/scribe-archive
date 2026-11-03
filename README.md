# The Scribe Archive

An unofficial, fan-made world for readers of the Empyrean series. Not affiliated with or endorsed by
Rebecca Yarros, Entangled Publishing or Red Tower Books.

## What's here

- **Choose your sky.** Readers pick Night & gold or Storm & silver on their first visit and can switch any time
  from the header (swatches on phones). The choice is saved in the browser and painted before first render, so
  there is no flash of the other theme. Every colour lives in CSS variables in `src/styles.css`.
- **Home.** A cinematic hero: lightning over Basgiath, a gliding dragon, drifting mist and film grain.
- **The Archive map** (`/map`). A moonlit 3D Navarre (React Three Fiber, loaded only on this page): forests,
  a river gorge, snow on the peaks, lit towns and Basgiath's castle, dragons on patrol, mist, and the wards as
  a shimmering curtain of light along the cliffs. It opens with a fly-in from the sea; drag to orbit, scroll or
  pinch to zoom, tap a light or a place to fly there. A spoiler shield (Book I–III, remembered site-wide in
  `src/lib/spoilers.ts`) seals later places, darkens their towns and fades the wards. The landscape is a few
  smooth functions in `src/lib/archiveMap.ts`, so terrain, river, forests, wards and pins always agree; the
  scene's pieces live in `src/components/3d/`. Labels are ordinary buttons the scene moves over their pins.
  **Take flight** puts the reader on their own dragon (from the Threshing, or a borrowed black one): it always
  flies forward; A/D or arrows turn, W/S climb and dive, Shift sprints, Esc lands; phones get hold buttons.
  Flying near a place discovers it (kept in the browser). The flight rules are pure and tested in
  `src/lib/dragonFlight.ts`: the dragon can't clip the ground, and the wards steer it home from open sea.
  Add `?lite` to the URL to turn the glow pass off on slow machines. Glow shaders must never output NaN (clamp
  before `pow`): the bloom pass smears a single NaN pixel into a black screen.
- **The Threshing** (`/threshing`). Six questions on a night field full of watching eyes, then a dragon
  chooses you: colour, tail, a generated name, a signet (one in twenty gets the rare one) and a wing. The
  result depends only on the answers and the rider's name (`src/lib/threshing.ts`), so it's saved by
  storing just those. Download or share a 1080×1920 rider card for stories; the wallpaper studio then
  offers the reader's own dragon first.
- **The Trials** (`/trials`) and **Cross the Parapet** (`/trials/parapet`). A balance game on the bridge
  over the gorge: hold W to walk, A/D to lean, Space to brace through gusts that are always announced first.
  Clear, Rain and Storm weather; best times are kept per weather. Touch screens get hold buttons. The
  physics (`src/lib/parapet.ts`) is pure and tested, including that a steady player can always cross and a
  careless one usually falls in a storm; drawing is in `src/lib/parapetScene.ts`.
- **The Gauntlet** (`/trials/gauntlet`). A timed climb up 48 holds through three sections: the bare wall,
  the rockfall and the swinging log. A/D or the arrows (or two big buttons on a phone) grab the left or right
  hold. A wrong grab slips; grabbing into a falling rock or the log knocks you down three holds, and both
  always flash red before they hit. The wall is new every day but the same for everyone that day, so times
  can be compared; today's best and the all-time best are kept. Rules are in `src/lib/gauntlet.ts`, with
  tests proving a careful climber finishes every day's wall without a knock; drawing is in
  `src/lib/gauntletScene.ts`. In development, `window.__climb` shows the climb from the console.
- **War Games** (`/trials/war-games`). A time trial on your own dragon through twelve gates around the map.
  The clock starts at the first gate and counts flight time, not wall time, so slow devices aren't
  penalised; an on-screen marker (an arrow at the screen edge) always points to the next gate. The best run
  is saved with a ghost path that races beside you next time. Course and ghost logic are in
  `src/lib/warGames.ts`; a test flies the whole course with an autopilot to prove it can be done. In
  development, `window.__ride` and `window.__teleport(x, y, z, heading)` help test races from the console.
- **Read with Basgiath** (`/read`). Six ambient layers (rain, wind, hearth, thunder, wingbeats, scribe quills)
  synthesised live with the Web Audio API, so there are no recordings to license. Presets, per-layer sliders
  and a reading timer that fades the sound out.
- **Wallpaper studio** (`/wallpapers`). Pick a dragon, a sky and a rider name, then download a full-resolution
  phone (1290×2796) or desktop (2560×1440) wallpaper. On phones that support it, "Share or save to photos"
  opens the share sheet.

Motion is turned off for readers who ask their device for reduced motion.

## Develop

```bash
npm install
npm run dev        # http://localhost:5190/scribe-archive/
npm test
npm run build      # type-checks, then builds to dist/
```

## Deploy

GitHub Pages, at https://kulsumtimol10.github.io/scribe-archive/. Every push to `main` runs
`.github/workflows/deploy.yml`, which tests, builds and publishes `dist/`.

- The site lives in the `/scribe-archive/` folder (`base` in `vite.config.ts`); in-app links come from
  `src/lib/router.ts`, so they follow it automatically. On a custom domain, set `base` to `/`.
- Pages can't rewrite URLs, so the build copies `index.html` into each page's folder (`read/`, `wallpapers/`)
  and to `404.html`. A new page only needs adding to `src/lib/routes.ts`.

## Ground rules

No AI art, no text copied from the books, nothing for sale. Credit fan artists by name, with permission.

## Next up

Threshing Night (live event, needs a backend), the Commons (discussion, needs a backend), the Dragon Codex
and an AR relic mark for phones.
