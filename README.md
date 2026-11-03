# The Scribe Archive

An unofficial, fan-made world for readers of the Empyrean series. Not affiliated with or endorsed by
Rebecca Yarros, Entangled Publishing or Red Tower Books.

## What's here

- **Choose your sky.** Readers pick Night & gold or Storm & silver on their first visit and can switch any time
  from the header (swatches on phones). The choice is saved in the browser and painted before first render, so
  there is no flash of the other theme. Every colour lives in CSS variables in `src/styles.css`.
- **Home.** A cinematic hero: lightning over Basgiath, a gliding dragon, drifting mist and film grain.
- **The Threshing** (`/threshing`). Six questions on a night field full of watching eyes, then a dragon
  chooses you: colour, tail, a generated name, a signet (one in twenty gets the rare one) and a wing. The
  result depends only on the answers and the rider's name (`src/lib/threshing.ts`), so it's saved by
  storing just those. Download or share a 1080×1920 rider card for stories; the wallpaper studio then
  offers the reader's own dragon first.
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

Threshing Night (live event, needs a backend), the Trials (games), the Commons (discussion, needs a
backend) and the 3D Archive map.
