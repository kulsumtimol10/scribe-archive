import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Vector3 } from 'three';
import { FlightRig } from '../components/3d/FlightRig';
import { mix } from '../components/3d/glow';
import { Basgiath, MapForest, MapTerrain, MapTowns } from '../components/3d/MapLand';
import { MapDragons } from '../components/3d/MapDragons';
import { LABEL_HEIGHT, MapBeacons, WardCurtain } from '../components/3d/MapMagic';
import { horizonColour, MapMist, MapSky, MapWater, MOON } from '../components/3d/MapSky';
import { heightAt, PLACES, type Place } from '../lib/archiveMap';
import type { FlightInput, Ride } from '../lib/dragonFlight';
import type { Palette } from '../lib/palette';
import type { Book } from '../lib/spoilers';

/**
 * Bloom is a full-screen pass, kept to devices with a mouse, which usually
 * have the GPU to spare. Adding ?lite to the URL turns it off on any device.
 */
const RICH = window.matchMedia('(pointer: fine)').matches && !new URLSearchParams(window.location.search).has('lite');

const OVERVIEW = { position: new Vector3(0, 40, 60), target: new Vector3(0, 0, 2) };
/** The opening shot: low over the southern sea, looking north at the moon over the island. */
const OPENING = { position: new Vector3(4, 5, 78), target: new Vector3(-6, 9, -40) };
/** Where the camera sits relative to a place it flies to. */
const CLOSE_UP = new Vector3(0, 16, 24);

/** The overview, pulled further back on tall, narrow screens so the whole island still fits. */
function overviewPosition(aspect: number): Vector3 {
  const back = Math.max(1, 1.1 / aspect);
  return OVERVIEW.target.clone().add(OVERVIEW.position.clone().sub(OVERVIEW.target).multiplyScalar(back));
}

/** The parts of OrbitControls this scene uses. */
interface Controls {
  target: Vector3;
  update(): void;
}

interface Trip {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  t: number;
  seconds: number;
}

const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * Moves the camera: the opening sweep from sea level up to the overview, then
 * a glide to a place (or back to the overview) whenever `flight` changes.
 */
function Camera({ to, flight, calm, onSettled }: { to: Place | null; flight: number; calm: boolean; onSettled: () => void }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const trip = useRef<Trip | null>(null);
  const opened = useRef(false);
  /** The last flight acted on; a flight asked for before the controls exist waits for them. */
  const handled = useRef(0);

  // The opening shot, once the controls exist.
  useEffect(() => {
    if (!controls || opened.current) return;
    opened.current = true;
    const overview = overviewPosition(aspect);
    if (calm) {
      camera.position.copy(overview);
      controls.target.copy(OVERVIEW.target);
      controls.update();
      onSettled();
      return;
    }
    camera.position.copy(OPENING.position);
    controls.target.copy(OPENING.target);
    trip.current = {
      fromPos: OPENING.position.clone(),
      toPos: overview,
      fromTarget: OPENING.target.clone(),
      toTarget: OVERVIEW.target.clone(),
      t: 0,
      seconds: 5,
    };
  }, [controls, camera, aspect, calm, onSettled]);

  useEffect(() => {
    if (!controls || flight === handled.current) return;
    handled.current = flight;
    const target = to ? new Vector3(to.x, heightAt(to.x, to.z), to.z) : OVERVIEW.target.clone();
    const position = to ? target.clone().add(CLOSE_UP) : overviewPosition(aspect);
    if (calm) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      return;
    }
    trip.current = { fromPos: camera.position.clone(), toPos: position, fromTarget: controls.target.clone(), toTarget: target, t: 0, seconds: 1.6 };
    // A resize shouldn't start a flight; `handled` stops a re-run from repeating one.
  }, [flight, controls]);

  useFrame((_, dt) => {
    const f = trip.current;
    if (!f || !controls) return;
    f.t = Math.min(1, f.t + dt / f.seconds);
    const e = ease(f.t);
    camera.position.lerpVectors(f.fromPos, f.toPos, e);
    controls.target.lerpVectors(f.fromTarget, f.toTarget, e);
    controls.update();
    if (f.t >= 1) {
      trip.current = null;
      onSettled();
    }
  });

  return null;
}

/**
 * Each frame, moves each label (plain buttons the page renders over the
 * canvas) to sit above its pin, hides labels behind the camera, and turns the
 * compass so its N points north on screen.
 */
function Overlay({ labels, compass }: { labels: RefObject<Map<string, HTMLElement>>; compass: RefObject<SVGSVGElement | null> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const facing = useMemo(() => new Vector3(), []);
  const anchors = useMemo(
    () => new Map(PLACES.map((p) => [p.id, new Vector3(p.x, heightAt(p.x, p.z) + LABEL_HEIGHT, p.z)])),
    [],
  );
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    for (const [id, anchor] of anchors) {
      const el = labels.current?.get(id);
      if (!el) continue;
      point.copy(anchor).project(camera);
      const visible = point.z < 1 && Math.abs(point.x) < 1.15 && Math.abs(point.y) < 1.15;
      el.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      el.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
    if (compass.current) {
      // Works for both the orbit view and riding: turn by which way the camera faces.
      camera.getWorldDirection(facing);
      compass.current.style.transform = `rotate(${Math.atan2(-facing.x, -facing.z)}rad)`;
    }
  });

  return null;
}

/**
 * Shifts the picture right by half the floating panel's width, so the island
 * centres in the open part of the screen rather than behind the panel.
 */
function PanelOffset({ panel }: { panel: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!('setViewOffset' in camera)) return;
    if (panel > 0) camera.setViewOffset(size.width + panel, size.height, 0, 0, size.width, size.height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }, [camera, size, panel]);
  return null;
}

export interface ArchiveMapSceneProps {
  palette: Palette;
  book: Book;
  selected: string;
  /** The page's label buttons by place id, positioned over the pins each frame. */
  labels: RefObject<Map<string, HTMLElement>>;
  /** The page's compass rose, turned to match the view. */
  compass: RefObject<SVGSVGElement | null>;
  /** Which place the camera should fly to; null for the overview. */
  focus: Place | null;
  /** Changes every time the reader asks for a flight, even to the same place. */
  flight: number;
  calm: boolean;
  /** Width of the panel floating over the map's left edge (0 on phones, where it sits below). */
  panel: number;
  /** Explore orbits the map; ride puts the reader on their own dragon. */
  mode: 'explore' | 'ride';
  /** Read every frame while riding. */
  flightInput: RefObject<FlightInput>;
  /** The rider's dragon colour. */
  pilot: string;
  onReach: (id: string | null) => void;
  onRideFrame?: (ride: Ride) => void;
}

/**
 * A moonlit Navarre: forests, a river, snow on the peaks, towns lit for the
 * night, dragons on patrol and the wards shimmering along the cliffs. Drag to
 * orbit, scroll or pinch to zoom, tap a beacon to fly there.
 */
export function ArchiveMapScene({
  palette,
  book,
  selected,
  labels,
  compass,
  focus,
  flight,
  calm,
  panel,
  mode,
  flightInput,
  pilot,
  onReach,
  onRideFrame,
}: ArchiveMapSceneProps) {
  const [settled, setSettled] = useState(false);
  const haze = useMemo(() => horizonColour(palette), [palette]);
  const fill = useMemo(() => mix(palette.accent, '#ffffff', 0.4), [palette]);

  return (
    <Canvas
      className="map-canvas"
      camera={{ position: OPENING.position.toArray(), fov: 42, near: 0.5, far: 1200 }}
      dpr={[1, 1.75]}
    >
      <color attach="background" args={[haze]} />
      <fog attach="fog" args={[haze, 120, 320]} />
      <hemisphereLight args={[palette.glow, '#05070a', 0.6]} />
      {/* Moonlight from the north, plus a faint warm fill from the south so the near slopes aren't black. */}
      <directionalLight position={MOON} intensity={2.2} color={palette.rim} />
      <directionalLight position={[30, 24, 60]} intensity={0.6} color={fill} />

      <MapSky palette={palette} calm={calm} />
      <MapWater palette={palette} />
      <MapTerrain palette={palette} />
      <MapForest palette={palette} />
      <MapTowns book={book} />
      <Basgiath />
      <WardCurtain palette={palette} book={book} />
      <MapBeacons palette={palette} book={book} selected={selected} />
      <MapMist palette={palette} calm={calm} />
      <MapDragons calm={calm} />

      {mode === 'explore' ? (
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={10}
          maxDistance={190}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI * 0.47}
          autoRotate={!calm && settled && flight === 0}
          autoRotateSpeed={0.3}
        />
      ) : (
        <FlightRig input={flightInput} colour={pilot} onReach={onReach} onFrame={onRideFrame} />
      )}
      <Camera to={focus} flight={flight} calm={calm} onSettled={() => setSettled(true)} />
      <Overlay labels={labels} compass={compass} />
      <PanelOffset panel={panel} />
      {RICH && (
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
