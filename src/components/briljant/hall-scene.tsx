"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { glow, stoneGeometry, stoneMaterial, stoneShape, studioEnvironment } from "./stone";
import type { SceneStone } from "./stone-scene";

/** Een steen in de zaal; `id` is ook de sleutel van zijn label ("hall:<id>"). */
export type HallStone = SceneStone & { id: string };

type Props = {
  stones: HallStone[];
  labels: RefObject<Map<string, HTMLElement>>;
  onFailed: () => void;
  rotate: boolean;
};

const NIGHT = 0x0a0c0f;
/** Zoveel sokkels naast elkaar; daarna een rij verder naar achteren, versprongen. */
const PER_ROW = 7;

/**
 * De zaal: alle stenen die je mag zien op een rij sokkels, de hoogste score in het
 * midden van de voorste rij. Lichter dan de steen zelf: één spot, geen draadmodel
 * en geen labels per onderdeel; kiezen opent de vergelijking.
 */
export default function HallScene({ stones, labels, onFailed, rotate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rotating = useRef(rotate);
  useEffect(() => {
    rotating.current = rotate;
  }, [rotate]);
  const [failed, setFailed] = useState(false);
  const key = stones.map((stone) => `${stone.id}:${stone.score}:${stone.level.n}`).join("|");
  const current = useRef(stones);
  useEffect(() => {
    current.current = stones;
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const stones = [...current.current].sort((a, b) => b.score - a.score);
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
    renderer.shadowMap.enabled = !lowQuality;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(NIGHT);
    const environment = studioEnvironment(renderer);
    scene.environment = environment;
    scene.environmentIntensity = 1.15;

    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const track = <T extends THREE.Mesh>(object: T) => {
      geometries.push(object.geometry);
      const material = object.material;
      materials.push(...(Array.isArray(material) ? material : [material]));
      return object;
    };

    const shapes = stones.map((stone) =>
      stoneShape({ seed: stone.seed, score: stone.score, level: stone.level, facets: stone.facets.map((f) => f.points) }),
    );
    const tallest = Math.max(1, ...shapes.map((shape) => shape.height));
    const widest = Math.max(0.5, ...shapes.map((shape) => shape.radius));
    const plinthRadius = widest * 1.5;
    const spacing = plinthRadius * 2 + 1.2;
    const plinthHeight = 0.26 * Math.max(1, tallest / 4.4);

    const floor = track(new THREE.Mesh(new THREE.CircleGeometry(400, 64), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9, envMapIntensity: 0.15 })));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const black = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.32 });
    materials.push(black, brass);
    const bodyGeometry = new THREE.CylinderGeometry(plinthRadius, plinthRadius * 1.04, plinthHeight, lowQuality ? 48 : 96);
    const edgeGeometry = new THREE.TorusGeometry(plinthRadius, Math.max(0.008, plinthRadius * 0.006), 8, 96);
    geometries.push(bodyGeometry, edgeGeometry);

    // De hoogste score in het midden van de voorste rij, de rest om en om ernaast.
    const rows = Math.ceil(stones.length / PER_ROW);
    const anchors = new Map<string, THREE.Vector3>();
    stones.forEach((stone, index) => {
      const row = Math.floor(index / PER_ROW);
      const inRow = Math.min(PER_ROW, stones.length - row * PER_ROW);
      const slot = index % PER_ROW;
      const offset = slot === 0 ? 0 : slot % 2 === 1 ? Math.ceil(slot / 2) : -Math.ceil(slot / 2);
      // Een achterste rij half versprongen, zodat de labels niet op die ervoor vallen.
      const shift = (inRow % 2 === 0 ? -0.5 : 0) + (row % 2 === 1 ? 0.5 : 0);
      const x = (offset + shift) * spacing;
      const z = -row * spacing * 1.1;

      const body = new THREE.Mesh(bodyGeometry, black);
      body.position.set(x, plinthHeight / 2, z);
      body.castShadow = body.receiveShadow = true;
      scene.add(body);
      const edge = new THREE.Mesh(edgeGeometry, brass);
      edge.rotation.x = Math.PI / 2;
      edge.position.set(x, plinthHeight, z);
      scene.add(edge);
      const pool = track(glow(0xfff1d8, plinthRadius * 2.4, 0.08));
      pool.position.set(x, 0.005, z);
      scene.add(pool);
      const tint = track(glow(stone.level.color, plinthRadius * 0.6, stone.level.kind === "edelsteen" ? 0.3 : 0.1));
      tint.position.set(x, plinthHeight + 0.004, z);
      scene.add(tint);
      const mesh = track(new THREE.Mesh(stoneGeometry(shapes[index]), stoneMaterial(stone.level)));
      mesh.position.set(x, plinthHeight, z);
      mesh.castShadow = true;
      scene.add(mesh);
      anchors.set(`hall:${stone.id}`, shapes[index].apex.clone().add(new THREE.Vector3(x, plinthHeight + 0.2, z)));
    });

    const width = Math.min(PER_ROW, stones.length) * spacing;
    const depth = rows * spacing * 1.1;
    const spot = new THREE.SpotLight(0xfff3e2, 9, 0, 0.7, 0.85, 0);
    spot.position.set(0, 14 + depth, 6);
    spot.target.position.set(0, 0, -depth / 2 + spacing / 2);
    spot.castShadow = !lowQuality;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0004;
    scene.add(spot, spot.target);
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.3);
    rim.position.set(-7, 5, -6 - depth);
    scene.add(rim, new THREE.HemisphereLight(0xcfd8e3, NIGHT, 0.3));

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 600);
    const bounds = element.getBoundingClientRect();
    const aspect = bounds.width / Math.max(1, bounds.height);
    const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect);
    // Ver genoeg dat de voorste rij in de breedte past, en de hoogste steen in beeld.
    const reach = Math.max((width / 2 + 0.6) / Math.tan(halfAngle), tallest * 2.4, 8) + depth * 0.5;
    const target = new THREE.Vector3(0, plinthHeight + tallest * 0.45, -depth / 2 + spacing / 2);
    camera.position.copy(target).add(new THREE.Vector3(0, reach * 0.38, reach));
    scene.fog = new THREE.Fog(NIGHT, reach + depth, reach + depth + 40);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minDistance = 3;
    controls.maxDistance = reach * 2.2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.25;
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
    const placeLabels = () => {
      const map = labels.current;
      if (!map) return;
      const { width, height } = element.getBoundingClientRect();
      for (const [name, position] of anchors) {
        const label = map.get(name);
        if (!label) continue;
        projected.copy(position).project(camera);
        label.style.transform = `translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px)`;
        label.style.opacity = projected.z < 1 ? "1" : "0";
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
    // Opnieuw opbouwen als de stenen veranderen, niet bij elke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
