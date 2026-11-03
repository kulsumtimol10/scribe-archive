import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, ShaderMaterial, type Mesh } from 'three';
import { heightAt, isUnsealed, landness, PLACES, wardX, type Place } from '../../lib/archiveMap';
import type { Palette } from '../../lib/palette';
import type { Book } from '../../lib/spoilers';

const CURTAIN_HEIGHT = 7;

/** Glowing light that fades upward; `uBands` adds the ward's shimmering vertical streaks. */
function glowMaterial(colour: string, opacity: number, bands: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColour: { value: new Color(colour) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
      uBands: { value: bands },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uBands;
      varying vec2 vUv;
      void main() {
        // max() matters: interpolation can nudge vUv.y a hair past 1, and pow() of a
        // negative number is NaN, which the bloom pass smears into a black screen.
        float fade = pow(max(1.0 - vUv.y, 0.0), 1.8);
        float streaks = mix(1.0, 0.55 + 0.45 * sin(vUv.x * 160.0 - uTime * 1.4), uBands);
        float shimmer = mix(1.0, 0.75 + 0.25 * sin(vUv.x * 41.0 + vUv.y * 7.0 + uTime * 2.2), uBands);
        float base = smoothstep(0.0, 0.03, vUv.y);
        gl_FragColor = vec4(uColour * 1.5, fade * streaks * shimmer * base * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

const WARD_POINTS = (() => {
  const points: [number, number, number][] = [];
  for (let z = -24; z <= 26; z += 0.4) {
    const x = wardX(z);
    if (landness(x, z) > 0.04) points.push([x, heightAt(x, z), z]);
  }
  return points;
})();

/** The wards: a shimmering curtain of light rising along the line, fading as the books go on. */
export function WardCurtain({ palette, book }: { palette: Palette; book: Book }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const index: number[] = [];
    WARD_POINTS.forEach(([x, y, z], i) => {
      const u = i / (WARD_POINTS.length - 1);
      positions.push(x, y - 0.3, z, x, y + CURTAIN_HEIGHT, z);
      uvs.push(u, 0, u, 1);
      if (i > 0) {
        const a = (i - 1) * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    g.setIndex(index);
    return g;
  }, []);
  const material = useMemo(() => glowMaterial(palette.cool, 1, 1), [palette.cool]);
  const strength = book === 1 ? 0.55 : book === 2 ? 0.28 : 0.1;

  useEffect(() => {
    material.uniforms.uOpacity.value = strength;
  }, [material, strength]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    material.uniforms.uTime.value += dt;
  });

  const base = useMemo(() => WARD_POINTS.map(([x, y, z]) => [x, y + 0.15, z] as [number, number, number]), []);
  return (
    <group>
      <mesh geometry={geometry} material={material} />
      <Line points={base} color={palette.cool} lineWidth={2} transparent opacity={strength + 0.3} toneMapped={false} />
    </group>
  );
}

interface BeaconProps {
  place: Place;
  open: boolean;
  selected: boolean;
  palette: Palette;
}

/** A column of light over a place, brighter when selected; sealed places glow faint and grey. */
function Beacon({ place, open, selected, palette }: BeaconProps) {
  const ring = useRef<Mesh>(null);
  const ground = heightAt(place.x, place.z);
  const colour = open ? palette.accent : palette.muted;
  const material = useMemo(() => glowMaterial(colour, 1, 0), [colour]);

  useEffect(() => {
    material.uniforms.uOpacity.value = selected ? 0.95 : open ? 0.45 : 0.18;
  }, [material, selected, open]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => {
    if (!ring.current) return;
    const pulse = selected ? 1 + 0.35 * ((clock.elapsedTime * 0.8) % 1) : 1;
    ring.current.scale.setScalar(pulse);
    const m = ring.current.material as { opacity: number };
    m.opacity = selected ? 0.8 * (1 - ((clock.elapsedTime * 0.8) % 1)) : 0.25;
  });

  return (
    <group position={[place.x, ground, place.z]}>
      <mesh position-y={selected ? 4.5 : 3} material={material}>
        <cylinderGeometry args={[0.22, 0.3, selected ? 9 : 6, 16, 1, true]} />
      </mesh>
      <mesh position-y={0.45}>
        <sphereGeometry args={[selected ? 0.3 : 0.22, 16, 12]} />
        <meshBasicMaterial color={colour} toneMapped={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.08}>
        <ringGeometry args={[0.6, 0.78, 40]} />
        <meshBasicMaterial color={colour} transparent opacity={0.25} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function MapBeacons({ palette, book, selected }: { palette: Palette; book: Book; selected: string }) {
  return (
    <group>
      {PLACES.map((place) => (
        <Beacon key={place.id} place={place} open={isUnsealed(place, book)} selected={place.id === selected} palette={palette} />
      ))}
    </group>
  );
}

/** How high above the ground a place's label floats. */
export const LABEL_HEIGHT = 1.6;
