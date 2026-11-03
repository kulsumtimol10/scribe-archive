import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Vector3, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import type { Palette } from '../../lib/palette';
import { GATE_RADIUS, GATES, ghostAt, type GhostSample } from '../../lib/warGames';
import { LowPolyDragon } from './MapDragons';

/**
 * The course: a ring of light at each gate, turned to face the way through.
 * The next gate burns gold and pulses; passed gates fade; later ones glow faintly.
 */
export function RaceGates({ palette, next }: { palette: Palette; next: number }) {
  const rings = useRef<(Mesh | null)[]>([]);

  // Face each ring along the line from the gate before it to the gate after it.
  useEffect(() => {
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const before = GATES[Math.max(0, i - 1)];
      const after = GATES[Math.min(GATES.length - 1, i + 1)];
      ring.lookAt(ring.position.x + (after.x - before.x), ring.position.y, ring.position.z + (after.z - before.z));
    });
  }, []);

  useFrame(({ clock }) => {
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const material = ring.material as MeshBasicMaterial;
      if (i === next) {
        ring.scale.setScalar(1 + 0.08 * Math.sin(clock.elapsedTime * 5));
        material.opacity = 1;
      } else {
        ring.scale.setScalar(1);
        material.opacity = i < next ? 0.08 : 0.35;
      }
    });
  });

  return (
    <group>
      {GATES.map((gate, i) => (
        <mesh
          key={gate.name}
          ref={(el) => {
            rings.current[i] = el;
          }}
          position={[gate.x, gate.y, gate.z]}
        >
          <torusGeometry args={[GATE_RADIUS, 0.18, 12, 48]} />
          <meshBasicMaterial
            color={i === next ? palette.accent : i === GATES.length - 1 ? palette.ink : palette.cool}
            transparent
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/** The best run so far, flown again as a pale, see-through dragon, in step with the race clock (seconds, null before the start). */
export function GhostRider({ path, clock }: { path: GhostSample[]; clock: RefObject<number | null> }) {
  const body = useRef<Group>(null);
  useFrame(() => {
    const g = body.current;
    if (!g) return;
    const t = clock.current;
    const at = t === null ? null : ghostAt(path, t);
    g.visible = at !== null;
    if (!at) return;
    g.position.set(at[0], at[1], at[2]);
    g.rotation.set(0, at[3], 0);
  });
  return (
    <group ref={body} scale={1.15} visible={false}>
      <LowPolyDragon colour="#cfe4ff" opacity={0.35} />
    </group>
  );
}

/**
 * Keeps an on-screen marker over the next gate. When the gate is off screen or
 * behind the camera, the marker sits at the edge and points the way.
 */
export function GateMarker({ next, marker }: { next: number; marker: RefObject<HTMLDivElement | null> }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const point = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const el = marker.current;
    if (!el) return;
    const gate = GATES[next];
    if (!gate) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    point.set(gate.x, gate.y, gate.z).project(camera);
    let x = point.x;
    let y = point.y;
    const behind = point.z > 1;
    if (behind) {
      x = -x;
      y = -y;
    }
    const inside = !behind && Math.abs(x) < 0.9 && Math.abs(y) < 0.85;
    if (!inside) {
      // Push the marker out to the screen's edge along its direction from the centre.
      const scale = 1 / Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.85, 1e-6);
      x *= scale;
      y *= scale;
    }
    const px = ((x + 1) / 2) * size.width;
    const py = ((1 - y) / 2) * size.height;
    el.classList.toggle('edge', !inside);
    el.style.transform = `translate(-50%, -50%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
    const arrow = el.firstElementChild as HTMLElement | null;
    if (arrow) arrow.style.transform = `rotate(${Math.atan2(x, y)}rad)`;
  });

  return null;
}
