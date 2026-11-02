import { useEffect, useRef, useState } from 'react';
import { WallpaperArt } from '../components/art/WallpaperArt';
import {
  DRAGONS,
  FORMATS,
  renderWallpaper,
  SKIES,
  WALLPAPER_TYPE,
  wallpaperFileName,
  wallpaperText,
  type DragonId,
  type SkyId,
  type WallpaperFormat,
} from '../lib/wallpaper';

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

function canShareImages(): boolean {
  try {
    const probe = new File([new Uint8Array(1)], 'probe.jpg', { type: WALLPAPER_TYPE });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function WallpapersPage() {
  const art = useRef<SVGSVGElement>(null);
  const [dragon, setDragon] = useState<DragonId>('tairn');
  const [sky, setSky] = useState<SkyId>('storm');
  const [name, setName] = useState('');
  const [relic, setRelic] = useState(true);
  const [format, setFormat] = useState<WallpaperFormat>('phone');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shareable, setShareable] = useState(false);

  useEffect(() => setShareable(canShareImages()), []);

  const lines = wallpaperText(format, name, dragon);
  const fileName = wallpaperFileName(dragon, sky, format);

  const make = async (): Promise<File | null> => {
    if (!art.current) return null;
    setStatus({ kind: 'working' });
    try {
      const blob = await renderWallpaper(art.current, format, lines);
      return new File([blob], fileName, { type: WALLPAPER_TYPE });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  const download = async () => {
    const file = await make();
    if (!file) return;
    saveBlob(file, file.name);
    setStatus({ kind: 'done', message: `Saved ${file.name}` });
  };

  const share = async () => {
    const file = await make();
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: 'My Scribe Archive wallpaper' });
      setStatus({ kind: 'done', message: 'Shared. Choose "Save Image" to keep it in your photos.' });
    } catch (err) {
      // Closing the share sheet is not an error worth showing.
      if (err instanceof DOMException && err.name === 'AbortError') setStatus({ kind: 'idle' });
      else setStatus({ kind: 'error', message: 'Sharing failed. Try Download instead.' });
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
            dragon={dragon}
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
            {(Object.keys(DRAGONS) as DragonId[]).map((id) => (
              <button key={id} type="button" className="chip" aria-pressed={dragon === id} onClick={() => setDragon(id)}>
                <span className="dot" style={{ background: DRAGONS[id].swatch, borderColor: DRAGONS[id].colours.rim }} aria-hidden="true" />
                {DRAGONS[id].name}
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
