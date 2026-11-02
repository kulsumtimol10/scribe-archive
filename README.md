# The Scribe Archive

An unofficial, fan-made world for readers of the Empyrean series. Not affiliated with or endorsed by
Rebecca Yarros, Entangled Publishing or Red Tower Books.

## What's here

- **Choose your sky.** Readers pick Night & gold or Storm & silver on their first visit and can switch any time
  from the header (swatches on phones). The choice is saved in the browser and painted before first render, so
  there is no flash of the other theme. Every colour lives in CSS variables in `src/styles.css`.
- **Home.** A cinematic hero: lightning over Basgiath, a gliding dragon, drifting mist and film grain.
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
npm run dev        # http://localhost:5190
npm test
npm run build      # type-checks, then builds to dist/
```

## Deploy

Vercel works out of the box (framework: Vite). `vercel.json` sends every path to `index.html` so links like
`/read` load directly.

## Ground rules

No AI art, no text copied from the books, nothing for sale. Credit fan artists by name, with permission.

## Next up

The Threshing (dragon quiz with a shareable rider card), Threshing Night (live event), the Trials (games),
the Commons (discussion, needs a backend) and the 3D Archive map.
