import { COURSES, terrainAt } from "./courses";
import { basicRider } from "./roster";
import { GAME_VERSION, type GameRider, type PlayerCommand, type RaceConfig, type RaceState, type RiderState } from "./types";

export const STEP_SECONDS = 0.2;
export const MAX_RACE_SECONDS = 1800;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
export function randomAt(seed: number, index: number) {
  let n = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function createRace(config: RaceConfig, roster: GameRider[]): RaceState {
  const player = roster.find((r) => r.id === config.playerId);
  if (!player) throw new Error("Je renner ontbreekt.");
  const opponents = [...new Map(roster.filter((r) => r.id !== player.id).map((r) => [r.id, r])).values()]
    .map((rider, index) => ({ rider, rank: randomAt(config.seed, index) }))
    .sort((a, b) => a.rank - b.rank).slice(0, 23).map((item) => item.rider);
  while (opponents.length < 7) opponents.push(basicRider(`guest:${opponents.length}`, `Gast ${opponents.length + 1}`));
  const riders = [...opponents, player].sort((a, b) => a.id.localeCompare(b.id));
  const course = COURSES[config.courseId];
  const climbing = course.segments.reduce((total, s, i) => total + (s.end - (course.segments[i - 1]?.end ?? 0)) * Math.max(0, s.grade), 0) / course.length;
  const strength = (r: GameRider) => r.flat * (1 - climbing * 8) + r.climb * climbing * 8;
  const strongest = Math.max(...riders.map(strength));
  return {
    version: GAME_VERSION, config, tick: 0, finished: false,
    riders: riders.map((rider, i) => {
      const compensation = clamp((strongest - strength(rider)) * 2.2, 0, 0.9);
      return { rider, distance: -Math.floor(i / 4) * 1.8, lane: (i % 4 - 1.5) * 0.85, speed: 10, energy: 100 + compensation * 60, maxEnergy: 100 + compensation * 60, reserve: 100, hydration: 100, recovery: 1 + compensation, effort: 0.72, tactic: "wheel", targetId: null, gels: 2, bottles: 2, fed: false, eating: 0, drinking: 0, digesting: 0, sheltered: false, finishTime: null, attacks: 0, shelteredSeconds: 0 };
    }),
  };
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
  }
}
export function botCommands(state: RaceState, index: number): PlayerCommand[] {
  const r = state.riders[index];
  const course = COURSES[state.config.courseId];
  const remaining = course.length - r.distance;
  const grade = terrainAt(course, r.distance).grade;
  const commands: PlayerCommand[] = [];
  if (r.energy < r.maxEnergy * 0.62 && r.gels) commands.push({ type: "eat" });
  if (r.hydration < 60 && r.bottles) commands.push({ type: "drink" });
  const roll = randomAt(state.config.seed, Math.floor(state.tick / 50) * 29 + index);
  let effort = 0.75 + (roll - 0.5) * 0.07;
  let tactic: RiderState["tactic"] = "wheel";
  const final = remaining < (r.rider.kind === "sprinter" ? 480 : 800);
  const terrainAttack = (r.rider.kind === "climber" && grade > 0.04) || (r.rider.kind === "puncher" && grade > 0.02);
  if (final && r.reserve > 10) { effort = 1.2; tactic = "attack"; }
  else if ((terrainAttack || roll > 0.94) && r.reserve > 65 && r.energy > 55) { effort = 1.08; tactic = "attack"; }
  else if (r.rider.kind === "tter" && roll > 0.5 && r.energy > 50) { effort = 0.83; tactic = "pull"; }
  if (r.reserve < 25 && !final) { effort = 0.62; tactic = "wheel"; }
  if (r.energy < 20) effort = 0.55;
  commands.push({ type: "effort", value: effort }, { type: "tactic", value: tactic });
  return commands;
}
/** Mutates a private simulation instance; rendering receives snapshots. No wall-clock or network. */
export function stepRace(state: RaceState, commands: PlayerCommand[] = [], botPolicy = botCommands) {
  if (state.finished) return state;
  const player = state.riders.find((r) => r.rider.id === state.config.playerId)!;
  for (const command of commands) applyCommand(player, command);
  if (state.tick % 10 === 0) state.riders.forEach((r, i) => {
    if (r !== player) for (const command of botPolicy(state, i)) applyCommand(r, command);
  });
  const course = COURSES[state.config.courseId];
  const positions = state.riders.map((r) => ({ id: r.rider.id, distance: r.distance, lane: r.lane, speed: r.speed, finished: r.finishTime !== null }));
  const leader = Math.max(...positions.filter((p) => !p.finished).map((p) => p.distance));
  for (const r of state.riders) {
    if (r.finishTime !== null) continue;
    const terrain = terrainAt(course, r.distance);
    const ahead = positions.filter((p) => !p.finished && p.id !== r.rider.id && p.distance > r.distance && p.distance - r.distance < 14)
      .sort((a, b) => a.distance - b.distance);
    const requested = ahead.find((p) => p.id === r.targetId);
    const wheel = requested ?? ahead[0];
    const inWheel = r.tactic === "wheel" && wheel;
    const desiredLane = inWheel ? wheel.lane : r.tactic === "attack" || r.tactic === "front" ? 2.8 : r.lane;
    r.lane += clamp(desiredLane - r.lane, -STEP_SECONDS * 1.2, STEP_SECONDS * 1.2);
    r.sheltered = Boolean(wheel && Math.abs(wheel.lane - r.lane) < 1 && wheel.distance - r.distance < 10 && r.tactic === "wheel" && terrain.grade < 0.05);
    if (r.sheltered) r.shelteredSeconds += STEP_SECONDS;
    let effort = r.effort;
    if (r.tactic === "attack") effort = Math.max(effort, 1.08);
    if (r.tactic === "front" && leader - r.distance > 3) effort = Math.max(effort, 0.92);
    if (r.eating > 0 || r.drinking > 0) effort = Math.min(effort, 0.58);
    const requestedEffort = effort;
    // An exhausted rider must actually choose recovery. Otherwise an attack held
    // forever oscillates between a free sprint and automatic regeneration.
    if (r.reserve < 1) effort = Math.min(effort, 0.48);
    const cost = effort * (r.sheltered ? 0.62 : 1) * (1 + Math.max(terrain.wind, 0) * 0.1);
    r.energy = clamp(r.energy - (0.03 + cost * cost * 0.2) * STEP_SECONDS, 0, r.maxEnergy);
    r.reserve = clamp(r.reserve + (requestedEffort > 0.86 ? -(requestedEffort - 0.86) * 13 : (0.9 - cost) * 3.6 * r.recovery) * STEP_SECONDS, 0, 100);
    r.hydration = clamp(r.hydration - (0.045 + effort * 0.08) * STEP_SECONDS, 0, 100);
    if (r.digesting > 0) { const amount = Math.min(r.digesting, STEP_SECONDS * 0.7); r.energy = Math.min(r.maxEnergy, r.energy + amount); r.digesting -= amount; }
    if (r.drinking > 0) r.hydration = Math.min(100, r.hydration + 11 * STEP_SECONDS);
    r.eating = Math.max(0, r.eating - STEP_SECONDS);
    r.drinking = Math.max(0, r.drinking - STEP_SECONDS);
    if (!r.fed && r.distance >= course.length * 0.52) { r.fed = true; r.gels = Math.min(3, r.gels + 1); r.bottles = Math.min(3, r.bottles + 1); }
    const hill = clamp(terrain.grade * 12, 0, 1);
    const ability = r.rider.flat * (1 - hill) + r.rider.climb * hill;
    const sprint = effort > 1 ? 1 + (r.rider.sprint - 1) * (effort - 1) * 3 : 1;
    const fatigue = (0.58 + 0.42 * clamp(r.energy / 22, 0, 1)) * (0.78 + 0.22 * clamp(r.hydration / 22, 0, 1));
    let target = 15 * ability * sprint * Math.pow(effort / 0.78, 0.42) * fatigue / (1 + terrain.grade * 6 + Math.max(0, terrain.wind) * (r.sheltered ? 0.015 : 0.055));
    if (r.sheltered) target *= 1.045;
    // Following a wheel controls spacing but cannot give free speed or teleport to it.
    if (inWheel && wheel.distance - r.distance < 2.5) target = Math.min(target, wheel.speed);
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
