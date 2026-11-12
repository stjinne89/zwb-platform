import { elevationAt, gradeAt, surfaceAt } from "../engine/course";
import { groupsOf, kopmanOf, laneOf, riding, type RaceState, type Rider } from "../engine/race";
import { hashSeed } from "../engine/rng";
import { PLAYER_TEAM, type Surface } from "../engine/types";

/**
 * The race seen from the camera bike: pure geometry for chase-view.tsx. The
 * engine only knows how far along the course a rider is, so the bends and
 * where a rider rides across the road are made up here, from the seed and
 * from his place in the group. Nothing here feeds back into the race.
 */

/** Metres the camera rides behind the rider it follows, and how far ahead it draws. */
export const CAMERA_BACK = 9;
export const VIEW_AHEAD = 170;
export const ROAD_HALF = 3.6;
const CAMERA_HEIGHT = 2.3;
/** Climbs drawn a little steeper than they are, so a 5 % slope reads as a slope. */
const RELIEF = 1.6;

export type Bend = { amp: number; wave: number; phase: number }[];

/**
 * The road's sideways course, seeded per race: two long waves. A sector of
 * several kilometres rides past in a few seconds, so a bend has to last
 * kilometres to sway rather than shake. What you see of it is the curvature,
 * amp / wave², about one road width of bend over the visible stretch.
 */
export function bendsFor(raceId: string, seed: number): Bend {
  const h = (salt: string) => (hashSeed(seed, raceId, salt) % 10000) / 10000;
  return [
    { amp: 650 + h("a1") * 300, wave: 950 + h("w1") * 350, phase: h("p1") * Math.PI * 2 },
    { amp: 150 + h("a2") * 110, wave: 430 + h("w2") * 170, phase: h("p2") * Math.PI * 2 },
  ];
}

const sideOf = (bend: Bend, s: number) => bend.reduce((x, b) => x + b.amp * Math.sin(s / b.wave + b.phase), 0);

/** The road's centre at `z` metres ahead, in the camera's frame: the camera looks along the road. */
export function roadX(bend: Bend, cam: number, z: number) {
  const slope = (sideOf(bend, cam + 1) - sideOf(bend, cam - 1)) / 2;
  return sideOf(bend, cam + z) - sideOf(bend, cam) - slope * z;
}

/** How much the camera tilts with the slope it is on, as a camera on a motorbike does. */
const PITCH = 0.55;
/** The steepest a slope is drawn, relative to the camera: a wall still reads as a wall but stays in the frame. */
const MAX_SLOPE = 0.16;

export function roadY(state: RaceState, cam: number, z: number) {
  const here = Math.max(0, Math.min(state.course.length - 1, cam));
  const at = Math.min(state.course.length, Math.max(0, cam + z));
  const rise = (elevationAt(state.course, at) - elevationAt(state.course, here)) * RELIEF - gradeAt(state.course, here) * RELIEF * PITCH * z;
  return Math.max(-MAX_SLOPE * z, Math.min(MAX_SLOPE * z, rise));
}

export function surfaceAhead(state: RaceState, cam: number, z: number): Surface {
  const at = cam + z;
  return at < 0 || at >= state.course.length ? "asfalt" : surfaceAt(state.course, at);
}

/** The rider the camera follows: your kopman, or the leader once he is out of the race. */
export function cameraRider(state: RaceState): Rider {
  const k = kopmanOf(state, PLAYER_TEAM);
  if (k && (riding(k) || k.finishTime !== null)) return k;
  return state.riders.reduce((a, b) => (b.distance > a.distance ? b : a), state.riders[0]);
}

export function cameraAt(state: RaceState) {
  return Math.min(cameraRider(state).distance, state.course.length) - CAMERA_BACK;
}

const unit = (id: string, salt: string) => (hashSeed(0, id, salt) % 1000) / 1000;

/**
 * Where across the road each rider wants to be, in metres from the centre. A
 * group rides as a bunch that widens with its size; alone or in a small group
 * you ride near the middle. In a time trial everyone rides his own line. In
 * the sprint the riders around your kopman ride in the engine's lanes.
 */
export function laneTargets(state: RaceState): Map<string, number> {
  const out = new Map<string, number>();
  for (const group of groupsOf(state)) {
    const perRow = state.course.tt ? 1 : Math.min(6, Math.max(1, Math.round(Math.sqrt(group.length * 1.6))));
    group.forEach((r, i) => {
      const slot = i % perRow;
      const row = Math.floor(i / perRow);
      const spread = perRow === 1 ? 0 : (slot / (perRow - 1) - 0.5) * Math.min(ROAD_HALF * 1.5, 0.8 * (perRow - 1));
      const stagger = perRow > 1 && row % 2 ? 0.35 : 0;
      const own = (unit(r.id, "lane") - 0.5) * (perRow === 1 ? 1.4 : 0.3);
      out.set(r.id, Math.max(-ROAD_HALF + 0.6, Math.min(ROAD_HALF - 0.6, spread + stagger + own)));
    });
  }
  const sprint = state.sprint;
  const k = sprint ? state.riders.find((r) => r.id === sprint.id) : undefined;
  if (k) for (const r of state.riders) if (riding(r) && Math.abs(r.distance - k.distance) < 80) out.set(r.id, laneOf(state, r));
  if (k) out.set(k.id, laneOf(state, k));
  return out;
}

/** Pedalling phase offset, so a bunch does not pedal in step. */
export const pedalOffset = (id: string) => unit(id, "pedal") * Math.PI * 2;

export type Projector = { x: (worldX: number, z: number) => number; y: (worldY: number, z: number) => number; scale: (z: number) => number };

/** A pinhole camera: `focal` in pixels, horizon at `horizon` px from the top. */
export function projector(width: number, horizon: number, focal: number): Projector {
  return {
    scale: (z) => focal / z,
    x: (wx, z) => width / 2 + (wx * focal) / z,
    y: (wy, z) => horizon + ((CAMERA_HEIGHT - wy) * focal) / z,
  };
}

/** Gradient under the camera in percent, rounded. */
export const gradeHere = (state: RaceState, cam: number) => Math.round(gradeAt(state.course, Math.max(0, Math.min(state.course.length - 1, cam + CAMERA_BACK))) * 100);
