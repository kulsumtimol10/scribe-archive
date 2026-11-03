import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Shape,
  ShapeGeometry,
  Vector3,
} from 'three';
import { COLOUR_INFO, type CodexTail, type Look } from '../../lib/codex';

/**
 * A dragon for the Codex, built from code rather than a model file: a faceted
 * body swept along a spine, ridged back, bat wings, tucked legs and a tail
 * that ends in whichever of the six weapons (or none) the dragon carries.
 * It faces +x, hovering with its wings raised.
 */

const UP = new Vector3(0, 1, 0);

/** The spine from snout to tail tip. A scorpiontail curls up over the back. */
function spine(tail: CodexTail | null): CatmullRomCurve3 {
  const front = [
    [3.25, 1.7],
    [2.75, 1.82],
    [2.2, 1.55],
    [1.4, 0.95],
    [0.4, 0.62],
    [-0.8, 0.6],
  ];
  const back =
    tail === 'scorpiontail'
      ? [
          [-2.0, 0.72],
          [-2.9, 1.25],
          [-3.15, 2.15],
          [-2.7, 2.85],
          [-2.0, 3.0],
        ]
      : [
          [-2.0, 0.5],
          [-2.9, 0.36],
          [-3.7, 0.3],
          [-4.3, 0.38],
        ];
  return new CatmullRomCurve3(
    [...front, ...back].map(([x, y]) => new Vector3(x, y, 0)),
    false,
    'centripetal',
  );
}

/** Body radius by distance from the snout: skull, thin neck, deep chest, tapering tail. */
const PROFILE: [number, number][] = [
  [0, 0.05],
  [0.25, 0.16],
  [0.5, 0.23],
  [0.8, 0.14],
  [1.7, 0.22],
  [2.5, 0.58],
  [3.3, 0.56],
  [4.3, 0.4],
  [5.2, 0.2],
];

function radiusAt(s: number, length: number): number {
  const points = [...PROFILE, [length, 0.05] as [number, number]];
  for (let i = 0; i < points.length - 1; i++) {
    const [s0, r0] = points[i];
    const [s1, r1] = points[i + 1];
    if (s <= s1) {
      const k = Math.min(1, Math.max(0, (s - s0) / (s1 - s0)));
      return r0 + (r1 - r0) * k * k * (3 - 2 * k);
    }
  }
  return 0.05;
}

/** Sweeps an eight-sided ring along the spine; flat shading makes the facets read as scales. */
function bodyGeometry(curve: CatmullRomCurve3, rings = 80, sides = 8): BufferGeometry {
  const length = curve.getLength();
  const frames = curve.computeFrenetFrames(rings, false);
  const positions: number[] = [];
  const p = new Vector3();
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    curve.getPointAt(t, p);
    const r = radiusAt(t * length, length);
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j < sides; j++) {
      const a = (j / sides) * Math.PI * 2;
      const c = Math.cos(a) * r * 1.1;
      const s = Math.sin(a) * r * 0.85;
      positions.push(p.x + n.x * c + b.x * s, p.y + n.y * c + b.y * s, p.z + n.z * c + b.z * s);
    }
  }
  const start = positions.length / 3;
  curve.getPointAt(0, p);
  positions.push(p.x + 0.04, p.y, p.z);
  const end = start + 1;
  curve.getPointAt(1, p);
  positions.push(p.x, p.y, p.z);

  const index: number[] = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j;
      const b = i * sides + ((j + 1) % sides);
      const c = (i + 1) * sides + j;
      const d = (i + 1) * sides + ((j + 1) % sides);
      index.push(a, c, b, b, c, d);
    }
  }
  for (let j = 0; j < sides; j++) {
    index.push(start, (j + 1) % sides, j);
    index.push(end, rings * sides + j, rings * sides + ((j + 1) % sides));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** The direction "up" at a point on the spine, square to the spine itself. */
function topAt(curve: CatmullRomCurve3, t: number): Vector3 {
  const tangent = curve.getTangentAt(t);
  return UP.clone().sub(tangent.multiplyScalar(UP.dot(tangent))).normalize();
}

/** A tapered rod between two points, for wing bones and legs. */
function Rod({ from, to, radius, tip = radius * 0.6, material }: { from: Vector3; to: Vector3; radius: number; tip?: number; material: MeshStandardMaterial }) {
  const { position, quaternion, length } = useMemo(() => {
    const dir = to.clone().sub(from);
    return {
      position: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    };
  }, [from, to]);
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[tip, radius, length, 5]} />
    </mesh>
  );
}

/** Wing outline in its own plane: x runs out along the span, y forward along the body. */
const WING_POINTS = {
  root: [0, 0.35],
  elbow: [1.3, 0.55],
  wrist: [2.5, 1.15],
  tips: [
    [4.3, 0.3],
    [3.9, -0.9],
    [3.0, -1.8],
    [1.7, -2.1],
  ],
};

function wingShape(): Shape {
  const s = new Shape();
  s.moveTo(0, 0.35);
  s.lineTo(1.3, 0.55);
  s.lineTo(2.5, 1.15);
  s.lineTo(2.85, 1.45);
  s.lineTo(2.62, 1.02);
  s.lineTo(4.3, 0.3);
  s.quadraticCurveTo(3.35, -0.1, 3.9, -0.9);
  s.quadraticCurveTo(3.05, -0.85, 3.0, -1.8);
  s.quadraticCurveTo(2.2, -1.25, 1.7, -2.1);
  s.quadraticCurveTo(1.1, -1.05, 0, -0.9);
  s.lineTo(0, 0.35);
  return s;
}

/** Lays the wing's plane flat: its span along +z, its chord along x. */
const LAY_FLAT = new Matrix4().set(0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1);
const flat = ([x, y]: number[]) => new Vector3(y, 0, x);

function Wing({ side, membrane, bone, flap }: { side: 1 | -1; membrane: MeshStandardMaterial; bone: MeshStandardMaterial; flap: RefObject<Group | null> }) {
  const geometry = useMemo(() => new ShapeGeometry(wingShape(), 6).applyMatrix4(LAY_FLAT), []);
  const bones = useMemo(() => {
    const root = flat(WING_POINTS.root);
    const elbow = flat(WING_POINTS.elbow);
    const wrist = flat(WING_POINTS.wrist);
    return [
      [root, elbow, 0.07],
      [elbow, wrist, 0.06],
      ...WING_POINTS.tips.map((t) => [wrist, flat(t), 0.035] as const),
    ] as [Vector3, Vector3, number][];
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group scale={[1.25, 1.25, 1.25 * side]}>
      <group rotation-y={-0.25}>
        <group ref={flap} rotation-x={-0.6}>
          <mesh geometry={geometry} material={membrane} />
          {bones.map(([a, b, r], i) => (
            <Rod key={i} from={a} to={b} radius={r} material={bone} />
          ))}
        </group>
      </group>
    </group>
  );
}

/** The weapon (or fan) at the end of the tail, pointing along local +y. */
function TailTip({ tail, material }: { tail: CodexTail | null; material: MeshStandardMaterial }) {
  const spikes = useMemo(() => {
    const ico = new IcosahedronGeometry(1, 0);
    const pos = ico.getAttribute('position');
    const seen = new Map<string, Vector3>();
    for (let i = 0; i < pos.count; i++) {
      const v = new Vector3().fromBufferAttribute(pos, i).normalize();
      seen.set(v.toArray().map((n) => n.toFixed(3)).join(), v);
    }
    ico.dispose();
    return [...seen.values()].map((v) => ({
      position: v.clone().multiplyScalar(0.3),
      quaternion: new Quaternion().setFromUnitVectors(UP, v),
    }));
  }, []);

  switch (tail) {
    case 'morningstartail':
      return (
        <group position-y={0.3}>
          <mesh material={material}>
            <icosahedronGeometry args={[0.26, 0]} />
          </mesh>
          {spikes.map((s, i) => (
            <mesh key={i} position={s.position} quaternion={s.quaternion} material={material}>
              <coneGeometry args={[0.07, 0.34, 4]} />
            </mesh>
          ))}
        </group>
      );
    case 'clubtail':
      return (
        <mesh position-y={0.32} scale={[1, 1.4, 1]} material={material}>
          <dodecahedronGeometry args={[0.32, 0]} />
        </mesh>
      );
    case 'daggertail':
      return (
        <mesh position-y={0.4} scale={[1, 1, 0.45]} material={material}>
          <coneGeometry args={[0.15, 0.8, 4]} />
        </mesh>
      );
    case 'swordtail':
      return (
        <mesh position-y={0.8} scale={[1, 1, 0.16]} material={material}>
          <coneGeometry args={[0.26, 1.6, 4]} />
        </mesh>
      );
    case 'scorpiontail':
      return (
        <group>
          <mesh position-y={0.08} material={material}>
            <icosahedronGeometry args={[0.17, 0]} />
          </mesh>
          <group rotation-z={-0.9} position-y={0.18}>
            <mesh position-y={0.28} material={material}>
              <coneGeometry args={[0.09, 0.56, 5]} />
            </mesh>
          </group>
        </group>
      );
    case 'feathertail':
      return (
        <group>
          {[-0.7, -0.35, 0, 0.35, 0.7].map((a) => (
            <group key={a} rotation-z={a}>
              <mesh position-y={0.42} scale={[1, 1, 0.12]} material={material}>
                <coneGeometry args={[0.17, 0.9, 4]} />
              </mesh>
            </group>
          ))}
        </group>
      );
    default:
      return null;
  }
}

/** Ridges down the back, from the neck to near the tail tip. */
function Ridges({ curve, material }: { curve: CatmullRomCurve3; material: MeshStandardMaterial }) {
  const ref = useRef<InstancedMesh>(null);
  const placements = useMemo(() => {
    const length = curve.getLength();
    const list: Matrix4[] = [];
    const dummy = new Object3D();
    for (let s = 0.9; s < length - 0.5; s += 0.3) {
      const t = s / length;
      const r = radiusAt(s, length);
      const top = topAt(curve, t);
      const tangent = curve.getTangentAt(t);
      dummy.position.copy(curve.getPointAt(t)).addScaledVector(top, r * 0.95);
      dummy.quaternion.setFromUnitVectors(UP, top.clone().addScaledVector(tangent, -0.6).normalize());
      const size = 0.35 + r * 1.3;
      dummy.scale.set(size, size, size);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [curve]);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return (
    <instancedMesh key={placements.length} ref={ref} args={[undefined, undefined, placements.length]} material={material}>
      <coneGeometry args={[0.09, 0.3, 4]} />
    </instancedMesh>
  );
}

export function CodexDragon({ look, still = false }: { look: Look; still?: boolean }) {
  const colour = COLOUR_INFO[look.colour];
  const curve = useMemo(() => spine(look.tail), [look.tail]);
  const body = useMemo(() => bodyGeometry(curve), [curve]);
  useEffect(() => () => body.dispose(), [body]);

  const materials = useMemo(() => {
    const gold = look.colour === 'gold';
    const skin = new MeshStandardMaterial({
      color: colour.body,
      roughness: gold ? 0.32 : 0.5,
      metalness: gold ? 0.75 : 0.25,
      flatShading: true,
      side: DoubleSide,
      emissive: colour.rim,
      emissiveIntensity: 0.03,
    });
    const membrane = new MeshStandardMaterial({
      color: colour.body,
      roughness: 0.75,
      metalness: 0.1,
      side: DoubleSide,
      transparent: true,
      opacity: 0.9,
      emissive: colour.rim,
      emissiveIntensity: 0.06,
    });
    const horn = new MeshStandardMaterial({ color: '#d9cdb4', roughness: 0.4, flatShading: true });
    const eye = new MeshStandardMaterial({ color: '#f2c46b', emissive: '#f2c46b', emissiveIntensity: 2 });
    return { skin, membrane, horn, eye };
  }, [colour, look.colour]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const anatomy = useMemo(() => {
    const length = curve.getLength();
    const at = (s: number) => curve.getPointAt(s / length);
    const head = at(0.42);
    const headTop = topAt(curve, 0.42 / length);
    const shoulder = at(2.55);
    const hips = at(4.3);
    const end = curve.getPointAt(1);
    const tailDir = curve.getTangentAt(1);
    const z = new Vector3(0, 0, 1);
    const leg = (base: Vector3, r: number, forward: number, side: 1 | -1) => {
      const hip = base.clone().add(new Vector3(0, -r * 0.55, side * r * 0.6));
      const knee = hip.clone().add(new Vector3(forward * 0.35, -0.5, side * 0.06));
      const foot = knee.clone().add(new Vector3(-forward * 0.3 + 0.12, -0.42, 0));
      return { hip, knee, foot };
    };
    return {
      horns: ([1, -1] as const).map((side) => {
        const base = head.clone().addScaledVector(headTop, 0.16).addScaledVector(z, side * 0.11);
        return { base, tip: base.clone().add(new Vector3(-0.55, 0.32, side * 0.14)) };
      }),
      eyes: ([1, -1] as const).map((side) => at(0.22).addScaledVector(topAt(curve, 0.22 / length), 0.06).addScaledVector(z, side * 0.13)),
      shoulder: shoulder.clone().addScaledVector(UP, 0.32),
      legs: [
        ...([1, -1] as const).map((side) => leg(shoulder, 0.5, 1, side)),
        ...([1, -1] as const).map((side) => leg(hips, 0.42, -1, side)),
      ],
      tail: { position: end, quaternion: new Quaternion().setFromUnitVectors(UP, tailDir) },
    };
  }, [curve]);

  const root = useRef<Group>(null);
  const right = useRef<Group>(null);
  const left = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const iridescent = look.colour === 'iridescent';
    if (iridescent) {
      const hue = (0.62 + Math.sin(t * 0.35) * 0.18 + 1) % 1;
      materials.skin.emissive.setHSL(hue, 0.7, 0.5);
      materials.skin.emissiveIntensity = 0.12;
      materials.membrane.emissive.setHSL((hue + 0.15) % 1, 0.7, 0.5);
    }
    if (still) return;
    if (root.current) root.current.position.y = Math.sin(t * 0.9) * 0.06;
    const flap = -(0.6 + Math.sin(t * 1.5) * 0.28);
    if (right.current) right.current.rotation.x = flap;
    if (left.current) left.current.rotation.x = flap;
  });

  return (
    <group ref={root}>
      <mesh geometry={body} material={materials.skin} />
      <Ridges curve={curve} material={materials.skin} />
      {anatomy.horns.map((h, i) => (
        <Rod key={i} from={h.base} to={h.tip} radius={0.06} tip={0.004} material={materials.horn} />
      ))}
      {anatomy.eyes.map((p, i) => (
        <mesh key={i} position={p} material={materials.eye}>
          <sphereGeometry args={[0.035, 8, 6]} />
        </mesh>
      ))}
      {anatomy.legs.map((l, i) => (
        <group key={i}>
          <Rod from={l.hip} to={l.knee} radius={0.13} tip={0.08} material={materials.skin} />
          <Rod from={l.knee} to={l.foot} radius={0.08} tip={0.05} material={materials.skin} />
          <mesh position={l.foot} material={materials.horn} rotation-z={-1.2}>
            <coneGeometry args={[0.05, 0.16, 4]} />
          </mesh>
        </group>
      ))}
      <group position={anatomy.shoulder}>
        <Wing side={1} membrane={materials.membrane} bone={materials.skin} flap={right} />
        <Wing side={-1} membrane={materials.membrane} bone={materials.skin} flap={left} />
      </group>
      <group position={anatomy.tail.position} quaternion={anatomy.tail.quaternion}>
        <TailTip tail={look.tail} material={materials.skin} />
      </group>
    </group>
  );
}
