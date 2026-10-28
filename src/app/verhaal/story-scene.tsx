"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CHAPTERS, type ChapterKit } from "@/lib/clubverhaal/chapters";
import { RIDERS_MAX, type Light, type Pose, type SceneSpec } from "@/lib/clubverhaal/scenes";
import { clubJersey, createPeloton, skinTone, type JerseyPainter, type Mood } from "@/app/(app)/zwbgame/rider-model";
import { createForest, createRidges, groundGeometry, smoothstep } from "@/app/(app)/zwbgame/scenery";

/**
 * The club story's backdrop: the ZWBgame's riders and landscape, without a race.
 * A scene is a few fixed choices (SceneSpec): the kit of an era, what the main
 * rider (rider 0) does, how many ride along, and the light. The 3D world is
 * built once; a new spec swaps the group (new riders roll in from behind),
 * moves to the stretch of road that suits the pose (flat, the finish arch, the
 * climb, the descent) and eases the camera and the light.
 *
 * frame "story": the text sits on the left on a wide screen, so the picture
 * shifts right; on a phone the text sits at the bottom, so it shifts up.
 * frame "hero": the same, a little less. frame "preview": centred.
 */
type Props = { spec: SceneSpec; frame?: "story" | "hero" | "preview" };

const bend = (d: number) => Math.sin(d / 450) * 35 + Math.sin(d / 180) * 7;
// Flat country, then a climb of 110 m (up to 10%), a plateau and the descent back.
const climb = (d: number) => 110 * smoothstep(1900, 3500, d) - 110 * smoothstep(3800, 5400, d);
const height = (d: number) => Math.sin(d / 520) * 4 + Math.sin(d / 160) * 1.2 + climb(d);
const LENGTH = 6000;
/** The finish arch for cheering and sprinting. */
const ARCH = 1320;

/** Per pose: the stretch the leader loops over (metres) and the speed (m/s). */
const STRETCH: Record<Pose, { from: number; to: number; speed: number }> = {
  rijden: { from: 300, to: 1500, speed: 9.5 },
  afzien: { from: 300, to: 1500, speed: 8 },
  juichen: { from: ARCH - 170, to: ARCH + 75, speed: 10 },
  sprinten: { from: ARCH - 190, to: ARCH + 70, speed: 15 },
  klimmen: { from: 2500, to: 2950, speed: 5 },
  afdalen: { from: 4300, to: 5000, speed: 17 },
};

/** Camera in the road's frame: right, up, back (negative is in front), fov; and what it follows. */
type View = { at: [number, number, number, number]; follow: "leader" | "group" };
function viewFor(spec: SceneSpec): View {
  switch (spec.pose) {
    case "juichen": return { at: [2.2, 1.5, -7.5, 38], follow: "leader" };
    case "sprinten": return { at: [2.2, 1.1, -8, 44], follow: "leader" };
    // From behind the one who is dropped, with the group riding away up the road.
    case "afzien": return { at: [3.6, 2.1, 6.5, 42], follow: "leader" };
    case "klimmen": return { at: [6.5, 2.2, 3.5, 40], follow: "leader" };
    case "afdalen": return { at: [3.2, 1.4, -9, 48], follow: "group" };
    default:
      // Riding: in profile alone, from behind as a pair, higher for a group, in front of a bunch.
      if (spec.riders === 1) return { at: [8.4, 1.9, -1, 36], follow: "group" };
      if (spec.riders === 2) return { at: [4.2, 2.6, 7.2, 40], follow: "group" };
      if (spec.riders <= 4) return { at: [6.2, 4.4, 10.5, 42], follow: "group" };
      return { at: [7.6, 3.4, -10, 44], follow: "group" };
  }
}

type LightLook = { zenith: string; horizon: string; glow: string; sun: [number, number, number]; sunColor: string; sunPower: number; sky: string; ground: string; hemi: number; near: number; far: number };
const LIGHTS: Record<Light, LightLook> = {
  // Late-morning sun from the right and a little ahead, as in the game.
  zon: { zenith: "#4f93c6", horizon: "#cde2e6", glow: "#fff3d6", sun: [0.55, 0.72, -0.42], sunColor: "#fff0d8", sunPower: 3.1, sky: "#dcefff", ground: "#5f6e3c", hemi: 1.5, near: 70, far: 380 },
  // Low sun ahead and to the left: long shadows towards the camera.
  avond: { zenith: "#3d5a8a", horizon: "#f2c9a0", glow: "#ffb26b", sun: [-0.5, 0.2, -0.85], sunColor: "#ffb070", sunPower: 2.8, sky: "#ffd9b8", ground: "#5a5340", hemi: 1.45, near: 60, far: 330 },
  // Overcast: flat light, faint shadows, the distance in haze.
  grijs: { zenith: "#8d9aa3", horizon: "#c3cacd", glow: "#000000", sun: [0.3, 0.9, -0.2], sunColor: "#e8eef0", sunPower: 0.9, sky: "#e1e7ea", ground: "#5d6650", hemi: 2.1, near: 35, far: 240 },
};

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

/** Per rider, eased between frames. */
type Motion = { crank: number; tuck: number; stand: number; cheer: number; slump: number };

export default function StoryScene({ spec, frame = "story" }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(spec);
  const [failed, setFailed] = useState(false);
  useEffect(() => { latest.current = spec; }, [spec]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const narrowQuery = window.matchMedia("(max-width: 760px)");
    const lowQuality = narrowQuery.matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: !lowQuality, alpha: false, powerPreference: "low-power" }); }
    catch { queueMicrotask(() => setFailed(true)); return; }
    const look0 = LIGHTS[latest.current.light];
    const scene = new THREE.Scene();
    const horizon = new THREE.Color(look0.horizon);
    scene.background = horizon;
    const fog = new THREE.Fog(horizon, look0.near, look0.far);
    scene.fog = fog;
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
    const hemisphere = new THREE.HemisphereLight(look0.sky, look0.ground, look0.hemi);
    scene.add(hemisphere);
    const sunlight = new THREE.DirectionalLight(look0.sunColor, look0.sunPower);
    sunlight.castShadow = !lowQuality;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.left = sunlight.shadow.camera.bottom = -SHADOW_REACH;
    sunlight.shadow.camera.right = sunlight.shadow.camera.top = SHADOW_REACH;
    sunlight.shadow.camera.near = 1; sunlight.shadow.camera.far = 260;
    sunlight.shadow.bias = -0.0004; sunlight.shadow.normalBias = 0.04; sunlight.shadow.radius = 3;
    scene.add(sunlight, sunlight.target);
    const material = (color: string) => { const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }); materials.push(m); return m; };
    const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g; };
    const sun = new THREE.Vector3(...look0.sun).normalize();
    const skyUniforms = { zenith: { value: new THREE.Color(look0.zenith) }, horizon: { value: horizon }, glow: { value: new THREE.Color(look0.glow) }, sun: { value: sun } };
    const sky = new THREE.Mesh(geometry(new THREE.SphereGeometry(450, 32, 16)), new THREE.ShaderMaterial({
      uniforms: skyUniforms, vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: THREE.BackSide, depthWrite: false, toneMapped: false,
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
    const heading = (d: number) => -Math.atan((bend(d + 1) - bend(d - 1)) / 2);
    const dashCount = Math.ceil(LENGTH / 12);
    const dashes = new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(0.1, 0.02, 3)), material("#e7e5d6"), dashCount);
    for (let i = 0; i < dashCount; i++) {
      const d = i * 12;
      dummy.position.set(bend(d), worldY(d) + 0.012, -d);
      dummy.rotation.set(0, heading(d), 0); dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix);
    }
    dashes.receiveShadow = true; scene.add(dashes);
    const forest = createForest(scene, track, lowQuality);
    // The ridges fade into the horizon colour, so they are rebuilt with the light.
    let ridges = createRidges(scene, "clubverhaal", look0.horizon), ridgeLight = latest.current.light;
    // The finish, as in the game: gold poles, a petrol banner and a chequered line.
    const arch = new THREE.Group();
    arch.position.set(bend(ARCH), worldY(ARCH), -ARCH);
    arch.rotation.y = heading(ARCH);
    for (const x of [-4.4, 4.4]) { const pole = new THREE.Mesh(geometry(new THREE.BoxGeometry(0.28, 4.6, 0.28)), material("#c9974a")); pole.position.set(x, 2.3, 0); arch.add(pole); }
    const banner = new THREE.Mesh(geometry(new THREE.BoxGeometry(9.1, 0.9, 0.3)), material("#004653")); banner.position.y = 4.6; arch.add(banner);
    for (let i = 0; i < 16; i++) { const square = new THREE.Mesh(geometry(new THREE.PlaneGeometry(0.5, 0.8)), material(i % 2 ? "#ffffff" : "#0a2b34")); square.rotation.x = -Math.PI / 2; square.position.set(-3.75 + i * 0.5, 0.03, 0); arch.add(square); }
    arch.traverse((part) => { part.castShadow = part.receiveShadow = true; });
    scene.add(arch);

    // One group of seven per kit, built up front; only the current kit is shown.
    const groups = CHAPTERS.map((item) => {
      const peloton = createPeloton(scene, RIDERS_MAX, JERSEYS[item.kit.back]);
      for (let i = 0; i < RIDERS_MAX; i++) {
        peloton.dress(i, { kit: "#ffffff", sleeve: item.kit.sleeve, helmet: item.kit.helmet, skin: skinTone(`${item.id}-${i}`) });
      }
      peloton.finishDressing();
      peloton.setVisible(false);
      return { kit: item.id, peloton };
    });
    const motion: Motion[] = Array.from({ length: RIDERS_MAX }, (_, i) => ({ crank: i * 1.7, tuck: 0, stand: 0, cheer: 0, slump: 0 }));

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
    const blobs = new THREE.InstancedMesh(geometry(new THREE.PlaneGeometry(1, 1)), blobMaterial, RIDERS_MAX);
    blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); blobs.frustumCulled = false; scene.add(blobs);
    const blobLocal = new THREE.Matrix4().compose(new THREE.Vector3(0, 0.03, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2), new THREE.Vector3(0.9, 2.1, 1));
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);

    const up = new THREE.Vector3(0, 1, 0), sunRight = new THREE.Vector3(), sunUp = new THREE.Vector3();
    const texel = (SHADOW_REACH * 2) / sunlight.shadow.mapSize.x;
    const sunTarget = new THREE.Vector3(), snapped = new THREE.Vector3(), sunGoal = new THREE.Vector3();
    const parent = new THREE.Object3D(), matrix = new THREE.Matrix4();
    const look = new THREE.Vector3(), roadAhead = new THREE.Vector3(), roadRight = new THREE.Vector3();
    const grade = (d: number) => (worldY(d + 1) - worldY(d - 1)) / 2;
    const colour = new THREE.Color();
    const fade = (target: THREE.Color, hex: string, t: number) => target.lerp(colour.set(hex), t);

    const frameView = () => {
      const { width, height: tall } = element.getBoundingClientRect();
      const narrow = narrowQuery.matches;
      const shift = frame === "story" ? (narrow ? 0.17 : 0.2) : frame === "hero" ? (narrow ? 0.12 : 0.14) : 0;
      if (!shift) camera.clearViewOffset();
      else if (narrow) camera.setViewOffset(width, tall, 0, tall * shift, width, tall);
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

    const rig = { right: 0, up: 0, back: 0, fov: 42, focus: 0 };
    let shown: SceneSpec | null = null, entry = 0, distance = STRETCH.rijden.from, lastFrame = 0, frameId = 0, disposed = false, initialized = false;
    const mood: Mood = { cheer: 0, slump: 0 };
    const render = (now: number) => {
      if (disposed) return;
      frameId = requestAnimationFrame(render);
      const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (!onScreen || document.hidden) return;
      const spec = latest.current;
      const stretch = STRETCH[spec.pose];
      if (!shown || shown.kit !== spec.kit || shown.riders !== spec.riders || shown.pose !== spec.pose) {
        for (const group of groups) group.peloton.setVisible(group.kit === spec.kit);
        // Another stretch of road: start near its beginning. A new group rolls in from behind.
        if (!shown || STRETCH[shown.pose] !== stretch) distance = stretch.from + (stretch.to - stretch.from) * 0.15;
        if (shown && (shown.kit !== spec.kit || shown.riders !== spec.riders) && !still) entry = 1;
        shown = spec;
      }
      if (spec.light !== ridgeLight) {
        ridges.dispose();
        ridges = createRidges(scene, "clubverhaal", LIGHTS[spec.light].horizon);
        ridgeLight = spec.light;
      }
      const ease = (rate: number) => (initialized ? 1 - Math.exp(-dt * rate) : 1);
      if (!still) distance += stretch.speed * dt;
      if (distance > stretch.to) distance = stretch.from;
      entry = Math.max(0, entry - dt * 0.55);

      // Light: everything eases to the chosen look.
      const light = LIGHTS[spec.light], t = ease(1.2);
      fade(horizon, light.horizon, t); fade(skyUniforms.zenith.value, light.zenith, t); fade(skyUniforms.glow.value, light.glow, t);
      fade(sunlight.color, light.sunColor, t); fade(hemisphere.color, light.sky, t); fade(hemisphere.groundColor, light.ground, t);
      sunlight.intensity += (light.sunPower - sunlight.intensity) * t; hemisphere.intensity += (light.hemi - hemisphere.intensity) * t;
      fog.near += (light.near - fog.near) * t; fog.far += (light.far - fog.far) * t;
      sun.lerp(sunGoal.set(...light.sun).normalize(), t).normalize();

      // Where everyone rides: the leader (rider 0) is the one the story is about.
      const count = spec.riders, progress = (distance - stretch.from) / (stretch.to - stretch.from);
      const place = (i: number): [number, number] => {
        const [lane, behind] = SLOTS[i];
        if (spec.pose === "juichen") return i ? [lane, behind + 7] : [0, 0];
        if (spec.pose === "afzien") {
          // The others ride on; the leader slowly drops off the back.
          if (!i) return [0.3, count > 1 ? SLOTS[count - 1][1] + 2.5 + progress * 14 : 0];
          return SLOTS[i - 1];
        }
        if (spec.pose === "sprinten") return i ? [lane * 1.6, behind * 0.7 + 1.2] : [0, 0];
        return [lane, behind];
      };
      let centre = 0;
      for (let i = 0; i < count; i++) centre += place(i)[1];
      centre /= count;
      const view = viewFor(spec);
      rig.right += (view.at[0] - rig.right) * ease(1.6); rig.up += (view.at[1] - rig.up) * ease(1.6);
      rig.back += (view.at[2] - rig.back) * ease(1.6); rig.fov += (view.at[3] - rig.fov) * ease(1.6);
      rig.focus += ((view.follow === "leader" ? place(0)[1] : centre) - rig.focus) * ease(1.6);
      if (Math.abs(camera.fov - rig.fov) > 0.01) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
      initialized = true;

      // A slow drift around the riders keeps the picture alive.
      const drift = still ? 0 : Math.sin(now / 5200) * 0.12;
      const focus = distance - rig.focus, focusX = bend(focus), focusY = worldY(focus);
      const slope = (bend(focus + 10) - bend(focus - 10)) / 20, norm = Math.hypot(slope, 1);
      roadAhead.set(slope / norm, 0, -1 / norm); roadRight.set(1 / norm, 0, slope / norm);
      // A portrait screen sees a narrow slice: the camera steps back so the riders still fit.
      const away = (camera.aspect < 1 ? Math.min(1.9, camera.aspect ** -0.7) : 1) * (1 + (count - 1) * 0.04);
      const right = (rig.right * Math.cos(drift) + rig.back * Math.sin(drift)) * away, back = (rig.back * Math.cos(drift) - rig.right * Math.sin(drift)) * away;
      camera.position.set(focusX, focusY + rig.up * away, -focus).addScaledVector(roadRight, right).addScaledVector(roadAhead, -back);
      // On a climb or descent the ground under the camera differs from the road at the riders.
      camera.position.y = Math.max(camera.position.y, worldY(focus - back) + 0.8);
      look.set(bend(focus + 0.5), worldY(focus + 0.5) + 0.95, -focus - 0.5);
      camera.lookAt(look);
      sky.position.copy(camera.position);
      ridges.group.position.set(camera.position.x, focusY - 12, camera.position.z);
      sunRight.crossVectors(up, sun).normalize(); sunUp.crossVectors(sun, sunRight).normalize();
      sunTarget.set(focusX, focusY, -focus);
      const a = Math.round(sunTarget.dot(sunRight) / texel) * texel, b = Math.round(sunTarget.dot(sunUp) / texel) * texel;
      snapped.copy(sunRight).multiplyScalar(a).addScaledVector(sunUp, b).addScaledVector(sun, sunTarget.dot(sun));
      sunlight.target.position.copy(snapped); sunlight.position.copy(snapped).addScaledVector(sun, 130);
      arch.visible = spec.pose === "juichen" || spec.pose === "sprinten";

      const current = groups.find((group) => group.kit === spec.kit) ?? groups[0];
      const rolledIn = smoothstep(0, 1, entry);
      const toLine = distance - ARCH;
      for (let i = 0; i < RIDERS_MAX; i++) {
        if (i >= count) { blobs.setMatrixAt(i, hidden); current.peloton.place(i, hidden, 0, 0, 0); continue; }
        const [lane, behind] = place(i);
        const m = motion[i], leader = i === 0;
        // What this rider does now, per pose.
        let tuck = 0, stand = 0, cheer = 0, slump = 0, rpm = 86 + (i % 3) * 4;
        if (spec.pose === "afdalen") { tuck = 1; rpm = 0; }
        if (spec.pose === "klimmen") { rpm = 70; stand = leader && Math.sin(now / 2600) > 0.25 ? 1 : 0; }
        if (spec.pose === "sprinten") { stand = toLine < 2 ? (leader ? 1 : 0.8) : 0; rpm = toLine < 2 ? 112 : 30; cheer = leader ? smoothstep(2, 10, toLine) : 0; }
        if (spec.pose === "juichen" && leader) { cheer = smoothstep(-30, -12, toLine); rpm = cheer > 0.5 ? 0 : 84; }
        if (spec.pose === "afzien" && leader) { slump = 1; rpm = 60; }
        const blend = 1 - Math.exp(-dt * 5);
        m.tuck += (tuck - m.tuck) * blend; m.stand += (stand - m.stand) * blend;
        m.cheer += (cheer - m.cheer) * (1 - Math.exp(-dt * 3)); m.slump += (slump - m.slump) * blend;
        if (!still) m.crank += dt * rpm * Math.PI / 30;
        // Every rider breathes a little in the group, so it never looks frozen.
        const sway = still ? 0 : Math.sin(now / 1900 + i * 2.3) * (leader && m.slump > 0.5 ? 0.25 : 0.12);
        const d = distance - behind - rolledIn * (16 + i * 4) + (still ? 0 : Math.sin(now / 2600 + i) * 0.25);
        parent.position.set(bend(d) + lane + sway, worldY(d), -d);
        // Out of the saddle the bike rocks; hanging over the bars it wobbles.
        const roll = Math.sin(m.crank) * (0.12 * m.stand + 0.05 * m.slump);
        parent.rotation.set(-Math.atan(grade(d)), heading(d), roll);
        parent.updateMatrix();
        blobs.setMatrixAt(i, matrix.multiplyMatrices(parent.matrix, blobLocal));
        mood.cheer = m.cheer; mood.slump = m.slump;
        current.peloton.place(i, parent.matrix, m.tuck, m.stand, m.crank, mood);
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
