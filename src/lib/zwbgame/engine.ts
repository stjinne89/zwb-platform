import { recoveryTau } from "@/lib/pacing/w-prime";
import { POWERUP_EFFECTS, ZWIFT_BASE_BIKE_KG, ZWIFT_BASE_CDA } from "@/lib/pacing/zwift-setup";
import { AIR_DENSITY, DRIVETRAIN_EFF, G } from "@/lib/ride-estimate";
import { basicRider, strength } from "./roster";
import { GRID_METERS, climbingShare, gradeAt } from "./routes";
import { GAME_VERSION, OWN_TEAM, type GameRider, type GameRoute, type Mode, type PlayerCommand, type PowerupId, type RaceConfig, type RaceState, type RiderState } from "./types";

export const STEP_SECONDS = 0.2;
/**
 * Every rider is the same reference body; the coefficients set the power. The
 * browser never sees watts or weight, yet the physics are Zwift's: air drag, a
 * 30 % draft, rolling resistance and gravity, so the wheel matters on the flat and
 * hardly on a climb.
 */
const RIDER_KG = 75;
const REF_CP = 250;
const REF_WPRIME = 20000;
/** Spreads the compressed coefficients back to power: 180 W vs 330 W becomes ×1.5, not ×1.18. */
const SPREAD = 2.5;
const CRR = 0.004;
/**
 * Drafting as in Pack Dynamics 4.1. The deeper in a line, the more shelter: Zwift
 * Insider measured 24, 32 and 39 % power saved for places 2, 3 and 4 (PD 4.1.1),
 * here as a share of CdA. An assumption: Zwift does not publish its model.
 */
const DRAFT_CDA_SAVING = [0.27, 0.36, 0.43];
/** Full shelter up to this far behind a wheel, fading out to the end of its shadow, which reaches further behind a group. */
const DRAFT_FULL = 5;
const SHADOW_RIDER = 10;
const SHADOW_GROUP = 18;
const DRAFT_LANE = 1.8;
/** PD 4.1: alongside a rider who is in the wind, you are in the wind too. Passing the front takes real power. */
const PASS_GAP = 1;
/** Ride and Save stay with a wheel this close; further back you ride your own pace. */
const RIDE_RANGE = 20;
/** A wheel you chose (a rider you follow, a teammate working for you) is followed this far. */
const FOLLOW_RANGE = 60;
/**
 * Ride follows the tempo, not an attack: in the wheel up to RIDE_CAP (enough for any
 * pace change, not for an attack), closing a gap in the wind up to RIDE_CLOSE_CAP.
 * Following an attack is a choice: a chosen wheel goes up to FOLLOW_CAP. Over the
 * top of a climb Ride eases to threshold, so a gap opens unless you push.
 * Save never goes above threshold. At the front of a group, without a wheel,
 * riding along is RIDE_BASE.
 */
const RIDE_BASE = 0.82;
/** Zwift bunches race the climbs: riding along goes up to this on a real gradient. */
const RIDE_BASE_CLIMB = 0.97;
/** A team time trial rides at threshold; riders take turns because the wheel is faster. */
const TTT_BASE = 0.95;
/** A time trial: riding along means riding your own threshold pace. */
const ITT_BASE = 0.97;
const RIDE_CAP = 1.05;
const RIDE_CLOSE_CAP = 1.25;
const FOLLOW_CAP = 1.6;
const CREST_CAP = 1;
const SAVE_CAP = 1;
/** A turn on the front of a big group is short and hard: up to this much above threshold with six or more behind. */
const PULL_BONUS = 0.15;
const ATTACK = 1.6;
/** Hard and out of the draft: what other riders see as an attack. */
export const SURGE_EFFORT = 1.3;
export const SPRINT_METERS = 400;
/** Zwift races start flat out. */
export const START_SECONDS = 90;
/** Supertuck: freewheeling on a steep descent at speed beats soft pedalling. */
const TUCK_GRADE = -0.03;
const TUCK_SPEED = 16.7;
const TUCK_CDA = 0.7;
/**
 * Fatigue: every match burnt costs threshold for the rest of the race (all of W′
 * once costs 4 %), and so does riding long above 70 % of threshold, at a fifth of
 * the rate. Sitting in the wheel is what keeps you fresh for the finale.
 */
const FATIGUE_PER_WPRIME = 0.04;
export const MAX_FATIGUE = 0.25;
const ENDURANCE_SHARE = 0.7;
const ENDURANCE_RATE = 0.2;
export const POWERUP_IDS: PowerupId[] = ["feather", "aero", "draft"];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function randomAt(seed: number, index: number) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
/** Threshold power on this gradient: flat watts blend into W/kg as it gets steeper. */
export function thresholdAt(r: RiderState, grade: number) {
  const hill = clamp(grade * 12, 0, 1);
  return REF_CP * (r.rider.flat ** SPREAD * (1 - hill) + r.rider.climb ** SPREAD * hill) * r.form * (1 - fatigueOf(r));
}
export const fatigueOf = (r: RiderState) => Math.min(MAX_FATIGUE, r.spent / r.wprime * FATIGUE_PER_WPRIME);
function sprintPower(r: RiderState, cp: number) {
  return Math.max(ATTACK * cp, 2.6 * REF_CP * r.rider.sprint ** 1.5 * r.form * (1 - fatigueOf(r)));
}
function steadySpeed(power: number, grade: number) {
  let v = 10;
  const m = RIDER_KG + ZWIFT_BASE_BIKE_KG;
  for (let i = 0; i < 40; i++) {
    const resist = 0.5 * AIR_DENSITY * ZWIFT_BASE_CDA * v * v + CRR * m * G + m * G * grade;
    v = clamp(v + (DRIVETRAIN_EFF * power / v - resist) / 40, 2, 22);
  }
  return v;
}
const expected = new WeakMap<GameRoute, number>();
/** Race seconds for a reference rider in a group: sets the time compression. */
export function expectedSeconds(route: GameRoute) {
  let seconds = expected.get(route);
  if (seconds === undefined) {
    seconds = route.grades.reduce((sum, grade) => sum + GRID_METERS / (steadySpeed(REF_CP * 0.85, grade) * (grade < 0.03 ? 1.1 : 1)), 0);
    expected.set(route, seconds);
  }
  return seconds;
}
/**
 * Simulation steps per shown step outside the moments that decide the race, so a
 * race of 25–45 minutes plays in about six minutes, slowed moments included.
 */
export function timeScale(route: GameRoute) {
  return clamp(Math.ceil(expectedSeconds(route) / 330), 3, 16);
}
export const maxRaceSeconds = (route: GameRoute) => Math.ceil(expectedSeconds(route) * 1.8);
/** Where the race is decided, time runs this much slower than real time compressed: you get to see it and choose. */
export const KEY_SCALE = 3;
export type MomentKind = "start" | "attack" | "gap" | "crest" | "climb" | "sprint" | "kom" | "final";
/**
 * A moment that decides the race, for you: the start, an attack near you, a gap
 * opening, the top or foot of a climb, a sprint or KOM, the final. Null otherwise.
 * An attack names the rider to follow.
 */
export function momentAt(state: RaceState): { kind: MomentKind; targetId?: string } | null {
  const me = state.riders.find((r) => r.rider.id === state.config.playerId);
  if (!me || !riding(me) || state.finished) return null;
  const route = state.route, d = me.distance;
  if (route.length - d < 1000) return { kind: "final" };
  // A time trial is paced, not raced against moves.
  if (isItt(state.config) || (state.config.mode === "zrl" && state.config.format === "ttt")) return null;
  // The start is one long surge; it is a moment of its own.
  if (state.tick * STEP_SECONDS < START_SECONDS) return { kind: "start" };
  const mover = state.riders.filter((x) => x !== me && riding(x) && x.surge >= 0.4 && x.surge < 8 && (!me.team || x.team !== me.team) && x.distance - d > -15 && x.distance - d < 60)
    .sort((a, b) => Math.abs(a.distance - d) - Math.abs(b.distance - d))[0];
  if (mover) return { kind: "attack", targetId: mover.distance > d ? mover.rider.id : undefined };
  const ahead = state.riders.filter((x) => x !== me && riding(x) && x.distance > d).map((x) => x.distance - d);
  const gap = ahead.length ? Math.min(...ahead) : Infinity;
  if (!me.sheltered && (me.mode === "ride" || me.mode === "save") && gap > 6 && gap < 40) return { kind: "gap" };
  if (atCrest(route, d) || (gradeAt(route, d) >= 0.03 && gradeAt(route, d + 100) < 0.015)) return { kind: "crest" };
  if (gradeAt(route, d + 200) >= 0.03 && gradeAt(route, d) < 0.02) return { kind: "climb" };
  // A sprint from its run-in, a KOM near the top: where the points are decided.
  const banner = route.accents.find((a) => a.banner && d < a.end && d >= (a.kind === "climb" ? a.end - 250 : a.start - 200));
  if (banner) return { kind: banner.kind === "climb" ? "kom" : "sprint" };
  return null;
}
/** Simulation steps per shown step right now. */
export const stepsPerFrame = (state: RaceState) => (momentAt(state) ? KEY_SCALE : timeScale(state.route));

export function pickOpponents(config: Pick<RaceConfig, "seed">, roster: GameRider[], player: GameRider) {
  // Like a Zwift category: the field is drawn from riders around your level.
  const own = strength(player);
  const pool = [...new Map(roster.filter((r) => r.id !== player.id).map((r) => [r.id, r])).values()]
    .map((rider, index) => ({ rider, rank: Math.abs(strength(rider) - own) + randomAt(config.seed, index) * 0.25 }))
    .sort((a, b) => a.rank - b.rank).slice(0, 23).map((item) => item.rider);
  while (pool.length < 7) pool.push(basicRider(`guest:${pool.length}`, `Gast ${pool.length + 1}`));
  return pool;
}
/** An FRR time trial: as on Zwift, everyone starts together without drafting or powerups. */
export const isItt = (config: RaceConfig) => config.mode === "frr" && config.stage?.kind === "itt";
/** Who gives shelter: everybody, nobody (Race of Truth, time trial) or only your own team (TTT). */
export function draftRule(config: RaceConfig): "all" | "none" | "team" {
  if (isItt(config)) return "none";
  if (config.mode !== "zrl") return "all";
  return config.format === "rot" ? "none" : config.format === "ttt" ? "team" : "all";
}
export function createRace(config: RaceConfig, roster: GameRider[], route: GameRoute): RaceState {
  if (config.routeId !== route.id) throw new Error("Deze route hoort niet bij de koers.");
  const player = roster.find((r) => r.id === config.playerId);
  if (!player) throw new Error("Je renner ontbreekt.");
  const byId = new Map(roster.map((r) => [r.id, r]));
  let entries: { rider: GameRider; team: RiderState["team"] }[];
  if (config.mode === "ladder" || config.mode === "zrl") {
    const squads = config.squads;
    const most = config.mode === "ladder" ? 2 : 8;
    if (!squads || squads.length < 2 || squads.length > most || squads[0].id !== OWN_TEAM || !squads[0].riders.includes(player.id)
      || squads.some((squad) => !squad.riders.length || squad.riders.length > 5) || new Set(squads.map((squad) => squad.id)).size !== squads.length) {
      throw new Error("Deze koers heeft geen geldige ploegen.");
    }
    if (config.mode === "zrl" && !config.format) throw new Error("Kies een ZRL-format.");
    let guest = 0;
    entries = squads.flatMap((squad) => squad.riders.map((id) => ({ rider: byId.get(id) ?? basicRider(id, `Gast ${++guest}`), team: squad.id })));
    if (new Set(entries.map((e) => e.rider.id)).size !== entries.length) throw new Error("Een renner staat in twee ploegen.");
  } else if (config.mode === "frr") {
    // A tour keeps its field from stage to stage; a rider who left the club rides on as a guest.
    const field = config.field;
    if (!field || !config.stage || !field.includes(player.id) || field.length > 24 || new Set(field).size !== field.length) throw new Error("Deze etappe heeft geen geldig veld.");
    let guest = 0;
    entries = field.map((id) => ({ rider: byId.get(id) ?? basicRider(id, `Gast ${++guest}`), team: null }));
  } else {
    entries = [...pickOpponents(config, roster, player), player].map((rider) => ({ rider, team: null }));
  }
  entries.sort((a, b) => a.rider.id.localeCompare(b.rider.id));
  const riders: RiderState[] = entries.map(({ rider, team }, i) => {
    const wprime = Math.round(REF_WPRIME * rider.sprint ** 2);
    return {
      rider, team, distance: -Math.floor(i / 4) * 1.8, lane: (i % 4 - 1.5) * 0.85, speed: 6,
      mode: "ride", targetId: null, effort: 0.8, wbal: wprime, wprime, spent: 0, sheltered: false, tucked: false,
      powerup: null, active: null, finishTime: null, attacks: 0, shelteredSeconds: 0, surge: 0,
      form: +(0.94 + randomAt(config.seed, 3000 + i) * 0.12).toFixed(4), job: null,
    };
  });
  return { version: GAME_VERSION, config, route, tick: 0, riders, order: "free", passes: [], finished: false };
}
export function applyCommand(state: RaceState, rider: RiderState, command: PlayerCommand) {
  if (rider.finishTime !== null) return;
  switch (command.type) {
    case "mode":
      if (command.value === "attack" && rider.mode !== "attack") rider.attacks++;
      rider.mode = command.value;
      rider.targetId = command.targetId ?? null;
      break;
    case "powerup":
      if (rider.powerup && !rider.active) { rider.active = { id: rider.powerup, left: POWERUP_EFFECTS[rider.powerup].durationS }; rider.powerup = null; }
      break;
    case "order":
      if (rider.rider.id === state.config.playerId && rider.team === OWN_TEAM) state.order = command.value;
      break;
  }
}
/** Your group on the road (riders less than 15 m apart): its size, your place in it, the gap to whoever is ahead of it and how hard its front rider rides. */
function groupAround(state: RaceState, r: RiderState) {
  const order = state.riders.filter(riding).sort((a, b) => b.distance - a.distance || a.rider.id.localeCompare(b.rider.id));
  const i = order.indexOf(r);
  let top = i, bottom = i;
  while (top > 0 && order[top - 1].distance - order[top].distance < 15) top--;
  while (bottom < order.length - 1 && order[bottom].distance - order[bottom + 1].distance < 15) bottom++;
  return { size: bottom - top + 1, place: i - top, gapAhead: top > 0 ? order[top - 1].distance - order[top].distance : Infinity, frontEffort: order[top].effort };
}
/** Seconds of visible attack before a bot reacts: further back is later, and some riders are slower to see it. */
export function noticeDelay(state: RaceState, index: number, meters: number) {
  return 1 + meters * 0.08 + randomAt(state.config.seed, 8000 + index * 13) * 2;
}
/** Seeded character per race: how eager, and from how far out the final move comes. */
export function personality(state: RaceState, index: number) {
  const r = state.riders[index];
  const base = { sprinter: 230, puncher: 450, climber: 700, tter: 1300, allrounder: 350 }[r.rider.kind];
  return {
    aggression: randomAt(state.config.seed, 5000 + index * 7),
    finalAt: base * (0.7 + randomAt(state.config.seed, 6000 + index * 11) * 0.6),
  };
}
const riding = (x: RiderState) => x.finishTime === null;
/** The rider a team rides for: you in your own team, otherwise the best finisher on this route. */
export function teamLeader(state: RaceState, team: RiderState["team"]) {
  if (!team) return null;
  const members = state.riders.filter((r) => r.team === team);
  if (team === OWN_TEAM && state.order !== "free" && state.order !== "points") return members.find((r) => r.rider.id === state.config.playerId) ?? null;
  const hilly = climbingShare(state.route) > 0.012;
  return [...members].filter((r) => r.rider.id !== state.config.playerId)
    .sort((a, b) => (hilly ? b.rider.climb - a.rider.climb : b.rider.sprint - a.rider.sprint) || a.rider.id.localeCompare(b.rider.id))[0] ?? null;
}
/** A ZRL points race or Race of Truth: segments score. */
export const huntsPoints = (state: RaceState) => state.config.mode === "zrl" && (state.config.format === "points" || state.config.format === "rot");
/** Hands out team jobs: bring your leader back, lead them out, or hunt segment points. */
function assignJobs(state: RaceState) {
  // A team time trial is ridden together; nobody works for one rider.
  if (state.config.mode === "zrl" && state.config.format === "ttt") return;
  for (const team of [...new Set(state.riders.flatMap((r) => (r.team ? [r.team] : [])))]) {
    const members = state.riders.filter((r) => r.team === team);
    const leader = teamLeader(state, team);
    for (const r of members) r.job = null;
    if (!leader || !riding(leader)) continue;
    const helpers = members.filter((r) => r !== leader && riding(r) && r.rider.id !== state.config.playerId);
    const remaining = state.route.length - leader.distance;
    const ahead = state.riders.filter((x) => riding(x) && x.team !== team && x.distance > leader.distance).map((x) => x.distance - leader.distance);
    const gap = ahead.length ? Math.min(...ahead) : Infinity;
    // In a ZRL points race every team sends its fastest finisher after the segment points.
    const hunt = huntsPoints(state) && (team === OWN_TEAM ? state.order === "points" : true);
    if (hunt && remaining > 1500) {
      const hunter = [...helpers].sort((a, b) => b.rider.sprint - a.rider.sprint || a.rider.id.localeCompare(b.rider.id))[0];
      if (hunter && hunter.wbal > hunter.wprime * 0.25) hunter.job = { for: leader.rider.id, kind: "points" };
    }
    const bring = team === OWN_TEAM ? state.order === "bring" : false;
    if (bring && gap > 12 && gap < 400) {
      const helper = helpers.filter((h) => h.distance > leader.distance - 5 && h.distance - leader.distance < 400).sort((a, b) => b.wbal / b.wprime - a.wbal / a.wprime)[0];
      if (helper && helper.wbal > helper.wprime * 0.2) helper.job = { for: leader.rider.id, kind: "bring" };
    }
    const leadout = team === OWN_TEAM ? state.order === "leadout" : true;
    if (leadout && remaining < 1100 && remaining > 150) {
      const helper = helpers.filter((h) => !h.job && Math.abs(h.distance - leader.distance) < 25 && h.wbal > h.wprime * 0.15).sort((a, b) => b.wbal - a.wbal)[0];
      if (helper) helper.job = { for: leader.rider.id, kind: "leadout" };
    }
  }
}
export function botCommands(state: RaceState, index: number): PlayerCommand[] {
  const r = state.riders[index];
  const route = state.route;
  const remaining = route.length - r.distance;
  const grade = gradeAt(route, r.distance + 60);
  const { aggression, finalAt } = personality(state, index);
  const roll = randomAt(state.config.seed, Math.floor(state.tick / 50) * 29 + index);
  const roll2 = randomAt(state.config.seed, Math.floor(state.tick / 150) * 31 + index + 20000);
  const commands: PlayerCommand[] = [];
  const mode = (value: Mode, targetId?: string) => commands.push({ type: "mode", value, targetId });
  const reserve = r.wbal / r.wprime;
  const ahead = state.riders.filter((x) => x !== r && riding(x) && x.distance > r.distance).map((x) => x.distance - r.distance);
  const gap = ahead.length ? Math.min(...ahead) : Infinity;
  const leader = r.team ? teamLeader(state, r.team) : null;
  if (isItt(state.config)) {
    // A time trial is paced: threshold all the way, what is left in the final kilometre.
    mode(remaining < 800 && reserve > 0.1 ? "attack" : reserve < 0.1 ? "save" : "ride");
    return commands;
  }
  if (state.config.mode === "zrl" && state.config.format === "ttt") {
    // Ride together at threshold; ease off when empty, go in the last few hundred metres.
    mode(remaining < 300 && reserve > 0.1 ? "attack" : reserve < 0.15 ? "save" : "ride");
    return commands;
  }
  if (r.job?.kind === "points") {
    // Save for the banner, then go: the sprint for first across the line, the climb for its fastest time.
    const next = route.accents.find((a) => a.banner && a.end > r.distance);
    const onClimb = next?.kind === "climb" && r.distance >= next.start;
    const sprinting = next?.kind === "sprint" && next.end - r.distance < 350;
    if (next && (sprinting || onClimb) && reserve > 0.15) {
      mode("attack");
      if (r.powerup === "aero" && sprinting) commands.push({ type: "powerup" });
      if (r.powerup === "feather" && onClimb) commands.push({ type: "powerup" });
    } else mode(reserve < 0.5 ? "save" : "ride");
    return commands;
  }
  if (r.job) {
    // A teammate's job overrides its own race. The engine rides the tow; here only the effort.
    mode(r.job.kind === "leadout" ? "attack" : "front");
    if (r.job.kind === "leadout" && r.powerup === "draft") commands.push({ type: "powerup" });
    return commands;
  }
  if (r.powerup === "feather" && grade > 0.04 && (r.mode === "attack" || roll < 0.5)) commands.push({ type: "powerup" });
  if (r.powerup === "aero" && (remaining < SPRINT_METERS || (r.mode === "attack" && grade < 0.02))) commands.push({ type: "powerup" });
  if (r.powerup === "draft" && gap > 8 && gap < FOLLOW_RANGE * 2) commands.push({ type: "powerup" });

  if (state.tick * STEP_SECONDS < START_SECONDS) { mode(aggression > 0.7 ? "front" : "ride"); return commands; }
  // A leader with a lead-out stays on its wheel until the sprint.
  const leadout = state.riders.find((x) => x.job?.for === r.rider.id && x.job.kind === "leadout" && riding(x) && x.distance > r.distance && x.distance - r.distance < 15);
  if (leadout && remaining > finalAt * 0.8) { mode("ride", leadout.rider.id); return commands; }
  if (remaining < finalAt && reserve > 0.2) { mode("attack"); return commands; }
  if (reserve < 0.2) { mode("save"); return commands; }
  if (r.mode === "attack" && reserve > 0.4 && (grade > 0.02 || gap > 15)) return commands;
  // An attack nearby: who goes with it depends on character and legs, and on how
  // soon it is seen. A teammate's move is left alone.
  const covering = r.targetId ? state.riders.find((x) => x.rider.id === r.targetId) : undefined;
  if (covering && riding(covering) && covering.distance > r.distance && covering.distance - r.distance < 60 && (covering.effort > 1.1 || covering.distance - r.distance > 6) && reserve > 0.15) { mode("ride", covering.rider.id); return commands; }
  const moverIndex = state.riders.findIndex((x) => x !== r && riding(x) && (!r.team || x.team !== r.team) && x.distance > r.distance && x.distance - r.distance < 40 && x.surge >= noticeDelay(state, index, x.distance - r.distance));
  if (moverIndex >= 0 && reserve > 0.3) {
    const mover = state.riders[moverIndex];
    const chance = 0.2 + aggression * 0.5 + (reserve - 0.5) * 0.5 + (strength(mover.rider) - strength(r.rider)) * 0.5;
    if (randomAt(state.config.seed, 9000 + index * 131 + moverIndex * 17 + mover.attacks) < chance) { mode("ride", mover.rider.id); return commands; }
  }
  const climber = r.rider.kind === "climber" || r.rider.kind === "puncher";
  const protectedLeader = leader === r && remaining > 3000;
  // Over the top without a gap; into the front of the group before a climb.
  if (atCrest(route, r.distance) && reserve > 0.3 && (climber || aggression > 0.6)) { mode("front"); return commands; }
  if (gradeAt(route, r.distance + 250) > 0.03 && grade < 0.02 && reserve > 0.5 && roll < 0.3 + aggression * 0.4) { mode("front"); return commands; }
  if (!protectedLeader && climber && grade > 0.035 && reserve > 0.6 && roll < 0.04 + aggression * 0.12) { mode("attack"); return commands; }
  if (!protectedLeader && reserve > 0.75 && roll > 0.997 - aggression * 0.004) { mode("attack"); return commands; }
  // A group up the road: the front of this group organises the chase. Alone, a
  // rider decides for itself whether to go across.
  const group = groupAround(state, r);
  if (group.size >= 2 && group.gapAhead >= 15 && group.gapAhead < 600 && group.place < 4 && reserve > 0.4 && remaining > 600 && roll2 < 0.35 + aggression * 0.5) { mode("front"); return commands; }
  if (group.size === 1 && gap >= RIDE_RANGE && gap < 250 && reserve > 0.5 && remaining > 800 && roll2 < 0.3 + aggression * 0.5) { mode("front"); return commands; }
  // Turns on the front: without them a group rolls at the pace of whoever is there.
  if (group.size >= 3 && group.place < 3 && reserve > 0.45) {
    if (group.place === 0 && r.mode === "front" && reserve > 0.55 && roll < 0.6) { mode("front"); return commands; }
    if (group.place > 0 && group.frontEffort < 0.95 && roll < 0.35 + aggression * 0.4) { mode("front"); return commands; }
  }
  if (r.rider.kind === "tter" && gap === Infinity && remaining > finalAt) { mode("front"); return commands; }
  mode(roll > 0.9 - aggression * 0.1 && reserve > 0.6 ? "front" : "ride");
  return commands;
}
type Snapshot = { id: string; distance: number; lane: number; speed: number; team: RiderState["team"] };
/**
 * Shelter per rider from one snapshot, front to back: the CdA share saved, by
 * place in the line and distance to the wheel. Alongside a rider in the wind you
 * get nothing (PD 4.1), except in a team time trial, where riders take turns.
 */
function shelterOf(positions: Snapshot[], rule: "all" | "none" | "team") {
  const saving = new Map<string, number>(), depth = new Map<string, number>();
  if (rule === "none") return saving;
  for (let k = positions.length - 1; k >= 0; k--) {
    const p = positions[k];
    let best = 0, bestDepth = 0;
    for (let j = k + 1; j < positions.length; j++) {
      const q = positions[j], gap = q.distance - p.distance;
      if (gap >= SHADOW_GROUP) break;
      if (gap <= 0.3 || Math.abs(q.lane - p.lane) >= DRAFT_LANE || (rule === "team" && q.team !== p.team)) continue;
      const inWind = !saving.get(q.id);
      if (inWind && gap < PASS_GAP && rule === "all") continue;
      const shadow = inWind ? SHADOW_RIDER : SHADOW_GROUP;
      const fade = gap <= DRAFT_FULL ? 1 : Math.max(0, 1 - (gap - DRAFT_FULL) / (shadow - DRAFT_FULL));
      const d = (depth.get(q.id) ?? 0) + 1;
      const s = DRAFT_CDA_SAVING[Math.min(d, DRAFT_CDA_SAVING.length) - 1] * fade;
      if (s > best) { best = s; bestDepth = d; }
    }
    if (best > 0) { saving.set(p.id, best); depth.set(p.id, bestDepth); }
  }
  return saving;
}
/** Just over the top of a climb, where riding along eases and a gap opens. */
export const atCrest = (route: GameRoute, distance: number) => gradeAt(route, distance - 100) >= 0.03 && gradeAt(route, distance) < 0.015 && gradeAt(route, distance + 100) < 0.015;
const stamp = (seconds: number) => Math.round(seconds * 100) / 100;
/** Mutates a private simulation instance; rendering receives snapshots. No wall-clock or network. */
export function stepRace(state: RaceState, commands: PlayerCommand[] = [], botPolicy = botCommands) {
  if (state.finished) return state;
  const route = state.route;
  const player = state.riders.find((r) => r.rider.id === state.config.playerId)!;
  for (const command of commands) applyCommand(state, player, command);
  if (state.tick % 10 === 0) assignJobs(state);
  // Staggered decisions: bots do not all react on the same tick.
  state.riders.forEach((r, i) => {
    if (r !== player && riding(r) && (state.tick + i * 7) % 10 === 0) for (const command of botPolicy(state, i)) applyCommand(state, r, command);
  });
  const time = state.tick * STEP_SECONDS;
  // One sort per step: everyone ahead of a rider is the tail of this list.
  const positions: Snapshot[] = state.riders.filter(riding).map((r) => ({ id: r.rider.id, distance: r.distance, lane: r.lane, speed: r.speed, team: r.team }))
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
  const byId = new Map(positions.map((p) => [p.id, p]));
  const order = new Map(positions.map((p, i) => [p.id, i]));
  const rule = draftRule(state.config);
  const ttt = state.config.mode === "zrl" && state.config.format === "ttt";
  const itt = isItt(state.config);
  const banners = route.accents.flatMap((a, i) => (a.banner ? [{ a, i }] : []));
  const shelter = shelterOf(positions, rule);
  // Group sizes on the road, for how hard a turn on the front is.
  const groupSize = new Map<string, number>();
  for (let k = 0, from = 0; k < positions.length; k++) {
    if (k === positions.length - 1 || positions[k + 1].distance - positions[k].distance >= 15) {
      for (let j = from; j <= k; j++) groupSize.set(positions[j].id, k - from + 1);
      from = k + 1;
    }
  }
  state.riders.forEach((r, index) => {
    if (!riding(r)) return;
    const grade = gradeAt(route, r.distance);
    const remaining = route.length - r.distance;
    const cp = thresholdAt(r, grade);
    const effect = r.active ? POWERUP_EFFECTS[r.active.id] : null;
    const mass = RIDER_KG * (1 + (effect?.riderMassFraction ?? 0)) + ZWIFT_BASE_BIKE_KG;
    // In a team time trial you only follow your own team.
    const ahead = positions.slice(order.get(r.rider.id)! + 1).filter((p) => p.distance > r.distance && (!ttt || p.team === r.team));
    const inLane = ahead.find((p) => p.distance - r.distance < RIDE_RANGE && Math.abs(p.lane - r.lane) < 1.2);
    // A teammate leading you out or bringing you back is a wheel you follow.
    const helper = state.riders.find((x) => x.job?.for === r.rider.id && (x.job.kind === "leadout" || x.job.kind === "bring") && riding(x));
    const requested = r.targetId ? byId.get(r.targetId) : helper ? byId.get(helper.rider.id) : undefined;
    const chosen = requested && requested.distance > r.distance && requested.distance - r.distance < FOLLOW_RANGE ? requested : undefined;
    // Without drafting there is no wheel to hold: you ride your own pace.
    let wheel = rule === "none" ? undefined : chosen ?? inLane ?? (ahead[0] && ahead[0].distance - r.distance < RIDE_RANGE ? ahead[0] : undefined);
    // In the wheel you don't go down with a rider who lets a gap open: you jump to
    // the wheel in front of them.
    if (wheel && !chosen && (r.mode === "ride" || r.mode === "save")) {
      for (let hop = 0; hop < 3; hop++) {
        const next = ahead.find((p) => p.distance > wheel!.distance);
        if (!next || next.distance - wheel.distance <= 5 || next.distance - r.distance >= RIDE_RANGE) break;
        wheel = next;
      }
    }
    // Lanes: follow the wheel's line, come around to attack or move up.
    const blocked = ahead.find((p) => p.distance - r.distance < 3 && Math.abs(p.lane - r.lane) < 1);
    const job = r.job ? byId.get(r.job.for) : undefined;
    let lane = r.lane;
    if (job && r.job?.kind === "bring") lane = job.lane;
    else if (job && r.job?.kind === "leadout" && r.distance > job.distance) lane = job.lane;
    else if (r.mode !== "save" && blocked) lane = blocked.lane + (blocked.lane > 0 ? -1.4 : 1.4);
    else if ((r.mode === "save" || r.mode === "ride") && wheel && !inLane && wheel.distance - r.distance < 20) lane = wheel.lane;
    r.lane = clamp(r.lane + clamp(clamp(lane, -2.6, 2.6) - r.lane, -STEP_SECONDS * 1.6, STEP_SECONDS * 1.6), -2.6, 2.6);

    const saving = (shelter.get(r.rider.id) ?? 0) * (effect?.draftSavingFactor ?? 1);
    r.sheltered = saving >= 0.1;
    // PD4: you supertuck only out of the draft.
    const tucking = r.mode === "save" && grade <= TUCK_GRADE && r.speed > TUCK_SPEED && !r.sheltered;
    const cda = ZWIFT_BASE_CDA * (effect?.cdaFactor ?? 1) * (tucking ? TUCK_CDA : 1) * (1 - Math.min(0.6, saving));
    const sinA = grade / Math.sqrt(1 + grade * grade), cosA = 1 / Math.sqrt(1 + grade * grade);
    const resist = (v: number) => 0.5 * AIR_DENSITY * cda * v * v + CRR * mass * G * cosA + mass * G * sinA;
    const v = Math.max(r.speed, 2);
    const base = ttt ? TTT_BASE : itt ? ITT_BASE : RIDE_BASE + (RIDE_BASE_CLIMB - RIDE_BASE) * clamp((grade - 0.015) / 0.025, 0, 1);

    let power: number;
    if (job && r.job?.kind === "bring") {
      // Wait for the leader, then tow them at threshold.
      power = job.distance < r.distance - 4 ? cp * 0.45 : cp * 1.05;
    } else if (tucking) power = 0;
    else if (r.mode === "attack") power = remaining < SPRINT_METERS ? sprintPower(r, cp) : cp * ATTACK;
    else if (r.mode === "front") power = cp * (time < START_SECONDS && !itt ? 1.3 : 1 + PULL_BONUS * Math.min((groupSize.get(r.rider.id) ?? 1) - 1, 6) / 6);
    else if (wheel) {
      // Hold the wheel: ride the speed of the bunch just ahead, not every twitch of one
      // rider, and close the gap, up to what this mode allows.
      const gap = wheel.distance - r.distance;
      const near = ahead.filter((p) => p.distance >= wheel!.distance && p.distance - wheel!.distance < 20);
      const pace = near.reduce((sum, p) => sum + p.speed, 0) / near.length;
      const want = pace + clamp((gap - 2) * 0.35, -1, 2.5);
      const hold = v * (resist(v) + mass * (want - v) / 3) / DRIVETRAIN_EFF;
      const cap = r.mode === "save" ? SAVE_CAP : wheel === chosen ? FOLLOW_CAP : atCrest(route, r.distance) ? CREST_CAP : r.sheltered ? RIDE_CAP : RIDE_CLOSE_CAP;
      // A team time trial still rotates: the wheel is faster, so riders come through.
      power = clamp(ttt && r.mode === "ride" ? Math.max(hold, cp * base) : hold, 0, cp * cap);
    } else power = cp * (r.mode === "save" ? 0.7 : base);
    // An empty W′ leaves you at threshold, whatever you ask for.
    if (r.wbal <= 1) power = Math.min(power, cp * 0.97);
    r.tucked = tucking;
    r.effort = +(power / cp).toFixed(3);
    r.surge = r.effort >= SURGE_EFFORT && !r.sheltered ? +(r.surge + STEP_SECONDS).toFixed(1) : 0;

    r.spent += Math.max(0, power - cp * ENDURANCE_SHARE) * STEP_SECONDS * ENDURANCE_RATE;
    if (power > cp) { const drawn = Math.min(r.wbal, (power - cp) * STEP_SECONDS); r.wbal -= drawn; r.spent += drawn; }
    else r.wbal = r.wprime - (r.wprime - r.wbal) * Math.exp(-STEP_SECONDS / recoveryTau(cp - power));
    const accel = (DRIVETRAIN_EFF * power / v - resist(r.speed)) / (mass * 1.04);
    r.speed = clamp(r.speed + accel * STEP_SECONDS, 1, 25);
    if (r.sheltered) r.shelteredSeconds += STEP_SECONDS;
    if (r.active) { r.active.left -= STEP_SECONDS; if (r.active.left <= 1e-9) r.active = null; }

    const previous = r.distance;
    r.distance += r.speed * STEP_SECONDS;
    // Named segments: when you entered and left each one, for FAL and FTS.
    const at = (d: number) => stamp(time + (d - previous) / r.speed);
    for (const { a, i } of banners) {
      if (previous < a.start && r.distance >= a.start) state.passes.push({ r: index, a: i, s: at(a.start), e: null });
      if (previous < a.end && r.distance >= a.end) {
        const open = state.passes.find((p) => p.r === index && p.a === i && p.e === null);
        if (open) open.e = at(a.end);
      }
    }
    // Powerups come from Zwift's banners: named sprints and KOMs, and the lap line.
    if (!r.powerup && !itt) {
      const arches = [...route.accents.filter((a) => a.banner).map((a) => a.end), ...route.lapLines];
      const crossed = arches.findIndex((d) => previous < d && r.distance >= d);
      if (crossed >= 0) {
        const pick = randomAt(state.config.seed, 7000 + index * 97 + Math.round(arches[crossed]));
        r.powerup = POWERUP_IDS[Math.floor(pick * POWERUP_IDS.length)];
      }
    }
    if (r.distance >= route.length) r.finishTime = time + (route.length - previous) / r.speed;
  });
  state.tick++;
  state.finished = state.riders.every((r) => !riding(r)) || state.tick * STEP_SECONDS >= maxRaceSeconds(route);
  return state;
}
export function standings(state: RaceState) {
  return [...state.riders].sort((a, b) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime || a.rider.id.localeCompare(b.rider.id);
    if (a.finishTime !== null) return -1;
    if (b.finishTime !== null) return 1;
    return b.distance - a.distance || a.rider.id.localeCompare(b.rider.id);
  });
}
/** Riders less than 15 m apart form a group. */
export function groupsOf(order: RiderState[]) {
  const groups: RiderState[][] = [];
  for (const r of order.filter(riding)) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].distance - r.distance < 15) last.push(r); else groups.push([r]);
  }
  return groups;
}
