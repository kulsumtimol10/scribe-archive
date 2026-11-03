import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { DragonButtons, useDragonControls } from '../components/DragonControls';
import { Link } from '../components/Link';
import { isUnsealed, PLACES, WARD_STATUS } from '../lib/archiveMap';
import { loadFound, saveFound, type Ride } from '../lib/dragonFlight';
import { readPalette } from '../lib/palette';
import { usePilot } from '../lib/pilot';
import { PATHS } from '../lib/router';
import { BOOK_NAMES, loadBook, saveBook, type Book } from '../lib/spoilers';
import { useTheme } from '../lib/theme';

// The 3D engine is large, so it only loads on this page.
const ArchiveMapScene = lazy(() => import('../scenes/ArchiveMapScene').then((m) => ({ default: m.ArchiveMapScene })));

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

const calm = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** How much of the map's left edge the floating panel covers; phones stack the panel below instead. */
function usePanelWidth(): number {
  const query = '(min-width: 761px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setWide(list.matches);
    list.addEventListener('change', change);
    return () => list.removeEventListener('change', change);
  }, []);
  return wide ? 400 : 0;
}

/** A compass rose for the corner of the map; the scene turns it to match the view. */
function Compass({ rose }: { rose: RefObject<SVGSVGElement | null> }) {
  return (
    <div className="compass" aria-hidden="true">
      <svg ref={rose} viewBox="0 0 100 100" width="76" height="76">
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeOpacity="0.35" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="2 4" />
        <path d="M50 8 L56 50 L50 92 L44 50 Z" fill="currentColor" fillOpacity="0.25" />
        <path d="M8 50 L50 44 L92 50 L50 56 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M50 8 L56 50 L44 50 Z" className="compass-north" />
        <text x="50" y="6" textAnchor="middle" dominantBaseline="hanging" className="compass-letter">
          N
        </text>
      </svg>
    </div>
  );
}

export function ArchiveMapPage() {
  const theme = useTheme();
  const [book, setBookState] = useState<Book>(loadBook);
  const [selected, setSelected] = useState('basgiath');
  const [flight, setFlight] = useState<{ to: string | null; id: number }>({ to: null, id: 0 });
  const [mode, setMode] = useState<'explore' | 'ride'>('explore');
  const [reached, setReached] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>(() => loadFound(PLACES.map((p) => p.id)));
  const [justFound, setJustFound] = useState<string | null>(null);
  // Re-read the colours whenever the reader switches sky.
  const palette = useMemo(readPalette, [theme]);
  const webgl = useMemo(hasWebGL, []);
  const labels = useRef(new Map<string, HTMLElement>());
  const compass = useRef<SVGSVGElement>(null);
  const panelWidth = usePanelWidth();
  const pilot = usePilot();

  const altitude = useRef<HTMLSpanElement>(null);
  const speed = useRef<HTMLSpanElement>(null);
  const warning = useRef<HTMLParagraphElement>(null);

  const place = PLACES.find((p) => p.id === selected) ?? PLACES[0];
  const open = isUnsealed(place, book);
  const riding = mode === 'ride';
  const openPlaces = PLACES.filter((p) => isUnsealed(p, book));
  const foundOpen = found.filter((id) => openPlaces.some((p) => p.id === id)).length;

  const flyTo = (id: string | null) => {
    if (id) setSelected(id);
    setFlight((f) => ({ to: id, id: f.id + 1 }));
  };

  const chooseBook = (next: Book) => {
    setBookState(next);
    saveBook(next);
  };

  const takeFlight = () => {
    setReached(null);
    setMode('ride');
  };

  const land = () => {
    setMode('explore');
    setReached(null);
    // Glide back out to the whole map.
    setFlight((f) => ({ to: null, id: f.id + 1 }));
  };

  const controls = useDragonControls(riding, land);

  const onReach = (id: string | null) => {
    setReached(id);
    if (!id) return;
    const reachedPlace = PLACES.find((p) => p.id === id)!;
    if (!isUnsealed(reachedPlace, book)) return;
    setSelected(id);
    if (found.includes(id)) return;
    const next = [...found, id];
    setFound(next);
    saveFound(next);
    setJustFound(id);
  };

  // The "discovered" flourish fades after a few seconds.
  useEffect(() => {
    if (!justFound) return;
    const timer = window.setTimeout(() => setJustFound(null), 4000);
    return () => window.clearTimeout(timer);
  }, [justFound]);

  const onRideFrame = (ride: Ride) => {
    if (altitude.current) altitude.current.textContent = `${Math.round(ride.y * 12)} ft`;
    if (speed.current) speed.current.textContent = ride.speed > 12 ? 'Sprinting' : 'Cruising';
    warning.current?.classList.toggle('show', ride.turnedBack);
  };

  const reachedPlace = reached ? PLACES.find((p) => p.id === reached) : undefined;

  return (
    <div className={riding ? 'map-page riding' : 'map-page'}>
      <section className="map-stage" aria-label="3D map of Navarre">
        {webgl ? (
          <Suspense fallback={<p className="map-loading">Unrolling the map…</p>}>
            <ArchiveMapScene
              palette={palette}
              book={book}
              selected={selected}
              labels={labels}
              compass={compass}
              focus={flight.to ? (PLACES.find((p) => p.id === flight.to) ?? null) : null}
              flight={flight.id}
              calm={calm()}
              panel={riding ? 0 : panelWidth}
              mode={mode}
              flightInput={controls.input}
              pilot={pilot.colour}
              onReach={onReach}
              onRideFrame={onRideFrame}
            />
            {/* Labels over the pins; the scene moves them into place every frame. */}
            <div className="map-labels">
              {PLACES.map((p) => {
                const isOpen = isUnsealed(p, book);
                return (
                  <button
                    key={p.id}
                    ref={(el) => {
                      if (el) labels.current.set(p.id, el);
                      else labels.current.delete(p.id);
                    }}
                    type="button"
                    tabIndex={-1}
                    className={`map-label${p.id === selected ? ' selected' : ''}${isOpen ? '' : ' sealed'}`}
                    onClick={() => !riding && flyTo(p.id)}
                  >
                    {isOpen ? p.name : 'Sealed'}
                  </button>
                );
              })}
            </div>
          </Suspense>
        ) : (
          <p className="map-loading">This browser can't draw 3D. The places and the spoiler shield still work.</p>
        )}
        <div className="map-vignette" aria-hidden="true" />
        <Compass rose={compass} />

        {riding ? (
          <>
            <div className="ride-hud">
              <p className="kicker">Riding {pilot.name}</p>
              <p className="ride-stats">
                <span ref={altitude}>—</span> · <span ref={speed}>Cruising</span> · Found {foundOpen} of {openPlaces.length}
              </p>
            </div>
            <button type="button" className="chip land" onClick={land}>
              Land
            </button>
            <p ref={warning} className="ride-warning" aria-live="polite">
              The wards turn you back toward Navarre
            </p>
            <div className="ride-card" aria-live="polite">
              {reachedPlace && (
                <div className={justFound === reachedPlace.id ? 'ride-place found' : 'ride-place'}>
                  <p className="muted-kicker">
                    {justFound === reachedPlace.id ? 'Discovered' : isUnsealed(reachedPlace, book) ? 'Below you' : 'Sealed'}
                  </p>
                  <p className="ride-place-name">{isUnsealed(reachedPlace, book) ? reachedPlace.name : 'A sealed record'}</p>
                  <p className="ride-place-text">
                    {isUnsealed(reachedPlace, book)
                      ? reachedPlace.text
                      : `The Archive keeps this place sealed until you've finished ${BOOK_NAMES[reachedPlace.from]}.`}
                  </p>
                </div>
              )}
            </div>
            <p className="ride-keys" aria-hidden="true">
              <kbd>A</kbd> <kbd>D</kbd> turn · <kbd>W</kbd> climb · <kbd>S</kbd> dive · <kbd>Shift</kbd> sprint · <kbd>Esc</kbd> land
            </p>
          </>
        ) : (
          <div className="map-overlay">
            <p className="map-hint" aria-hidden="true">
              Drag to turn · scroll or pinch to zoom · tap a light to fly there
            </p>
            <button type="button" className="chip map-reset" onClick={() => flyTo(null)}>
              Whole map
            </button>
          </div>
        )}
      </section>

      {riding && <DragonButtons hold={controls.hold} />}

      {!riding && (
        <aside className="map-panel" aria-labelledby="map-title">
          <div className="stack-tight">
            <p className="kicker">The Archive map</p>
            <h1 id="map-title">Know the ground you fly over.</h1>
          </div>

          <div className="take-flight">
            <button type="button" className="button primary wide-button" onClick={takeFlight} disabled={!webgl}>
              Take flight
            </button>
            <p className="muted small">
              {pilot.own ? (
                <>Ride {pilot.name}, over Navarre and find every place from the air.</>
              ) : (
                <>
                  Ride over Navarre and find every place from the air.{' '}
                  <Link href={PATHS.threshing}>Walk the Threshing</Link> to fly your own dragon.
                </>
              )}{' '}
              Found {foundOpen} of {openPlaces.length}.
            </p>
          </div>

          <div className="place-card" aria-live="polite">
            <div className="place-card-head">
              <span className="muted-kicker">{open ? place.kind : 'Unknown'}</span>
              {!open && <span className="sealed-note">Sealed until {BOOK_NAMES[place.from]}</span>}
            </div>
            <h2 className="place-name">{open ? place.name : 'Sealed record'}</h2>
            <p className="lore">
              {open ? place.text : `The Archive keeps this record sealed until you've finished ${BOOK_NAMES[place.from]}.`}
            </p>
          </div>

          <div className="field">
            <span className="legend" id="places-label">
              Places
            </span>
            <div className="chips" role="group" aria-labelledby="places-label">
              {PLACES.map((p) => (
                <button key={p.id} type="button" className="chip" aria-pressed={p.id === selected} onClick={() => flyTo(p.id)}>
                  {isUnsealed(p, book) ? p.name : 'Sealed'}
                  {found.includes(p.id) && isUnsealed(p, book) && (
                    <>
                      <span className="found-mark" aria-hidden="true">
                        ✦
                      </span>
                      <span className="visually-hidden">, found from the air</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="legend" id="shield-label">
              Spoiler shield · I have read up to
            </span>
            <div className="chips" role="group" aria-labelledby="shield-label">
              {([1, 2, 3] as Book[]).map((b) => (
                <button key={b} type="button" className="chip book-chip" aria-pressed={book === b} onClick={() => chooseBook(b)}>
                  {BOOK_NAMES[b]}
                </button>
              ))}
            </div>
            <p className="ward-status">{WARD_STATUS[book]}</p>
          </div>

          <p className="muted small">A stylised fan map for exploring, not the books' official geography.</p>
        </aside>
      )}
    </div>
  );
}
