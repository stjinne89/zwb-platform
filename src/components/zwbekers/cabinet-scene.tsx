"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { AIR, QUOTES, board, emblem, floorMaterial, rail, textureCache, wallMaterial, wallText } from "@/components/briljant/gallery";
import { studioEnvironment } from "@/components/briljant/stone";
import { spins, type BekerDesign } from "@/lib/zwbekers/design";
import { softWash } from "./loods";
import { buildTrophy, disposeTree, trophyEnvironment, type BuiltTrophy } from "./trophy";

export type CabinetBeker = { id: string; year: number; design: BekerDesign };

type Props = {
  bekers: CabinetBeker[];
  /** Bij welke beker de camera begint; zonder: de kast van het nieuwste jaar. */
  startId?: string;
  /** De sponsors met een logo, voor de bordjes tussen de kasten (zoals in ZWBriljant). */
  sponsors?: Array<{ id: string; name: string }>;
  labels: RefObject<Map<string, HTMLElement>>;
  onFailed: () => void;
  rotate: boolean;
};

/** Maten van een kast, in de eenheden van de bekers (een gewone beker is ~1,3 hoog). */
const CABINET = {
  /** Vakken per plank; een vol jaar maakt de kast breder, niet hoger. */
  minSlots: 4,
  shelves: 3,
  slot: 1.15,
  gap: 1.25,
  /** Het dichte onderkastje en de kroon erboven. */
  plinth: 0.95,
  crown: 0.42,
  depth: 0.95,
  /** De houten zijkanten en tussenstijlen. */
  frame: 0.09,
} as const;

/** De bekers per jaar, oudste jaar links; binnen een jaar op datum. */
function byYear(bekers: CabinetBeker[]) {
  const years = new Map<number, CabinetBeker[]>();
  for (const beker of bekers) years.set(beker.year, [...(years.get(beker.year) ?? []), beker]);
  return [...years.entries()].sort(([a], [b]) => a - b);
}

/** Donker notenhout met nerf, gelakt; het hout van de kast. */
function walnut() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#3b2416";
  context.fillRect(0, 0, 256, 512);
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    context.strokeStyle = `rgba(${random() > 0.5 ? "20,10,4" : "110,70,40"},${0.12 + random() * 0.2})`;
    context.lineWidth = 0.6 + random() * 2.4;
    const x = random() * 256;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + (random() - 0.5) * 30, 170, x + (random() - 0.5) * 30, 340, x + (random() - 0.5) * 16, 512);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 0.6 });
}

/** Het jaartal in goud op de kroon van de kast. */
function crownPlate(text: string, width: number, height: number, serif: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.round((1024 * height) / width);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const draw = () => {
    const context = canvas.getContext("2d")!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.textAlign = "center";
    context.textBaseline = "middle";
    const size = Math.round(canvas.height * 0.62);
    context.font = `500 ${size}px ${serif}`;
    context.letterSpacing = `${Math.round(size * 0.18)}px`;
    context.fillStyle = "#e7c56b";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + size * 0.04);
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.load(`500 64px ${serif}`).then(draw, () => undefined);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
}

/**
 * De prijzenkast (eigenaar, 2026-10-28: "meer een prijzenkast dan een
 * galerij"). In dezelfde loods als ZWBriljant (petrol wand, gouden plint,
 * spreuken en het logo aan de wand) staat per jaar een kast van notenhout met
 * glazen deuren en verlichte glazen planken. De bekers staan op de planken, met
 * een messing bordje op de rand; dat bordje opent de beker. Een vol jaar maakt
 * de kast breder. Scrollen, slepen of de pijltjes lopen van kast naar kast.
 */
export default function CabinetScene({ bekers, startId, sponsors = [], labels, onFailed, rotate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rotating = useRef(rotate);
  useEffect(() => {
    rotating.current = rotate;
  }, [rotate]);
  const [failed, setFailed] = useState(false);
  const key = `${startId ?? ""}|${bekers.map((beker) => `${beker.id}:${beker.year}:${JSON.stringify(beker.design)}`).join("|")}|${sponsors.map((sponsor) => sponsor.id).join(",")}`;
  const current = useRef(bekers);
  const currentSponsors = useRef(sponsors);
  useEffect(() => {
    current.current = bekers;
    currentSponsors.current = sponsors;
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const lowQuality = window.matchMedia("(max-width: 640px)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, powerPreference: "low-power" });
    } catch {
      queueMicrotask(() => {
        setFailed(true);
        onFailed();
      });
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(AIR);
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    scene.environmentIntensity = 1.1;
    const shine = trophyEnvironment(renderer);
    const fonts = {
      serif: getComputedStyle(element).getPropertyValue("--serif").trim() || "Georgia, serif",
      sans: getComputedStyle(element).getPropertyValue("--sans").trim() || "system-ui, sans-serif",
    };

    const wood = walnut();
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.3 });
    const velvet = new THREE.MeshStandardMaterial({ color: 0x0f3a44, roughness: 0.95, envMapIntensity: 0.25 });
    const shelfGlass = new THREE.MeshPhysicalMaterial({
      color: 0xdff3f0,
      roughness: 0.08,
      metalness: 0,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1,
      depthWrite: false,
    });
    // De deuren: bijna onzichtbaar glas dat alleen de lichtbakken weerspiegelt.
    const doorGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.08,
      envMapIntensity: 1.6,
      depthWrite: false,
    });
    const strip = new THREE.MeshBasicMaterial({ color: 0xfff2d6 });

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 200), floorMaterial());
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const years = byYear(current.current);
    const interiorHeight = CABINET.shelves * CABINET.gap;
    const totalHeight = CABINET.plinth + interiorHeight + CABINET.crown;
    const anchors = new Map<string, { position: THREE.Vector3; radius: number }>();
    const spinners: THREE.Group[] = [];
    const lights: THREE.Light[] = [];
    const centers: number[] = [];
    const widths: number[] = [];
    /** Waar elke beker staat: voor de stops van de camera. */
    const places: Array<{ id: string; cabinet: number; shelf: number; slot: number; slotX: number; shelfY: number }> = [];
    let x = 0;
    // Tussen twee kasten hangt een spreuk of het logo; die moet ernaast passen.
    const between = 3.6;

    years.forEach(([year, list], cabinetIndex) => {
      const slots = Math.max(CABINET.minSlots, Math.ceil(list.length / CABINET.shelves));
      const inner = slots * CABINET.slot;
      const outer = inner + CABINET.frame * 2;
      const cx = x + outer / 2;
      centers.push(cx);
      widths.push(outer);
      x += outer + between;
      const front = CABINET.depth / 2;
      const group = new THREE.Group();
      group.position.set(cx, 0, 0);
      scene.add(group);
      const box = (w: number, h: number, d: number, material: THREE.Material, px: number, py: number, pz: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        mesh.position.set(px, py, pz);
        group.add(mesh);
        return mesh;
      };

      // De romp: onderkast, zijkanten, achterwand van fluweel, kroon.
      box(outer, CABINET.plinth, CABINET.depth, wood, 0, CABINET.plinth / 2, 0);
      box(outer + 0.08, 0.05, CABINET.depth + 0.06, wood, 0, CABINET.plinth + 0.025, 0);
      for (const side of [-1, 1]) {
        box(CABINET.frame, interiorHeight, CABINET.depth, wood, side * (outer / 2 - CABINET.frame / 2), CABINET.plinth + interiorHeight / 2, 0);
      }
      box(inner, interiorHeight, 0.04, velvet, 0, CABINET.plinth + interiorHeight / 2, -front + 0.02);
      // Ook de binnenkant van zijwanden, bodem en plafond in fluweel: kaal hout werd
      // onder het licht van de planken grijs.
      for (const side of [-1, 1]) {
        box(0.02, interiorHeight, CABINET.depth - 0.04, velvet, side * (inner / 2 - 0.01), CABINET.plinth + interiorHeight / 2, 0);
      }
      box(inner, 0.02, CABINET.depth - 0.04, velvet, 0, CABINET.plinth + 0.06, 0);
      box(inner, 0.02, CABINET.depth - 0.04, velvet, 0, CABINET.plinth + interiorHeight - 0.01, 0);
      const crownY = CABINET.plinth + interiorHeight;
      box(outer + 0.08, CABINET.crown, CABINET.depth + 0.06, wood, 0, crownY + CABINET.crown / 2, 0);
      box(outer + 0.1, 0.03, CABINET.depth + 0.08, brass, 0, crownY + 0.015, 0);
      box(outer + 0.12, 0.05, CABINET.depth + 0.1, wood, 0, crownY + CABINET.crown + 0.025, 0);
      const plate = crownPlate(String(year), Math.min(outer * 0.5, 1.8), CABINET.crown * 0.7, fonts.serif);
      plate.position.set(0, crownY + CABINET.crown / 2, CABINET.depth / 2 + 0.035);
      group.add(plate);
      // Twee deurtjes onderin: een naad in het midden en twee messing knoppen.
      box(0.012, CABINET.plinth * 0.78, 0.01, brass, 0, CABINET.plinth / 2, front + 0.006);
      for (const side of [-1, 1]) {
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 12), brass);
        knob.position.set(side * 0.16, CABINET.plinth * 0.55, front + 0.04);
        group.add(knob);
      }

      // Planken van glas met een messing rand, en een lichtlijst onder elke plank erboven.
      for (let shelf = 0; shelf < CABINET.shelves; shelf++) {
        const y = CABINET.plinth + shelf * CABINET.gap;
        if (shelf > 0) {
          box(inner, 0.03, CABINET.depth - 0.08, shelfGlass, 0, y, -0.02);
          box(inner, 0.035, 0.02, brass, 0, y, front - 0.06);
        }
        const top = y + CABINET.gap;
        box(inner * 0.94, 0.02, 0.05, strip, 0, top - 0.04, front - 0.18);
        const light = new THREE.PointLight(0xfff0d6, 2.2, CABINET.gap * 2.4, 1.6);
        light.position.set(0, top - 0.12, front - 0.25);
        group.add(light);
        lights.push(light);
      }

      // De glazen deuren met een dunne lijst en een messing knop in het midden.
      const doorHeight = interiorHeight;
      const doorWidth = inner / 2;
      for (const side of [-1, 1]) {
        const door = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth - 0.02, doorHeight - 0.02), doorGlass);
        door.position.set(side * (doorWidth / 2), CABINET.plinth + doorHeight / 2, front + 0.01);
        group.add(door);
        box(0.035, doorHeight, 0.03, wood, side * (doorWidth - 0.0175), CABINET.plinth + doorHeight / 2, front + 0.01);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), brass);
        knob.position.set(side * 0.08, CABINET.plinth + doorHeight * 0.5, front + 0.05);
        group.add(knob);
      }
      box(0.04, doorHeight, 0.035, wood, 0, CABINET.plinth + doorHeight / 2, front + 0.01);

      // De bekers: van linksboven naar rechtsonder, elk geschaald in zijn vak.
      list.forEach((beker, index) => {
        const shelf = CABINET.shelves - 1 - Math.floor(index / slots);
        const slot = index % slots;
        const trophy: BuiltTrophy = buildTrophy(beker.design, { lowQuality, serif: fonts.serif, envMap: shine });
        const fit = Math.min(
          1,
          (CABINET.gap * 0.78) / trophy.height,
          (CABINET.slot * 0.42) / Math.max(trophy.radius, 0.35),
        );
        const sx = -inner / 2 + CABINET.slot * (slot + 0.5);
        const sy = CABINET.plinth + shelf * CABINET.gap + (shelf === 0 ? 0.07 : 0.015);
        trophy.group.scale.setScalar(fit);
        trophy.group.position.set(sx, sy, -0.06);
        group.add(trophy.group);
        if (spins(beker.design.vorm)) spinners.push(trophy.spinner);
        anchors.set(`kast:${beker.id}`, {
          position: new THREE.Vector3(cx + sx, sy - 0.045, front - 0.02),
          radius: CABINET.slot / 2,
        });
        places.push({ id: beker.id, cabinet: cabinetIndex, shelf, slot, slotX: cx + sx, shelfY: CABINET.plinth + shelf * CABINET.gap });
      });
    });

    const minX = centers[0] ?? 0;
    const maxX = centers[centers.length - 1] ?? 0;

    // De loods: wand, plint, het licht van een spot op de wand achter elke kast,
    // en tussen de kasten een spreuk of het logo.
    const wallZ = -(CABINET.depth / 2 + 0.6);
    const wallLength = maxX - minX + 60;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallLength, 40), wallMaterial());
    wall.position.set((minX + maxX) / 2, 20, wallZ);
    scene.add(wall);
    const plint = rail(wallLength, 0.09, (mesh) => mesh);
    plint.position.set((minX + maxX) / 2, 0.02, wallZ + 0.04);
    scene.add(plint);
    centers.forEach((cx, index) => {
      const spill = softWash(widths[index] * 1.6, totalHeight * 1.7, 0.18);
      spill.position.set(cx, totalHeight * 0.8, wallZ + 0.02);
      scene.add(spill);
    });
    const load = textureCache();
    const keep = <T extends THREE.Mesh>(mesh: T) => mesh;
    const hang = (object: THREE.Object3D, at: number) => {
      object.position.set(at, totalHeight * 0.62, wallZ + 0.03);
      scene.add(object);
    };
    hang(emblem(1.8, load, keep), minX - widths[0] / 2 - between / 2 - 0.4);
    hang(emblem(1.8, load, keep), maxX + widths[widths.length - 1] / 2 + between / 2 + 0.4);
    // Tussen de kasten om de beurt een spreuk, een sponsor en het logo.
    const sponsorList = currentSponsors.current;
    const kinds = sponsorList.length > 0 ? (["spreuk", "sponsor", "logo"] as const) : (["spreuk", "logo"] as const);
    const counts = { spreuk: 0, sponsor: 0 };
    for (let i = 1; i < centers.length; i++) {
      const at = (centers[i - 1] + widths[i - 1] / 2 + centers[i] - widths[i] / 2) / 2;
      const kind = kinds[(i - 1) % kinds.length];
      if (kind === "spreuk") hang(wallText(QUOTES[counts.spreuk++ % QUOTES.length], between * 0.78, fonts, keep), at);
      else if (kind === "sponsor") {
        const sponsor = sponsorList[counts.sponsor++ % sponsorList.length];
        hang(board(`/api/briljant/sponsor-logo/${sponsor.id}`, between * 0.6, between * 0.36, load, keep), at);
      } else hang(emblem(between * 0.6, load, keep), at);
    }

    scene.add(new THREE.HemisphereLight(0xf2ead8, 0x55605c, 0.6));
    const keyLight = new THREE.DirectionalLight(0xfff3e2, 1.4);
    keyLight.position.set(2, 8, 9);
    scene.add(keyLight);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400);
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    let aspect = 1;

    // Waar de camera kan stilstaan. Op een breed scherm een hele kast per stop;
    // op een staand scherm (eigenaar, 2026-10-28: "inzoomen op een plank") steeds
    // twee vakken van een plank, van boven naar beneden en van kast naar kast.
    type Stop = { x: number; y: number; width: number; height: number; ids: string[] };
    const cabinetStops: Stop[] = centers.map((cx, index) => ({
      x: cx,
      y: totalHeight * 0.5,
      width: widths[index] * 1.14,
      height: totalHeight * 1.12,
      ids: places.filter((place) => place.cabinet === index).map((place) => place.id),
    }));
    const shelfStops: Stop[] = [];
    {
      const groups = new Map<string, typeof places>();
      for (const place of places) {
        const pair = Math.floor(place.slot / 2);
        const groupKey = `${place.cabinet}:${place.shelf}:${pair}`;
        groups.set(groupKey, [...(groups.get(groupKey) ?? []), place]);
      }
      const ordered = [...groups.entries()].sort(([a], [b]) => {
        const [ca, sa, pa] = a.split(":").map(Number);
        const [cb, sb, pb] = b.split(":").map(Number);
        return ca - cb || sb - sa || pa - pb;
      });
      for (const [groupKey, list] of ordered) {
        const [cabinet, , pair] = groupKey.split(":").map(Number);
        const inner = widths[cabinet] - CABINET.frame * 2;
        const left = centers[cabinet] - inner / 2 + pair * 2 * CABINET.slot;
        shelfStops.push({
          x: left + CABINET.slot,
          // Iets onder het midden van het vak: de bordjes hangen onder de plank.
          y: list[0].shelfY + CABINET.gap * 0.4,
          width: CABINET.slot * 2 * 1.1,
          height: CABINET.gap * 1.4,
          ids: list.map((place) => place.id),
        });
      }
      // Een kast zonder bekers (kan niet, maar toch) krijgt zijn hele kast als stop.
      if (shelfStops.length === 0) shelfStops.push(...cabinetStops);
    }
    const portrait = () => aspect < 0.8;
    let stops = cabinetStops;
    const reachFor = (stop: Stop) => {
      const halfAngle = Math.atan(Math.tan(vertical) * aspect);
      return Math.max(stop.height / 2 / Math.tan(vertical), stop.width / 2 / Math.tan(halfAngle)) + CABINET.depth / 2;
    };
    const stopWith = (id: string | undefined) => (id ? stops.findIndex((stop) => stop.ids.includes(id)) : -1);

    let at = 0;
    let dragOffset = 0;
    const cameraState = { x: 0, y: 0, reach: 10 };
    const go = (index: number) => {
      at = Math.min(stops.length - 1, Math.max(0, index));
    };
    const pickStops = (keep: string | undefined) => {
      stops = portrait() ? shelfStops : cabinetStops;
      const found = stopWith(keep);
      // Zonder beker om bij te beginnen: de nieuwste kast, bovenaan.
      go(found >= 0 ? found : portrait() ? stops.findIndex((stop) => places.find((place) => place.id === stop.ids[0])?.cabinet === centers.length - 1) : stops.length - 1);
    };

    let wheelTotal = 0;
    let wheelLock = 0;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (performance.now() < wheelLock) return;
      wheelTotal += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(wheelTotal) < 60) return;
      go(at + Math.sign(wheelTotal));
      wheelTotal = 0;
      wheelLock = performance.now() + 380;
    };
    let dragFrom: number | null = null;
    const onDown = (event: PointerEvent) => {
      dragFrom = event.clientX;
    };
    const onMove = (event: PointerEvent) => {
      if (dragFrom == null) return;
      dragOffset = -((event.clientX - dragFrom) * (stops[at]?.width ?? 5)) / Math.max(1, element.clientWidth);
    };
    const onUp = (event: PointerEvent) => {
      if (dragFrom == null) return;
      const moved = event.clientX - dragFrom;
      dragFrom = null;
      dragOffset = 0;
      if (Math.abs(moved) > 40) go(at + (moved < 0 ? 1 : -1));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select")) return;
      go(at + (event.key === "ArrowRight" ? 1 : -1));
    };
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey);

    let first = true;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      const wasPortrait = portrait();
      aspect = camera.aspect;
      // Gedraaid of de eerste keer: andere stops, bij dezelfde beker blijven.
      if (first || wasPortrait !== portrait()) pickStops(first ? startId : stops[at]?.ids[0]);
      if (first) {
        const stop = stops[at];
        if (stop) Object.assign(cameraState, { x: stop.x, y: stop.y, reach: reachFor(stop) });
        first = false;
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const projected = new THREE.Vector3();
    const edge = new THREE.Vector3();
    const placeLabels = () => {
      const map = labels.current;
      if (!map) return;
      const { width, height } = element.getBoundingClientRect();
      for (const [name, { position, radius }] of anchors) {
        const label = map.get(name);
        if (!label) continue;
        projected.copy(position).project(camera);
        edge.set(position.x + radius, position.y, position.z).project(camera);
        // Het bordje past in zijn vak: hooguit 90% van de breedte op het scherm.
        const slotPx = Math.abs(edge.x - projected.x) * width;
        const plaque = label.firstElementChild as HTMLElement | null;
        const scale = plaque && plaque.offsetWidth > 0 ? Math.min(1, (slotPx * 0.92) / plaque.offsetWidth) : 1;
        label.style.transformOrigin = "0 0";
        label.style.transform = `translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px) scale(${scale.toFixed(3)})`;
        const off = Math.abs(projected.x);
        label.style.opacity = projected.z < 1 && off < 1.05 ? String(Math.max(0.2, 1 - Math.max(0, off - 0.8) * 3)) : "0";
        label.style.visibility = off < 1.1 ? "visible" : "hidden";
      }
    };

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let disposed = false;
    let last = performance.now();
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ease = Math.min(1, dt * (reducedMotion ? 30 : 5));
      const stop = stops[at];
      if (stop) {
        cameraState.x += (stop.x + dragOffset - cameraState.x) * (dragFrom != null ? 1 : ease);
        cameraState.y += (stop.y - cameraState.y) * ease;
        cameraState.reach += (reachFor(stop) - cameraState.reach) * ease;
      }
      camera.position.set(cameraState.x, cameraState.y + cameraState.reach * 0.05, cameraState.reach);
      camera.lookAt(cameraState.x, cameraState.y, 0);
      if (!reducedMotion && rotating.current) for (const spinner of spinners) spinner.rotation.y += dt * 0.25;
      if (!document.hidden) {
        renderer.render(scene, camera);
        placeLabels();
      }
      frame = requestAnimationFrame(render);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      onFailed();
    };
    canvas.addEventListener("webglcontextlost", lost);
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("webglcontextlost", lost);
      disposeTree(scene);
      lights.forEach((light) => light.dispose());
      keyLight.dispose();
      environment.dispose();
      shine.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
