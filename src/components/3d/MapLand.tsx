import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BufferAttribute, Color, Matrix4, PlaneGeometry, Quaternion, Vector3, type InstancedMesh } from 'three';
import { forestSpots, grain, heightAt, isUnsealed, PLACES, type Place } from '../../lib/archiveMap';
import type { Palette } from '../../lib/palette';
import type { Book } from '../../lib/spoilers';
import { mix } from './glow';

/** Natural colours for the land, later tinted toward the reader's theme. */
const NATURE = {
  seabed: '#0a1016',
  sand: '#5f5a49',
  meadow: '#2a4232',
  forest: '#172a1f',
  rock: '#55585e',
  snow: '#eef2f7',
};

const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** The island: shores, meadows and forest floor, rock on steep slopes, snow on the high peaks. */
export function MapTerrain({ palette }: { palette: Palette }) {
  const geometry = useMemo(() => {
    const plane = new PlaneGeometry(124, 80, 248, 160);
    plane.rotateX(-Math.PI / 2);
    const position = plane.attributes.position;
    for (let i = 0; i < position.count; i++) position.setY(i, heightAt(position.getX(i), position.getZ(i)));
    plane.computeVertexNormals();

    const normals = plane.attributes.normal;
    const colours = new Float32Array(position.count * 3);
    const tint = new Color(palette.ridge1);
    const c = {
      seabed: new Color(NATURE.seabed),
      sand: new Color(NATURE.sand),
      meadow: new Color(NATURE.meadow),
      forest: new Color(NATURE.forest),
      rock: new Color(NATURE.rock),
      snow: new Color(NATURE.snow),
    };
    const colour = new Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const h = position.getY(i);
      const steep = 1 - normals.getY(i);
      const g = grain(x, z);

      // A thin beach at the waterline, meadows and darker forest floor inland.
      if (h < -0.4) colour.copy(c.seabed);
      else if (h < 0.35) colour.copy(c.seabed).lerp(c.sand, smooth((h + 0.4) / 0.6));
      else colour.copy(c.sand).lerp(c.meadow, smooth((h - 0.35) / 0.25)).lerp(c.forest, smooth((g - 0.35) / 0.3));
      colour.lerp(c.rock, Math.max(smooth((steep - 0.16) / 0.22), smooth((h - 5.5) / 2.5)));
      colour.lerp(c.snow, smooth((h - 8.2) / 2.2) * (1 - smooth((steep - 0.5) / 0.2)));
      colour.lerp(tint, 0.22).multiplyScalar(0.8 + 0.4 * g);
      colour.toArray(colours, i * 3);
    }
    plane.setAttribute('color', new BufferAttribute(colours, 3));
    return plane;
  }, [palette]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </mesh>
  );
}

const TREES = forestSpots();

/** Thousands of pines, drawn in one go. */
export function MapForest({ palette }: { palette: Palette }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const trees = mesh.current;
    if (!trees) return;
    const matrix = new Matrix4();
    const turn = new Quaternion();
    const dark = mix('#16271c', palette.ridge1, 0.25);
    const light = mix('#2f4d36', palette.ridge1, 0.2);
    const colour = new Color();
    TREES.forEach((t, i) => {
      const tall = t.scale * (0.85 + t.shade * 0.45);
      matrix.compose(new Vector3(t.x, heightAt(t.x, t.z) + 0.5 * tall, t.z), turn, new Vector3(t.scale, tall, t.scale));
      trees.setMatrixAt(i, matrix);
      trees.setColorAt(i, colour.copy(dark).lerp(light, t.shade));
    });
    trees.instanceMatrix.needsUpdate = true;
    if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
  }, [palette]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, TREES.length]}>
      <coneGeometry args={[0.3, 1, 6]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

/** A repeatable scatter of lit windows around a place. */
function windows(place: Place): [number, number, number][] {
  const count = place.id === 'basgiath' ? 18 : place.kind === 'Capital' || place.kind === 'City' ? 16 : 8;
  const out: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399 + place.x;
    const radius = 0.5 + ((i * 0.37) % 1) * (place.id === 'basgiath' ? 1.4 : 1.7);
    const x = place.x + Math.cos(angle) * radius;
    const z = place.z + Math.sin(angle) * radius;
    out.push([x, heightAt(x, z) + 0.12 + (i % 3) * 0.1, z]);
  }
  return out;
}

/** Warm lights where people live. Sealed places stay dark. */
export function MapTowns({ book }: { book: Book }) {
  const mesh = useRef<InstancedMesh>(null);
  const lights = useMemo(() => PLACES.filter((p) => isUnsealed(p, book)).flatMap(windows), [book]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new Matrix4();
    lights.forEach(([x, y, z], i) => mesh.current!.setMatrixAt(i, matrix.makeTranslation(x, y, z)));
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [lights]);
  return (
    <instancedMesh key={lights.length} ref={mesh} args={[undefined, undefined, lights.length]}>
      <sphereGeometry args={[0.07, 6, 4]} />
      <meshBasicMaterial color="#ffd38c" toneMapped={false} />
    </instancedMesh>
  );
}

/** Basgiath: towers and a curtain wall on its rise, windows lit. */
export function Basgiath() {
  const place = PLACES.find((p) => p.id === 'basgiath')!;
  const ground = heightAt(place.x, place.z);
  const towers: [number, number, number, number][] = [
    [-0.7, -0.3, 0.42, 2.2],
    [0.1, -0.6, 0.55, 3.1],
    [0.8, 0.1, 0.4, 1.9],
    [-0.2, 0.55, 0.36, 1.6],
  ];
  return (
    <group position={[place.x, ground, place.z]}>
      <mesh position-y={0.35}>
        <cylinderGeometry args={[1.25, 1.4, 0.7, 8]} />
        <meshStandardMaterial color="#3a3e46" roughness={0.85} />
      </mesh>
      {towers.map(([x, z, w, h]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position-y={h / 2}>
            <boxGeometry args={[w, h, w]} />
            <meshStandardMaterial color="#444952" roughness={0.8} />
          </mesh>
          <mesh position-y={h + w * 0.55}>
            <coneGeometry args={[w * 0.78, w * 1.1, 4]} />
            <meshStandardMaterial color="#2a2d33" roughness={0.7} />
          </mesh>
          <mesh position={[0, h * 0.7, w / 2 + 0.01]}>
            <planeGeometry args={[w * 0.25, w * 0.35]} />
            <meshBasicMaterial color="#ffd38c" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
