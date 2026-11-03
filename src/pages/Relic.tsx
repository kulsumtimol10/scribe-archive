import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { PracticeArm, RelicArt, SKINS } from '../components/art/RelicArt';
import { IMAGE_TYPE } from '../lib/render';
import { drawRelic, inkFor, INKS, RELIC_HEIGHT, RELIC_WIDTH, type InkId } from '../lib/relic';
import { captureRelic, type Backdrop, type Placement } from '../lib/relicPhoto';
import { canShareImages, saveFile, shareFile } from '../lib/share';
import { choose, loadBond } from '../lib/threshing';

type Source = 'practice' | 'camera' | 'photo';
type Facing = 'environment' | 'user';
type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'done'; message: string } | { kind: 'error'; message: string };

/** The stage is 3:4, like most phone cameras held upright. */
const ASPECT = 3 / 4;
/** Lined up with the practice arm, which runs up and to the right. */
const START: Placement = { x: 0.47, y: 0.6, scale: 0.62, rotation: 42 };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Pointer {
  x: number;
  y: number;
}

/** Distance and angle between two touches, for pinching and twisting. */
function span(a: Pointer, b: Pointer) {
  return { dist: Math.hypot(b.x - a.x, b.y - a.y), angle: Math.atan2(b.y - a.y, b.x - a.x), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
}

const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rider';

export function RelicPage() {
  const bond = useMemo(() => {
    const saved = loadBond();
    return saved ? choose(saved.answers, saved.rider) : null;
  }, []);
  const [name, setName] = useState(bond?.rider ?? '');
  const [variant, setVariant] = useState(0);
  const [ink, setInk] = useState<InkId>(() => inkFor(bond?.colour ?? null));
  const [skin, setSkin] = useState(1);
  const [source, setSource] = useState<Source>('practice');
  const [facing, setFacing] = useState<Facing>('environment');
  const [photo, setPhoto] = useState<string | null>(null);
  const [placement, setPlacement] = useState<Placement>(START);
  const [notice, setNotice] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [shareable, setShareable] = useState(false);
  const [taken, setTaken] = useState<{ url: string; file: File } | null>(null);

  const mark = useMemo(() => drawRelic(name, variant), [name, variant]);
  const stage = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const practice = useRef<HTMLDivElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => setShareable(canShareImages()), []);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  // Let go of the camera (and its light) when the reader leaves the page.
  useEffect(() => stopCamera, []);
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);
  useEffect(() => () => {
    if (taken) URL.revokeObjectURL(taken.url);
  }, [taken]);

  const openCamera = async (want: Facing) => {
    setNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser can't open a camera here. Try a photo instead.");
      return;
    }
    stopCamera();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: want, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      });
      stream.current = s;
      setFacing(want);
      setSource('camera');
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play().catch(() => undefined);
      }
    } catch (err) {
      const declined = err instanceof DOMException && err.name === 'NotAllowedError';
      setNotice(
        declined
          ? 'Camera access was turned down. You can still use a photo or the practice arm.'
          : "The camera couldn't open. Try a photo or the practice arm.",
      );
    }
  };

  const usePractice = () => {
    stopCamera();
    setSource('practice');
    setNotice('');
  };

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    stopCamera();
    setPhoto(URL.createObjectURL(file));
    setSource('photo');
    setNotice('');
  };

  /* Placing the mark: one finger (or the mouse) drags it, two fingers pinch and twist. */
  const pointers = useRef(new Map<number, Pointer>());
  const baseline = useRef<{ placement: Placement; pointers: Map<number, Pointer> } | null>(null);
  const rebase = () => {
    baseline.current = { placement: placementRef.current, pointers: new Map(pointers.current) };
  };
  const placementRef = useRef(placement);
  placementRef.current = placement;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety; dragging still works without it.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    rebase();
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !baseline.current || !stage.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { width, height } = stage.current.getBoundingClientRect();
    const start = baseline.current.placement;
    const ids = [...pointers.current.keys()].slice(0, 2);
    const before = ids.map((id) => baseline.current!.pointers.get(id)).filter(Boolean) as Pointer[];
    const now = ids.map((id) => pointers.current.get(id)!);
    if (before.length !== now.length) return;
    if (now.length === 1) {
      setPlacement({
        ...start,
        x: clamp(start.x + (now[0].x - before[0].x) / width, 0, 1),
        y: clamp(start.y + (now[0].y - before[0].y) / height, 0, 1),
      });
    } else {
      const a = span(before[0], before[1]);
      const b = span(now[0], now[1]);
      setPlacement({
        x: clamp(start.x + (b.mid.x - a.mid.x) / width, 0, 1),
        y: clamp(start.y + (b.mid.y - a.mid.y) / height, 0, 1),
        scale: clamp(start.scale * (b.dist / Math.max(1, a.dist)), 0.2, 1.4),
        rotation: start.rotation + ((b.angle - a.angle) * 180) / Math.PI,
      });
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    rebase();
  };

  /** Arrow keys nudge the mark; with Shift they turn it. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = 0.02;
    const moves: Record<string, Partial<Placement>> = e.shiftKey
      ? { ArrowLeft: { rotation: placement.rotation - 5 }, ArrowRight: { rotation: placement.rotation + 5 } }
      : {
          ArrowLeft: { x: clamp(placement.x - step, 0, 1) },
          ArrowRight: { x: clamp(placement.x + step, 0, 1) },
          ArrowUp: { y: clamp(placement.y - step, 0, 1) },
          ArrowDown: { y: clamp(placement.y + step, 0, 1) },
        };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setPlacement({ ...placement, ...move });
  };

  const backdrop = (): Backdrop | null => {
    if (source === 'camera' && video.current && video.current.videoWidth > 0)
      return { kind: 'camera', video: video.current, mirrored: facing === 'user' };
    if (source === 'photo' && image.current?.complete) return { kind: 'photo', image: image.current };
    const svg = practice.current?.querySelector('svg');
    return svg ? { kind: 'practice', svg } : null;
  };

  const takePhoto = async () => {
    const from = backdrop();
    if (!from) return;
    setStatus({ kind: 'working' });
    try {
      const blob = await captureRelic(from, mark, ink, placement, ASPECT);
      const file = new File([blob], `relic-${slug(name)}.jpg`, { type: IMAGE_TYPE });
      setTaken({ url: URL.createObjectURL(blob), file });
      setStatus({ kind: 'idle' });
    } catch (err) {
      setStatus({ kind: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  const download = () => {
    if (!taken) return;
    saveFile(taken.file);
    setStatus({ kind: 'done', message: `Saved ${taken.file.name}` });
  };

  const share = async () => {
    if (!taken) return;
    try {
      const shared = await shareFile(taken.file, 'My relic', 'Drawn from my name at The Scribe Archive');
      setStatus(shared ? { kind: 'done', message: 'Shared.' } : { kind: 'idle' });
    } catch {
      setStatus({ kind: 'error', message: 'Sharing failed. Try Save instead.' });
    }
  };

  const who = name.trim();

  return (
    <div className="relic-page">
      <section className="page-section relic-intro" aria-labelledby="relic-title">
        <div className="stack-tight">
          <p className="kicker">The relic</p>
          <h1 id="relic-title">Wear your mark</h1>
          <p className="lore">
            A swirling mark drawn from your name. Nobody else gets this one. Place it on your arm with your camera, then
            keep the photo.
          </p>
        </div>
      </section>

      <div className="relic-layout">
        <div className="relic-column">
          <div
            ref={stage}
            className="relic-stage"
            tabIndex={0}
            role="application"
            aria-label="The mark on your arm. Drag to move it, pinch to resize and twist. Arrow keys move it; Shift with left or right turns it."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <video
              ref={video}
              className={facing === 'user' ? 'relic-backdrop mirrored' : 'relic-backdrop'}
              hidden={source !== 'camera'}
              playsInline
              muted
              autoPlay
            />
            {source === 'photo' && photo && <img ref={image} className="relic-backdrop" src={photo} alt="" />}
            {source === 'practice' && (
              <div ref={practice} className="relic-backdrop">
                <PracticeArm skin={SKINS[skin]} />
              </div>
            )}

            <div
              className="relic-overlay"
              style={{
                left: `${placement.x * 100}%`,
                top: `${placement.y * 100}%`,
                height: `${placement.scale * 100}%`,
                aspectRatio: `${RELIC_WIDTH} / ${RELIC_HEIGHT}`,
                transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                mixBlendMode: ink === 'ink' ? 'multiply' : 'normal',
              }}
            >
              <RelicArt key={`${name}#${variant}#${ink}`} mark={mark} ink={ink} />
            </div>

            <p className="relic-hint" aria-hidden="true">
              Drag to place · pinch to size and turn
            </p>
            {source === 'camera' && (
              <button
                type="button"
                className="relic-flip"
                aria-label={facing === 'user' ? 'Use the back camera' : 'Use the front camera'}
                onClick={() => openCamera(facing === 'user' ? 'environment' : 'user')}
              >
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                  <path d="M3 7a6 6 0 0 1 11-2M15 11a6 6 0 0 1-11 2" />
                  <path d="M14 2v3h-3M4 16v-3h3" />
                </svg>
              </button>
            )}
          </div>

          <div className="relic-actions">
            <button type="button" className="button" onClick={() => setVariant((v) => v + 1)}>
              Redraw
            </button>
            <button type="button" className="shutter" aria-label="Take a photo" onClick={takePhoto} disabled={status.kind === 'working'}>
              <span aria-hidden="true" />
            </button>
            <button type="button" className="button" onClick={() => setPlacement(START)}>
              Reset
            </button>
          </div>
        </div>

        <aside className="relic-panel" aria-label="Your mark">
          <div className="stack-tight">
            <p className="relic-name">{who ? `The mark of ${who}` : 'Your mark'}</p>
            <p className="muted small">{variant === 0 ? 'Drawn from your name. Nobody else gets this one.' : `Drawn from your name, take ${variant + 1}.`}</p>
          </div>

          <label className="field text-field relic-field">
            <span className="legend">Your name</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              autoComplete="given-name"
              placeholder="Rider"
              onChange={(e) => {
                setName(e.target.value);
                setVariant(0);
              }}
            />
          </label>

          <div className="field">
            <span className="legend" id="relic-ink">
              Ink
            </span>
            <div className="chips" role="group" aria-labelledby="relic-ink">
              {(Object.keys(INKS) as InkId[]).map((id) => (
                <button key={id} type="button" className="chip" aria-pressed={ink === id} onClick={() => setInk(id)}>
                  <span className="dot" style={{ background: INKS[id].glow ?? INKS[id].line, borderColor: INKS[id].glow ? INKS[id].line : 'var(--muted)' }} />
                  {INKS[id].name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="legend" id="relic-source">
              Try it on
            </span>
            <div className="chips" role="group" aria-labelledby="relic-source">
              <button type="button" className="chip" aria-pressed={source === 'camera'} onClick={() => openCamera(facing)}>
                Camera
              </button>
              <button type="button" className="chip" aria-pressed={source === 'photo'} onClick={() => fileInput.current?.click()}>
                A photo
              </button>
              <button type="button" className="chip" aria-pressed={source === 'practice'} onClick={usePractice}>
                Practice arm
              </button>
            </div>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
          </div>

          {source === 'practice' && (
            <div className="field">
              <span className="legend" id="relic-skin">
                Skin
              </span>
              <div className="chips" role="group" aria-labelledby="relic-skin">
                {SKINS.map((s, i) => (
                  <button key={s.name} type="button" className="chip" aria-pressed={skin === i} onClick={() => setSkin(i)}>
                    <span className="dot" style={{ background: s.base, borderColor: s.shade }} />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="field relic-sliders">
            <label>
              <span className="legend">Size</span>
              <input
                type="range"
                min={20}
                max={140}
                value={Math.round(placement.scale * 100)}
                onChange={(e) => setPlacement({ ...placement, scale: Number(e.target.value) / 100 })}
              />
            </label>
            <label>
              <span className="legend">Turn</span>
              <input
                type="range"
                min={-180}
                max={180}
                value={Math.round((((placement.rotation % 360) + 540) % 360) - 180)}
                onChange={(e) => setPlacement({ ...placement, rotation: Number(e.target.value) })}
              />
            </label>
          </div>

          {taken && (
            <div className="relic-taken">
              <img src={taken.url} alt={who ? `Your photo with the mark of ${who}` : 'Your photo with your mark'} />
              <div className="download-row">
                <button type="button" className="button primary" onClick={download}>
                  Save photo
                </button>
                {shareable && (
                  <button type="button" className="button" onClick={share}>
                    Share
                  </button>
                )}
              </div>
            </div>
          )}
          <p className={status.kind === 'error' ? 'notice error' : 'muted small'} role="status">
            {status.kind === 'working'
              ? 'Taking the photo…'
              : status.kind === 'done' || status.kind === 'error'
                ? status.message
                : 'The camera stays on your device. Nothing is uploaded.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
