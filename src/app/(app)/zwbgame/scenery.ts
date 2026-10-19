import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Landscape around the road: rolling ground with field colours, trees and bushes in
 * groups, and hill ridges on the horizon. All of it is generated from the route, with a
 * seed, so a route looks the same every time it is ridden.
 */

/** The road through the world: x offset and height per distance. The road runs towards −z. */
export type Track = { bend: (d: number) => number; height: (d: number) => number; length: number; seed: string };

const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoothstep = (a: number, b: number, x: number) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));
const hash = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };

/** Value noise in 0–1, smooth between whole-number grid points. */
export function noise2(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Seeded random numbers, so the scenery does not change between visits. */
export function seeded(text: string) {
  let h = 1779033703;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/** Ground height beside the road, above the road's own height. Flat close to the road, rolling further out. */
export function terrainLift(d: number, x: number) {
  const away = Math.abs(x), ramp = smoothstep(12, 45, away);
  if (!ramp) return 0;
  const hills = (noise2(d / 160, x / 160) - 0.35) * 14 + (noise2(d / 55 + 7, x / 55) - 0.5) * 3;
  return ramp * hills * (1 + smoothstep(100, 260, away) * 1.6);
}

const GROUND_X = [-260, -190, -130, -90, -60, -40, -26, -17, -11, -7, 7, 11, 17, 26, 40, 60, 90, 130, 190, 260];
const GRASS = new THREE.Color("#8db571"), MEADOW = new THREE.Color("#78a05f"), FIELD = new THREE.Color("#bfbb7e"), DARK = new THREE.Color("#66905a"), VERGE = new THREE.Color("#9fc386");

/** The ground: a grid that follows the road, with gentle hills and patches of field and meadow. */
export function groundGeometry(track: Track, lowQuality: boolean) {
  const step = lowQuality ? 30 : 20, rows = Math.ceil((track.length + 400) / step) + 1, cols = GROUND_X.length;
  const positions = new Float32Array(rows * cols * 3), colors = new Float32Array(rows * cols * 3), indices: number[] = [];
  const color = new THREE.Color();
  for (let r = 0; r < rows; r++) {
    const d = r * step - 100, x0 = track.bend(d), y0 = track.height(Math.max(0, d)) - 0.18;
    for (let c = 0; c < cols; c++) {
      const x = GROUND_X[c], i = (r * cols + c) * 3;
      positions.set([x0 + x, y0 + terrainLift(d, x), -d], i);
      color.copy(GRASS).lerp(MEADOW, noise2(d / 90, x / 90));
      const patch = noise2(d / 200 + 31, x / 200 + 5);
      color.lerp(FIELD, smoothstep(0.7, 0.8, patch) * 0.6).lerp(DARK, smoothstep(0.3, 0.2, patch) * 0.7);
      color.lerp(VERGE, 1 - smoothstep(7, 12, Math.abs(x)));
      colors.set([color.r, color.g, color.b], i);
      if (r && c) { const a = (r - 1) * cols + c - 1, b = a + 1, e = a + cols, f = e + 1; indices.push(a, b, e, b, f, e); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

/** Merges parts into one geometry, each part in its own vertex colour. */
function merged(parts: [THREE.BufferGeometry, string][]) {
  const geometries = parts.map(([g, hex]) => {
    const flat = g.index ? g.toNonIndexed() : g, c = new THREE.Color(hex), count = flat.getAttribute("position").count, colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    flat.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    flat.deleteAttribute("uv");
    return flat;
  });
  const result = mergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  parts.forEach(([g]) => g.dispose());
  result.computeVertexNormals();
  return result;
}

// Crowns are white in the geometry and take their green from the instance colour.
const TRUNK = "#4a3828";
const conifer = () => merged([
  [new THREE.CylinderGeometry(0.16, 0.26, 1.6, 6).translate(0, 0.8, 0), TRUNK],
  [new THREE.ConeGeometry(1.9, 2.8, 7).translate(0, 2.6, 0), "#ffffff"],
  [new THREE.ConeGeometry(1.5, 2.5, 7).translate(0, 3.9, 0), "#ffffff"],
  [new THREE.ConeGeometry(1.0, 2.1, 7).translate(0, 5.1, 0), "#ffffff"],
]);
const broadleaf = () => merged([
  [new THREE.CylinderGeometry(0.18, 0.3, 2.4, 6).translate(0, 1.2, 0), TRUNK],
  [new THREE.IcosahedronGeometry(1.9, 0).translate(0, 3.5, 0), "#ffffff"],
  [new THREE.IcosahedronGeometry(1.4, 0).translate(1.0, 2.9, 0.4), "#ffffff"],
  [new THREE.IcosahedronGeometry(1.3, 0).translate(-0.9, 3.0, -0.4), "#ffffff"],
]);
const bush = () => merged([
  [new THREE.IcosahedronGeometry(0.62, 0).scale(1.1, 0.8, 1).translate(0, 0.35, 0), "#ffffff"],
  [new THREE.IcosahedronGeometry(0.45, 0).translate(0.55, 0.28, 0.15), "#ffffff"],
]);

const PINE = ["#3b6b4f", "#2f5e46", "#47775a", "#3a6644"];
const LEAF = ["#5d9a4c", "#6ba356", "#4f8a45", "#7aa85a", "#8aa850"];
const SHRUB = ["#5a8f48", "#6c9c52", "#4e7f40", "#7a9a4a"];

type Placed = { kind: 0 | 1 | 2; x: number; y: number; z: number; scale: number; turn: number; tint: string };

/**
 * Trees and bushes in groups along the road. The camera rides to the right of the
 * player, so trees keep more room on that side and never fill the screen.
 * Grouped per stretch of road so whatever is out of view is not drawn.
 */
export function createForest(scene: THREE.Scene, track: Track, lowQuality: boolean) {
  const random = seeded(track.seed);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const placed: Placed[] = [];
  const step = lowQuality ? 14 : 8;
  for (let d = -80; d < track.length + 300; d += step) {
    for (const side of [-1, 1]) {
      const forest = noise2(d / 350 + (side > 0 ? 13.7 : 0), side * 3.1);
      const density = 0.18 + smoothstep(0.38, 0.75, forest) * 0.8;
      const pines = noise2(d / 600 + 40, side) > 0.5;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (random() > density) continue;
        const x = side * ((side > 0 ? 17 : 10) + Math.pow(random(), 1.6) * 110), z = d + (random() - 0.5) * step;
        const kind = random() < (pines ? 0.8 : 0.2) ? 0 : 1;
        placed.push({ kind, x: track.bend(z) + x, y: track.height(Math.max(0, z)) - 0.18 + terrainLift(z, x), z: -z, scale: 0.75 + random() * 0.65, turn: random() * Math.PI * 2, tint: pick(kind ? LEAF : PINE) });
      }
      if (random() < 0.3) {
        const x = side * ((side > 0 ? 12 : 7.5) + random() * 14), z = d + (random() - 0.5) * step;
        placed.push({ kind: 2, x: track.bend(z) + x, y: track.height(Math.max(0, z)) - 0.18 + terrainLift(z, x), z: -z, scale: 0.6 + random() * 0.7, turn: random() * Math.PI * 2, tint: pick(SHRUB) });
      }
    }
  }
  const geometries = [conifer(), broadleaf(), bush()];
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
  const meshes: THREE.InstancedMesh[] = [];
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const CHUNK = 400;
  const chunks = new Map<string, Placed[]>();
  for (const p of placed) {
    const key = `${p.kind}:${Math.floor(-p.z / CHUNK)}`;
    const list = chunks.get(key) ?? []; list.push(p); chunks.set(key, list);
  }
  for (const [key, list] of chunks) {
    const kind = Number(key.split(":")[0]);
    const mesh = new THREE.InstancedMesh(geometries[kind], material, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.turn, 0); dummy.scale.setScalar(p.scale); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, color.set(p.tint));
    });
    mesh.computeBoundingSphere();
    mesh.castShadow = kind !== 2; mesh.receiveShadow = true;
    scene.add(mesh); meshes.push(mesh);
  }
  return {
    count: placed.length,
    dispose: () => { meshes.forEach((m) => { scene.remove(m); m.dispose(); }); geometries.forEach((g) => g.dispose()); material.dispose(); },
  };
}

/**
 * Two hill ridges on the horizon that travel with the camera, like painted scenery:
 * a nearer green one and a hazier blue one behind it. Their feet fade into the haze.
 */
export function createRidges(scene: THREE.Scene, seed: string, horizon: string) {
  const random = seeded(`${seed}:ridges`);
  const group = new THREE.Group();
  const layers = [
    { radius: 415, base: 16, rise: 46, color: "#a7c3c8" },
    { radius: 360, base: 6, rise: 30, color: "#8fae9f" },
  ];
  const fade = new THREE.Color(horizon), top = new THREE.Color();
  const geometries: THREE.BufferGeometry[] = [];
  const material = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, side: THREE.DoubleSide });
  for (const layer of layers) {
    const segments = 72, phase = random() * 100, positions: number[] = [], colors: number[] = [], indices: number[] = [];
    top.set(layer.color);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      // Seamless round the circle: the noise is sampled on a circle too.
      const n = noise2(Math.cos(a) * 3 + phase, Math.sin(a) * 3) * 0.7 + noise2(Math.cos(a) * 9 + phase, Math.sin(a) * 9) * 0.3;
      const h = layer.base + layer.rise * n, x = Math.sin(a) * layer.radius, z = Math.cos(a) * layer.radius;
      positions.push(x, h, z, x, -90, z);
      colors.push(top.r, top.g, top.b, fade.r, fade.g, fade.b);
      if (i) { const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    geometries.push(g);
    const mesh = new THREE.Mesh(g, material); mesh.frustumCulled = false;
    group.add(mesh);
  }
  scene.add(group);
  return { group, dispose: () => { scene.remove(group); geometries.forEach((g) => g.dispose()); material.dispose(); } };
}
