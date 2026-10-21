"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LEVELS, type Level } from "@/lib/briljant/norms";
import { stoneGeometry, stoneMaterial, stoneShape, studioEnvironment } from "./stone";

type Props = {
  seed: string;
  /** Score en profielscore in punten; de profielscore is de steen bij volledige consistentie. */
  score: number;
  profile: number;
  level: Level;
  facets: Array<{ key: string; points: number }>;
  /** De HTML-labels per sleutel ("summit", "ghost", "foot", "facet:sprint", "ref:5"); de scène zet hun positie. */
  labels: RefObject<Map<string, HTMLElement>>;
  onFailed: () => void;
};

const NIGHT = 0x0a0c0f;
const CAMERA = new THREE.Vector3(10.5, 6.2, 12.5);

/** Een zachte lichtvlek op de grond (additief), voor de spot en de kleur door de steen. */
function glow(color: THREE.ColorRepresentation, radius: number, opacity: number) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ map: texture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  disc.rotation.x = -Math.PI / 2;
  return disc;
}

export default function StoneScene({ seed, score, profile, level, facets, labels, onFailed }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const facetKey = facets.map((facet) => `${facet.key}:${facet.points}`).join(",");

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NIGHT);
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    scene.environmentIntensity = 1.15;

    const values = facets.map((facet) => facet.points);
    const shape = stoneShape({ seed, score, level, facets: values });
    const ghost = stoneShape({ seed, score, level, facets: values, scale: profile / Math.max(1, score) });
    const fit = Math.max(1, ghost.height / 4.4);
    scene.fog = new THREE.Fog(NIGHT, 15 * fit, 46 * fit);

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const track = <T extends THREE.Mesh | THREE.LineSegments>(object: T) => {
      geometries.push(object.geometry);
      const material = object.material;
      materials.push(...(Array.isArray(material) ? material : [material]));
      return object;
    };

    // Een donkere, naadloze studio: de vloer loopt via de mist over in de achtergrond.
    const floor = track(new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9, envMapIntensity: 0.15 })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const pool = track(glow(0xfff1d8, ghost.radius * 5, 0.1));
    pool.position.y = 0.005;
    scene.add(pool);

    // De sokkel: gepolijst zwart met een messing rand.
    const black = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.32 });
    materials.push(black, brass);
    const plinth = (radius: number, height: number) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, height, lowQuality ? 64 : 128), black);
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
    const plinthRadius = ghost.radius * 1.7;
    scene.add(plinth(plinthRadius, plinthHeight));
    // Het licht dat door de steen valt kleurt de sokkel in de kleur van de klasse.
    const tint = track(glow(level.color, plinthRadius * 0.8, level.kind === "edelsteen" ? 0.3 : 0.1));
    tint.position.y = plinthHeight + 0.004;
    scene.add(tint);

    const stone = track(new THREE.Mesh(stoneGeometry(shape), stoneMaterial(level)));
    stone.position.y = plinthHeight;
    stone.castShadow = true;
    scene.add(stone);
    // Dezelfde steen bij volledige consistentie, als gouden draadmodel.
    const ghostGeometry = stoneGeometry(ghost);
    geometries.push(ghostGeometry);
    const ghostLines = track(
      new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeometry, 1), new THREE.LineBasicMaterial({ color: 0xe7c56b, transparent: true, opacity: 0.5 })),
    );
    ghostLines.position.y = plinthHeight;
    if (profile > score + 0.5) scene.add(ghostLines);
    const lift = (vector: THREE.Vector3) => vector.clone().add(new THREE.Vector3(0, plinthHeight, 0));

    // Eén warme spot met zachte schaduw, een koel strijklicht van achteren, weinig vullicht.
    const spot = new THREE.SpotLight(0xfff3e2, 9, 0, 0.32, 0.85, 0);
    spot.position.set(2.5 * fit, 13 * fit, 3.5 * fit);
    spot.target.position.set(0, plinthHeight + ghost.height * 0.4, 0);
    spot.castShadow = true;
    spot.shadow.mapSize.set(lowQuality ? 1024 : 2048, lowQuality ? 1024 : 2048);
    spot.shadow.bias = -0.0004;
    spot.shadow.radius = 6;
    scene.add(spot, spot.target);
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.3);
    rim.position.set(-7, 5, -6);
    scene.add(rim, new THREE.HemisphereLight(0xcfd8e3, NIGHT, 0.22));

    // De tien klassen als slanke ijkstenen in een boog erachter, elk op zijn grens.
    const facing = CAMERA.clone().setY(0).normalize();
    const behind = Math.atan2(-facing.z, -facing.x);
    const anchors = new Map<string, { position: THREE.Vector3; front?: boolean }>();
    LEVELS.forEach((ref, index) => {
      const angle = behind + (index / (LEVELS.length - 1) - 0.5) * 1.6;
      const x = Math.cos(angle) * 19 * fit;
      const z = Math.sin(angle) * 19 * fit;
      const refPoints = Math.max(50, ref.n * 100);
      const refShape = stoneShape({ seed: ref.name, score: refPoints, level: ref, facets: [1, 1, 1, 1, 1, 1, 1] });
      const baseHeight = 0.12 * fit;
      const base = plinth(Math.max(0.26, refShape.radius * 0.38 * 1.7), baseHeight);
      base.position.set(x, 0, z);
      scene.add(base);
      const refPool = track(glow(0xfff1d8, Math.max(0.9, refShape.radius * 1.4), 0.09));
      refPool.position.set(x, 0.006, z);
      scene.add(refPool);
      const refStone = track(new THREE.Mesh(stoneGeometry(refShape), stoneMaterial(ref)));
      refStone.scale.set(0.38, 1, 0.38);
      refStone.position.set(x, baseHeight, z);
      scene.add(refStone);
      anchors.set(`ref:${ref.n}`, { position: new THREE.Vector3(x, baseHeight + refShape.height + 0.25, z) });
    });

    const toward = Math.atan2(facing.z, facing.x);
    const right = toward - Math.PI / 2;
    // De top ligt in het midden: nooit "achter" de steen.
    anchors.set("summit", { position: lift(shape.apex), front: true });
    anchors.set("ghost", {
      position: new THREE.Vector3(Math.cos(right) * ghost.radius * 0.55, plinthHeight + ghost.height * 0.82, Math.sin(right) * ghost.radius * 0.55),
      front: true,
    });
    anchors.set("foot", {
      position: new THREE.Vector3(Math.cos(toward) * plinthRadius, plinthHeight * 0.5, Math.sin(toward) * plinthRadius),
      front: true,
    });
    facets.forEach((facet, index) => {
      anchors.set(`facet:${facet.key}`, { position: lift(shape.shoulders[index].clone().multiply(new THREE.Vector3(1.18, 1, 1.18))) });
    });

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 400);
    // Op een staand scherm verder weg, zodat de steen in de breedte past.
    const bounds = element.getBoundingClientRect();
    const aspect = bounds.width / Math.max(1, bounds.height);
    camera.position.copy(CAMERA).multiplyScalar(fit * (aspect < 1 ? 1 + (1 - aspect) * 0.9 : 1));
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, plinthHeight + Math.max(1.4, ghost.height * 0.45), 0);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 4;
    controls.maxDistance = 22 * fit;
    // Rustig ronddraaien, behalve bij verminderde beweging; met de vinger draaien kan altijd.
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.6;
    const stopRotating = () => (controls.autoRotate = false);
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
        outward.set(anchor.position.x, 0, anchor.position.z).normalize();
        label.style.opacity = anchor.front || toCamera.dot(outward) > -0.15 ? "1" : "0.28";
      }
    };

    let frame = 0;
    let disposed = false;
    const render = () => {
      if (disposed) return;
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
      for (const mesh of [pool, tint, ...scene.children]) {
        if (mesh instanceof THREE.Mesh) (mesh.material as THREE.MeshBasicMaterial).map?.dispose();
      }
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      environment.dispose();
      spot.shadow.map?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // De scène wordt opnieuw opgebouwd als de steen verandert, niet bij elke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, score, profile, level.n, facetKey]);

  // Het beeld zelf is versiering; de getallen staan in de labels en knoppen erboven.
  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
