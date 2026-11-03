import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { CodexDragon } from '../components/3d/CodexDragon';
import { COLOUR_INFO, type Look } from '../lib/codex';

const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * OrbitControls claims every touch on the canvas. Handing vertical swipes back
 * to the browser keeps the page scrollable on phones; sideways drags still turn
 * the dragon.
 */
function ScrollableOnTouch() {
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      canvas.style.touchAction = 'pan-y';
    });
    return () => cancelAnimationFrame(frame);
  }, [canvas]);
  return null;
}

/** One dragon on a plinth of gold light, turning slowly. Drag to turn it yourself. */
export function CodexScene({ look, active }: { look: Look; active: boolean }) {
  const rim = COLOUR_INFO[look.colour].rim;
  return (
    <Canvas camera={{ position: [5.5, 3.2, 8.5], fov: 38 }} dpr={[1, 2]} frameloop={active ? 'always' : 'never'}>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#9fb4d8', '#2a1d10', 0.7]} />
      <directionalLight position={[4, 6, 7]} intensity={1.8} />
      <directionalLight position={[-6, 4, -7]} intensity={3} color={rim} />
      <pointLight position={[0, -1.2, 2.5]} intensity={8} distance={7} color="#e3b15c" />

      <group position={[0.45, -1.35, 0]} scale={0.85}>
        <CodexDragon look={look} still={STILL} />
      </group>

      <group position-y={-2.05} rotation-x={-Math.PI / 2}>
        <mesh>
          <ringGeometry args={[2.7, 2.76, 96]} />
          <meshBasicMaterial color="#e3b15c" transparent opacity={0.55} />
        </mesh>
        <mesh position-z={-0.01}>
          <circleGeometry args={[2.3, 48]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.35} />
        </mesh>
      </group>

      <OrbitControls
        autoRotate={!STILL}
        autoRotateSpeed={0.7}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={1.05}
        maxPolarAngle={1.45}
        target={[0, 0.4, 0]}
      />
      <ScrollableOnTouch />
    </Canvas>
  );
}
