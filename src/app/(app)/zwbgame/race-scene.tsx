"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STEP_SECONDS } from "@/lib/zwbgame/engine";
import { teamTint } from "@/lib/zwbgame/colors";
import { elevationAt } from "@/lib/zwbgame/routes";
import type { RaceState } from "@/lib/zwbgame/types";

/**
 * raised: controls cover the lower part of the screen, so the picture shifts up.
 * stepTicks: simulation steps per shown step (time compression).
 */
type Props = { state: RaceState; overview: boolean; lowQuality: boolean; raised?: boolean; stepTicks?: number };
const bend = (d: number) => Math.sin(d / 450) * 35 + Math.sin(d / 180) * 7;
// Late-morning sun from the right and a little ahead: shadows fall left of the riders, in view.
const SUN = new THREE.Vector3(0.55, 0.72, -0.42).normalize();
const HORIZON = "#cde2e6";
// Half the width of the sun's shadow box around the player, in metres.
const SHADOW_REACH = 42;
const SKY_VERTEX = "varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const SKY_FRAGMENT = `
uniform vec3 zenith; uniform vec3 horizon; uniform vec3 glow; uniform vec3 sun;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float up = max(dir.y, 0.0);
  vec3 color = mix(horizon, zenith, pow(smoothstep(0.0, 0.4, up), 0.6));
  float toSun = max(dot(dir, sun), 0.0);
  color += glow * (pow(toSun, 9.0) * 0.12 + pow(toSun, 90.0) * 0.5 + smoothstep(0.9993, 0.9997, toSun) * 1.4);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

export default function RaceScene({ state, overview, lowQuality, raised = false, stepTicks = 1 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ state, overview, raised, stepTicks });
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = { state, overview, raised, stepTicks }; }, [state, overview, raised, stepTicks]);
  const route = state.route;
  const riderCount = state.riders.length;
  const teamKey = state.riders.map((r) => r.team ?? "").join("");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => setFailed(true)); return; }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON);
    // The fog ends in the sky's horizon colour, so the land fades into the sky without a seam.
    scene.fog = new THREE.Fog(HORIZON, 90, 420);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the club colours true while the sunlit side no longer clips to white.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lowQuality;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "3D-peloton op het parcours");
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    scene.add(new THREE.HemisphereLight(0xdcefff, 0x5f6e3c, 1.5));
    const sunlight = new THREE.DirectionalLight(0xfff0d8, 3.1);
    sunlight.castShadow = !lowQuality;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = sunlight.shadow.camera.bottom = -SHADOW_REACH;
    sunlight.shadow.camera.right = sunlight.shadow.camera.top = SHADOW_REACH;
    sunlight.shadow.camera.near = 1; sunlight.shadow.camera.far = 260;
    sunlight.shadow.bias = -0.0004; sunlight.shadow.normalBias = 0.04; sunlight.shadow.radius = 3;
    scene.add(sunlight, sunlight.target);
    const material = (color: string, flatShading = true) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading }); materials.push(m); return m; };
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
    // A gradient dome that travels with the camera, with a soft glow where the sun stands.
    const sky = new THREE.Mesh(geometry(new THREE.SphereGeometry(450, 32, 16)), new THREE.ShaderMaterial({
      uniforms: { zenith: { value: new THREE.Color("#4f93c6") }, horizon: { value: new THREE.Color(HORIZON) }, glow: { value: new THREE.Color("#fff3d6") }, sun: { value: SUN } },
      vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false, toneMapped: false,
    }));
    materials.push(sky.material); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
    const worldY = (distance: number) => elevationAt(route, Math.max(0, distance));
    const roadVertices: number[] = [], groundVertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= Math.ceil((route.length + 400) / 10); i++) {
      const d = i * 10 - 100, x = bend(d), y = worldY(d);
      roadVertices.push(x - 5, y, -d, x + 5, y, -d);
      groundVertices.push(x - 260, y - 0.18, -d, x + 260, y - 0.18, -d);
      if (i) { const n = i * 2; indices.push(n - 2, n - 1, n, n - 1, n + 1, n); }
    }
    const strip = (vertices: number[], color: string) => {
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, material(color)); mesh.receiveShadow = true; scene.add(mesh);
    };
    strip(groundVertices, "#92b27b");
    strip(roadVertices, "#525e60");
    // Off the tarmac the road changes colour: dirt, gravel, cobbles.
    const surfaceColors: Partial<Record<string, string>> = { dirt: "#8a6a46", gravel: "#9a8a70", cobbles: "#6f6a62", brick: "#7a4b3a", wood: "#7b5a3c", snow: "#e8eef0", grass: "#5d8a45" };
    for (const section of route.rough ?? []) {
      const color = surfaceColors[section.surface];
      if (!color) continue;
      const vertices: number[] = [], own: number[] = [];
      for (let d = section.start, i = 0; d <= section.end; d += 10, i++) {
        vertices.push(bend(d) - 5, worldY(d) + 0.02, -d, bend(d) + 5, worldY(d) + 0.02, -d);
        if (i) { const n = i * 2; own.push(n - 2, n - 1, n, n - 1, n + 1, n); }
      }
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(own); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, material(color)); mesh.receiveShadow = true; scene.add(mesh);
    }
    const dummy = new THREE.Object3D();
    const markerGeo = geometry(new THREE.BoxGeometry(0.11, 0.025, 4));
    // Time runs compressed, so the verge markers are spaced out to keep the picture calm.
    const markerCount = Math.ceil(route.length / 24);
    const markers = new THREE.InstancedMesh(markerGeo, material("#e7e5bd"), markerCount * 2);
    for (let i = 0; i < markerCount; i++) for (let side = 0; side < 2; side++) {
      const d = i * 24;
      dummy.position.set(bend(d) + (side ? 4.5 : -4.5), worldY(d) + 0.025, -d);
      dummy.rotation.set(0, -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); markers.setMatrixAt(i * 2 + side, dummy.matrix);
    }
    scene.add(markers);
    const trees = new THREE.InstancedMesh(geometry(new THREE.ConeGeometry(2.4, 8, 5)), material("#3f7058"), Math.min(lowQuality ? 400 : 900, Math.ceil(route.length / 22)));
    for (let i = 0; i < trees.count; i++) {
      const d = i / trees.count * route.length;
      dummy.position.set(bend(d) + (i % 2 ? -1 : 1) * (10 + (i * 17 % 50)), worldY(d) + 3, -d);
      dummy.rotation.set(0, i, 0); dummy.scale.setScalar(0.7 + (i % 4) * 0.3); dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix);
    }
    trees.castShadow = true; scene.add(trees);
    const finish = new THREE.Group();
    finish.position.set(bend(route.length), worldY(route.length), -route.length);
    for (const x of [-5, 5]) { const pole = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.3, 5, 0.3)), material("#c9974a")); pole.position.set(x, 2.5, 0); finish.add(pole); }
    const banner = new THREE.Mesh(geometry(new THREE.BoxGeometry(10.3, 1, 0.35)), material("#004653")); banner.position.y = 5; finish.add(banner);
    for (let i = 0; i < 20; i++) { const square = new THREE.Mesh(geometry(new THREE.PlaneGeometry(0.5, 1)), material(i % 2 ? "#ffffff" : "#0a2b34")); square.rotation.x = -Math.PI / 2; square.position.set(-4.75 + i * 0.5, 0.04, 0); finish.add(square); }
    finish.traverse((part) => { part.castShadow = part.receiveShadow = true; }); scene.add(finish);
    // Zwift banners: green for a sprint, red for a KOM, petrol for the lap line.
    const arches = [...route.accents.filter((a) => a.banner).map((a) => ({ at: a.end, color: a.kind === "sprint" ? "#3fa34d" : "#c8402f" })), ...route.lapLines.map((at) => ({ at, color: "#0b6b7c" }))];
    for (const arch of arches) {
      const group = new THREE.Group();
      group.position.set(bend(arch.at), worldY(arch.at), -arch.at);
      group.rotation.y = -Math.atan((bend(arch.at + 1) - bend(arch.at - 1)) / 2);
      for (const x of [-5, 5]) { const pole = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.3, 5, 0.3)), material(arch.color)); pole.position.set(x, 2.5, 0); group.add(pole); }
      const top = new THREE.Mesh(geometry(new THREE.BoxGeometry(10.3, 0.9, 0.3)), material(arch.color)); top.position.y = 5; group.add(top);
      group.traverse((part) => { part.castShadow = true; }); scene.add(group);
    }
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
    const skin = material("#d7a887"), shorts = material("#15191b"), bikeFrame = material("#e6e9e6"), tyre = material("#1b1f22"), gold = material("#c9974a"), white = material("#f4f5f1"), helmet = material("#ffffff");
    type Part = { mesh: THREE.InstancedMesh; x: number; y: number; z: number; sx: number; sy: number; sz: number; rx: number; rz: number; pedal?: number };
    const parts: Part[] = [];
    const addPart = (g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0, pedal?: number) => {
      const mesh = new THREE.InstancedMesh(g, m, riderCount); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = true; scene.add(mesh);
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
    const kitPart = parts[parts.length - 1];
    addPart(bodyGeo, gold, 0, 1.3, -0.3, 0.45, 0.14, 0.1, 0.3);
    addPart(helmetGeo, helmet, 0, 1.43, -0.4, 1, 0.8, 1.2);
    const helmetPart = parts[parts.length - 1];
    // Opponents wear their team colour over the club kit.
    const tint = new THREE.Color();
    latest.current.state.riders.forEach((r, i) => {
      kitPart.mesh.setColorAt(i, tint.set(teamTint(r.team).kit));
      helmetPart.mesh.setColorAt(i, tint.set(teamTint(r.team).helmet));
    });
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
    // A soft dark patch under every bike keeps the riders on the road, also without shadow maps.
    const blobCanvas = document.createElement("canvas");
    blobCanvas.width = blobCanvas.height = 64;
    const blobPaint = blobCanvas.getContext("2d");
    if (blobPaint) {
      const fade = blobPaint.createRadialGradient(32, 32, 0, 32, 32, 32);
      fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(0.55, "rgba(0,0,0,0.45)"); fade.addColorStop(1, "rgba(0,0,0,0)");
      blobPaint.fillStyle = fade; blobPaint.fillRect(0, 0, 64, 64);
    }
    const blobTexture = new THREE.CanvasTexture(blobCanvas);
    const blobMaterial = new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity: lowQuality ? 0.6 : 0.28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    materials.push(blobMaterial);
    const blobs = new THREE.InstancedMesh(geometry(new THREE.PlaneGeometry(1, 1)), blobMaterial, riderCount);
    blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); blobs.frustumCulled = false; scene.add(blobs);
    const blobLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.03, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(0.9, 2.1, 1));
    // Snap the shadow box to whole shadow texels so tree and banner shadows do not crawl.
    const sunRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN).normalize();
    const sunUp = new THREE.Vector3().crossVectors(SUN, sunRight).normalize();
    const texel = (SHADOW_REACH * 2) / sunlight.shadow.mapSize.x;
    const sunTarget = new THREE.Vector3(), snapped = new THREE.Vector3();
    const parent = new THREE.Object3D(), local = new THREE.Object3D(), matrix = new THREE.Matrix4();
    const desiredCamera = new THREE.Vector3(), look = new THREE.Vector3();
    let appliedRaise: boolean | null = null;
    const frameView = () => {
      const { width, height } = element.getBoundingClientRect();
      appliedRaise = latest.current.raised;
      if (appliedRaise) camera.setViewOffset(width, height, 0, height * 0.24, width, height); else camera.clearViewOffset();
      camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix();
    };
    const resize = () => { const { width, height } = element.getBoundingClientRect(); renderer.setSize(width, height, false); frameView(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame = 0, initialized = false, disposed = false;
    // The simulation moves in 200 ms steps. Rendering glides from where each rider was
    // shown when a step arrived to its new position over one step, so motion is
    // continuous at any frame rate instead of jumping five times a second.
    type Shown = { from: number; to: number; fromLane: number; toLane: number };
    const displayed = new Map<string, Shown & { distance: number; lane: number }>();
    let lastTick = -1, lastRace = "", tickAt = 0, lastFrame = 0, fromTick = latest.current.state.tick, displayedTick = fromTick;
    const cameraOffset = new THREE.Vector3(7, 7, 14);
    const render = (now: number) => {
      if (disposed) return;
      const current = latest.current;
      if (current.raised !== appliedRaise) frameView();
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      const race = `${current.state.config.seed}:${current.state.config.routeId}:${current.state.riders.length}`;
      if (current.state.tick !== lastTick || race !== lastRace || current.state.riders.some((r) => !displayed.has(r.rider.id))) {
        const jump = lastTick < 0 || race !== lastRace || current.state.tick < lastTick || current.state.tick - lastTick > 10 * current.stepTicks;
        lastRace = race;
        for (const r of current.state.riders) {
          const shown = displayed.get(r.rider.id);
          const reset = jump || !shown || Math.abs(shown.distance - r.distance) > 30 + 15 * current.stepTicks;
          displayed.set(r.rider.id, {
            from: reset ? r.distance : shown.distance, to: r.distance, fromLane: reset ? r.lane : shown.lane, toLane: r.lane,
            distance: reset ? r.distance : shown.distance, lane: reset ? r.lane : shown.lane,
          });
        }
        fromTick = jump ? current.state.tick : displayedTick;
        lastTick = current.state.tick; tickAt = now;
      }
      // A little past 1: a step that lands a frame late must not freeze the picture.
      const alpha = Math.min(1.15, (now - tickAt) / (STEP_SECONDS * 1000));
      displayedTick = fromTick + (current.state.tick - fromTick) * alpha;
      for (const shown of displayed.values()) {
        shown.distance = shown.from + (shown.to - shown.from) * alpha;
        shown.lane = shown.fromLane + (shown.toLane - shown.fromLane) * alpha;
      }
      const me = current.state.riders.find((r) => r.rider.id === current.state.config.playerId)!;
      const focus = Math.min(displayed.get(me.rider.id)!.distance, route.length + 10);
      const focusY = worldY(focus), focusX = bend(focus);
      // Only the camera's offset eases (switching views); following the rider is exact.
      desiredCamera.set(current.overview ? 20 : 8, current.overview ? 45 : 8.5, current.overview ? 40 : 17);
      cameraOffset.lerp(desiredCamera, initialized ? 1 - Math.exp(-dt * 4) : 1); initialized = true;
      camera.position.set(focusX + cameraOffset.x, focusY + cameraOffset.y, -focus + cameraOffset.z);
      look.set(bend(focus + 16), worldY(focus + 16) + 1, -focus - 16); camera.lookAt(look);
      sky.position.copy(camera.position);
      // The shadow box sits a little ahead of the player, where the camera looks.
      sunTarget.set(bend(focus + 12), worldY(focus + 12), -focus - 12);
      const a = Math.round(sunTarget.dot(sunRight) / texel) * texel, b = Math.round(sunTarget.dot(sunUp) / texel) * texel;
      snapped.copy(sunRight).multiplyScalar(a).addScaledVector(sunUp, b).addScaledVector(SUN, sunTarget.dot(SUN));
      sunlight.target.position.copy(snapped); sunlight.position.copy(snapped).addScaledVector(SUN, 130);
      current.state.riders.forEach((r, i) => {
        const position = displayed.get(r.rider.id)!;
        const d = Math.min(position.distance, route.length + 6 + i * 0.1);
        parent.position.set(bend(d) + position.lane, worldY(d), -d);
        parent.rotation.set(-Math.atan(terrainGrade(d)), -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0);
        parent.scale.setScalar(r.rider.id === current.state.config.playerId ? 1.15 : 1);
        parent.updateMatrix();
        const helping = r.team === "own" && r.rider.id !== current.state.config.playerId;
        dummy.position.set(bend(d) + position.lane, worldY(d) + 0.035, -d); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.setScalar(helping ? 1 : 0); dummy.updateMatrix(); helperMarkers.setMatrixAt(i, dummy.matrix);
        blobs.setMatrixAt(i, matrix.multiplyMatrices(parent.matrix, blobLocal));
        for (const part of parts) {
          local.position.set(part.x, part.y, part.z);
          local.rotation.set(part.rx + (part.pedal ? Math.sin(displayedTick * 0.5 + i) * 0.55 * part.pedal : 0), 0, part.rz);
          local.scale.set(part.sx, part.sy, part.sz); local.updateMatrix(); matrix.multiplyMatrices(parent.matrix, local.matrix); part.mesh.setMatrixAt(i, matrix);
        }
      });
      for (const part of parts) part.mesh.instanceMatrix.needsUpdate = true;
      helperMarkers.instanceMatrix.needsUpdate = true; blobs.instanceMatrix.needsUpdate = true;
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
      parts.forEach((part) => part.mesh.dispose()); markers.dispose(); trees.dispose(); helperMarkers.dispose(); blobs.dispose(); jerseyTexture.dispose(); blobTexture.dispose();
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
    // The scene is rebuilt per route and field, not per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id, route.length, riderCount, teamKey, lowQuality]);
  return <div ref={host} style={{ position: "absolute", inset: 0 }}>
    {failed && <div style={{ position: "absolute", inset: 0, background: "#0b3a45", display: "grid", placeItems: "center", color: "white", padding: 24 }} role="status">3D is niet beschikbaar. Gebruik het koersoverzicht en de bediening.</div>}
  </div>;
}
