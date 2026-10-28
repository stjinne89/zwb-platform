// Een ZWBeker in three.js, uit het ontwerp van het lid (src/lib/zwbekers/design.ts).
// De maten komen uit dezelfde functies als het plaatje op het profiel, zodat de
// beker in de kast en op de plank dezelfde vorm heeft.
//
// De groep staat met de onderkant van de sokkel op y = 0 en kijkt naar +z.

import * as THREE from "three";
import {
  LINT_COLOR,
  MEDAL,
  METAL_COLOR,
  SOKKEL_COLOR,
  SOKKEL_HEIGHT,
  bodyProfile,
  handleCurves,
  trophyBounds,
  type BekerDesign,
} from "@/lib/zwbekers/design";

export type BuiltTrophy = {
  group: THREE.Group;
  /** De delen die draaien als de beker op zijn sokkel ronddraait (niet de sokkel zelf). */
  spinner: THREE.Group;
  height: number;
  radius: number;
  /** Ruimt alle vormen, materialen en texturen van deze beker op. */
  dispose: () => void;
};

/** Ruimt alles onder `root` op, elk ding één keer, ook als delen een materiaal delen. */
export function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    (material as THREE.MeshStandardMaterial).map?.dispose();
    material.dispose();
  });
}

/**
 * Wat het metaal weerspiegelt: lichter en warmer dan de galerij zelf. Met de
 * petrol vloer van de galerij erin werd goud aan de binnenkant olijfgroen; zo
 * blijft goud goud, zoals onder de spots van een echte prijzenkast. Eén keer per
 * scène maken en meegeven aan buildTrophy.
 */
export function trophyEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const dome = new THREE.SphereGeometry(10, 32, 16);
  const bottom = new THREE.Color("#6f6a60");
  const top = new THREE.Color("#f4eee2");
  const colors: number[] = [];
  const position = dome.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const c = bottom.clone().lerp(top, Math.max(0, (position.getY(i) / 10) * 0.5 + 0.5) ** 1.2);
    colors.push(c.r, c.g, c.b);
  }
  dome.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(dome, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  // Lichtbakken voor de strepen glans; een petrol vlak opzij voor wat kleur van de wand.
  for (const [x, y, z, w, h, k] of [
    [5, 6, 3, 4, 2.5, 10],
    [-6, 4, 2, 3, 3, 6],
    [0, 8, -5, 6, 1.5, 8],
    [2, 2, 7, 6, 1.5, 4],
  ]) {
    const box = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k * 0.97, k * 0.9), side: THREE.DoubleSide }));
    box.position.set(x, y, z);
    box.lookAt(0, 0, 0);
    scene.add(box);
  }
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ color: "#0b4a56", side: THREE.DoubleSide }));
  wall.position.set(0, 1, -8);
  wall.lookAt(0, 0, 0);
  scene.add(wall);
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

/** Gepolijst metaal, met een dun laklaagje voor de glans. */
export function metalMaterial(design: BekerDesign, envMap?: THREE.Texture) {
  const colors = METAL_COLOR[design.metaal];
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colors.hex),
    metalness: 1,
    roughness: design.metaal === "brons" ? 0.28 : 0.18,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    envMap: envMap ?? null,
    envMapIntensity: 1.1,
    side: THREE.DoubleSide,
  });
}

/** Een sokkel van gelakt zwart, hout met nerf of marmer met aders. */
function sokkelMaterial(design: BekerDesign) {
  const color = new THREE.Color(SOKKEL_COLOR[design.sokkel]);
  if (design.sokkel === "zwart") {
    return new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: 0.6 });
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  context.fillStyle = SOKKEL_COLOR[design.sokkel];
  context.fillRect(0, 0, 256, 256);
  // Vaste "willekeur" per soort, zodat elke houten sokkel dezelfde nerf heeft.
  let seed = design.sokkel === "hout" ? 7 : 13;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (design.sokkel === "hout") {
    for (let i = 0; i < 26; i++) {
      context.strokeStyle = `rgba(${random() > 0.5 ? "40,22,10" : "140,96,60"},${0.18 + random() * 0.25})`;
      context.lineWidth = 1 + random() * 3;
      const y = random() * 256;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(85, y + (random() - 0.5) * 24, 170, y + (random() - 0.5) * 24, 256, y + (random() - 0.5) * 10);
      context.stroke();
    }
  } else {
    for (let i = 0; i < 9; i++) {
      context.strokeStyle = `rgba(120,118,112,${0.18 + random() * 0.3})`;
      context.lineWidth = 0.6 + random() * 1.6;
      let x = random() * 256;
      let y = 0;
      context.beginPath();
      context.moveTo(x, y);
      while (y < 256) {
        x += (random() - 0.5) * 40;
        y += 18 + random() * 30;
        context.lineTo(x, y);
      }
      context.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: design.sokkel === "hout" ? 0.55 : 0.25,
    clearcoat: design.sokkel === "hout" ? 0.4 : 0.6,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.5,
  });
}

/** Het gegraveerde plaatje op de voorkant van de sokkel: donkere letters op messing. */
function gravurePlate(text: string, width: number, serif: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = () => {
    const context = canvas.getContext("2d")!;
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#e9cd84");
    gradient.addColorStop(0.5, "#c9a45a");
    gradient.addColorStop(1, "#a5823f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "rgba(70,48,14,.55)";
    context.lineWidth = 6;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    let size = 110;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (; size > 40; size -= 6) {
      context.font = `500 ${size}px ${serif}`;
      if (context.measureText(text).width < canvas.width * 0.86) break;
    }
    // Gegraveerd: een lichte rand onder de donkere letters.
    context.fillStyle = "rgba(255,240,200,.45)";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 3);
    context.fillStyle = "#3d2a0c";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`500 110px ${serif}`).then(draw, () => undefined);
  const height = width * (canvas.height / canvas.width);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, metalness: 0.6, roughness: 0.35 }),
  );
}

/**
 * Bouwt de beker. `quality` laag op een telefoon: minder rondingen. `serif` is de
 * letter voor de gravure (de schreefletter van de galerij).
 */
export function buildTrophy(
  design: BekerDesign,
  options: { lowQuality?: boolean; serif?: string; envMap?: THREE.Texture } = {},
): BuiltTrophy {
  const segments = options.lowQuality ? 40 : 72;
  const serif = options.serif || "Georgia, serif";
  const bounds = trophyBounds(design);
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.position.y = SOKKEL_HEIGHT;
  group.add(spinner);

  const metal = metalMaterial(design, options.envMap);
  const withMetal = (geometry: THREE.BufferGeometry) => new THREE.Mesh(geometry, metal);

  // De sokkel: een blok, vierkant bij een beker, ondiep bij een medaille.
  const depth = design.vorm === "medaille" ? 0.5 : bounds.sokkelWidth * 0.82;
  const sokkel = new THREE.Mesh(new THREE.BoxGeometry(bounds.sokkelWidth, SOKKEL_HEIGHT, depth), sokkelMaterial(design));
  sokkel.position.y = SOKKEL_HEIGHT / 2;
  group.add(sokkel);
  if (design.gravure) {
    const plate = gravurePlate(design.gravure, Math.min(bounds.sokkelWidth * 0.84, 1.1), serif);
    plate.position.set(0, SOKKEL_HEIGHT / 2, depth / 2 + 0.003);
    group.add(plate);
  }

  if (design.vorm === "medaille") {
    buildMedal(design, spinner, withMetal, segments);
  } else {
    const profile = bodyProfile(design)!;
    const body = withMetal(new THREE.LatheGeometry(profile.lathe.map(([x, y]) => new THREE.Vector2(x, y)), segments));
    spinner.add(body);
    if (profile.lid) {
      spinner.add(withMetal(new THREE.LatheGeometry(profile.lid.map(([x, y]) => new THREE.Vector2(x, y)), segments)));
    }
    for (const [a, b, c, d] of handleCurves(design)) {
      for (const side of [1, -1]) {
        const curve = new THREE.CubicBezierCurve3(
          new THREE.Vector3(a[0] * side, a[1], 0),
          new THREE.Vector3(b[0] * side, b[1], 0),
          new THREE.Vector3(c[0] * side, c[1], 0),
          new THREE.Vector3(d[0] * side, d[1], 0),
        );
        spinner.add(withMetal(new THREE.TubeGeometry(curve, 40, design.oren === "vleugel" ? 0.024 : 0.03, 12, false)));
      }
    }
  }

  return { group, spinner, height: bounds.height, radius: bounds.radius, dispose: () => disposeTree(group) };
}

/** Een medaille aan een lint, op een fluwelen bordje dat iets achterover leunt. */
function buildMedal(
  design: BekerDesign,
  spinner: THREE.Group,
  withMetal: (geometry: THREE.BufferGeometry) => THREE.Mesh,
  segments: number,
) {
  const holder = new THREE.Group();
  holder.rotation.x = -0.12;
  spinner.add(holder);

  const { board, disc, ribbon } = MEDAL;
  const velvet = new THREE.Mesh(
    new THREE.BoxGeometry(board.width, board.height, board.depth),
    new THREE.MeshStandardMaterial({ color: 0x0f2f36, roughness: 0.95, envMapIntensity: 0.2 }),
  );
  velvet.position.set(0, board.height / 2, -0.04);
  holder.add(velvet);
  // Een smalle gouden lijst om het bordje.
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(board.width + 0.04, board.height + 0.04, board.depth * 0.6),
    new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.35 }),
  );
  frame.position.set(0, board.height / 2, -0.06);
  holder.add(frame);

  // Het lint: twee banen in een V, van de bovenkant van het bord naar de schijf.
  // Mat, als stof: anders spoelt de spot de kleur weg.
  const ribbonMaterial = new THREE.MeshStandardMaterial({
    // Iets donkerder dan de keuzekleur: onder de spot komt hij er dan op uit.
    color: new THREE.Color(LINT_COLOR[design.lint]).multiplyScalar(0.62),
    roughness: 0.95,
    envMapIntensity: 0.3,
    side: THREE.DoubleSide,
  });
  const discTop = disc.center[1] + disc.radius;
  for (const side of [-1, 1]) {
    const from = new THREE.Vector2(side * ribbon.spread, ribbon.top);
    const to = new THREE.Vector2(side * ribbon.bottomSpread, discTop - 0.04);
    const length = from.distanceTo(to);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(ribbon.width, length), ribbonMaterial);
    strip.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, 0.01 + (side > 0 ? 0.004 : 0));
    strip.rotation.z = Math.atan2(to.x - from.x, from.y - to.y);
    holder.add(strip);
  }

  // De schijf met een opstaande rand en een verhoogd midden.
  const coin = withMetal(new THREE.CylinderGeometry(disc.radius, disc.radius, disc.thickness, segments));
  coin.rotation.x = Math.PI / 2;
  coin.position.set(disc.center[0], disc.center[1], 0.05);
  holder.add(coin);
  const rim = withMetal(new THREE.TorusGeometry(disc.radius - 0.012, 0.018, 10, segments));
  rim.position.set(disc.center[0], disc.center[1], 0.05 + disc.thickness / 2);
  holder.add(rim);
  const boss = withMetal(new THREE.CylinderGeometry(disc.radius * 0.55, disc.radius * 0.6, 0.02, segments));
  boss.rotation.x = Math.PI / 2;
  boss.position.set(disc.center[0], disc.center[1], 0.05 + disc.thickness / 2 + 0.01);
  holder.add(boss);
  // Het oogje bovenaan de schijf, waar het lint door gaat.
  const eye = withMetal(new THREE.TorusGeometry(0.035, 0.012, 8, 20));
  eye.position.set(0, discTop + 0.01, 0.05);
  holder.add(eye);
}
