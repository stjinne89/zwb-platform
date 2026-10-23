// De ruimte om de stenen heen: een galerij in ZWB-kleuren (eigenaar, 2026-10-23:
// "nu een zwart gat"). Petrol wanden met een gouden plint, een grijsgroene stenen
// vloer, witte sokkels met een gouden rand, lichtvlekken van de spots op de wand
// en het ZWB-logo op een bordje aan de muur. De wanden blijven donker genoeg dat
// de lichte labels erboven leesbaar blijven.

import * as THREE from "three";

/** De kleuren van het shirt die de galerij gebruikt. */
const ZWB = {
  petrolDark: 0x0a2b34,
  cream: 0xf5f6f0,
} as const;

/** De lucht achter en boven de wanden, en de mist: petrol-donker in plaats van zwart. */
export const AIR = ZWB.petrolDark;

type Track = <T extends THREE.Mesh>(mesh: T) => T;

/** Het materiaal van de wand: mat petrol, iets lichter dan de lucht erachter. */
export function wallMaterial(side: THREE.Side = THREE.FrontSide) {
  return new THREE.MeshStandardMaterial({ color: 0x0b4a56, roughness: 0.92, envMapIntensity: 0.25, side });
}

/**
 * Een matte stenen vloer in donker grijsgroen, donker genoeg voor de lichte ladder
 * ervoor. Lambert, want bij een standaardmateriaal weerkaatst de vloer onder een
 * scherpe hoek de lichte omgeving en wordt hij grijs, welke kleur hij ook heeft.
 */
export function floorMaterial() {
  return new THREE.MeshLambertMaterial({ color: 0x2a3634 });
}

/** Witte sokkels met een rand van ZWB-goud, zoals in een galerij. */
export function plinthMaterials() {
  return {
    body: new THREE.MeshPhysicalMaterial({ color: 0xece8de, roughness: 0.62, clearcoat: 0.2, clearcoatRoughness: 0.5, envMapIntensity: 0.4 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.32 }),
  };
}

/**
 * De lichtvlek van een spot op de wand: een zachte, staande ovaal die van boven
 * oplicht (additief, dus geen extra lamp). Het vlak staat rechtop en kijkt naar +z.
 */
export function wash(width: number, height: number, opacity: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.translate(64, 70);
  context.scale(1, 2.6);
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.4, "rgba(255,255,255,.5)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(-64, -70, 128, 256);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, color: 0xffe9c8, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
}

/**
 * Het echte ZWB-logo (public/zwb-logo.png, met "Cycling Community") op een crème
 * bordje, `width` breed. Het bordje staat rechtop en kijkt naar +z; het logo
 * verschijnt zodra het plaatje geladen is.
 */
export function emblem(width: number, track: Track) {
  const group = new THREE.Group();
  // Het plaatje is 300 bij 104; een rand van crème eromheen.
  const logoWidth = width * 0.86;
  const logoHeight = logoWidth * (104 / 300);
  const panel = track(
    new THREE.Mesh(
      new THREE.PlaneGeometry(width, logoHeight + width * 0.14),
      new THREE.MeshStandardMaterial({ color: ZWB.cream, roughness: 0.85 }),
    ),
  );
  group.add(panel);
  const texture = new THREE.TextureLoader().load("/zwb-logo.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const logo = track(
    new THREE.Mesh(
      new THREE.PlaneGeometry(logoWidth, logoHeight),
      new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.8 }),
    ),
  );
  logo.position.z = 0.01;
  group.add(logo);
  return group;
}

/** Een gouden plint langs de wand: een dunne lat, `length` lang langs x. */
export function rail(length: number, thickness: number, track: Track) {
  return track(
    new THREE.Mesh(
      new THREE.BoxGeometry(length, thickness, thickness * 0.6),
      new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.35 }),
    ),
  );
}
