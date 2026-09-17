import { COURSES, terrainAt } from "./courses";
import { basicRider } from "./roster";
import { GAME_VERSION, type CardId, type GameRider, type PlayerCommand, type RaceConfig, type RaceState, type RiderState } from "./types";

export const STEP_SECONDS = 0.2;
export const MAX_RACE_SECONDS = 1800;
/** Riders in "wheel" still chase a group this far ahead; beyond it they are dropped. */
const CHASE_RANGE = 150;
export const CARD_IDS: CardId[] = ["tailwind", "legs", "second", "surprise"];
/** Timed cards run for these seconds; the others apply instantly. */
export const CARD_SECONDS: Partial<Record<CardId, number>> = { tailwind: 20, surprise: 10 };
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function randomAt(seed: number, index: number) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
/** Per-race wind: the course sets the character, the seed decides how hard it blows today. */
export function conditionsAt(config: RaceConfig, distance: number) {
  const course = COURSES[config.courseId];
  const terrain = terrainAt(course, distance);
  const k = course.segments.indexOf(terrain);
  const wind = clamp(terrain.wind * (0.4 + randomAt(config.seed, 900 + k) * 1.3) + (randomAt(config.seed, 950 + k) - 0.5) * 0.6, -0.4, 1.6);
  return { grade: terrain.grade, wind };
}
function courseClimbing(config: RaceConfig) {
  const course = COURSES[config.courseId];
  return course.segments.reduce((total, s, i) => total + (s.end - (course.segments[i - 1]?.end ?? 0)) * Math.max(0, s.grade), 0) / course.length;
}
export function createRace(config: RaceConfig, roster: GameRider[]): RaceState {
  const player = roster.find((r) => r.id === config.playerId);
  if (!player) throw new Error("Je renner ontbreekt.");
  const opponents = [...new Map(roster.filter((r) => r.id !== player.id).map((r) => [r.id, r])).values()]
    .map((rider, index) => ({ rider, rank: randomAt(config.seed, index) }))
    .sort((a, b) => a.rank - b.rank).slice(0, 23).map((item) => item.rider);
  while (opponents.length < 7) opponents.push(basicRider(`guest:${opponents.length}`, `Gast ${opponents.length + 1}`));
  const riders = [...opponents, player].sort((a, b) => a.id.localeCompare(b.id));
  const climbing = courseClimbing(config);
  const strength = (r: GameRider) => r.flat * (1 - climbing * 8) + r.climb * climbing * 8;
  const strongest = Math.max(...riders.map(strength));
  const compensation = riders.map((rider) => clamp((strongest - strength(rider)) * 2.2, 0, 0.9));
  const states: RiderState[] = riders.map((rider, i) => {
    const c = compensation[i];
    const handSize = 2 + (c >= 0.3 ? 1 : 0) + (c >= 0.6 ? 1 : 0);
    const cards = Array.from({ length: handSize }, (_, n) => CARD_IDS[Math.floor(randomAt(config.seed, 4000 + i * 17 + n) * CARD_IDS.length)]);
    return {
      rider, distance: -Math.floor(i / 4) * 1.8, lane: (i % 4 - 1.5) * 0.85, speed: 10,
      energy: 100 + c * 50, maxEnergy: 100 + c * 50, reserve: 100, hydration: 100, recovery: 1 + c,
      effort: 0.75, tactic: "wheel", targetId: null, gels: 2, bottles: 2, fed: false, eating: 0, drinking: 0, digesting: 0,
      sheltered: false, finishTime: null, attacks: 0, shelteredSeconds: 0,
      form: +(0.94 + randomAt(config.seed, 3000 + i) * 0.12).toFixed(4), cards, boost: null, captainId: null,
    };
  });
  assignHelpers(states, compensation, riders.map(strength), config);
  return { version: GAME_VERSION, config, tick: 0, finished: false, riders: states };
}
/**
 * Weaker riders get teammates who ride in front of them; the strongest ride alone.
 * By strength: the weakest third can get helpers, the middle third supplies them,
 * the strongest third never works for someone else. Team size follows the gap.
 */
function assignHelpers(states: RiderState[], compensation: number[], strengths: number[], config: RaceConfig) {
  const wanted = (c: number) => (c >= 0.36 ? 3 : c >= 0.22 ? 2 : c >= 0.1 ? 1 : 0);
  const third = Math.floor(states.length / 3);
  const ranked = states.map((s, i) => ({ s, i })).sort((a, b) => strengths[a.i] - strengths[b.i] || a.s.rider.id.localeCompare(b.s.rider.id));
  const weakest = new Set(ranked.slice(0, third).map((x) => x.s));
  // You always count as weak enough to lead a team when the gap asks for it.
  const player = ranked.find((x) => x.s.rider.id === config.playerId)!;
  const captains = ranked.filter((x) => (weakest.has(x.s) || x === player) && wanted(compensation[x.i]) > 0)
    .sort((a, b) => compensation[b.i] - compensation[a.i] || Number(b === player) - Number(a === player));
  const pool = ranked.slice(0, states.length - third)
    .filter((x) => !captains.includes(x) && x !== player)
    .sort((a, b) => randomAt(config.seed, 8000 + a.i) - randomAt(config.seed, 8000 + b.i))
    .map((x) => x.s);
  let given = 0;
  for (const captain of captains) {
    for (let n = 0; n < wanted(compensation[captain.i]) && pool.length && given < third; n++, given++) pool.shift()!.captainId = captain.s.rider.id;
  }
}
export function helpersOf(state: RaceState, id: string) {
  return state.riders.filter((r) => r.captainId === id);
}
export function applyCommand(rider: RiderState, command: PlayerCommand) {
  if (rider.finishTime !== null) return;
  switch (command.type) {
    case "effort": rider.effort = clamp(command.value, 0.4, 1.25); break;
    case "tactic":
      if (command.value === "attack" && rider.tactic !== "attack") rider.attacks++;
      rider.tactic = command.value;
      rider.targetId = command.targetId ?? null;
      break;
    case "eat":
      if (rider.gels > 0 && rider.eating === 0 && rider.drinking === 0) { rider.gels--; rider.eating = 5; rider.digesting += 30; }
      break;
    case "drink":
      if (rider.bottles > 0 && rider.drinking === 0 && rider.eating === 0) { rider.bottles--; rider.drinking = 4; }
      break;
    case "card": {
      const index = rider.cards.indexOf(command.card);
      const timed = CARD_SECONDS[command.card];
      if (index < 0 || (timed && rider.boost)) break;
      rider.cards.splice(index, 1);
      if (command.card === "legs") rider.reserve = 100;
      if (command.card === "second") { rider.energy = Math.min(rider.maxEnergy, rider.energy + 22); rider.hydration = Math.min(100, rider.hydration + 15); }
      if (timed) rider.boost = { card: command.card, left: timed };
      if (command.card === "surprise") rider.attacks++;
      break;
    }
  }
}
/** Seeded character per race: how eager, and from how far out the final move comes. */
export function personality(state: RaceState, index: number) {
  const r = state.riders[index];
  const base = { sprinter: 350, puncher: 700, climber: 900, tter: 1400, allrounder: 800 }[r.rider.kind];
  return {
    aggression: randomAt(state.config.seed, 5000 + index * 7),
    finalAt: base * (0.55 + randomAt(state.config.seed, 6000 + index * 11) * 1.1),
  };
}
export function botCommands(state: RaceState, index: number): PlayerCommand[] {
  const r = state.riders[index];
  const course = COURSES[state.config.courseId];
  const remaining = course.length - r.distance;
  const { grade, wind } = conditionsAt(state.config, r.distance);
  const { aggression, finalAt } = personality(state, index);
  const roll = randomAt(state.config.seed, Math.floor(state.tick / 50) * 29 + index);
  const roll2 = randomAt(state.config.seed, Math.floor(state.tick / 35) * 31 + index + 20000);
  const commands: PlayerCommand[] = [];
  const has = (card: CardId) => r.cards.includes(card);
  if (r.energy < r.maxEnergy * (0.5 + aggression * 0.2) && r.gels) commands.push({ type: "eat" });
  if (r.hydration < 45 + roll * 15 && r.bottles) commands.push({ type: "drink" });
  if (has("second") && r.energy < r.maxEnergy * 0.3) commands.push({ type: "card", card: "second" });
  const final = remaining < finalAt;

  const captain = r.captainId ? state.riders.find((x) => x.rider.id === r.captainId) : undefined;
  if (captain && captain.finishTime === null && r.energy > r.maxEnergy * 0.3 && remaining > 150) {
    const gap = captain.distance - r.distance;
    // Distance from the captain to the nearest rival ahead: a helper closes that gap.
    const rivalGap = Math.min(...state.riders.filter((x) => x.finishTime === null && x.captainId !== captain.rider.id && x !== captain && x.distance > captain.distance).map((x) => x.distance - captain.distance), Infinity);
    const chase = rivalGap > 8 && rivalGap < 200;
    // A helper far ahead waits. Otherwise it rides the highest tempo that does not burn
    // its attack reserve, and only goes deep for the lead-out.
    const effort = gap < -30 ? 0.55 : remaining < 450 ? 1.15 : gap > 0 || chase ? 0.86 : clamp(Math.max(captain.effort, 0.8), 0.6, 0.86);
    commands.push({ type: "effort", value: effort }, { type: "tactic", value: gap > 30 ? "wheel" : "pull" });
    return commands;
  }

  // Only trust a helper that is actually setting pace, not one that blew up.
  const escort = state.riders.find((x) => x.captainId === r.rider.id && x.finishTime === null && x.tactic === "pull" && x.speed >= r.speed - 1 && x.distance > r.distance && x.distance - r.distance < 12 && x.energy > x.maxEnergy * 0.3);
  if (escort && !(final && remaining < 220)) {
    commands.push({ type: "effort", value: final ? 1.05 : 0.72 + (roll - 0.5) * 0.08 }, { type: "tactic", value: "wheel", targetId: escort.rider.id });
    return commands;
  }
  let effort = 0.72 + aggression * 0.06 + (roll - 0.5) * 0.08;
  let tactic: RiderState["tactic"] = "wheel";
  let targetId: string | undefined;
  const attacker = state.riders.find((x) => x !== r && x.finishTime === null && (x.tactic === "attack" || x.boost?.card === "surprise") && x.distance > r.distance && x.distance - r.distance < 25);
  const leading = !state.riders.some((x) => x !== r && x.finishTime === null && x.distance > r.distance);
  const chasers = state.riders.filter((x) => x !== r && x.finishTime === null && r.distance - x.distance < 12 && x.distance < r.distance).length;
  const terrainAttack = (r.rider.kind === "climber" && grade > 0.04) || (r.rider.kind === "puncher" && grade > 0.02);
  if (final && r.reserve > 10) {
    effort = 1.2; tactic = "attack";
    if (has("surprise") && roll2 < 0.6 && !r.boost) commands.push({ type: "card", card: "surprise" });
    if (has("legs") && r.reserve < 40) commands.push({ type: "card", card: "legs" });
  } else if (attacker && r.reserve > 45 && roll2 < 0.2 + aggression * 0.5) {
    effort = 1.05; targetId = attacker.rider.id;
  } else if (leading && chasers === 0 && r.distance > 300 && r.energy > r.maxEnergy * 0.4) {
    effort = 0.9; tactic = "pull";
  } else if ((terrainAttack && roll < 0.35 + aggression * 0.4) || roll > 0.975 - aggression * 0.05) {
    if (r.reserve > 65 && r.energy > 55) { effort = 1.08; tactic = "attack"; }
  } else if (r.rider.kind === "tter" && roll > 0.5 && r.energy > 50) { effort = 0.83; tactic = "pull"; }
  if (has("tailwind") && !r.boost && wind > 0.5 && !r.sheltered && roll2 > 0.85) commands.push({ type: "card", card: "tailwind" });
  if (has("legs") && r.reserve < 20 && remaining < finalAt * 1.6) commands.push({ type: "card", card: "legs" });
  if (r.reserve < 25 && !final) { effort = 0.62; tactic = "wheel"; }
  if (r.energy < 20) effort = 0.55;
  commands.push({ type: "effort", value: effort }, { type: "tactic", value: tactic, targetId });
  return commands;
}
const DRAFT = 1.12;
/** Target speed for a rider at an effort, in the wind or in a wheel. */
function speedFor(r: RiderState, grade: number, wind: number, effort: number, sheltered: boolean) {
  const hill = clamp(grade * 12, 0, 1);
  const ability = (r.rider.flat * (1 - hill) + r.rider.climb * hill) * r.form;
  const sprint = effort > 1 ? 1 + (r.rider.sprint - 1) * (effort - 1) * 3 : 1;
  const fatigue = (0.58 + 0.42 * clamp(r.energy / 22, 0, 1)) * (0.8 + 0.2 * clamp(r.hydration / 40, 0, 1));
  // The draft must be strong enough that an equal rider at the same effort stays in the group.
  return 15 * ability * sprint * Math.pow(effort / 0.78, 0.42) * fatigue / (1 + grade * 6 + Math.max(0, wind) * (sheltered ? 0.015 : 0.055) + Math.min(0, wind) * 0.03) * (sheltered ? DRAFT : 1);
}
/** Mutates a private simulation instance; rendering receives snapshots. No wall-clock or network. */
export function stepRace(state: RaceState, commands: PlayerCommand[] = [], botPolicy = botCommands) {
  if (state.finished) return state;
  const player = state.riders.find((r) => r.rider.id === state.config.playerId)!;
  for (const command of commands) applyCommand(player, command);
  // Staggered decisions: bots do not all react on the same tick.
  state.riders.forEach((r, i) => {
    if (r !== player && (state.tick + i * 7) % 10 === 0) for (const command of botPolicy(state, i)) applyCommand(r, command);
  });
  const course = COURSES[state.config.courseId];
  const positions = state.riders.map((r) => ({ id: r.rider.id, distance: r.distance, lane: r.lane, speed: r.speed, finished: r.finishTime !== null, tactic: r.tactic, boost: r.boost?.card }));
  const byId = new Map(positions.map((p) => [p.id, p]));
  const leader = Math.max(...positions.filter((p) => !p.finished).map((p) => p.distance));
  for (const r of state.riders) {
    if (r.finishTime !== null) continue;
    const terrain = conditionsAt(state.config, r.distance);
    const boost = r.boost?.card;
    const wind = boost === "tailwind" ? 0 : terrain.wind;
    const ahead = positions.filter((p) => !p.finished && p.id !== r.rider.id && p.distance > r.distance && p.distance - r.distance < 14)
      .sort((a, b) => a.distance - b.distance);
    const requested = ahead.find((p) => p.id === r.targetId);
    const wheel = requested ?? ahead[0];
    const inWheel = r.tactic === "wheel" && wheel;
    // Don't go down with a rider who lets a gap open: move around them to the next wheel.
    const beyond = inWheel && !requested ? positions.filter((p) => !p.finished && p.id !== r.rider.id && p.id !== wheel.id && p.distance > wheel.distance && p.distance - wheel.distance < CHASE_RANGE).sort((a, b) => a.distance - b.distance)[0] : undefined;
    // Only come around when you are actually faster in the wind than the wheel you leave.
    const bridging = Boolean(beyond && beyond.distance - wheel.distance > 6 && !state.riders.some((x) => x.rider.id === wheel.id && x.captainId === r.rider.id) && speedFor(r, terrain.grade, wind, 0.86, false) > wheel.speed + 0.3);
    // A helper lines up in front of its captain unless the captain is attacking.
    const captain = r.captainId ? byId.get(r.captainId) : undefined;
    const spot = 3 + 2.2 * state.riders.filter((x) => x.captainId === r.captainId && x.rider.id.localeCompare(r.rider.id) < 0).length;
    const escorting = Boolean(captain && !captain.finished && Math.abs(captain.distance - r.distance) < 30 && captain.tactic !== "attack" && captain.boost !== "surprise" && r.tactic === "pull");
    const desiredLane = escorting ? captain!.lane : bridging ? wheel.lane + (wheel.lane > 0 ? -1.4 : 1.4) : inWheel ? wheel.lane : r.tactic === "attack" || r.tactic === "front" ? 2.8 : r.lane;
    r.lane += clamp(desiredLane - r.lane, -STEP_SECONDS * 1.8, STEP_SECONDS * 1.8);
    // A teammate's wheel works harder: it holds a steady line, also on a climb.
    const teamWheel = Boolean(wheel && state.riders.some((x) => x.rider.id === wheel.id && x.captainId === r.rider.id));
    r.sheltered = Boolean(wheel && !bridging && Math.abs(wheel.lane - r.lane) < 1.3 && wheel.distance - r.distance < 10 && r.tactic === "wheel" && (terrain.grade < 0.05 || teamWheel));
    if (r.sheltered) r.shelteredSeconds += STEP_SECONDS;
    let effort = r.effort;
    if (r.tactic === "attack") effort = Math.max(effort, 1.08);
    if (boost === "surprise") effort = Math.max(effort, 1.15);
    if (r.tactic === "front" && leader - r.distance > 3) effort = Math.max(effort, 0.92);
    // "In het wiel" means staying with the group: a small gap is closed at the highest
    // tempo that does not burn the attack reserve. That costs energy, not a free ride.
    // A chasing group takes turns, so with more riders on the wheel it can hold a
    // higher tempo without burning anyone's attack reserve.
    let chasing = false;
    if (r.tactic === "wheel" && !r.sheltered) {
      const gap = Math.min(...positions.filter((p) => !p.finished && p.id !== r.rider.id && p.distance > r.distance).map((p) => p.distance - r.distance), Infinity);
      if (gap > 3.5 && gap < CHASE_RANGE) {
        const followers = positions.filter((p) => !p.finished && p.id !== r.rider.id && r.distance - p.distance > 0 && r.distance - p.distance < 15).length;
        effort = Math.max(effort, 0.86 + 0.03 * Math.min(followers, 4));
        chasing = true;
      }
    }
    if (r.eating > 0 || r.drinking > 0) effort = Math.min(effort, 0.58);
    const requestedEffort = boost === "surprise" || chasing ? Math.min(effort, 0.86) : effort;
    // An exhausted rider must actually choose recovery. Otherwise an attack held
    // forever oscillates between a free sprint and automatic regeneration.
    if (r.reserve < 1 && boost !== "surprise") effort = Math.min(effort, 0.48);
    const cost = effort * (r.sheltered ? (teamWheel ? 0.52 : 0.62) : 1) * (1 + Math.max(wind, 0) * 0.1) * (boost === "tailwind" ? 0.85 : 1);
    r.energy = clamp(r.energy - (0.03 + cost * cost * 0.2) * STEP_SECONDS, 0, r.maxEnergy);
    r.reserve = clamp(r.reserve + (requestedEffort > 0.86 ? -(requestedEffort - 0.86) * 13 : (0.9 - cost) * 3.6 * r.recovery) * STEP_SECONDS, 0, 100);
    r.hydration = clamp(r.hydration - (0.07 + effort * 0.1) * STEP_SECONDS, 0, 100);
    if (r.digesting > 0) { const amount = Math.min(r.digesting, STEP_SECONDS * 0.7); r.energy = Math.min(r.maxEnergy, r.energy + amount); r.digesting -= amount; }
    if (r.drinking > 0) r.hydration = Math.min(100, r.hydration + 11 * STEP_SECONDS);
    r.eating = Math.max(0, r.eating - STEP_SECONDS);
    r.drinking = Math.max(0, r.drinking - STEP_SECONDS);
    if (r.boost) { r.boost.left -= STEP_SECONDS; if (r.boost.left <= 1e-9) r.boost = null; }
    if (!r.fed && r.distance >= course.length * 0.52) { r.fed = true; r.gels = Math.min(3, r.gels + 1); r.bottles = Math.min(3, r.bottles + 1); }
    let target = speedFor(r, terrain.grade, wind, effort, r.sheltered);
    if (boost === "surprise") target *= 1.03;
    // Following a wheel controls spacing but cannot give free speed or teleport to it.
    // A teammate tows: on its wheel you go at its speed, not your own.
    if (teamWheel && r.sheltered && wheel.distance - r.distance < 6) target = Math.max(target, wheel.speed + 0.3);
    if (inWheel && !bridging && wheel.distance - r.distance < 2.5) target = Math.min(target, wheel.speed);
    // An escort that dropped its captain waits instead of riding away.
    if (escorting && r.distance - captain!.distance > spot + 3) target = Math.min(target, captain!.speed + (captain!.distance + spot - r.distance) * 0.4);
    r.speed += clamp(target - r.speed, -STEP_SECONDS * 3, STEP_SECONDS * 1.8);
    r.speed = clamp(r.speed, 2, 25);
    const previous = r.distance;
    r.distance += r.speed * STEP_SECONDS;
    if (r.distance >= course.length) r.finishTime = state.tick * STEP_SECONDS + (course.length - previous) / r.speed;
  }
  state.tick++;
  state.finished = state.riders.every((r) => r.finishTime !== null) || state.tick * STEP_SECONDS >= MAX_RACE_SECONDS;
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
