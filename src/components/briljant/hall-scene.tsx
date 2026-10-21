"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { glow, stoneGeometry, stoneMaterial, stoneShape, studioEnvironment } from "./stone";
import { facetPoints, type SceneStone } from "./stone-scene";

/** Een steen in de zaal; `id` is ook de sleutel van zijn plaatje ("hall:<id>"). */
export type HallStone = SceneStone & { id: string };

type Props = {
  stones: HallStone[];
  /** Waar de wandeling begint: meestal je eigen steen. */
  startId?: string;
  labels: RefObject<Map<string, HTMLElement>>;
  onFailed: () => void;
  rotate: boolean;
};

const NIGHT = 0x0a0c0f;

/**
 * De zaal als museum (eigenaar, 2026-10-21): alle stenen op één rij hoge sokkels,
 * van laag naar hoog, met de recordsteen achteraan. Je loopt erlangs door te
 * scrollen of te slepen; naam en score staan als plaatje op de sokkel, zodat er
 * weinig in de lucht zweeft. Kiezen opent de vergelijking.
 */
export default function HallScene({ stones, startId, labels, onFailed, rotate }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const rotating = useRef(rotate);
  useEffect(() => {
    rotating.current = rotate;
  }, [rotate]);
  const [failed, setFailed] = useState(false);
  const key = `${startId ?? ""}|${stones.map((stone) => `${stone.id}:${stone.score}:${stone.level.n}`).join("|")}`;
  const current = useRef(stones);
  useEffect(() => {
    current.current = stones;
  });

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const stones = [...current.current].sort((a, b) => a.score - b.score);
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
      stoneShape({ seed: stone.seed, score: stone.score, level: stone.level, facets: facetPoints(stone) }),
    );
    const tallest = Math.max(1, ...shapes.map((shape) => shape.height));
    const widest = Math.max(0.5, ...shapes.map((shape) => shape.radius));
    // Elke sokkel past bij zijn steen; de afstand volgt de breedste.
    const plinthRadius = widest * 1.15;
    const spacing = plinthRadius * 2 + 1.2;
    // Hoge sokkels, zodat het plaatje op ooghoogte staat en de steen erboven.
    const plinthHeight = Math.max(1.6, tallest * 0.55);

    const floor = track(new THREE.Mesh(new THREE.PlaneGeometry(2000, 200), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9, envMapIntensity: 0.15 })));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const black = new THREE.MeshPhysicalMaterial({ color: 0x050607, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18, envMapIntensity: 0.3 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 1, roughness: 0.32 });
    materials.push(black, brass);

    const meshes: THREE.Mesh[] = [];
    const xs: number[] = [];
    const anchors = new Map<string, THREE.Vector3>();
    stones.forEach((stone, index) => {
      const x = index * spacing;
      xs.push(x);
      const radius = Math.max(0.8, shapes[index].radius * 1.3);
      const bodyGeometry = new THREE.CylinderGeometry(radius, radius * 1.06, plinthHeight, lowQuality ? 48 : 96);
      const edgeGeometry = new THREE.TorusGeometry(radius, Math.max(0.008, radius * 0.008), 8, 96);
      geometries.push(bodyGeometry, edgeGeometry);
      const body = new THREE.Mesh(bodyGeometry, black);
      body.position.set(x, plinthHeight / 2, 0);
      scene.add(body);
      for (const y of [plinthHeight, 0.02]) {
        const edge = new THREE.Mesh(edgeGeometry, brass);
        edge.rotation.x = Math.PI / 2;
        edge.position.set(x, y, 0);
        scene.add(edge);
      }
      const pool = track(glow(0xfff1d8, radius * 2.6, 0.1));
      pool.position.set(x, 0.005, 0);
      scene.add(pool);
      const tint = track(glow(stone.level.color, radius * 0.7, stone.level.kind === "edelsteen" ? 0.32 : 0.12));
      tint.position.set(x, plinthHeight + 0.004, 0);
      scene.add(tint);
      const mesh = track(new THREE.Mesh(stoneGeometry(shapes[index]), stoneMaterial(stone.level)));
      mesh.position.set(x, plinthHeight, 0);
      scene.add(mesh);
      meshes.push(mesh);
      // Het plaatje op de voorkant van de sokkel, iets onder het midden.
      anchors.set(`hall:${stone.id}`, new THREE.Vector3(x, plinthHeight * 0.55, radius * 1.03));
    });

    // Een rij spots boven de sokkels, zoals in een museum.
    const lights: THREE.Light[] = [];
    xs.forEach((x) => {
      const spot = new THREE.SpotLight(0xfff3e2, 7, 0, 0.45, 0.8, 0);
      spot.position.set(x + 0.6, plinthHeight + tallest + 6, 3.5);
      spot.target.position.set(x, plinthHeight + tallest * 0.4, 0);
      scene.add(spot, spot.target);
      lights.push(spot);
    });
    scene.add(new THREE.HemisphereLight(0xcfd8e3, NIGHT, 0.35));
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.1);
    rim.position.set(-4, 6, -8);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 600);
    // Van de vloer tot de top van de hoogste steen in beeld, het midden daartussen.
    const fullHeight = plinthHeight + tallest;
    const lookHeight = fullHeight * 0.5;
    const reachFor = (aspect: number) => {
      // Op een breed scherm drie stenen tegelijk, op een telefoon ruim één.
      const across = aspect >= 1 ? spacing * 2.8 : spacing * 1.2;
      const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
      const halfAngle = Math.atan(Math.tan(vertical) * aspect);
      return Math.max(across / 2 / Math.tan(halfAngle), (fullHeight * 0.62) / Math.tan(vertical));
    };
    let reach = reachFor(element.clientWidth / Math.max(1, element.clientHeight));
    scene.fog = new THREE.Fog(NIGHT, reach + 4, reach + spacing * 4);

    // Lopen langs de rij: scrollen of slepen verschuift het doel, de camera volgt zacht.
    const start = Math.max(0, stones.findIndex((stone) => stone.id === startId));
    const minX = xs[0] ?? 0;
    const maxX = xs[xs.length - 1] ?? 0;
    let targetX = xs[start] ?? 0;
    let cameraX = targetX;
    const clamp = (x: number) => Math.min(maxX, Math.max(minX, x));
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      targetX = clamp(targetX + delta * spacing * 0.004);
    };
    let dragFrom: number | null = null;
    let dragX = 0;
    const onDown = (event: PointerEvent) => {
      dragFrom = event.clientX;
      dragX = targetX;
    };
    const onMove = (event: PointerEvent) => {
      if (dragFrom == null) return;
      const perPixel = (spacing * 2.8) / Math.max(1, element.clientWidth);
      targetX = clamp(dragX - (event.clientX - dragFrom) * perPixel);
    };
    const onUp = () => {
      if (dragFrom == null) return;
      dragFrom = null;
      // Na het slepen naar de dichtstbijzijnde sokkel.
      targetX = xs.reduce((best, x) => (Math.abs(x - targetX) < Math.abs(best - targetX) ? x : best), targetX);
    };
    const canvas = renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      reach = reachFor(camera.aspect);
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
        // Plaatjes ver opzij vervagen, buiten beeld verdwijnen ze.
        const off = Math.abs(projected.x);
        label.style.opacity = projected.z < 1 && off < 1.1 ? String(Math.max(0.25, 1 - Math.max(0, off - 0.6))) : "0";
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
      cameraX += (targetX - cameraX) * Math.min(1, dt * (reducedMotion ? 30 : 6));
      camera.position.set(cameraX, lookHeight + reach * 0.08, reach);
      camera.lookAt(cameraX, lookHeight, 0);
      // De stenen draaien langzaam op hun sokkel.
      if (!reducedMotion && rotating.current) for (const mesh of meshes) mesh.rotation.y += dt * 0.25;
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
      canvas.removeEventListener("webglcontextlost", lost);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) (object.material as THREE.MeshBasicMaterial).map?.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      lights.forEach((light) => light.dispose());
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // Opnieuw opbouwen als de stenen veranderen, niet bij elke render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
