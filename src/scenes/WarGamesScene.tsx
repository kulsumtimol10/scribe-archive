import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, type RefObject } from 'react';
import { FlightRig } from '../components/3d/FlightRig';
import { mix } from '../components/3d/glow';
import { Basgiath, MapForest, MapTerrain, MapTowns } from '../components/3d/MapLand';
import { MapDragons } from '../components/3d/MapDragons';
import { WardCurtain } from '../components/3d/MapMagic';
import { horizonColour, MapMist, MapSky, MapWater, MOON } from '../components/3d/MapSky';
import { GateMarker, GhostRider, RaceGates } from '../components/3d/RaceGates';
import type { FlightInput, Ride } from '../lib/dragonFlight';
import type { Palette } from '../lib/palette';
import type { GhostSample } from '../lib/warGames';

/** Bloom is kept to devices with a mouse; ?lite turns it off anywhere. */
const RICH = window.matchMedia('(pointer: fine)').matches && !new URLSearchParams(window.location.search).has('lite');

/** Before the race: looking north over the start gate toward the island. */
function StartingView() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(6, 22, 70);
    camera.lookAt(-2, 6, 10);
  }, [camera]);
  return null;
}

export interface WarGamesSceneProps {
  palette: Palette;
  calm: boolean;
  racing: boolean;
  /** Changes on every new attempt, so the dragon starts again from the start line. */
  attempt: number;
  next: number;
  input: RefObject<FlightInput>;
  onFrame: (ride: Ride, flown: number) => void;
  ghost: GhostSample[];
  /** Seconds of race flown, null before the first gate; the ghost keeps pace with it. */
  clock: RefObject<number | null>;
  marker: RefObject<HTMLDivElement | null>;
  /** The rider's dragon colour. */
  pilot: string;
}

/** The War Games course over the moonlit island: gates, the reader's dragon and the ghost of their best run. */
export function WarGamesScene({ palette, calm, racing, attempt, next, input, onFrame, ghost, clock, marker, pilot }: WarGamesSceneProps) {
  const haze = useMemo(() => horizonColour(palette), [palette]);
  const fill = useMemo(() => mix(palette.accent, '#ffffff', 0.4), [palette]);
  return (
    <Canvas className="map-canvas" camera={{ position: [6, 22, 70], fov: 50, near: 0.5, far: 1200 }} dpr={[1, 1.75]}>
      <color attach="background" args={[haze]} />
      <fog attach="fog" args={[haze, 110, 300]} />
      <hemisphereLight args={[palette.glow, '#05070a', 0.6]} />
      <directionalLight position={MOON} intensity={2.2} color={palette.rim} />
      <directionalLight position={[30, 24, 60]} intensity={0.6} color={fill} />

      <MapSky palette={palette} calm={calm} />
      <MapWater palette={palette} />
      <MapTerrain palette={palette} />
      <MapForest palette={palette} />
      <MapTowns book={1} />
      <Basgiath />
      <WardCurtain palette={palette} book={1} />
      <MapMist palette={palette} calm={calm} />
      <MapDragons calm={calm} />

      <RaceGates palette={palette} next={next} />
      {ghost.length > 0 && <GhostRider path={ghost} clock={clock} />}
      {racing ? (
        <FlightRig key={attempt} input={input} colour={pilot} onReach={() => {}} onFrame={onFrame} />
      ) : (
        <StartingView />
      )}
      <GateMarker next={racing ? next : -1} marker={marker} />
      {RICH && (
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}
