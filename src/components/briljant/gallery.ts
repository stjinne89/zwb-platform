// De ruimte om de stenen heen: een galerij in ZWB-kleuren (eigenaar, 2026-10-23:
// "nu een zwart gat"). Petrol wanden met een gouden plint, een grijsgroene stenen
// vloer, witte sokkels met een gouden rand, lichtvlekken van de spots op de wand,
// en in de galerij ZWB-logo's, spreuken van de website en sponsors aan de wand.
// De wanden blijven donker genoeg dat de lichte labels erboven leesbaar blijven.

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
 * De spreuken van zwbcycling.nl, waar ze om de beurt worden uitgetypt (eigenaar,
 * 2026-10-23: "op de website staan altijd spreuken"). In de galerij staan ze als
 * wandtekst tussen de stenen.
 */
export const QUOTES: ReadonlyArray<{ text: string; by: string }> = [
  { text: "The race is won by the rider who can suffer the most", by: "Eddy Merckx" },
  { text: "As long as I breathe, I attack", by: "Bernard Hinault" },
  {
    text: "Pain is temporary, eventually it will subside and something else will take its place. If I quit, however, it lasts forever",
    by: "Lance Armstrong",
  },
  { text: "When it’s hurting you, that’s when you can make a difference", by: "Eddy Merckx" },
  {
    text: "If you go (with a break), you can either win or not win. If you don’t go for it, you definitely won’t win",
    by: "Jens Voigt",
  },
];

/** Laadt een plaatje als textuur; elk adres één keer per scène. */
export function textureCache() {
  const loader = new THREE.TextureLoader();
  const cache = new Map<string, Promise<THREE.Texture>>();
  return (src: string) => {
    let texture = cache.get(src);
    if (!texture) {
      texture = loader.loadAsync(src).then((loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = 4;
        return loaded;
      });
      cache.set(src, texture);
    }
    return texture;
  };
}

/**
 * Een bordje aan de wand, `width` bij `height`, met een plaatje erop dat binnen
 * de rand past (een logo). Het bordje staat rechtop en kijkt naar +z; het plaatje
 * verschijnt zodra het geladen is. Lukt dat niet, dan verdwijnt het hele bordje.
 */
export function board(src: string, width: number, height: number, load: (src: string) => Promise<THREE.Texture>, track: Track) {
  const group = new THREE.Group();
  group.add(track(new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ color: ZWB.cream, roughness: 0.85 }))));
  const material = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.8 });
  const image = track(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));
  image.position.z = 0.01;
  image.visible = false;
  group.add(image);
  load(src).then(
    (texture) => {
      const { width: w, height: h } = texture.image as { width: number; height: number };
      // Zo groot als past binnen de rand.
      const fit = Math.min((width * 0.84) / w, (height * 0.74) / h);
      image.scale.set(w * fit, h * fit, 1);
      material.map = texture;
      material.needsUpdate = true;
      image.visible = true;
    },
    () => {
      group.visible = false;
    },
  );
  return group;
}

/** Het echte ZWB-logo (public/zwb-logo.png, 300 bij 104, met "Cycling Community") op een crème bordje. */
export function emblem(width: number, load: (src: string) => Promise<THREE.Texture>, track: Track) {
  return board("/zwb-logo.png", width, width * 0.48, load, track);
}

/**
 * Een spreuk als wandtekst: crème letters in de schreefletter, de naam eronder
 * in goud. `width` breed, half zo hoog; het vlak kijkt naar +z.
 */
export function wallText(quote: { text: string; by: string }, width: number, fonts: { serif: string; sans: string }, track: Track) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = () => {
    const context = canvas.getContext("2d")!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    // Een lange spreuk krijgt kleinere letters, zodat hij in vijf regels past.
    let size = 64;
    let lines: string[] = [];
    for (; size >= 34; size -= 4) {
      context.font = `italic 400 ${size}px ${fonts.serif}`;
      lines = [];
      let line = "";
      for (const word of `“${quote.text}”`.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > canvas.width * 0.92) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
      if (lines.length * size * 1.18 <= canvas.height * 0.72) break;
    }
    const by = 30;
    const total = lines.length * size * 1.18 + by * 1.9;
    let y = (canvas.height - total) / 2 + size;
    context.textAlign = "center";
    context.fillStyle = "#f5f6f0";
    for (const line of lines) {
      context.fillText(line, canvas.width / 2, y);
      y += size * 1.18;
    }
    context.font = `500 ${by}px ${fonts.sans}`;
    context.letterSpacing = "6px";
    context.fillStyle = "#d9b25e";
    context.fillText(`— ${quote.by.toUpperCase()}`, canvas.width / 2, y + by * 0.6);
    texture.needsUpdate = true;
  };
  draw();
  // Opnieuw zodra de letters van ZWBriljant geladen zijn.
  document.fonts?.load(`italic 400 64px ${fonts.serif}`).then(draw, () => undefined);
  return track(
    new THREE.Mesh(
      new THREE.PlaneGeometry(width, width / 2),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.92, depthWrite: false }),
    ),
  );
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
