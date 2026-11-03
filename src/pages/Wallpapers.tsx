import { useEffect, useMemo, useRef, useState } from 'react';
import { WallpaperArt } from '../components/art/WallpaperArt';
import { IMAGE_TYPE, renderImage } from '../lib/render';
import { canShareImages, saveFile, shareFile } from '../lib/share';
import { choose, loadBond } from '../lib/threshing';
import {
  dragonsFor,
  FORMATS,
  SKIES,
  wallpaperFileName,
  wallpaperText,
  type DragonId,
  type SkyId,
  type WallpaperFormat,
} from '../lib/wallpaper';

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

export function WallpapersPage() {
  // Readers who walked the Threshing find their own dragon first in line.
  const bond = useMemo(() => {
    const saved = loadBond();
    return saved ? choose(saved.answers, saved.rider) : null;
  }, []);
  const dragons = dragonsFor(bond);

  const art = useRef<SVGSVGElement>(null);
  const [dragon, setDragon] = useState<DragonId>(bond ? 'mine' : 'tairn');
  const [sky, setSky] = useState<SkyId>('storm');
  const [name, setName] = useState(bond?.rider ?? '');
  const [relic, setRelic] = useState(true);
  const [format, setFormat] = useState<WallpaperFormat>('phone');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shareable, setShareable] = useState(false);

  useEffect(() => setShareable(canShareImages()), []);

  const lines = wallpaperText(format, name, dragons[dragon].line);
  const fileName = wallpaperFileName(dragons[dragon].name, sky, format);

  const make = async (): Promise<File | null> => {
    if (!art.current) return null;
    setStatus({ kind: 'working' });
    try {
      const blob = await renderImage(art.current, FORMATS[format], lines);
      return new File([blob], fileName, { type: IMAGE_TYPE });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  const download = async () => {
    const file = await make();
    if (!file) return;
    saveFile(file);
    setStatus({ kind: 'done', message: `Saved ${file.name}` });
  };

  const share = async () => {
    const file = await make();
    if (!file) return;
    try {
      const shared = await shareFile(file, 'My Scribe Archive wallpaper');
      setStatus(shared ? { kind: 'done', message: 'Shared. Choose "Save Image" to keep it in your photos.' } : { kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: 'Sharing failed. Try Download instead.' });
    }
  };

  const { width, height } = FORMATS[format];

  return (
    <div className="wallpaper-page">
      <section className="wallpaper-preview" aria-label="Preview">
        <div className={format === 'phone' ? 'device phone' : 'device desktop'}>
          <WallpaperArt
            ref={art}
            className="device-screen"
            style={{ aspectRatio: `${width} / ${height}` }}
            format={format}
            dragon={dragons[dragon]}
            sky={sky}
            relic={relic}
            lines={lines}
          />
        </div>
      </section>

      <section className="wallpaper-controls" aria-labelledby="wallpaper-title">
        <div className="stack-tight">
          <p className="kicker">Wallpaper studio</p>
          <h1 id="wallpaper-title">Carry your dragon in your pocket.</h1>
        </div>

        <fieldset className="field">
          <legend>Dragon</legend>
          <div className="chips">
            {(Object.keys(dragons) as DragonId[]).map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={dragon === id} onClick={() => setDragon(id)}>
                <span className="dot" style={{ background: dragons[id].swatch, borderColor: dragons[id].colours.rim }} aria-hidden="true" />
                {dragons[id].name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Sky</legend>
          <div className="chips">
            {(Object.keys(SKIES) as SkyId[]).map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={sky === id} onClick={() => setSky(id)}>
                <span
                  className="sky-dot"
                  style={{ background: `linear-gradient(${SKIES[id].top}, ${SKIES[id].mid})` }}
                  aria-hidden="true"
                />
                {SKIES[id].name}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <label className="field text-field">
            <span className="legend">Your rider name</span>
            <input type="text" value={name} maxLength={18} placeholder="Cadet" onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="button" className="chip" aria-pressed={relic} onClick={() => setRelic((r) => !r)}>
            Relic mark {relic ? 'on' : 'off'}
          </button>
        </div>

        <fieldset className="field">
          <legend>Size</legend>
          <div className="chips">
            {(Object.keys(FORMATS) as WallpaperFormat[]).map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={format === id} onClick={() => setFormat(id)}>
                {FORMATS[id].label} · {FORMATS[id].width}×{FORMATS[id].height}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="download-row">
          <button type="button" className="button primary" onClick={download} disabled={status.kind === 'working'}>
            {status.kind === 'working' ? 'Painting…' : `Download ${FORMATS[format].label.toLowerCase()} wallpaper`}
          </button>
          {shareable && (
            <button type="button" className="button" onClick={share} disabled={status.kind === 'working'}>
              Share or save to photos
            </button>
          )}
        </div>
        <p className={status.kind === 'error' ? 'notice error' : 'muted small'} role="status">
          {status.kind === 'done' || status.kind === 'error'
            ? status.message
            : 'Full resolution, ready for your lock screen. Free, fan-made, not for resale.'}
        </p>
      </section>
    </div>
  );
}
