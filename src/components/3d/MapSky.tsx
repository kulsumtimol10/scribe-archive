import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, BackSide, BufferAttribute, Color, SphereGeometry, type Sprite } from 'three';
import type { Palette } from '../../lib/palette';
import { glowTexture, mix } from './glow';

/** Low in the north, so the reader sees it rise over the island when they tilt the view down to the sea. */
export const MOON: [number, number, number] = [-70, 62, -330];

/** The colour distant land and sea fade into: the haze along the horizon. */
export function horizonColour(palette: Palette): Color {
  return mix(palette.skyMid, palette.bg, 0.35);
}

/** A dome of night sky glowing at the horizon, the moon with its halo, and stars. */
export function MapSky({ palette, calm }: { palette: Palette; calm: boolean }) {
  const dome = useMemo(() => {
    const sphere = new SphereGeometry(450, 48, 24);
    const position = sphere.attributes.position;
    const colours = new Float32Array(position.count * 3);
    // Below the horizon the dome matches the fog exactly, so the far sea melts into it with no seam.
    const haze = horizonColour(palette);
    const horizon = mix(palette.skyMid, palette.glow, 0.18);
    const top = mix(palette.skyTop, '#000000', 0.45);
    const colour = new Color();
    for (let i = 0; i < position.count; i++) {
      const up = position.getY(i) / 450;
      if (up <= 0) colour.copy(haze);
      else if (up < 0.08) colour.copy(haze).lerp(horizon, up / 0.08);
      else colour.copy(horizon).lerp(top, Math.pow((up - 0.08) / 0.92, 0.55));
      colour.toArray(colours, i * 3);
    }
    sphere.setAttribute('color', new BufferAttribute(colours, 3));
    return sphere;
  }, [palette]);

  return (
    <group>
      <mesh geometry={dome}>
        <meshBasicMaterial vertexColors side={BackSide} fog={false} depthWrite={false} />
      </mesh>
      {!calm && <Stars radius={300} depth={80} count={3500} factor={5} saturation={0} fade speed={0.3} />}
      <mesh position={MOON}>
        <sphereGeometry args={[10, 32, 16]} />
        <meshBasicMaterial color="#b4b0a2" fog={false} />
      </mesh>
      <sprite position={MOON} scale={[90, 90, 1]}>
        <spriteMaterial map={glowTexture()} color={palette.glow} transparent opacity={0.16} depthWrite={false} blending={AdditiveBlending} fog={false} />
      </sprite>
    </group>
  );
}

/**
 * The sea: a soft satin sheen under the moon. Any glossier and the moon's
 * highlight blooms into a white blot over the island. (A true mirror, drei's
 * MeshReflectorMaterial, produced invalid pixels that the bloom pass smeared
 * into a black screen.)
 */
export function MapWater({ palette }: { palette: Palette }) {
  const colour = useMemo(() => mix(palette.skyMid, palette.glow, 0.12), [palette]);
  return (
    // Wide enough that its edge lies deep in the fog, so it never shows as a line.
    <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
      <planeGeometry args={[1600, 1600]} />
      <meshStandardMaterial color={colour} roughness={0.62} metalness={0.25} />
    </mesh>
  );
}

const PUFFS = Array.from({ length: 24 }, (_, i) => ({
  x: -50 + ((i * 37) % 100),
  z: -24 + ((i * 23) % 50),
  y: 3 + (i % 5) * 0.9,
  size: 16 + (i % 4) * 7,
  speed: 0.25 + (i % 3) * 0.12,
  opacity: 0.035 + (i % 4) * 0.015,
}));

/** Banks of mist drifting slowly east across the valleys. */
export function MapMist({ palette, calm }: { palette: Palette; calm: boolean }) {
  const sprites = useRef<(Sprite | null)[]>([]);
  // Dimmer than the theme's mist, so the glow pass doesn't turn it into fog lamps.
  const colour = useMemo(() => mix(palette.mist, palette.bg, 0.45), [palette]);
  useFrame((_, dt) => {
    if (calm) return;
    sprites.current.forEach((sprite, i) => {
      if (!sprite) return;
      sprite.position.x += PUFFS[i].speed * dt;
      if (sprite.position.x > 60) sprite.position.x -= 120;
    });
  });
  return (
    <group>
      {PUFFS.map((puff, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          position={[puff.x, puff.y, puff.z]}
          scale={[puff.size, puff.size * 0.45, 1]}
        >
          <spriteMaterial map={glowTexture()} color={colour} transparent opacity={puff.opacity} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}
