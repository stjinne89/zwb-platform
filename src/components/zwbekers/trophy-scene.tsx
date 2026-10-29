"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AIR, floorMaterial, plinthMaterials, wallMaterial } from "@/components/briljant/gallery";
import { glow, studioEnvironment } from "@/components/briljant/stone";
import { softWash } from "./loods";
import { spins, trophyBounds, type BekerDesign } from "@/lib/zwbekers/design";
import { buildTrophy, disposeTree, trophyEnvironment, type BuiltTrophy } from "./trophy";

type Props = {
  design: BekerDesign;
  onFailed?: () => void;
};

/**
 * Eén beker op een sokkel in een hoek van de galerij: het voorbeeld bij het
 * ontwerpen en de beker op zijn eigen pagina. Slepen draait hem rond; een nieuw
 * ontwerp wisselt alleen de beker, niet de hele scène, zodat het voorbeeld bij
 * elke keuze meteen meeverandert.
 */
export default function TrophyScene({ design, onFailed }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  /** Wat de scène van buiten nodig heeft: de beker wisselen. */
  const stage = useRef<{ show: (design: BekerDesign) => void } | null>(null);
  const latest = useRef(design);
  useEffect(() => {
    latest.current = design;
    stage.current?.show(design);
  }, [design]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const lowQuality = window.matchMedia("(max-width: 640px)").matches;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "low-power" });
    } catch {
      queueMicrotask(() => {
        setFailed(true);
        onFailed?.();
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
    scene.environmentIntensity = 1.15;
    const shine = trophyEnvironment(renderer);
    const serif = getComputedStyle(element).getPropertyValue("--serif").trim() || "Georgia, serif";

    // Een lage sokkel: hier gaat het om de beker, niet om het bordje.
    const plinthHeight = 0.9;
    const plinthRadius = 1.05;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMaterial());
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const { body: white, rim: brass } = plinthMaterials();
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(plinthRadius, plinthRadius * 1.06, plinthHeight, 96), white);
    plinth.position.y = plinthHeight / 2;
    scene.add(plinth);
    const edgeGeometry = new THREE.TorusGeometry(plinthRadius, 0.009, 8, 96);
    for (const y of [plinthHeight, 0.02]) {
      const edge = new THREE.Mesh(edgeGeometry, brass);
      edge.rotation.x = Math.PI / 2;
      edge.position.y = y;
      scene.add(edge);
    }
    const pool = glow(0xfff1d8, plinthRadius * 2.8, 0.12);
    pool.position.y = 0.005;
    scene.add(pool);
    const wallZ = -(plinthRadius + 1);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), wallMaterial());
    wall.position.set(0, 10, wallZ);
    scene.add(wall);
    const spill = softWash(3.2, 5, 0.2);
    spill.position.set(0, 2.4, wallZ + 0.02);
    scene.add(spill);

    const spot = new THREE.SpotLight(0xfff3e2, 10, 0, 0.5, 0.8, 0);
    spot.position.set(0.8, 6.5, 3.8);
    spot.target.position.set(0, plinthHeight + 0.8, 0);
    scene.add(spot, spot.target);
    scene.add(new THREE.HemisphereLight(0xf2ead8, 0x55605c, 0.6));
    const rim = new THREE.DirectionalLight(0xbcd6ff, 1.2);
    rim.position.set(-4, 5, -6);
    scene.add(rim);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    // Hoe hoog en breed de beker is, met een zachte overgang naar een andere beker.
    const first = trophyBounds(latest.current);
    let frameHeight = first.height;
    let targetHeight = first.height;
    let frameWidth = Math.max(first.radius, first.sokkelWidth / 2);
    let targetWidth = frameWidth;

    let trophy: BuiltTrophy | null = null;
    // Hoe ver iemand de beker heeft rondgedraaid; blijft staan als hij een andere kiest.
    let turn = 0;
    let spinning = spins(latest.current.vorm);
    const show = (next: BekerDesign) => {
      if (trophy) {
        scene.remove(trophy.group);
        trophy.dispose();
      }
      trophy = buildTrophy(next, { lowQuality, serif, envMap: shine });
      trophy.group.position.y = plinthHeight;
      trophy.group.rotation.y = turn;
      scene.add(trophy.group);
      const bounds = trophyBounds(next);
      targetHeight = bounds.height;
      targetWidth = Math.max(bounds.radius, bounds.sokkelWidth / 2);
      spinning = spins(next.vorm);
    };
    show(latest.current);
    stage.current = { show };

    let dragFrom: number | null = null;
    let dragTurn = 0;
    const canvas = renderer.domElement;
    canvas.style.touchAction = "pan-y";
    const onDown = (event: PointerEvent) => {
      dragFrom = event.clientX;
      dragTurn = turn;
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (dragFrom == null) return;
      turn = dragTurn + ((event.clientX - dragFrom) / Math.max(1, element.clientWidth)) * Math.PI * 2;
    };
    const onUp = () => {
      dragFrom = null;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height, false);
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let disposed = false;
    let last = performance.now();
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
    const render = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ease = Math.min(1, dt * 5);
      frameHeight += (targetHeight - frameHeight) * ease;
      frameWidth += (targetWidth - frameWidth) * ease;
      // De beker vult het beeld; van de sokkel alleen de bovenrand.
      const top = plinthHeight + frameHeight * 1.1;
      const bottom = plinthHeight - 0.2;
      const halfAngle = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = Math.max((top - bottom) / 2 / Math.tan(vertical), (frameWidth * 1.35) / Math.tan(halfAngle)) + frameWidth;
      const look = (top + bottom) / 2;
      camera.position.set(0, look + distance * 0.12, distance);
      camera.lookAt(0, look, 0);
      if (dragFrom == null && spinning && !reducedMotion) turn += dt * 0.35;
      if (trophy) trophy.group.rotation.y = turn;
      if (!document.hidden) renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      onFailed?.();
    };
    canvas.addEventListener("webglcontextlost", lost);
    frame = requestAnimationFrame(render);

    return () => {
      disposed = true;
      stage.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", lost);
      disposeTree(scene);
      spot.dispose();
      environment.dispose();
      shine.dispose();
      renderer.dispose();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="absolute inset-0" aria-hidden data-failed={failed || undefined} />;
}
