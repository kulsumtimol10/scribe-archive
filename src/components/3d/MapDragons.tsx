import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type RefObject } from 'react';
import { DoubleSide, Shape, ShapeGeometry, type Group } from 'three';

/** A wing seen from above: leading edge to the tip, scalloped trailing edge back to the body. */
function wingGeometry(): ShapeGeometry {
  const s = new Shape();
  s.moveTo(0, 0.5);
  s.lineTo(1.4, 0.95);
  s.lineTo(2.7, 0.5);
  s.lineTo(2.2, 0.05);
  s.quadraticCurveTo(1.9, -0.15, 1.7, -0.35);
  s.quadraticCurveTo(1.25, -0.25, 1.0, -0.55);
  s.quadraticCurveTo(0.6, -0.45, 0, -0.65);
  s.closePath();
  const geometry = new ShapeGeometry(s);
  // Lay it flat: the shape's y becomes the dragon's forward (z) axis.
  geometry.rotateX(-Math.PI / 2);
  geometry.scale(1, 1, -1);
  return geometry;
}

interface LowPolyDragonProps {
  colour: string;
  /** Wingbeats per second, read every frame so a rider can change it (gliding, climbing). */
  beat?: RefObject<number>;
  phase?: number;
  calm?: boolean;
  /** Below 1 makes a see-through dragon: the ghost of a best run. */
  opacity?: number;
}

/**
 * A low-poly dragon facing +z: body, neck, tail, glowing eyes and two wings
 * that flap about the body's long axis. Position and turn it with a parent group.
 */
export function LowPolyDragon({ colour, beat, phase = 0, calm = false, opacity = 1 }: LowPolyDragonProps) {
  const see = { transparent: opacity < 1, opacity, depthWrite: opacity >= 1 };
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const wing = useMemo(wingGeometry, []);
  const angle = useRef(phase);

  useFrame((_, dt) => {
    if (calm) return;
    angle.current += dt * (beat?.current ?? 0.7) * Math.PI * 2;
    const flap = Math.sin(angle.current) * 0.55;
    if (left.current) left.current.rotation.z = -flap;
    if (right.current) right.current.rotation.z = flap;
  });

  return (
    <group>
      {/* Body, neck and head pointing forward (+z), tail trailing behind. */}
      <mesh rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.26, 2.2, 6]} />
        <meshStandardMaterial color={colour} roughness={0.6} {...see} />
      </mesh>
      <mesh position-z={1.35} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.15, 0.7, 5]} />
        <meshStandardMaterial color={colour} roughness={0.6} {...see} />
      </mesh>
      <mesh position-z={-1.75} rotation-x={-Math.PI / 2}>
        <coneGeometry args={[0.13, 2.2, 5]} />
        <meshStandardMaterial color={colour} roughness={0.6} {...see} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.08, 1.55]}>
          <sphereGeometry args={[0.035, 6, 4]} />
          <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
        </mesh>
      ))}
      <group ref={right} position={[0.12, 0.05, 0.1]}>
        <mesh geometry={wing}>
          <meshStandardMaterial color={colour} roughness={0.7} side={DoubleSide} {...see} />
        </mesh>
      </group>
      <group ref={left} position={[-0.12, 0.05, 0.1]} scale-x={-1}>
        <mesh geometry={wing}>
          <meshStandardMaterial color={colour} roughness={0.7} side={DoubleSide} {...see} />
        </mesh>
      </group>
    </group>
  );
}

interface Patrol {
  /** Centre and radius of the loop the dragon circles. */
  x: number;
  z: number;
  radius: number;
  height: number;
  /** Radians per second; negative circles the other way. */
  speed: number;
  phase: number;
  colour: string;
  size: number;
}

/** Dragons on patrol: one over the Vale, one along the cliffs, one over the northern range. */
const PATROLS: Patrol[] = [
  { x: -10, z: 6, radius: 9, height: 11, speed: 0.17, phase: 0, colour: '#0c0e13', size: 1.25 },
  { x: 4, z: -2, radius: 15, height: 16, speed: -0.11, phase: 2, colour: '#13223d', size: 1.05 },
  { x: -24, z: -11, radius: 7, height: 15, speed: 0.21, phase: 4, colour: '#3b1612', size: 0.95 },
];

function PatrolDragon({ patrol, calm }: { patrol: Patrol; calm: boolean }) {
  const body = useRef<Group>(null);

  useFrame(({ clock }) => {
    const time = calm ? 0 : clock.elapsedTime;
    const t = time * patrol.speed + patrol.phase;
    const g = body.current;
    if (!g) return;
    g.position.set(
      patrol.x + patrol.radius * Math.cos(t),
      patrol.height + Math.sin(time * 1.3 + patrol.phase) * 0.5,
      patrol.z + patrol.radius * Math.sin(t),
    );
    // Face along the loop, leaning into the turn.
    g.rotation.set(0, Math.atan2(-Math.sin(t) * patrol.speed, Math.cos(t) * patrol.speed), 0);
    g.rotateZ(Math.sign(patrol.speed) * -0.32);
  });

  return (
    <group ref={body} scale={patrol.size}>
      <LowPolyDragon colour={patrol.colour} phase={patrol.phase} calm={calm} />
    </group>
  );
}

export function MapDragons({ calm }: { calm: boolean }) {
  return (
    <group>
      {PATROLS.map((patrol) => (
        <PatrolDragon key={patrol.phase} patrol={patrol} calm={calm} />
      ))}
    </group>
  );
}
