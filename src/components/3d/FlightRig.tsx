import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Vector3, type Group } from 'three';
import { heightAt, PLACES } from '../../lib/archiveMap';
import { fly, MAX_STEP, placeInReach, STILL, takeOff, type FlightInput, type Ride } from '../../lib/dragonFlight';
import { LowPolyDragon } from './MapDragons';

interface FlightRigProps {
  input: RefObject<FlightInput>;
  colour: string;
  /** Called when the dragon comes within reach of a place, or leaves it (null). */
  onReach: (id: string | null) => void;
  /**
   * Called every frame with the ride and the seconds of flight it covered. Race
   * clocks should add up `flown` rather than wall time, so a slow device that
   * drops frames isn't penalised.
   */
  onFrame?: (ride: Ride, flown: number) => void;
}

/** How far behind and above the dragon the camera rides. */
const BEHIND = 11;
const ABOVE = 4.2;

/** The reader's dragon, flown by `input`, with a camera following close behind. */
export function FlightRig({ input, colour, onReach, onFrame }: FlightRigProps) {
  const camera = useThree((s) => s.camera);
  const ride = useRef<Ride>(takeOff());
  const dragon = useRef<Group>(null);
  const beat = useRef(0.9);
  const reached = useRef<string | null>(null);
  const callbacks = useRef({ onReach, onFrame });
  callbacks.current = { onReach, onFrame };
  const want = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);

  // In development only, tests can move the dragon: window.__teleport(x, y, z, heading).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __teleport?: (x: number, y: number, z: number, heading: number) => void };
    w.__teleport = (x, y, z, heading) => {
      ride.current = { ...ride.current, x, y, z, heading };
    };
    return () => {
      delete w.__teleport;
    };
  }, []);

  // Start right behind the dragon rather than sweeping in from wherever the map left the camera.
  useEffect(() => {
    const r = ride.current;
    camera.position.set(r.x - Math.sin(r.heading) * BEHIND, r.y + ABOVE, r.z - Math.cos(r.heading) * BEHIND);
    look.set(r.x, r.y, r.z);
    camera.lookAt(look);
  }, [camera, look]);

  useFrame((_, dt) => {
    const r = fly(ride.current, input.current ?? STILL, dt, heightAt);
    ride.current = r;

    const g = dragon.current;
    if (g) {
      g.position.set(r.x, r.y, r.z);
      g.rotation.set(0, 0, 0);
      g.rotateY(r.heading);
      g.rotateX(-r.pitch);
      g.rotateZ(r.bank);
    }
    // Hard wingbeats to climb, slow ones to cruise, wings nearly still in a dive.
    beat.current = r.pitch > 0.15 ? 1.7 : r.pitch < -0.2 ? 0.12 : r.speed > 12 ? 1.3 : 0.8;

    const ease = 1 - Math.exp(-dt * 3.2);
    want.set(r.x - Math.sin(r.heading) * BEHIND, r.y + ABOVE - r.pitch * 3, r.z - Math.cos(r.heading) * BEHIND);
    camera.position.lerp(want, ease);
    const floor = Math.max(heightAt(camera.position.x, camera.position.z), 0) + 1.2;
    if (camera.position.y < floor) camera.position.y = floor;
    look.lerp(new Vector3(r.x + Math.sin(r.heading) * 6, r.y + 0.8, r.z + Math.cos(r.heading) * 6), ease * 1.5);
    camera.lookAt(look);

    const near = placeInReach(r, PLACES)?.id ?? null;
    if (near !== reached.current) {
      reached.current = near;
      callbacks.current.onReach(near);
    }
    callbacks.current.onFrame?.(r, Math.min(dt, MAX_STEP));
  });

  return (
    <group ref={dragon} scale={1.15}>
      <LowPolyDragon colour={colour} beat={beat} />
    </group>
  );
}
