"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { COURSES, elevationAt } from "@/lib/zwbgame/courses";
import type { RaceState } from "@/lib/zwbgame/types";

type Props = { state: RaceState; overview: boolean; lowQuality: boolean };
const bend = (d: number) => Math.sin(d / 450) * 35 + Math.sin(d / 180) * 7;

export default function RaceScene({ state, overview, lowQuality }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ state, overview });
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = { state, overview }; }, [state, overview]);
  const courseId = state.config.courseId;
  const riderCount = state.riders.length;
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => setFailed(true)); return; }
    const course = COURSES[courseId];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b4d9df");
    scene.fog = new THREE.Fog("#b4d9df", 100, 420);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "3D-peloton op het parcours");
    scene.add(new THREE.HemisphereLight(0xe9fbff, 0x647744, 2.6));
    const sunlight = new THREE.DirectionalLight(0xffedcf, 2.3);
    sunlight.position.set(40, 100, 20); scene.add(sunlight);
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const material = (color: string, flatShading = true) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading }); materials.push(m); return m; };
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
    const worldY = (distance: number) => elevationAt(course, Math.max(0, distance));
    const roadVertices: number[] = [], groundVertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= Math.ceil((course.length + 400) / 10); i++) {
      const d = i * 10 - 100, x = bend(d), y = worldY(d);
      roadVertices.push(x - 5, y, -d, x + 5, y, -d);
      groundVertices.push(x - 260, y - 0.18, -d, x + 260, y - 0.18, -d);
      if (i) { const n = i * 2; indices.push(n - 2, n - 1, n, n - 1, n + 1, n); }
    }
    const strip = (vertices: number[], color: string) => {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, material(color)); scene.add(mesh);
    };
    strip(groundVertices, courseId === "alpen" ? "#859578" : "#92b27b");
    strip(roadVertices, "#525e60");
    const dummy = new THREE.Object3D();
    const markerGeo = geometry(new THREE.BoxGeometry(0.11, 0.025, 4));
    const markerCount = Math.ceil(course.length / 12);
    const markers = new THREE.InstancedMesh(markerGeo, material("#e7e5bd"), markerCount * 2);
    for (let i = 0; i < markerCount; i++) for (let side = 0; side < 2; side++) {
      const d = i * 12;
      dummy.position.set(bend(d) + (side ? 4.5 : -4.5), worldY(d) + 0.025, -d);
      dummy.rotation.set(0, -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); markers.setMatrixAt(i * 2 + side, dummy.matrix);
    }
    scene.add(markers);
    const trees = new THREE.InstancedMesh(geometry(new THREE.ConeGeometry(2.4, 8, 5)), material("#3f7058"), lowQuality ? 180 : 360);
    for (let i = 0; i < trees.count; i++) {
      const d = i / trees.count * course.length;
      dummy.position.set(bend(d) + (i % 2 ? -1 : 1) * (10 + (i * 17 % 50)), worldY(d) + 3, -d);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(0.7 + (i % 4) * 0.3); dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix);
    }
    scene.add(trees);
    const finish = new THREE.Group();
    finish.position.set(bend(course.length), worldY(course.length), -course.length);
    for (const x of [-5, 5]) { const pole = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.3, 5, 0.3)), material("#c9974a")); pole.position.set(x, 2.5, 0); finish.add(pole); }
    const banner = new THREE.Mesh(geometry(new THREE.BoxGeometry(10.3, 1, 0.35)), material("#004653")); banner.position.y = 5; finish.add(banner);
    for (let i = 0; i < 20; i++) { const square = new THREE.Mesh(geometry(new THREE.PlaneGeometry(0.5, 1)), material(i % 2 ? "#ffffff" : "#0a2b34")); square.rotation.x = -Math.PI / 2; square.position.set(-4.75 + i * 0.5, 0.04, 0); finish.add(square); }
    scene.add(finish);
    // Each anatomical/bicycle part is instanced across the peloton: ~14 draws, not 24 × 14.
    const wheelGeo = geometry(new THREE.TorusGeometry(0.34, 0.045, 5, 14));
    const bodyGeo = geometry(new THREE.BoxGeometry(0.42, 0.34, 0.65));
    const helmetGeo = geometry(new THREE.SphereGeometry(0.2, 8, 6));
    const tubeGeo = geometry(new THREE.CylinderGeometry(0.055, 0.055, 1, 5));
    // Club jersey: white shoulders, petrol body with slate chevrons, gold collar and cuffs.
    const jerseyCanvas = document.createElement("canvas");
    jerseyCanvas.width = 64; jerseyCanvas.height = 128;
    const paint = jerseyCanvas.getContext("2d");
    if (paint) {
      const band = (y: number, color: string) => { paint.fillStyle = color; paint.beginPath(); paint.moveTo(0, y); paint.lineTo(32, y + 18); paint.lineTo(64, y); paint.lineTo(64, 128); paint.lineTo(0, 128); paint.fill(); };
      paint.fillStyle = "#ffffff"; paint.fillRect(0, 0, 64, 128);
      band(56, "#6f8f96"); band(68, "#4d767f"); band(80, "#2f6470"); band(92, "#185663"); band(104, "#0b4654");
      paint.fillStyle = "#c9974a"; paint.fillRect(10, 40, 44, 5);
      paint.fillStyle = "#0b3a45"; paint.fillRect(0, 64, 5, 64); paint.fillRect(59, 64, 5, 64);
      paint.fillStyle = "#15191b"; paint.fillRect(0, 120, 64, 8);
    }
    const jerseyTexture = new THREE.CanvasTexture(jerseyCanvas);
    jerseyTexture.colorSpace = THREE.SRGBColorSpace;
    const kit = new THREE.MeshStandardMaterial({ map: jerseyTexture, roughness: 0.85 }); materials.push(kit);
    const skin = material("#d7a887"), shorts = material("#15191b"), bikeFrame = material("#e6e9e6"), tyre = material("#1b1f22"), gold = material("#c9974a"), white = material("#f4f5f1"), helmet = material("#004653");
    type Part = { mesh: THREE.InstancedMesh; x: number; y: number; z: number; sx: number; sy: number; sz: number; rx: number; rz: number; pedal?: number };
    const parts: Part[] = [];
    const addPart = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0, pedal?: number) => {
      const mesh = new THREE.InstancedMesh(g, m, riderCount); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh);
      parts.push({ mesh, x, y, z, sx, sy, sz, rx, rz, pedal });
    };
    addPart(wheelGeo, tyre, 0, 0.36, -0.58);
    addPart(wheelGeo, tyre, 0, 0.36, 0.58);
    // Torus default normal is Z; rotate the geometry once into bicycle wheel planes.
    wheelGeo.rotateY(Math.PI / 2);
    addPart(tubeGeo, bikeFrame, 0, 0.55, 0, 1, 1.2, 1, Math.PI / 2);
    addPart(tubeGeo, bikeFrame, 0, 0.65, -0.48, 1, 0.65, 1, -0.3);
    addPart(tubeGeo, bikeFrame, 0, 0.69, 0.18, 1, 0.7, 1, 0.5);
    addPart(bodyGeo, kit, 0, 1.15, 0.04, 1, 1, 1, 0.3);
    addPart(bodyGeo, gold, 0, 1.3, -0.3, 0.45, 0.14, 0.1, 0.3);
    addPart(helmetGeo, helmet, 0, 1.43, -0.4, 1, 0.8, 1.2);
    // Arms run from the shoulder (top) down to the bars; the sleeve covers the top part.
    const arm = -0.6, along = (t: number) => [Math.cos(arm) * t, Math.sin(arm) * t] as const;
    for (const side of [-1, 1]) {
      addPart(tubeGeo, skin, side * 0.2, 1.0, -0.43, 1, 0.42, 1, arm);
      const [sy, sz] = along(0.13), [cy, cz] = along(0.05);
      addPart(tubeGeo, white, side * 0.2, 1.0 + sy, -0.43 + sz, 1.6, 0.17, 1.6, arm);
      addPart(tubeGeo, gold, side * 0.2, 1.0 + cy, -0.43 + cz, 1.65, 0.035, 1.65, arm);
      addPart(tubeGeo, shorts, side * 0.13, 0.72, 0.14, 1.6, 0.55, 1.6, 0.5, 0, side);
    }
    const playerMarker = new THREE.Mesh(geometry(new THREE.RingGeometry(0.8, 0.97, 24)), new THREE.MeshBasicMaterial({ color: "#d2a95f", side: THREE.DoubleSide }));
    materials.push(playerMarker.material); playerMarker.rotation.x = -Math.PI / 2; scene.add(playerMarker);
    const helperMarkers = new THREE.InstancedMesh(geometry(new THREE.RingGeometry(0.6, 0.72, 20)), material("#8fc4cc"), riderCount);
    helperMarkers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); helperMarkers.frustumCulled = false; scene.add(helperMarkers);
    const parent = new THREE.Object3D(), local = new THREE.Object3D(), matrix = new THREE.Matrix4();
    const desiredCamera = new THREE.Vector3(), look = new THREE.Vector3();
    const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame = 0, initialized = false, disposed = false;
    const displayed = new Map<string, { distance: number; lane: number }>();
    let displayedTick = latest.current.state.tick;
    const render = () => {
      if (disposed) return;
      const current = latest.current;
      displayedTick += (current.state.tick - displayedTick) * 0.3;
      for (const r of current.state.riders) {
        const prior = displayed.get(r.rider.id);
        displayed.set(r.rider.id, prior && Math.abs(prior.distance - r.distance) < 30
          ? { distance: prior.distance + (r.distance - prior.distance) * 0.3, lane: prior.lane + (r.lane - prior.lane) * 0.3 }
          : { distance: r.distance, lane: r.lane });
      }
      const me = current.state.riders.find((r) => r.rider.id === current.state.config.playerId)!;
      const focus = Math.min(displayed.get(me.rider.id)!.distance, course.length + 10);
      const focusY = worldY(focus), focusX = bend(focus);
      desiredCamera.set(focusX + (current.overview ? 20 : 7), focusY + (current.overview ? 45 : 7), -focus + (current.overview ? 40 : 14));
      camera.position.lerp(desiredCamera, initialized ? 0.08 : 1); initialized = true;
      look.set(bend(focus + 16), worldY(focus + 16) + 1, -focus - 16); camera.lookAt(look);
      current.state.riders.forEach((r, i) => {
        const position = displayed.get(r.rider.id)!;
        const d = Math.min(position.distance, course.length + 6 + i * 0.1);
        parent.position.set(bend(d) + position.lane, worldY(d), -d);
        parent.rotation.set(-Math.atan(terrainGrade(d)), -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0);
        parent.scale.setScalar(r.rider.id === current.state.config.playerId ? 1.15 : 1);
        parent.updateMatrix();
        const helping = r.captainId === current.state.config.playerId;
        dummy.position.set(bend(d) + position.lane, worldY(d) + 0.035, -d); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.setScalar(helping ? 1 : 0); dummy.updateMatrix(); helperMarkers.setMatrixAt(i, dummy.matrix);
        for (const part of parts) {
          local.position.set(part.x, part.y, part.z);
          local.rotation.set(part.rx + (part.pedal ? Math.sin(displayedTick * 0.5 + i) * 0.55 * part.pedal : 0), 0, part.rz);
          local.scale.set(part.sx, part.sy, part.sz); local.updateMatrix(); matrix.multiplyMatrices(parent.matrix, local.matrix); part.mesh.setMatrixAt(i, matrix);
        }
      });
      for (const part of parts) part.mesh.instanceMatrix.needsUpdate = true;
      helperMarkers.instanceMatrix.needsUpdate = true;
      playerMarker.position.set(focusX + displayed.get(me.rider.id)!.lane, focusY + 0.04, -focus);
      if (!document.hidden) renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    const terrainGrade = (d: number) => (worldY(d + 1) - worldY(d - 1)) / 2;
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      parts.forEach((part) => part.mesh.dispose()); markers.dispose(); trees.dispose(); helperMarkers.dispose(); jerseyTexture.dispose();
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [courseId, riderCount, lowQuality]);
  return <div ref={host} style={{ position: "absolute", inset: 0 }}>
    {failed && <div style={{ position: "absolute", inset: 0, background: "#0b3a45", display: "grid", placeItems: "center", color: "white", padding: 24 }} role="status">3D is niet beschikbaar. Gebruik het koersoverzicht en de bediening.</div>}
  </div>;
}
