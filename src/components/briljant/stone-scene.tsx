"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LEVELS, type Level } from "@/lib/briljant/norms";
import { FACETS } from "@/lib/briljant/score";
import { AIR, floorMaterial, plinthMaterials, wallMaterial, wash } from "./gallery";
import { glow, seeded, stoneGeometry, stoneMaterial, stoneShape, studioEnvironment } from "./stone";

/** Een steen om te tekenen: score en profielscore in punten, facetten in punten. */
export type SceneStone = {
  seed: string;
  score: number;
  /** De score bij volledige consistentie; dat is het gouden draadmodel. */
  profile: number;
  level: Level;
  facets: Array<{ key: string; points: number }>;
};

type Props = SceneStone & {
  /** Een tweede steen naast de jouwe: een ander lid of het ZWB-gemiddelde. */
  compare?: SceneStone | null;
  /**
   * De HTML-labels per sleutel ("summit", "ghost", "foot", "facet:sprint", "ref:5",
   * "compare"); de scène zet hun positie.
   */
  labels: RefObject<Map<string, HTMLElement>>;
  onFailed: () => void;
  /** Rustig ronddraaien; uit terwijl het lid een label aanwijst of een paneel open heeft. */
  rotate: boolean;
};

const CAMERA = new THREE.Vector3(10.5, 6.2, 12.5);

/** De punten per facet in de vaste volgorde rond de steen, null waar een facet ontbreekt. */
export function facetPoints(stone: SceneStone): Array<number | null> {
  const byKey = new Map(stone.facets.map((facet) => [facet.key, facet.points]));
  return FACETS.map((key) => byKey.get(key) ?? null);
}

const stoneKey = (stone: SceneStone | null | undefined) =>
  stone ? `${stone.seed}|${stone.score}|${stone.profile}|${stone.level.n}|${stone.facets.map((f) => `${f.key}:${f.points}`).join(",")}` : "";

export default function StoneScene({ labels, onFailed, rotate, compare, ...main }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rotating = useRef(rotate);
  useEffect(() => {
    rotating.current = rotate;
  }, [rotate]);
  const [failed, setFailed] = useState(false);
  const mainKey = stoneKey(main);
  const compareKey = stoneKey(compare);
  const stones = useRef({ main, compare });
  useEffect(() => {
    stones.current = { main, compare };
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const { main, compare } = stones.current;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(AIR);
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    scene.environmentIntensity = 1.15;

    const shapeOf = (stone: SceneStone, scale = 1) =>
      stoneShape({ seed: stone.seed, score: stone.score, level: stone.level, facets: facetPoints(stone), scale });
    const shape = shapeOf(main);
    const ghost = shapeOf(main, main.profile / Math.max(1, main.score));
    const other = compare ? shapeOf(compare) : null;
    const tallest = Math.max(ghost.height, other?.height ?? 0);
    const fit = Math.max(1, tallest / 4.4);
    const fog = new THREE.Fog(AIR, 15 * fit, 46 * fit);
    scene.fog = fog;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const track = <T extends THREE.Mesh | THREE.LineSegments>(object: T) => {
      geometries.push(object.geometry);
      const material = object.material;
      materials.push(...(Array.isArray(material) ? material : [material]));
      return object;
    };

    // Een ronde galerij in ZWB-kleuren (eigenaar, 2026-10-23): een stenen vloer,
    // petrol wanden eromheen; de wand komt verderop, als de afstand van de camera vastligt.
    const floor = track(new THREE.Mesh(new THREE.CircleGeometry(220, 64), floorMaterial()));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // De sokkel: wit met een gouden rand.
    const { body: white, rim: brass } = plinthMaterials();
    materials.push(white, brass);
    const plinth = (radius: number, height: number) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, height, lowQuality ? 64 : 128), white);
      geometries.push(body.geometry);
      body.position.y = height / 2;
      body.castShadow = body.receiveShadow = true;
      group.add(body);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(radius, Math.max(0.008, radius * 0.006), 8, 128), brass);
      geometries.push(edge.geometry);
      edge.rotation.x = Math.PI / 2;
      edge.position.y = height;
      group.add(edge);
      return group;
    };
    const plinthHeight = 0.26 * fit;

    // Met een tweede steen staan ze naast elkaar, dwars op de beginblik van de camera.
    const facing = CAMERA.clone().setY(0).normalize();
    const toward = Math.atan2(facing.z, facing.x);
    const right = toward - Math.PI / 2;
    const sideways = new THREE.Vector3(Math.cos(right), 0, Math.sin(right));
    const mainRadius = ghost.radius * 1.7;
    const otherRadius = other ? other.radius * 1.7 : 0;
    const gap = other ? (mainRadius + otherRadius) / 2 + 0.8 * fit : 0;
    const mainCenter = sideways.clone().multiplyScalar(-gap);
    const otherCenter = sideways.clone().multiplyScalar(gap);

    /** Sokkel, kleurgloed en steen op `center`; geeft de bovenkant van de sokkel. */
    const placeStone = (stone: SceneStone, stoneShapeData: ReturnType<typeof shapeOf>, radius: number, center: THREE.Vector3) => {
      const base = plinth(radius, plinthHeight);
      base.position.copy(center);
      scene.add(base);
      const pool = track(glow(0xfff1d8, radius * 3, 0.1));
      pool.position.set(center.x, 0.005, center.z);
      scene.add(pool);
      // Het licht dat door de steen valt kleurt de sokkel in de kleur van de klasse.
      const tint = track(glow(stone.level.color, radius * 0.8, stone.level.kind === "edelsteen" ? 0.3 : 0.1));
      tint.position.set(center.x, plinthHeight + 0.004, center.z);
      scene.add(tint);
      const mesh = track(new THREE.Mesh(stoneGeometry(stoneShapeData), stoneMaterial(stone.level)));
      mesh.position.set(center.x, plinthHeight, center.z);
      mesh.castShadow = true;
      scene.add(mesh);
      return new THREE.Vector3(center.x, plinthHeight, center.z);
    };
    const mainTop = placeStone(main, shape, mainRadius, mainCenter);
    // Dezelfde steen bij volledige consistentie, als gouden draadmodel.
    const ghostGeometry = stoneGeometry(ghost);
    geometries.push(ghostGeometry);
    const ghostLines = track(
      new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeometry, 1), new THREE.LineBasicMaterial({ color: 0xe7c56b, transparent: true, opacity: 0.5 })),
    );
    ghostLines.position.copy(mainTop);
    if (main.profile > main.score + 0.5) scene.add(ghostLines);
    const otherTop = compare && other ? placeStone(compare, other, otherRadius, otherCenter) : null;
    const onMain = (vector: THREE.Vector3) => vector.clone().add(mainTop);

    // Eén warme spot met zachte schaduw, een koel strijklicht van achteren, weinig vullicht.
    const spot = new THREE.SpotLight(0xfff3e2, 9, 0, other ? 0.42 : 0.32, 0.85, 0);
    spot.position.set(2.5 * fit, 13 * fit, 3.5 * fit);
    spot.target.position.set(0, plinthHeight + tallest * 0.4, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(lowQuality ? 1024 : 2048, lowQuality ? 1024 : 2048);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 6;
    scene.add(spot, spot.target);
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.3);
    rim.position.set(-7, 5, -6);
    scene.add(rim, new THREE.HemisphereLight(0xf2ead8, 0x55605c, 0.4));

    // De tien klassen als ijkstenen in een boog erachter: echte stenen in hun eigen
    // verhoudingen (een metaal als lage klomp, een edelsteen als kristal), geen
    // pilaren op hoogte. Een hogere klasse is iets groter.
    const behind = Math.atan2(-facing.z, -facing.x);
    type Anchor = { position: THREE.Vector3; front?: boolean; center?: THREE.Vector3 };
    const anchors = new Map<string, Anchor>();
    LEVELS.forEach((ref, index) => {
      const angle = behind + (index / (LEVELS.length - 1) - 0.5) * 1.6;
      const x = Math.cos(angle) * 19 * fit;
      const z = Math.sin(angle) * 19 * fit;
      // Ongelijke kanten, zodat elke steen er natuurlijk uitziet.
      const lumpy = seeded(`ref-${ref.name}`);
      const facets = Array.from({ length: 7 }, () => 0.8 + lumpy() * 0.4);
      const refShape = stoneShape({ seed: ref.name, score: 300, level: ref, facets });
      const size = (0.55 + ref.n * 0.05) * fit;
      const metal = ref.kind === "metaal";
      const wide = size * (metal ? 1.15 : 1);
      const tall = size * (metal ? 0.62 : 0.95);
      const baseHeight = 0.12 * fit;
      const base = plinth(refShape.radius * wide * 1.5, baseHeight);
      base.position.set(x, 0, z);
      scene.add(base);
      const refPool = track(glow(0xfff1d8, refShape.radius * wide * 2.6, 0.09));
      refPool.position.set(x, 0.006, z);
      scene.add(refPool);
      const refStone = track(new THREE.Mesh(stoneGeometry(refShape), stoneMaterial(ref)));
      refStone.scale.set(wide, tall, wide);
      refStone.rotation.y = lumpy() * Math.PI * 2;
      refStone.position.set(x, baseHeight, z);
      refStone.castShadow = true;
      scene.add(refStone);
      anchors.set(`ref:${ref.n}`, { position: new THREE.Vector3(x, baseHeight + refShape.height * tall + 0.25, z) });
    });

    // De top ligt in het midden van de steen: nooit "achter" de steen.
    anchors.set("summit", { position: onMain(shape.apex), front: true });
    anchors.set("ghost", {
      position: onMain(sideways.clone().multiplyScalar(ghost.radius * 0.55).setY(ghost.height * 0.82)),
      front: true,
    });
    anchors.set("foot", {
      position: new THREE.Vector3(Math.cos(toward) * mainRadius, plinthHeight * 0.5, Math.sin(toward) * mainRadius).add(mainCenter),
      front: true,
    });
    main.facets.forEach((facet) => {
      anchors.set(`facet:${facet.key}`, {
        position: onMain(shape.shoulders[FACETS.indexOf(facet.key as (typeof FACETS)[number])].clone().multiply(new THREE.Vector3(1.18, 1, 1.18))),
        center: mainTop,
      });
    });
    if (other && otherTop) anchors.set("compare", { position: other.apex.clone().add(otherTop), front: true });

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
    // Op een staand scherm verder weg, zodat de steen in de breedte past; met twee
    // stenen ver genoeg dat beide sokkels passen.
    const bounds = element.getBoundingClientRect();
    const aspect = bounds.width / Math.max(1, bounds.height);
    let distance = fit * (aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1);
    if (other) {
      // Beide sokkels in de breedte, met wat lucht: op een telefoon dus flink verder weg.
      const halfWidth = gap + Math.max(mainRadius, otherRadius) + 0.4 * fit;
      const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
      distance = Math.max(distance * 1.35, halfWidth / Math.tan(halfAngle) / CAMERA.length());
    }
    camera.position.copy(CAMERA).multiplyScalar(distance);
    const reach = CAMERA.length() * distance;
    const maxDistance = Math.max(26 * fit, reach * 1.3);

    // De ronde wand, ver genoeg dat de camera er nooit doorheen gaat, met een
    // gouden plint en de lichtvlekken van spots. Geen logo: dat draait mee en
    // schuift dan onder de score door; het hangt bij de ingang van de galerij.
    const wallRadius = Math.max(32 * fit, maxDistance + 4 * fit);
    const wallHeight = 18 * fit;
    const wall = track(
      new THREE.Mesh(new THREE.CylinderGeometry(wallRadius, wallRadius, wallHeight, 96, 1, true), wallMaterial(THREE.BackSide)),
    );
    wall.position.y = wallHeight / 2;
    scene.add(wall);
    const plint = track(new THREE.Mesh(new THREE.TorusGeometry(wallRadius - 0.1 * fit, 0.1 * fit, 6, 192), brass));
    plint.rotation.x = Math.PI / 2;
    plint.position.y = 0.03 * fit;
    scene.add(plint);
    const onWall = (object: THREE.Object3D, angle: number, y: number, inset: number) => {
      object.position.set(Math.cos(angle) * (wallRadius - inset), y, Math.sin(angle) * (wallRadius - inset));
      object.lookAt(0, y, 0);
      scene.add(object);
    };
    const spills = 16;
    for (let i = 0; i < spills; i++) {
      onWall(track(wash(7 * fit, 11 * fit, 0.13)), behind + (i / spills) * Math.PI * 2, 5.5 * fit, 0.4 * fit);
    }

    // De mist begint achter de stenen, ook als de camera verder weg staat, en
    // laat de wand aan de overkant wat wegzakken.
    fog.near = Math.max(15 * fit, reach + 2 * fit);
    fog.far = Math.max(wallRadius * 2.4, reach + 31 * fit);
    const controls = new OrbitControls(camera, renderer.domElement);
    // Op een staand scherm staat de kop bovenin: de stenen iets lager in beeld.
    const lower = aspect < 1 ? 0.09 * reach * Math.min(1, (1 - aspect) * 2) : 0;
    controls.target.set(0, plinthHeight + Math.max(1.4, tallest * 0.45) + lower, 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 4;
    controls.maxDistance = maxDistance;
    // Rustig ronddraaien, behalve bij verminderde beweging; met de vinger draaien kan altijd.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.6;
    // Wie zelf draait, neemt het over: daarna draait de steen niet meer vanzelf.
    let turnedByHand = false;
    const stopRotating = () => {
      turnedByHand = true;
    };
    controls.addEventListener("start", stopRotating);

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const projected = new THREE.Vector3();
    const toCamera = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const placeLabels = () => {
      const map = labels.current;
      if (!map) return;
      const { width, height } = element.getBoundingClientRect();
      for (const [key, anchor] of anchors) {
        const label = map.get(key);
        if (!label) continue;
        projected.copy(anchor.position).project(camera);
        label.style.transform = `translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px)`;
        // Labels aan de achterkant van de steen vervagen.
        toCamera.copy(camera.position).sub(anchor.position).normalize();
        outward.copy(anchor.position).sub(anchor.center ?? new THREE.Vector3()).setY(0).normalize();
        label.style.opacity = anchor.front || toCamera.dot(outward) > -0.15 ? "1" : "0.28";
      }
    };

    let frame = 0;
    let disposed = false;
    const render = () => {
      if (disposed) return;
      controls.autoRotate = !reducedMotion && !turnedByHand && rotating.current;
      controls.update();
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
    renderer.domElement.addEventListener("webglcontextlost", lost);
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("start", stopRotating);
      controls.dispose();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) (object.material as THREE.MeshBasicMaterial).map?.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      environment.dispose();
      spot.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // De scène wordt opnieuw opgebouwd als een steen verandert, niet bij elke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainKey, compareKey]);

  // Het beeld zelf is versiering; de getallen staan in de labels en knoppen erboven.
  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
