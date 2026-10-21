// De steen van ZWBriljant in three.js: één ruwe edelsteen uit één stuk. De
// facetten duwen de steen samen in hun eigen richting naar buiten (een sterk
// facet verder dan een zwak), het omhulsel eromheen is de steen. Hoogte en
// grootte zijn de score, dus consistentie maakt hem via de factor kleiner.
// Kleur, materiaal en de kop volgen de klasse. Ontwerp: de schets die de
// eigenaar op 2026-10-21 goedkeurde.

import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import type { Level } from "@/lib/briljant/norms";

/** Punten naar wereldeenheden (verticaal): 430 punten is 3,5 hoog. */
export const POINT = 0.0082;

type Habit = "klomp" | "draad" | "kwarts" | "korund" | "beril" | "robijn" | "octaeder";

/**
 * De ruwe vorm per klasse, naar de echte steen: goud, koper en brons zijn een
 * klomp, zilver en platina groeien draderig; amethist heeft de punt van kwarts,
 * saffier de spoel van korund, smaragd het platte zeskant van beril, robijn een
 * lage punt en diamant de octaëder.
 */
const HABITS: readonly Habit[] = ["klomp", "klomp", "draad", "klomp", "draad", "kwarts", "korund", "beril", "robijn", "octaeder"];

/** De kop: ringen van punten [hoogte, straal, aantal] en of er een spits boven op staat. */
const TOPS: Record<Habit, { ring: Array<[number, number, number]>; apex: boolean }> = {
  klomp: { ring: [[0.78, 0.55, 9], [0.92, 0.3, 7]], apex: true },
  draad: { ring: [[0.74, 0.5, 8], [0.9, 0.28, 6]], apex: true },
  kwarts: { ring: [[0.7, 0.5, 6]], apex: true },
  korund: { ring: [[0.66, 0.46, 6]], apex: true },
  robijn: { ring: [[0.8, 0.5, 6]], apex: true },
  beril: { ring: [[0.86, 0.48, 6], [1, 0.4, 6]], apex: false },
  octaeder: { ring: [[0.58, 0.55, 4]], apex: true },
};

const IOR: Partial<Record<Habit, number>> = { kwarts: 1.54, korund: 1.77, beril: 1.58, robijn: 1.77, octaeder: 2.42 };
const METAL_ROUGHNESS = [0.42, 0.5, 0.32, 0.3, 0.22];

/** Vaste toevalsgenerator: elk lid houdt altijd dezelfde steen. */
export function seeded(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type StoneShape = {
  points: THREE.Vector3[];
  height: number;
  radius: number;
  apex: THREE.Vector3;
  /** Per facet het punt waar het de steen het verst naar buiten duwt. */
  shoulders: THREE.Vector3[];
};

/**
 * De punten van de steen; het omhulsel ervan is de steen. `scale` tekent
 * dezelfde vorm op een andere maat (de steen bij volledige consistentie).
 */
export function stoneShape(args: { seed: string; score: number; level: Level; facets: number[]; scale?: number }): StoneShape {
  const rnd = seeded(args.seed);
  const habit = HABITS[args.level.n];
  const height = args.score * POINT * (args.scale ?? 1);
  const radius = 0.38 * height;
  const mean = args.facets.reduce((sum, value) => sum + value, 0) / Math.max(1, args.facets.length);
  const n = args.facets.length;
  const gap = (2 * Math.PI) / Math.max(1, n);
  const turn = rnd() * 2 * Math.PI;
  const points: THREE.Vector3[] = [];
  const shoulders = args.facets.map((value, i) => {
    const angle = turn + i * gap + (rnd() - 0.5) * gap * 0.45;
    const reach = radius * Math.min(1.55, Math.max(0.5, Math.pow(value / Math.max(1e-6, mean), 1.8)));
    const y = height * (0.3 + rnd() * 0.14);
    // Een paar punten per facet: zo krijgt elke kant meerdere ruwe vlakken.
    for (let k = 0; k < 5; k++) {
      const a = angle + (rnd() - 0.5) * 0.32;
      const r = reach * (0.88 + rnd() * 0.12);
      points.push(new THREE.Vector3(Math.cos(a) * r, y + (rnd() - 0.5) * height * 0.16, Math.sin(a) * r));
    }
    // De voet volgt dezelfde richting, smaller.
    points.push(new THREE.Vector3(Math.cos(angle) * reach * 0.68, 0, Math.sin(angle) * reach * 0.68));
    return { angle, reach, pos: new THREE.Vector3(Math.cos(angle) * reach, y, Math.sin(angle) * reach) };
  });
  // Tussen twee facetten een iets ingezakte kant, zodat de steen niet rond wordt.
  shoulders.forEach((s, i) => {
    const t = shoulders[(i + 1) % n];
    const a = s.angle + ((t.angle - s.angle + 2 * Math.PI) % (2 * Math.PI)) / 2;
    const r = Math.min(s.reach, t.reach) * (0.7 + rnd() * 0.12);
    points.push(new THREE.Vector3(Math.cos(a) * r, height * (0.18 + rnd() * 0.3), Math.sin(a) * r));
  });
  const top = TOPS[habit];
  const twist = rnd() * Math.PI;
  for (const [h, r, count] of top.ring) {
    for (let k = 0; k < count; k++) {
      const a = twist + (k / count) * 2 * Math.PI + (rnd() - 0.5) * 0.25;
      const rr = radius * r * (0.85 + rnd() * 0.3);
      points.push(new THREE.Vector3(Math.cos(a) * rr, height * h * (0.97 + rnd() * 0.03), Math.sin(a) * rr));
    }
  }
  const apex = new THREE.Vector3((rnd() - 0.5) * radius * 0.12, height, (rnd() - 0.5) * radius * 0.12);
  if (top.apex) points.push(apex);
  return { points, height, radius, apex, shoulders: shoulders.map((s) => s.pos) };
}

export function stoneGeometry(shape: StoneShape): THREE.BufferGeometry {
  return new ConvexGeometry(shape.points);
}

/** Metaal is dof en ondoorzichtig, een edelsteen doorschijnend; diamant fonkelt. */
export function stoneMaterial(level: Level): THREE.Material {
  const habit = HABITS[level.n];
  if (level.kind === "metaal") {
    return new THREE.MeshStandardMaterial({ color: level.color, metalness: 1, roughness: METAL_ROUGHNESS[level.n], flatShading: true });
  }
  if (habit === "octaeder") {
    // Weinig doorzicht (de studio is donker), veel weerkaatsing.
    return new THREE.MeshPhysicalMaterial({
      color: "#e4f6ff",
      transmission: 0.4,
      thickness: 0.8,
      roughness: 0.06,
      ior: IOR.octaeder,
      dispersion: 6,
      attenuationColor: new THREE.Color(level.color),
      attenuationDistance: 2,
      flatShading: true,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 0.6,
      iridescenceIOR: 1.8,
      envMapIntensity: 2.2,
      emissive: new THREE.Color(level.color),
      emissiveIntensity: 0.12,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(level.color).lerp(new THREE.Color("#ffffff"), 0.12),
    transmission: 0.55,
    thickness: 0.8,
    roughness: 0.32,
    ior: IOR[habit] ?? 1.6,
    attenuationColor: new THREE.Color(level.color),
    attenuationDistance: 0.3,
    flatShading: true,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
  });
}

/** Licht om in te weerspiegelen: een donkere studio met lichtbakken. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const dome = new THREE.SphereGeometry(10, 32, 16);
  const bottom = new THREE.Color("#3a4652");
  const top = new THREE.Color("#c3cfdb");
  const colors: number[] = [];
  const position = dome.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const c = bottom.clone().lerp(top, Math.max(0, (position.getY(i) / 10) * 0.5 + 0.5) ** 1.6);
    colors.push(c.r, c.g, c.b);
  }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  for (const [x, y, z, w, h, k] of [
    [5, 6, 3, 4, 2.5, 12],
    [-6, 4, -2, 3, 3, 7],
    [0, 8, -5, 6, 1.5, 9],
    [3, 1.5, 6, 5, 1.2, 4],
  ]) {
    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.96), side: THREE.DoubleSide }),
    );
    box.position.set(x, y, z);
    box.lookAt(0, 0, 0);
    scene.add(box);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    }
  });
  return texture;
}
