import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * The peloton's riders and bikes. Rider-local frame: x to the right, y up, z backwards
 * (the bike rides towards −z), in metres. Every part is one InstancedMesh across the
 * whole field, so the draw count does not grow with the number of riders.
 */

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const BB = v(0, 0.27, 0.07);
export const CRANK = 0.17;
export const THIGH = 0.43, SHIN = 0.45, UPPER_ARM = 0.3, FOREARM = 0.3;
const PEDAL_X = 0.12, HIP_X = 0.09, SHOULDER_X = 0.18;
// The ankle sits a little above and behind the pedal spindle (ball of the foot on the pedal).
const ANKLE = v(0, 0.06, 0.035);

/** Upper body per riding position. Hands: right hand; the left one mirrors it. */
const HOODS = { hip: v(0, 0.97, 0.27), shoulder: v(0, 1.35, -0.17), head: v(0, 1.49, -0.31), hand: v(0.2, 0.89, -0.5) };
const TUCK = { hip: v(0, 0.97, 0.24), shoulder: v(0, 1.17, -0.23), head: v(0, 1.27, -0.39), hand: v(0.19, 0.76, -0.46) };
const STAND = { hip: v(0, 1.0, 0.1), shoulder: v(0, 1.4, -0.32), head: v(0, 1.54, -0.45), hand: v(0.2, 0.89, -0.5) };
type Key = keyof typeof HOODS;
const KEYS: Key[] = ["hip", "shoulder", "head", "hand"];
const TO_TUCK = Object.fromEntries(KEYS.map((k) => [k, TUCK[k].clone().sub(HOODS[k])])) as Record<Key, THREE.Vector3>;
const TO_STAND = Object.fromEntries(KEYS.map((k) => [k, STAND[k].clone().sub(HOODS[k])])) as Record<Key, THREE.Vector3>;

type Side = { hip: THREE.Vector3; knee: THREE.Vector3; ankle: THREE.Vector3; pedal: THREE.Vector3; shoulder: THREE.Vector3; elbow: THREE.Vector3; hand: THREE.Vector3 };
export type Pose = { hip: THREE.Vector3; shoulder: THREE.Vector3; head: THREE.Vector3; crank: number; sides: [Side, Side] };

const side = (): Side => ({ hip: v(0, 0, 0), knee: v(0, 0, 0), ankle: v(0, 0, 0), pedal: v(0, 0, 0), shoulder: v(0, 0, 0), elbow: v(0, 0, 0), hand: v(0, 0, 0) });
export const createPose = (): Pose => ({ hip: v(0, 0, 0), shoulder: v(0, 0, 0), head: v(0, 0, 0), crank: 0, sides: [side(), side()] });

/**
 * Two-bone joint (knee, elbow) in the bike's side plane. The joint bends forward for a
 * leg (bend 1) and backwards for an arm (bend −1). An end out of reach straightens the limb.
 */
function bendJoint(out: THREE.Vector3, from: THREE.Vector3, to: THREE.Vector3, a: number, b: number, bend: 1 | -1) {
  const dy = to.y - from.y, dz = to.z - from.z, flat = Math.hypot(dy, dz) || 1e-6;
  const d = Math.min(a + b - 1e-4, Math.max(Math.abs(a - b) + 1e-4, flat));
  const uy = dy / flat, uz = dz / flat;
  const cos = (a * a + d * d - b * b) / (2 * a * d), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  out.set(from.x + (to.x - from.x) * (a / (a + b)), from.y + a * (cos * uy - sin * uz * bend), from.z + a * (cos * uz + sin * uy * bend));
}

/** tuck and stand are 0–1 blends from riding on the hoods; crank is the right crank angle (0 = up). */
export function solvePose(pose: Pose, tuck: number, stand: number, crank: number) {
  const blend = (out: THREE.Vector3, key: Key) => out.copy(HOODS[key]).addScaledVector(TO_TUCK[key], tuck).addScaledVector(TO_STAND[key], stand);
  blend(pose.hip, "hip"); blend(pose.shoulder, "shoulder"); blend(pose.head, "head");
  pose.crank = crank;
  pose.sides.forEach((s, index) => {
    const sign = index ? -1 : 1, angle = crank + (index ? Math.PI : 0);
    s.pedal.set(sign * PEDAL_X, BB.y + CRANK * Math.cos(angle), BB.z - CRANK * Math.sin(angle));
    s.ankle.copy(s.pedal).add(ANKLE);
    s.hip.set(sign * HIP_X, pose.hip.y, pose.hip.z);
    bendJoint(s.knee, s.hip, s.ankle, THIGH, SHIN, 1);
    s.shoulder.set(sign * SHOULDER_X, pose.shoulder.y, pose.shoulder.z);
    blend(s.hand, "hand"); s.hand.x *= sign;
    bendJoint(s.elbow, s.shoulder, s.hand, UPPER_ARM, FOREARM, -1);
    // Elbows point a little outwards.
    s.elbow.x += sign * 0.03;
  });
  return pose;
}

/** Club jersey: white shoulders, petrol body with slate chevrons, gold collar, dark side panels. */
function jerseyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64; canvas.height = 128;
  const paint = canvas.getContext("2d");
  if (paint) {
    const band = (y: number, color: string) => { paint.fillStyle = color; paint.beginPath(); paint.moveTo(0, y); paint.lineTo(32, y + 18); paint.lineTo(64, y); paint.lineTo(64, 128); paint.lineTo(0, 128); paint.fill(); };
    paint.fillStyle = "#ffffff"; paint.fillRect(0, 0, 64, 128);
    band(56, "#6f8f96"); band(68, "#4d767f"); band(80, "#2f6470"); band(92, "#185663"); band(104, "#0b4654");
    paint.fillStyle = "#c9974a"; paint.fillRect(0, 22, 64, 4);
    paint.fillStyle = "#0b3a45"; paint.fillRect(14, 64, 4, 64); paint.fillRect(46, 64, 4, 64);
    paint.fillStyle = "#15191b"; paint.fillRect(0, 118, 64, 10);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One bike, merged into a single geometry with vertex colours. White parts take the team colour. */
function bikeGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const paint = (g: THREE.BufferGeometry, color: string) => {
    const c = new THREE.Color(color), count = g.getAttribute("position").count, colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  };
  const up = v(0, 1, 0);
  const tube = (a: THREE.Vector3, b: THREE.Vector3, r: number, color: string) => {
    const dir = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, dir.length(), 6, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    paint(g, color);
  };
  const frame = "#ffffff", dark = "#20262a", carbon = "#2c3337", tyre = "#16191b";
  const rear = v(0, 0.335, 0.5), front = v(0, 0.335, -0.5);
  const seatTop = v(0, 0.8, 0.23), headTop = v(0, 0.8, -0.4), headBottom = v(0, 0.66, -0.44), bar = v(0, 0.86, -0.47);
  for (const axle of [rear, front]) {
    const t = new THREE.TorusGeometry(0.315, 0.022, 6, 32); t.rotateY(Math.PI / 2); t.translate(axle.x, axle.y, axle.z); paint(t, tyre);
    // Deep carbon rims: race wheels, and they read well from behind the bunch.
    const rim = new THREE.CylinderGeometry(0.3, 0.3, 0.024, 32, 1, true); rim.rotateZ(Math.PI / 2); rim.translate(axle.x, axle.y, axle.z); paint(rim, carbon);
    const disc = new THREE.RingGeometry(0.23, 0.3, 32); disc.rotateY(Math.PI / 2); disc.translate(axle.x + 0.012, axle.y, axle.z); paint(disc, carbon);
    const discBack = new THREE.RingGeometry(0.23, 0.3, 32); discBack.rotateY(-Math.PI / 2); discBack.translate(axle.x - 0.012, axle.y, axle.z); paint(discBack, carbon);
    const hub = new THREE.CylinderGeometry(0.025, 0.025, 0.11, 8); hub.rotateZ(Math.PI / 2); hub.translate(axle.x, axle.y, axle.z); paint(hub, dark);
  }
  tube(BB, seatTop, 0.022, frame);
  tube(seatTop, headTop, 0.02, frame);
  tube(BB, headBottom, 0.028, frame);
  tube(headBottom, headTop.clone().add(v(0, 0.02, 0.01)), 0.03, frame);
  for (const x of [-0.045, 0.045]) {
    tube(v(x * 0.6, BB.y, BB.z), v(x, rear.y, rear.z), 0.014, frame);
    tube(v(x * 0.4, seatTop.y - 0.02, seatTop.z), v(x, rear.y, rear.z), 0.012, frame);
    tube(v(x * 0.5, headBottom.y, headBottom.z), v(x, front.y, front.z), 0.016, frame);
  }
  tube(seatTop, v(0, 0.88, 0.27), 0.015, dark);
  const saddle = new THREE.BoxGeometry(0.11, 0.035, 0.26); saddle.rotateX(0.04); saddle.translate(0, 0.9, 0.29); paint(saddle, dark);
  tube(headTop, bar, 0.018, dark);
  tube(v(-0.21, bar.y, bar.z), v(0.21, bar.y, bar.z), 0.016, dark);
  for (const x of [-0.2, 0.2]) {
    tube(v(x, bar.y, bar.z), v(x, 0.89, -0.53), 0.018, dark);
    tube(v(x, bar.y, bar.z), v(x, 0.8, -0.55), 0.016, dark);
    tube(v(x, 0.8, -0.55), v(x, 0.74, -0.5), 0.016, dark);
    tube(v(x, 0.74, -0.5), v(x, 0.74, -0.43), 0.016, dark);
  }
  const ring = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 24); ring.rotateZ(Math.PI / 2); ring.translate(0.055, BB.y, BB.z); paint(ring, "#5b6268");
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

/** A limb or tube from a to b: the unit geometry runs from y = 0 to y = 1. */
const limb = (r0: number, r1: number) => new THREE.CylinderGeometry(r1, r0, 1, 8, 1).translate(0, 0.5, 0);

export type RiderLook = { kit: string; helmet: string; skin: string };

export function createPeloton(scene: THREE.Scene, count: number) {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const meshes: THREE.InstancedMesh[] = [];
  const texture = jerseyTexture();
  const standard = (params: THREE.MeshStandardMaterialParameters) => { const m = new THREE.MeshStandardMaterial(params); materials.push(m); return m; };
  const instanced = (g: THREE.BufferGeometry, m: THREE.Material) => {
    geometries.push(g);
    const mesh = new THREE.InstancedMesh(g, m, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = true;
    scene.add(mesh); meshes.push(mesh); return mesh;
  };
  const tinted = { roughness: 0.75, color: "#ffffff" };
  const bike = instanced(bikeGeometry(), standard({ vertexColors: true, roughness: 0.45, metalness: 0.1 }));
  // The capsule's seam faces forward, so the chevrons point down on the rider's back.
  const torsoGeo = new THREE.CapsuleGeometry(0.14, 0.32, 4, 14).rotateY(Math.PI).translate(0, 0.3, 0);
  const torso = instanced(torsoGeo, standard({ ...tinted, map: texture }));
  const kitMat = standard(tinted), skinMat = standard({ color: "#ffffff", roughness: 0.7 }), shorts = standard({ color: "#15191b", roughness: 0.8 });
  const sleeves = [instanced(limb(0.058, 0.046), kitMat), instanced(limb(0.058, 0.046), kitMat)];
  const forearms = [instanced(limb(0.04, 0.032), skinMat), instanced(limb(0.04, 0.032), skinMat)];
  const thighs = [instanced(limb(0.078, 0.052), shorts), instanced(limb(0.078, 0.052), shorts)];
  const shins = [instanced(limb(0.05, 0.032), skinMat), instanced(limb(0.05, 0.032), skinMat)];
  const shoeGeo = () => new THREE.BoxGeometry(0.085, 0.06, 0.25).translate(0, 0.035, 0.05);
  const shoeMat = standard({ color: "#f2f2ee", roughness: 0.5 });
  const shoes = [instanced(shoeGeo(), shoeMat), instanced(shoeGeo(), shoeMat)];
  const crankMat = standard({ color: "#2b3034", roughness: 0.4, metalness: 0.4 });
  const cranks = [instanced(limb(0.013, 0.013), crankMat), instanced(limb(0.013, 0.013), crankMat)];
  const neck = instanced(limb(0.05, 0.045), skinMat);
  const head = instanced(new THREE.SphereGeometry(0.1, 14, 10), skinMat);
  const helmetGeo = new THREE.SphereGeometry(0.118, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).scale(0.95, 0.78, 1.35);
  const helmet = instanced(helmetGeo, standard({ color: "#ffffff", roughness: 0.35 }));

  const tint = new THREE.Color();
  const dress = (i: number, look: RiderLook) => {
    for (const mesh of [torso, ...sleeves]) mesh.setColorAt(i, tint.set(look.kit));
    for (const mesh of [...forearms, ...shins, neck, head]) mesh.setColorAt(i, tint.set(look.skin));
    helmet.setColorAt(i, tint.set(look.helmet));
    bike.setColorAt(i, tint.set(look.helmet));
  };

  const pose = createPose();
  const up = v(0, 1, 0), dir = v(0, 0, 0), scale = v(1, 1, 1), quat = new THREE.Quaternion(), local = new THREE.Matrix4(), world = new THREE.Matrix4();
  const euler = new THREE.Euler(), offset = v(0, 0, 0), helmetLift = v(0, 0.02, 0.025);
  let index = 0, parentMatrix = world;
  const put = (mesh: THREE.InstancedMesh) => mesh.setMatrixAt(index, world.multiplyMatrices(parentMatrix, local));
  const bone = (mesh: THREE.InstancedMesh, a: THREE.Vector3, b: THREE.Vector3, unit = 1, sx = 1, sz = 1) => {
    dir.subVectors(b, a); const length = dir.length() || 1e-6;
    quat.setFromUnitVectors(up, dir.divideScalar(length));
    local.compose(a, quat, scale.set(sx, length / unit, sz)); put(mesh);
  };
  const at = (mesh: THREE.InstancedMesh, position: THREE.Vector3, pitch = 0) => {
    local.compose(position, quat.setFromEuler(euler.set(pitch, 0, 0)), scale.set(1, 1, 1)); put(mesh);
  };

  /** Places rider i: parent is the bike's world matrix on the road. */
  const place = (i: number, parent: THREE.Matrix4, tuck: number, stand: number, crank: number) => {
    index = i; parentMatrix = parent;
    bike.setMatrixAt(i, parent);
    solvePose(pose, tuck, stand, crank);
    bone(torso, pose.hip, pose.shoulder, 0.6, 1.3, 0.85);
    bone(neck, offset.copy(pose.shoulder).lerp(pose.head, 0.25), pose.head);
    at(head, pose.head);
    at(helmet, offset.copy(pose.head).add(helmetLift), 0.12 + tuck * 0.2);
    pose.sides.forEach((s, k) => {
      bone(thighs[k], s.hip, s.knee);
      bone(shins[k], s.knee, s.ankle);
      at(shoes[k], s.pedal, -0.18 * Math.sin(crank + (k ? Math.PI : 0)));
      bone(cranks[k], offset.set(s.pedal.x * 0.65, BB.y, BB.z), s.pedal);
      bone(sleeves[k], s.shoulder, s.elbow);
      bone(forearms[k], s.elbow, s.hand);
    });
  };
  const commit = () => { for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true; };
  const finishDressing = () => { for (const mesh of meshes) if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  const dispose = () => {
    meshes.forEach((mesh) => { scene.remove(mesh); mesh.dispose(); });
    geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); texture.dispose();
  };
  return { dress, finishDressing, place, commit, dispose };
}

/** A few skin tones, picked per rider so the field is not one person copied. */
const SKIN = ["#f1c9a8", "#e0ac88", "#c68e66", "#9a6646", "#6e472f"];
export function skinTone(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SKIN[Math.abs(hash) % SKIN.length];
}
