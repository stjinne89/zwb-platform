import { cardById } from "./cards";
import { buildCourse, courseWeights, fitFor, gradeAt, surfaceAt } from "./course";
import { NO_BONUS, type TeamBonus } from "./items";
import { clamp, hashSeed, randomAt, rng } from "./rng";
import { lineupFor, rivalTeams } from "./teams";
import { GRID, PLAYER_TEAM, type Course, type RiderCard } from "./types";
import { raceById } from "./world";

/**
 * Race simulation in one-second steps. Every rider is a body with power, mass and
 * drag from his card; speed follows from the power balance, the wheel saves on air
 * drag (so it helps on the flat and hardly on a climb), and W′ pays for attacks and
 * sprints. Bots ride as teams: a break goes early, teams with a kopman for the
 * finish chase, climbers attack on the last climbs, sprinters get a lead-out.
 */
export const STEP = 1;
const AIR = 1.2;
const G = 9.81;
const EFF = 0.976;
const BIKE_KG = 7.5;
const ROAD_CDA = 0.3;
const CRR = { asfalt: 0.004, kasseien: 0.012, grind: 0.009 } as const;
/** CdA saved in the wheel, by riders sheltering you within 15 m: one, two, three or more. */
const SHELTER = [0, 0.3, 0.38, 0.45];
const SHELTER_FULL = 3;
const SHELTER_END = 12;
const WHEEL_RANGE = 25;
const GROUP_GAP = 15;
const FOLLOW_RANGE = 120;

export type Mode = "mee" | "kop" | "aanval" | "sparen" | "volgen" | "wachten" | "sprint" | "tempo";

export type Override = { mode: Mode; untilTime?: number; untilDistance?: number; pull?: number; target?: string };

export type Rider = {
  id: string;
  team: string;
  kopman: boolean;
  card: RiderCard;
  mass: number;
  cpFlat: number;
  cpClimb: number;
  wprime: number;
  sprintW: number;
  cda: number;
  crrFactor: number;
  vmax: number;
  /** Bike weight, rolling resistance scale, drivetrain efficiency and W′ recovery speed: equipment and staff. */
  bikeKg: number;
  crrScale: number;
  eff: number;
  recovery: number;
  distance: number;
  speed: number;
  wbal: number;
  mode: Mode;
  modeUntil: number;
  pull: number;
  target: string | null;
  override: Override | null;
  sprintAt: number;
  cooldown: number;
  breakaway: boolean;
  finishTime: number | null;
  effort: number;
  sheltered: boolean;
};

export type RaceEvent = { t: number; km: number; kind: "aanval" | "ontsnapping" | "ingelopen" | "radio" | "finish"; rider?: string; text?: string };

export type RaceState = {
  raceId: string;
  seed: number;
  course: Course;
  riders: Rider[];
  time: number;
  tick: number;
  finished: boolean;
  maxTime: number;
  events: RaceEvent[];
  breakAnnounced: boolean;
  /** The last radio hand an order was played from: one order per hand. */
  radioHand: number;
  /** How much longer the player's radio orders last (assistant directeur sportif). */
  orderScale: number;
  /**
   * Board game: attacks come from cards and intents, not from chance, and the
   * player's riders only ride along unless a card tells them otherwise.
   */
  scripted?: boolean;
};

export type Lineup = { riders: string[]; kopman: string; bonus?: TeamBonus };

function bodyOf(card: RiderCard, tt: boolean, bonus: TeamBonus = NO_BONUS) {
  const s = card.stats;
  const mass = clamp(72 - (s.klim - s.vlak) * 0.35, 58, 85);
  const power = 1 + bonus.power;
  return {
    mass,
    // A time trialist pushes more on his own: up to +8 % at 99.
    cpFlat: (300 + (s.vlak - 60) * 3.2) * (tt ? 1 + (s.tijdrit - 60) * 0.002 : 1) * power,
    cpClimb: (5 + (s.klim - 60) * 0.035) * mass * power,
    wprime: (14000 + s.sprint * 80 + s.klim * 30) * (1 + bonus.wprime),
    sprintW: (600 + s.sprint * 14) * power,
    cda: (tt ? 0.235 - (s.tijdrit - 60) * 0.0015 : ROAD_CDA) * (1 - bonus.cda),
    crrFactor: 1.3 - s.kasseien / 150,
    vmax: (17 + s.afdalen * 0.07) * (1 + bonus.descent),
    bikeKg: BIKE_KG * (1 - bonus.bikeMass),
    crrScale: 1 - bonus.crr,
    eff: EFF * (1 + bonus.drivetrain),
    recovery: bonus.recovery,
  };
}

/** Threshold power on this gradient: flat watts blend into W/kg as it gets steeper. */
export function cpAt(r: Pick<Rider, "cpFlat" | "cpClimb">, grade: number) {
  const hill = clamp(grade * 12, 0, 1);
  return r.cpFlat * (1 - hill) + r.cpClimb * hill;
}

function steadySpeed(power: number, grade: number, cda: number) {
  let v = 10;
  const m = 72 + BIKE_KG;
  for (let i = 0; i < 60; i++) {
    const resist = 0.5 * AIR * cda * v * v + CRR.asfalt * m * G + m * G * grade;
    v = clamp(v + (EFF * power / v - resist) / 30, 2, 22);
  }
  return v;
}

const expectedCache = new Map<string, number>();
/** Race seconds for a reference bunch: sets the playback speed. */
export function expectedSeconds(course: Course) {
  const hit = expectedCache.get(course.id);
  if (hit !== undefined) return hit;
  const seconds = course.grades.reduce((sum, g) => sum + GRID / steadySpeed(course.tt ? 330 : g > 0.03 ? 360 : 300, g, course.tt ? 0.22 : g > 0.03 ? ROAD_CDA : ROAD_CDA * 0.6), 0);
  expectedCache.set(course.id, seconds);
  return seconds;
}

export function createRace(raceId: string, seed: number, player: Lineup): RaceState {
  const def = raceById.get(raceId);
  if (!def) throw new Error(`Onbekende koers: ${raceId}`);
  const course = buildCourse(def);
  const mine = new Set(player.riders);
  const entries: { card: RiderCard; team: string; kopman: boolean }[] = player.riders.map((id) => ({ card: cardById(id), team: PLAYER_TEAM, kopman: id === player.kopman }));
  for (const team of rivalTeams()) {
    const lineup = lineupFor(team.riders.map(cardById), course, mine);
    lineup.forEach((card, i) => entries.push({ card, team: team.id, kopman: i === 0 }));
  }
  const random = rng(hashSeed(seed, raceId, "start"));
  // Start grid: a shuffled bunch, three abreast.
  const order = entries.map((e) => ({ e, key: random() })).sort((a, b) => a.key - b.key);
  const riders: Rider[] = order.map(({ e }, i) => ({
    id: e.card.id,
    team: e.team,
    kopman: e.kopman,
    card: e.card,
    ...bodyOf(e.card, course.tt, e.team === PLAYER_TEAM ? player.bonus : NO_BONUS),
    distance: course.tt ? 0 : -Math.floor(i / 3) * 1.6,
    speed: course.tt ? 2 : 9,
    wbal: 0,
    mode: course.tt ? "tempo" : "mee",
    modeUntil: 0,
    pull: 1,
    target: null,
    override: null,
    sprintAt: e.kopman ? 300 : 250,
    cooldown: 0,
    breakaway: false,
    finishTime: null,
    effort: 0,
    sheltered: false,
  }));
  for (const r of riders) r.wbal = r.wprime;
  // The break of the day: four riders from different rival teams who will never win.
  if (!course.tt) {
    const candidates = riders.filter((r) => r.team !== PLAYER_TEAM && !r.kopman).map((r) => ({ r, key: random() })).sort((a, b) => a.key - b.key);
    const teams = new Set<string>();
    for (const { r } of candidates) {
      if (teams.size >= 4) break;
      if (teams.has(r.team)) continue;
      teams.add(r.team);
      r.breakaway = true;
    }
  }
  return { raceId, seed, course, riders, time: 0, tick: 0, finished: false, maxTime: expectedSeconds(course) * 1.9, events: [], breakAnnounced: false, radioHand: -1, orderScale: 1 + (player.bonus?.orders ?? 0) };
}

export const riding = (r: Rider) => r.finishTime === null;
export const kopmanOf = (state: RaceState, team: string) => state.riders.find((r) => r.team === team && r.kopman);
const km = (d: number) => Math.round(Math.max(0, d) / 100) / 10;

/** Riders less than 15 m apart form a group, front group first. */
export function groupsOf(state: RaceState) {
  const order = state.riders.filter(riding).sort((a, b) => b.distance - a.distance || a.id.localeCompare(b.id));
  const groups: Rider[][] = [];
  for (const r of order) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].distance - r.distance <= GROUP_GAP) last.push(r);
    else groups.push([r]);
  }
  return groups;
}

export function climbAt(course: Course, distance: number) {
  return course.features.find((f) => f.kind === "klim" && distance >= f.start && distance < f.end);
}
const lastClimbOf = (course: Course) => [...course.features].reverse().find((f) => f.kind === "klim");
export const uphillFinish = (course: Course) => {
  const last = lastClimbOf(course);
  return !!last && course.length - last.end < 2500;
};

type Context = { groups: Rider[][]; groupIndex: Map<string, number>; byId: Map<string, Rider> };

function setMode(r: Rider, mode: Mode, until = 0, pull = 1, target: string | null = null) {
  r.mode = mode;
  r.modeUntil = until;
  r.pull = pull;
  r.target = target;
}

function log(state: RaceState, r: Rider | null, kind: RaceEvent["kind"], text?: string) {
  state.events.push({ t: state.time, km: km(r ? r.distance : 0), kind, rider: r?.id, text });
  if (state.events.length > 120) state.events.shift();
}

/** A bot's (or an unmanaged rider's) choice, made every five seconds. */
function decide(state: RaceState, r: Rider, ctx: Context, index: number) {
  // The sprint goes before any order.
  if (!state.course.tt && state.course.length - r.distance < r.sprintAt && r.wbal > 0.1 * r.wprime && r.mode !== "sprint") { r.override = null; setMode(r, "sprint"); return; }
  if (r.override) {
    const o = r.override;
    if ((o.untilTime !== undefined && state.time >= o.untilTime) || (o.untilDistance !== undefined && r.distance >= o.untilDistance)) r.override = null;
    else return;
  }
  if (state.scripted && r.team === PLAYER_TEAM) {
    if (r.mode === "sprint") return;
    // Dropped and a group in sight: ride back at threshold, as any rider would.
    const gi = ctx.groupIndex.get(r.id) ?? 0;
    const ahead = gi > 0 ? ctx.groups[gi - 1] : null;
    const alone = ctx.groups[gi].length <= 2;
    setMode(r, ahead && alone && ahead[ahead.length - 1].distance - r.distance < 600 ? "tempo" : "mee");
    return;
  }
  const course = state.course;
  if (course.tt) { setMode(r, "tempo"); return; }
  const remaining = course.length - r.distance;
  const frac = r.distance / course.length;
  const chance = (salt: number) => randomAt(state.seed, state.tick * 131 + index * 7919 + salt);
  if (r.mode === "sprint") return;
  if (remaining < r.sprintAt && r.wbal > 0.1 * r.wprime) { setMode(r, "sprint"); return; }
  if ((r.mode === "aanval" || r.mode === "volgen") && state.time < r.modeUntil) return;

  const gi = ctx.groupIndex.get(r.id) ?? 0;
  const group = ctx.groups[gi];
  const kopman = kopmanOf(state, r.team);
  const kopmanHere = !!kopman && riding(kopman) && ctx.groupIndex.get(kopman.id) === gi;
  const grade = gradeAt(course, r.distance);

  // The break of the day: go early, share the work, sit up once caught.
  if (r.breakaway) {
    if (state.time < 240 && r.distance < 6000) { if (r.mode !== "aanval") { setMode(r, "aanval", state.time + 45); } return; }
    if (group.length > 8) {
      r.breakaway = false;
      if (state.breakAnnounced && !group.some((x) => x.breakaway)) { log(state, r, "ingelopen"); state.breakAnnounced = false; }
    } else { setMode(r, "kop", 0, 0.9); return; }
  }

  // Go with an attack close by, if you are strong enough to matter.
  const attacker = state.riders.find((x) => riding(x) && x.team !== r.team && x.mode === "aanval" && !x.breakaway && x.distance > r.distance && x.distance - r.distance < 60);
  if (attacker && r.wbal > 0.5 * r.wprime && (r.kopman || r.card.overall >= attacker.card.overall - 2) && chance(1) < (r.kopman ? 0.55 : 0.2)) {
    setMode(r, "volgen", state.time + 35, 1, attacker.id);
    return;
  }

  // Lead-out on a flat finish: two helpers ride hard, the kopman follows.
  if (!uphillFinish(course) && remaining < 2500 && kopman && kopmanHere && kopman.card.stats.sprint >= 68) {
    if (r.kopman) {
      const helper = group.find((x) => x.team === r.team && x !== r && x.distance > r.distance && x.mode === "kop");
      setMode(r, helper ? "volgen" : "mee", state.time + 6, 1, helper?.id ?? null);
      return;
    }
    const leading = group.filter((x) => x.team === r.team && x !== r && x.mode === "kop").length;
    if (leading < 2 && r.wbal > 0.25 * r.wprime) { setMode(r, "kop", 0, 1.15); return; }
  }

  const climb = climbAt(course, r.distance);
  const lastClimb = lastClimbOf(course);
  const onLastClimb = !!climb && climb === lastClimb;
  // Attacks: climbers on the decisive climbs, strong men on the cobbles, punchers late.
  if (!state.scripted && state.time > r.cooldown && r.wbal > 0.7 * r.wprime) {
    const s = r.card.stats;
    let p = 0;
    if (climb && grade >= 0.035 && climb.end - r.distance > 300 && (frac > 0.5 || onLastClimb) && (r.kopman || s.klim >= 74)) p = 0.05 * clamp((s.klim - 55) / 35, 0, 1.2) * (onLastClimb ? 2.5 : 1);
    else if (surfaceAt(course, r.distance) === "kasseien" && frac > 0.45 && s.kasseien >= 72 && (r.kopman || r.card.overall >= 72)) p = 0.04;
    else if (remaining < 15000 && remaining > 2500 && (r.card.type === "klassieker" || r.card.type === "allrounder") && r.card.overall >= 68) p = 0.004;
    if (p > 0 && chance(2) < p) {
      setMode(r, "aanval", state.time + 25);
      r.cooldown = state.time + 120;
      log(state, r, "aanval");
      return;
    }
  }

  // On the last climb, helpers of a climber set the pace.
  if (onLastClimb && kopmanHere && !r.kopman && kopman && (kopman.card.type === "klimmer" || kopman.card.type === "allrounder") && r.wbal > 0.3 * r.wprime) {
    setMode(r, "kop", 0, 1);
    return;
  }

  // Chase: no teammate up the road, the kopman is here, and he could win this.
  if (gi > 0 && kopmanHere && !r.kopman && r.wbal > 0.3 * r.wprime) {
    const teamAhead = ctx.groups.slice(0, gi).some((g) => g.some((x) => x.team === r.team));
    if (!teamAhead) {
      const ahead = ctx.groups[gi - 1];
      const gapSeconds = (ahead[ahead.length - 1].distance - group[0].distance) / Math.max(r.speed, 5);
      const weights = courseWeights(course);
      // Only teams with nobody up the road chase; the three with the best kopman for this course do the work.
      const free = (team: string) => !ctx.groups.slice(0, gi).some((g) => g.some((x) => x.team === team));
      const rank = group.filter((x) => x.kopman && free(x.team)).map((x) => ({ team: x.team, fit: fitFor(x.card, weights) })).sort((a, b) => b.fit - a.fit || a.team.localeCompare(b.team)).findIndex((x) => x.team === r.team);
      const pulling = group.filter((x) => x.team === r.team && x !== r && x.mode === "kop").length;
      if (rank >= 0 && rank < 3 && pulling < 2 && (frac >= 0.45 || gapSeconds > 150)) { setMode(r, "kop", 0, frac >= 0.8 ? 1.05 : frac >= 0.45 ? 1 : 0.92); return; }
    }
  }
  setMode(r, "mee");
}

export function stepRace(state: RaceState) {
  if (state.finished) return state;
  const course = state.course;
  const order = state.riders.filter(riding).sort((a, b) => b.distance - a.distance || a.id.localeCompare(b.id));
  const groups: Rider[][] = [];
  const groupIndex = new Map<string, number>();
  for (const r of order) {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].distance - r.distance <= GROUP_GAP) last.push(r);
    else groups.push([r]);
    groupIndex.set(r.id, groups.length - 1);
  }
  const ctx: Context = { groups, groupIndex, byId: new Map(state.riders.map((r) => [r.id, r])) };
  order.forEach((r) => {
    const index = state.riders.indexOf(r);
    if ((state.tick + index) % 5 === 0) decide(state, r, ctx, index);
  });
  // The break is a fact once it is half a minute clear.
  if (!state.breakAnnounced && groups.length > 1 && groups[0].every((r) => r.breakaway) && groups[0][groups[0].length - 1].distance - groups[1][0].distance > 300) {
    state.breakAnnounced = true;
    log(state, groups[0][0], "ontsnapping", String(groups[0].length));
  }

  // Positions and speeds at the start of the step, so the update order does not matter.
  const at = order.map((r) => r.distance);
  const pace0 = order.map((r) => r.speed);
  const slot = new Map(order.map((r, i) => [r.id, i]));
  const groupSize = order.map((r) => groups[groupIndex.get(r.id)!].length);
  for (let i = 0; i < order.length; i++) {
    const r = order[i];
    const here = at[i];
    const grade = gradeAt(course, here);
    const surface = surfaceAt(course, here);
    const remaining = course.length - here;
    const cp = cpAt(r, grade);
    let count = 0;
    let nearest = Infinity;
    for (let j = i - 1; j >= 0 && at[j] - here < GROUP_GAP; j--) {
      const gap = at[j] - here;
      if (gap > 0.3) { count++; nearest = Math.min(nearest, gap); }
    }
    const fade = nearest <= SHELTER_FULL ? 1 : clamp((SHELTER_END - nearest) / (SHELTER_END - SHELTER_FULL), 0, 1);
    const saving = course.tt ? 0 : SHELTER[Math.min(count, 3)] * fade;
    r.sheltered = saving >= 0.1;
    const mass = r.mass + r.bikeKg;
    const crr = CRR[surface] * (surface === "asfalt" ? 1 : r.crrFactor) * r.crrScale;
    const cda = r.cda * (1 - saving);
    const sinA = grade / Math.sqrt(1 + grade * grade), cosA = 1 / Math.sqrt(1 + grade * grade);
    const resist = (v: number) => 0.5 * AIR * cda * v * v + crr * mass * G * cosA + mass * G * sinA;
    const v = Math.max(r.speed, 2);
    const o = r.override;
    const mode = o?.mode ?? r.mode;
    const pull = o?.pull ?? r.pull;
    const targetId = o?.target ?? r.target;

    // Hold a wheel: ride the speed of the riders just ahead and close the gap, up to a cap.
    const hold = (w: number, cap: number) => {
      const gap = at[w] - here;
      let pace = 0, n = 0;
      for (let j = w; j >= 0 && at[j] - at[w] < 15; j--) { pace += pace0[j]; n++; }
      const want = pace / n + clamp((gap - 1.5) * 0.3, -1, 2.5);
      const p = v * (resist(v) + mass * (want - v) / 3) / r.eff;
      return clamp(p, 0, cp * cap);
    };
    let wheel = -1;
    if (i > 0 && at[i - 1] - here < WHEEL_RANGE) {
      wheel = i - 1;
      // Don't go down with a rider who lets the wheel go: jump across to the next one.
      for (let hops = 0; wheel > 0 && hops < 3; hops++) {
        if (at[wheel - 1] - at[wheel] <= 5 || at[wheel - 1] - here >= WHEEL_RANGE) break;
        wheel--;
      }
    }
    // On the front of a big group the turns are short and hard: up to +15 % with six or more behind.
    const behind = Math.min(groupSize[i] - 1, 6);
    const frontBase = (grade >= 0.03 ? 0.9 : here / course.length > 0.85 ? 0.85 : 0.76) * (1 + 0.15 * behind / 6);
    // Riding along does not follow an attack: let the wheel go, unless you chose to follow it.
    const wheelGoes = wheel >= 0 && (order[wheel].mode === "aanval" || order[wheel].mode === "sprint" || (order[wheel].breakaway && state.time < 300));
    const rideCap = wheelGoes ? 1 : r.sheltered ? 1.08 : 1.2;

    let power: number;
    if (mode === "tempo") power = cp * (remaining < 1000 ? 1.08 : 0.99);
    else if (mode === "aanval") power = cp * 1.45;
    else if (mode === "sprint") power = Math.max(cp * 1.4, r.sprintW);
    else if (mode === "kop") power = cp * pull;
    else if (mode === "wachten") {
      const leader = targetId ? ctx.byId.get(targetId) : undefined;
      if (leader && riding(leader) && leader.distance < here - 3) power = cp * 0.45;
      else {
        // The kopman is back on: tow him for three kilometres.
        power = cp;
        r.override = { mode: "kop", pull: 1.02, untilDistance: r.distance + 3000 };
        if (leader && riding(leader)) leader.override = { mode: "volgen", target: r.id, untilDistance: r.distance + 3000 };
      }
    } else if (mode === "volgen") {
      const t = targetId ? slot.get(targetId) : undefined;
      if (t !== undefined && t < i && at[t] - here < FOLLOW_RANGE) power = hold(t, 1.5);
      else power = wheel >= 0 ? hold(wheel, rideCap) : cp * frontBase;
    } else if (wheel >= 0) power = hold(wheel, mode === "sparen" ? Math.min(0.95, rideCap) : rideCap);
    else power = cp * (mode === "sparen" ? 0.7 : frontBase);
    if (r.wbal <= 0) power = Math.min(power, cp);
    r.effort = +(power / cp).toFixed(2);

    if (power > cp) r.wbal = Math.max(0, r.wbal - (power - cp) * STEP);
    else r.wbal = r.wprime - (r.wprime - r.wbal) * Math.exp(-STEP * (1 + r.recovery) / (546 * Math.exp(-0.01 * (cp - power)) + 316));
    const accel = (r.eff * power / v - resist(r.speed)) / (mass * 1.04);
    const vmax = grade < -0.02 ? r.vmax : 25;
    r.speed = clamp(r.speed + accel * STEP, 1, vmax);
    const before = r.distance;
    r.distance += r.speed * STEP;
    if (r.distance >= course.length) {
      r.finishTime = state.time + (course.length - before) / r.speed;
      if (!state.events.some((e) => e.kind === "finish")) log(state, r, "finish");
    }
  }
  state.time += STEP;
  state.tick++;
  state.finished = state.riders.every((r) => !riding(r)) || state.time >= state.maxTime;
  return state;
}

export function runToEnd(state: RaceState) {
  while (!state.finished) stepRace(state);
  return state;
}

export type Placing = { id: string; team: string; place: number; time: number | null; gap: number | null };

/** Finish order. Riders who cross the line together get the same time, as in a road race. */
export function results(state: RaceState): Placing[] {
  const finished = state.riders.filter((r) => r.finishTime !== null).sort((a, b) => a.finishTime! - b.finishTime! || a.id.localeCompare(b.id));
  const rest = state.riders.filter((r) => r.finishTime === null).sort((a, b) => b.distance - a.distance || a.id.localeCompare(b.id));
  const winner = finished[0]?.finishTime ?? null;
  let groupTime = winner ?? 0;
  let previous = winner ?? 0;
  const out: Placing[] = finished.map((r, i) => {
    if (r.finishTime! - previous > 1) groupTime = r.finishTime!;
    previous = r.finishTime!;
    return { id: r.id, team: r.team, place: i + 1, time: groupTime, gap: winner === null ? null : Math.round(groupTime - winner) };
  });
  rest.forEach((r) => out.push({ id: r.id, team: r.team, place: 0, time: null, gap: null }));
  return out;
}
