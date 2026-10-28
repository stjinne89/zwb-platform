"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CHAPTERS, type ChapterId, type ChapterKit } from "@/lib/clubverhaal/chapters";
import { clubJersey, createPeloton, skinTone, type JerseyPainter } from "@/app/(app)/zwbgame/rider-model";
import { createForest, createRidges, groundGeometry, smoothstep } from "@/app/(app)/zwbgame/scenery";

/**
 * The club story's backdrop: the ZWBgame's riders and landscape, without a race.
 * Per chapter a small group in that era's kit rides an endless country road; the
 * group grows with the club. The scene is built once; switching chapters swaps
 * the group (new riders roll in from behind) and eases the camera to that
 * chapter's angle.
 *
 * frame "story": the text sits on the left on a wide screen, so the picture
 * shifts right; on a phone the text sits at the bottom, so it shifts up.
 * frame "hero": the same, a little less.
 */
type Props = { chapter: ChapterId; frame?: "story" | "hero" };

const bend = (d: number) => Math.sin(d / 450) * 35 + Math.sin(d / 180) * 7;
const height = (d: number) => Math.sin(d / 520) * 9 + Math.sin(d / 160) * 2.2;
const LENGTH = 5200;
const START = 300;
const SPEED = 9.5;
const SUN = new THREE.Vector3(0.55, 0.72, -0.42).normalize();
const HORIZON = "#cde2e6";
const SHADOW_REACH = 30;
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

/** Where each rider rides in the group: metres right of and behind the leader. */
const SLOTS: [number, number][] = [[0, 0], [-0.85, 2.1], [0.85, 2.25], [0, 4.3], [-0.85, 6.4], [0.85, 6.55], [0, 8.6]];

/** Camera per chapter in the road's frame: right, up, back (negative is in front), fov. */
const VIEWS: Record<ChapterId, [number, number, number, number]> = {
  // One rider in profile, close by.
  basis: [8.4, 1.9, -1, 36],
  // From behind and to the side, so the Z on the back reads.
  anders: [4.2, 2.6, 7.2, 40],
  // Higher, so the group reads as a group.
  team: [6.2, 4.4, 10.5, 42],
  // In front of the whole bunch, looking back at it.
  nu: [7.6, 3.4, -10, 44],
};

const sideStrips = (paint: CanvasRenderingContext2D, color: string) => {
  paint.fillStyle = color; paint.fillRect(14, 64, 4, 54); paint.fillRect(46, 64, 4, 54);
};

/** The old kits, painted the way rider-model paints the club jersey. */
const JERSEYS: Record<ChapterKit["back"], JerseyPainter> = {
  blanco: (paint) => {
    paint.fillStyle = "#f4f2ec"; paint.fillRect(0, 0, 64, 128);
    paint.fillStyle = "#cfd8d3"; paint.fillRect(0, 22, 64, 3);
    sideStrips(paint, "#dfe3df");
    paint.fillStyle = "#1e2544"; paint.fillRect(0, 118, 64, 10);
  },
  z: (paint) => {
    paint.fillStyle = "#2563eb"; paint.fillRect(0, 0, 64, 128);
    paint.fillStyle = "#91c8ee"; paint.fillRect(0, 0, 64, 40);
    paint.fillStyle = "#f05a8b"; paint.fillRect(0, 40, 64, 6);
    paint.fillStyle = "#facc15"; paint.beginPath(); paint.arc(32, 62, 14, 0, Math.PI * 2); paint.fill();
    paint.fillStyle = "#f05a8b"; paint.font = "900 24px Arial, sans-serif"; paint.textAlign = "center"; paint.textBaseline = "middle"; paint.fillText("Z", 32, 63);
    paint.fillStyle = "#1e2544"; paint.fillRect(0, 118, 64, 10);
  },
  banden: (paint) => {
    paint.fillStyle = "#ffffff"; paint.fillRect(0, 0, 64, 128);
    paint.fillStyle = "#b99453"; paint.fillRect(0, 50, 64, 12);
    paint.fillStyle = "#0f5963"; paint.fillRect(0, 62, 64, 56);
    paint.fillStyle = "#1f6068"; paint.fillRect(0, 84, 64, 4);
    sideStrips(paint, "#0b3f47");
    paint.fillStyle = "#111111"; paint.fillRect(0, 118, 64, 10);
  },
  club: clubJersey,
};

export default function StoryScene({ chapter, frame = "story" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(chapter);
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = chapter; }, [chapter]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const narrowQuery = window.matchMedia("(max-width: 760px)");
    const lowQuality = narrowQuery.matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => setFailed(true)); return; }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON);
    scene.fog = new THREE.Fog(HORIZON, 70, 380);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !lowQuality;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = renderer.domElement.style.height = "100%";
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
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
    const material = (color: string) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }); materials.push(m); return m; };
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
    const sky = new THREE.Mesh(geometry(new THREE.SphereGeometry(450, 32, 16)), new THREE.ShaderMaterial({
      uniforms: { zenith: { value: new THREE.Color("#4f93c6") }, horizon: { value: new THREE.Color(HORIZON) }, glow: { value: new THREE.Color("#fff3d6") }, sun: { value: SUN } },
      vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false, toneMapped: false,
    }));
    materials.push(sky.material); sky.renderOrder = -1; sky.frustumCulled = false; scene.add(sky);
    const worldY = (d: number) => height(Math.max(0, d));
    const track = { bend, height: worldY, length: LENGTH, seed: "clubverhaal" };
    const groundMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true });
    materials.push(groundMaterial);
    const ground = new THREE.Mesh(geometry(groundGeometry(track, lowQuality)), groundMaterial);
    ground.receiveShadow = true; scene.add(ground);
    // Tarmac, verges and edge lines, as in the game.
    const ribbon = (from: number, to: number, lift: number, color: string) => {
      const vertices: number[] = [], own: number[] = [];
      for (let i = 0; i <= Math.ceil((LENGTH + 400) / 10); i++) {
        const d = i * 10 - 100, x = bend(d), y = worldY(d) + lift;
        vertices.push(x + from, y, -d, x + to, y, -d);
        if (i) { const n = i * 2; own.push(n - 2, n - 1, n, n - 1, n + 1, n); }
      }
      const g = geometry(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(own); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, material(color)); mesh.receiveShadow = true; scene.add(mesh);
    };
    ribbon(-4, 4, 0, "#525e60");
    for (const side of [-1, 1]) {
      ribbon(side * 4, side * 5.2, -0.06, "#a39a80");
      ribbon(side * 3.6, side * 3.47, 0.012, "#e7e5d6");
    }
    const dummy = new THREE.Object3D();
    const dashCount = Math.ceil(LENGTH / 12);
    const dashes = new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(0.1, 0.02, 3)), material("#e7e5d6"), dashCount);
    for (let i = 0; i < dashCount; i++) {
      const d = i * 12;
      dummy.position.set(bend(d), worldY(d) + 0.012, -d);
      dummy.rotation.set(0, -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0); dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix);
    }
    dashes.receiveShadow = true; scene.add(dashes);
    const forest = createForest(scene, track, lowQuality);
    const ridges = createRidges(scene, "clubverhaal", HORIZON);

    // One group per chapter, built up front; only the current one is shown.
    const groups = CHAPTERS.map((item) => {
      const peloton = createPeloton(scene, item.riders, JERSEYS[item.kit.back]);
      for (let i = 0; i < item.riders; i++) {
        peloton.dress(i, { kit: "#ffffff", sleeve: item.kit.sleeve, helmet: item.kit.helmet, skin: skinTone(`${item.id}-${i}`) });
      }
      peloton.finishDressing();
      peloton.setVisible(false);
      const centre = SLOTS.slice(0, item.riders).reduce((sum, slot) => sum + slot[1], 0) / item.riders;
      return { id: item.id, count: item.riders, peloton, centre, entry: 0, cranks: Array.from({ length: item.riders }, (_, i) => i * 1.7) };
    });

    // Soft dark patches under the bikes, as in the game.
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
    const blobs = new THREE.InstancedMesh(geometry(new THREE.PlaneGeometry(1, 1)), blobMaterial, SLOTS.length);
    blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); blobs.frustumCulled = false; scene.add(blobs);
    const blobLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.03, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(0.9, 2.1, 1));
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

    const sunRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN).normalize();
    const sunUp = new THREE.Vector3().crossVectors(SUN, sunRight).normalize();
    const texel = (SHADOW_REACH * 2) / sunlight.shadow.mapSize.x;
    const sunTarget = new THREE.Vector3(), snapped = new THREE.Vector3();
    const parent = new THREE.Object3D(), matrix = new THREE.Matrix4();
    const look = new THREE.Vector3(), roadAhead = new THREE.Vector3(), roadRight = new THREE.Vector3();
    const grade = (d: number) => (worldY(d + 1) - worldY(d - 1)) / 2;

    const frameView = () => {
      const { width, height: tall } = element.getBoundingClientRect();
      const narrow = narrowQuery.matches;
      const shift = frame === "story" ? (narrow ? 0.17 : 0.2) : (narrow ? 0.12 : 0.14);
      if (narrow) camera.setViewOffset(width, tall, 0, tall * shift, width, tall);
      else camera.setViewOffset(width, tall, -width * shift, 0, width, tall);
      camera.aspect = width / Math.max(1, tall); camera.updateProjectionMatrix();
    };
    const resize = () => { const { width, height: tall } = element.getBoundingClientRect(); renderer.setSize(width, tall, false); frameView(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    narrowQuery.addEventListener("change", frameView);
    // Off screen (the detail page scrolls past it) the scene does not render.
    let onScreen = true;
    const visibility = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    visibility.observe(element);

    const rig = { right: 0, up: 0, back: 0, fov: 42, centre: 0 };
    let shown = "", distance = START, lastFrame = 0, frameId = 0, disposed = false, initialized = false;
    const render = (now: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(render);
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (!onScreen || document.hidden) return;
      const current = groups.find((group) => group.id === latest.current) ?? groups[0];
      if (current.id !== shown) {
        for (const group of groups) group.peloton.setVisible(group === current);
        // A new group rolls in from behind, unless motion is reduced.
        current.entry = initialized && !still ? 1 : 0;
        shown = current.id;
      }
      if (!still) distance += SPEED * dt;
      if (distance > LENGTH - 300) distance = START;
      current.entry = Math.max(0, current.entry - dt * 0.55);
      const ease = (rate: number) => (initialized ? 1 - Math.exp(-dt * rate) : 1);
      const view = VIEWS[current.id];
      // A slow drift around the group keeps the picture alive.
      const drift = still ? 0 : Math.sin(now / 5200) * 0.14;
      rig.right += (view[0] - rig.right) * ease(1.6); rig.up += (view[1] - rig.up) * ease(1.6);
      rig.back += (view[2] - rig.back) * ease(1.6); rig.fov += (view[3] - rig.fov) * ease(1.6);
      rig.centre += (current.centre - rig.centre) * ease(1.6);
      if (Math.abs(camera.fov - rig.fov) > 0.01) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
      initialized = true;

      const focus = distance - rig.centre, focusX = bend(focus), focusY = worldY(focus);
      const slope = (bend(focus + 10) - bend(focus - 10)) / 20, norm = Math.hypot(slope, 1);
      roadAhead.set(slope / norm, 0, -1 / norm); roadRight.set(1 / norm, 0, slope / norm);
      // A portrait screen sees a narrow slice: the camera steps back so the group still fits.
      const away = camera.aspect < 1 ? Math.min(1.9, camera.aspect ** -0.7) : 1;
      const right = (rig.right * Math.cos(drift) + rig.back * Math.sin(drift)) * away, back = (rig.back * Math.cos(drift) - rig.right * Math.sin(drift)) * away;
      camera.position.set(focusX, focusY + rig.up * away, -focus).addScaledVector(roadRight, right).addScaledVector(roadAhead, -back);
      look.set(bend(focus + 0.5), worldY(focus + 0.5) + 0.95, -focus - 0.5);
      camera.lookAt(look);
      sky.position.copy(camera.position);
      ridges.group.position.set(camera.position.x, focusY - 12, camera.position.z);
      sunTarget.set(focusX, focusY, -focus);
      const a = Math.round(sunTarget.dot(sunRight) / texel) * texel, b = Math.round(sunTarget.dot(sunUp) / texel) * texel;
      snapped.copy(sunRight).multiplyScalar(a).addScaledVector(sunUp, b).addScaledVector(SUN, sunTarget.dot(SUN));
      sunlight.target.position.copy(snapped); sunlight.position.copy(snapped).addScaledVector(SUN, 130);

      const entry = smoothstep(0, 1, current.entry);
      for (let i = 0; i < SLOTS.length; i++) {
        if (i >= current.count) { blobs.setMatrixAt(i, hidden); continue; }
        const [lane, behind] = SLOTS[i];
        // Every rider breathes a little in the group, so it never looks frozen.
        const sway = still ? 0 : Math.sin(now / 1900 + i * 2.3) * 0.12;
        const d = distance - behind - entry * (16 + i * 4) + (still ? 0 : Math.sin(now / 2600 + i) * 0.25);
        const x = bend(d) + lane + sway;
        parent.position.set(x, worldY(d), -d);
        if (!still) current.cranks[i] += dt * (86 + (i % 3) * 4) * Math.PI / 30;
        parent.rotation.set(-Math.atan(grade(d)), -Math.atan((bend(d + 1) - bend(d - 1)) / 2), 0);
        parent.updateMatrix();
        blobs.setMatrixAt(i, matrix.multiplyMatrices(parent.matrix, blobLocal));
        current.peloton.place(i, parent.matrix, 0, 0, current.cranks[i]);
      }
      current.peloton.commit();
      blobs.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
    };
    const lost = (event: Event) => { event.preventDefault(); setFailed(true); };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    frameId = requestAnimationFrame(render);
    return () => {
      disposed = true; cancelAnimationFrame(frameId); observer.disconnect(); visibility.disconnect();
      narrowQuery.removeEventListener("change", frameView);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      for (const group of groups) group.peloton.dispose();
      dashes.dispose(); forest.dispose(); ridges.dispose(); blobs.dispose(); blobTexture.dispose();
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [frame]);
  return (
    <div ref={host} style={{ position: "absolute", inset: 0 }}>
      {failed && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #165e72, #08232a)" }} />}
    </div>
  );
}
