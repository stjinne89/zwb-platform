// Balance simulation for ZWBgame: how much does tactics matter? Every player
// strategy rides the same races (route × seed) in a field around its level; the
// output is the mean place per strategy plus how the races were decided.
// Run with `npm run zwbgame:balance`. Synthetic riders only.
import { botCommands, createRace, groupsOf, momentAt, standings, stepRace, STEP_SECONDS, stepsPerFrame, timeScale } from "../../src/lib/zwbgame/engine";
import { deriveRider } from "../../src/lib/zwbgame/roster";
import { gradeAt } from "../../src/lib/zwbgame/routes";
import type { GameRider, GameRoute, Mode, PlayerCommand, RaceState } from "../../src/lib/zwbgame/types";
import { createDrill, DRILLS, drillPassed } from "../../src/lib/zwbgame/drills";
import { fixtureRoutes } from "../../tests/fixtures/zwbgame/routes";

type Policy = (s: RaceState, i: number) => PlayerCommand[];
const mode = (value: Mode, targetId?: string): PlayerCommand => ({ type: "mode", value, targetId });
const remainingOf = (s: RaceState, i: number) => s.route.length - s.riders[i].distance;
const finale = (s: RaceState, i: number, at = 300): PlayerCommand[] | null => remainingOf(s, i) < at ? [mode("attack")] : null;

/** Ride along all race, sprint at 300 m: the passive player. */
const passive: Policy = (s, i) => finale(s, i) ?? [mode("ride")];
/** Save all race, sprint at 300 m. */
const saver: Policy = (s, i) => finale(s, i) ?? [mode("save")];
/** Attack whenever W′ is above 60 %. */
const reckless: Policy = (s, i) => { const r = s.riders[i]; return [mode(r.wbal > r.wprime * 0.6 || (r.mode === "attack" && r.wbal > 1) ? "attack" : "ride")]; };
/** In the wind all race. */
const fullGas: Policy = (s, i) => finale(s, i) ?? [mode("front")];
/**
 * What the research calls good Zwift racing: hard start, move up before a climb,
 * push over the top, cover a move in your group, close a gap to the group ahead
 * early, save in the wheel otherwise, and sprint late with the aero helmet.
 */
const tactician: Policy = (s, i) => {
  const r = s.riders[i];
  const remaining = remainingOf(s, i);
  const reserve = r.wbal / r.wprime;
  const commands: PlayerCommand[] = [];
  if (r.powerup === "aero" && remaining < 330) commands.push({ type: "powerup" });
  if (r.powerup === "feather" && gradeAt(s.route, r.distance) > 0.04) commands.push({ type: "powerup" });
  if (r.powerup === "draft" && r.sheltered && remaining < 2000) commands.push({ type: "powerup" });
  if (remaining < 280) return [...commands, mode("attack")];
  // A team time trial: wait for the fourth rider, ride the wheel, empty it at the end.
  if (s.config.mode === "zrl" && s.config.format === "ttt") return [{ type: "order", value: "four" }, mode(remaining < 500 ? "attack" : "ride")];
  // Down a steep descent out of the wheel: supertuck.
  const chasing = s.riders.some((x) => x !== r && x.finishTime === null && x.distance - r.distance > 20 && x.distance - r.distance < 150);
  if (gradeAt(s.route, r.distance) <= -0.03 && !r.sheltered && r.speed > 16.5 && !chasing) return [...commands, mode("save")];
  const time = s.tick * STEP_SECONDS;
  if (time < 75) return [...commands, mode("front")];
  const order = standings(s).filter((x) => x.finishTime === null);
  const groups = groupsOf(order);
  const g = groups.findIndex((group) => group.includes(r));
  const group = groups[g] ?? [r];
  const place = group.indexOf(r);
  // A group up the road and close: go now, before it is gone.
  const ahead = groups[g - 1];
  if (ahead && remaining > 600) {
    const gap = ahead[ahead.length - 1].distance - r.distance;
    if (gap < 200 && reserve > 0.25) return [...commands, mode(gap < 120 ? "attack" : "front")];
  }
  // A move in your group: follow the wheel of whoever goes.
  const mover = group.find((x) => x !== r && x.distance > r.distance && x.effort > 1.25 && x.distance - r.distance < 40);
  if (mover && reserve > 0.2) return [...commands, mode("ride", mover.rider.id)];
  const now = gradeAt(s.route, r.distance), soon = gradeAt(s.route, r.distance + 300), later = gradeAt(s.route, r.distance + 120);
  // Before a climb: into the front third.
  if (soon > 0.03 && now < 0.02 && place > group.length / 3 && reserve > 0.4) return [...commands, mode("front")];
  // Over the top: no gap.
  if (now > 0.02 && later < 0.01 && reserve > 0.15) return [...commands, mode("front")];
  return [...commands, mode(reserve < 0.5 && now < 0.02 ? "save" : "ride")];
};
const all: Record<string, Policy> = { passief: passive, sparen: saver, roekeloos: reckless, "vol gas": fullGas, bot: botCommands, tacticus: tactician };
const strategies = process.env.ONLY ? Object.fromEntries(Object.entries(all).filter(([name]) => process.env.ONLY!.split(",").includes(name))) : all;

/** A club of 40 around FTP 200–340, mixed weights and sprints, plus you. */
function club(ftp: number): GameRider[] {
  const riders = Array.from({ length: 40 }, (_, i) => {
    const f = 200 + (i * 37) % 141;
    return deriveRider(`r${String(i).padStart(2, "0")}`, `R${i}`, { ftp: f, weight: 62 + (i * 13) % 28, sprint: f * (2.4 + (i % 5) * 0.3) }, "manual", "v");
  });
  return [...riders, deriveRider("me", "Jij", { ftp, weight: 75, sprint: ftp * 3 }, "manual", "v")];
}
type Outcome = { place: number; front: number; gap: number; minutes: number; play: number; key: number };
function race(route: GameRoute, seed: number, roster: GameRider[], policy: Policy): Outcome {
  const state = createRace({ mode: "free", routeId: route.id, seed, playerId: "me" }, roster, route);
  const index = state.riders.findIndex((r) => r.rider.id === "me");
  let nextKm = 0, play = 0, key = 0;
  while (!state.finished) {
    // Real seconds on screen: one shown step of 0.2 s covers stepsPerFrame simulation steps.
    if (state.riders[index].finishTime === null) { const n = stepsPerFrame(state); play += STEP_SECONDS / n; const m = momentAt(state); if (m) { key += STEP_SECONDS / n; kinds[m.kind] = (kinds[m.kind] ?? 0) + STEP_SECONDS / n; } }
    stepRace(state, state.tick % 10 === 0 ? policy(state, index) : []);
    // TRACE=1: per kilometre the groups on the road and where you are.
    if (process.env.TRACE && state.riders[index].distance >= nextKm * 1000 && state.riders[index].finishTime === null) {
      const groups = groupsOf(standings(state));
      const mine = groups.findIndex((g) => g.includes(state.riders[index]));
      process.stdout.write(`  km ${nextKm} ${groups.map((g) => g.length).join("-")} jij in groep ${mine + 1}, W′ ${Math.round(state.riders[index].wbal / state.riders[index].wprime * 100)}% sheltered ${state.riders[index].sheltered}
`);
      nextKm++;
    }
  }
  const order = standings(state);
  const times = order.map((r) => r.finishTime ?? Infinity);
  if (process.env.TRACE) process.stdout.write(`  finish: ${times.slice(0, 12).map((t) => (t - times[0]).toFixed(1)).join(" ")}
`);
  // The front group at the finish: finishers less than 1.5 s apart, from the winner back.
  let front = 1;
  while (front < times.length && times[front] - times[front - 1] < 1.5) front++;
  return { place: order.findIndex((r) => r.rider.id === "me") + 1, front, gap: times[front] - times[0], minutes: times[0] / timeScale(route) / 60, play: play / 60, key: key / 60 };
}
const kinds: Record<string, number> = {};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
// DRILLS=1: how often each strategy passes each practice race.
if (process.env.DRILLS) {
  const roster = club(Number(process.env.FTP ?? 270));
  const lines: string[] = [];
  for (const drill of DRILLS) {
    const rates = Object.entries(strategies).map(([name, policy]) => {
      let passed = 0;
      for (let k = 0; k < 10; k++) {
        const state = createDrill(drill.id, roster, "me", 300 + k * 41);
        const index = state.riders.findIndex((r) => r.rider.id === "me");
        while (!state.finished) stepRace(state, state.tick % 10 === 0 ? policy(state, index) : []);
        if (drillPassed(state)) passed++;
      }
      return `${name} ${passed}/10`;
    });
    lines.push(`${drill.title.padEnd(16)} ${rates.join(" · ")}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}
const seeds = Array.from({ length: Number(process.env.SEEDS ?? 10) }, (_, i) => 101 + i * 37);
const levels = [Number(process.env.FTP ?? 270), 240, 300].slice(0, Number(process.env.LEVELS ?? 2));
const started = Date.now();
const rows: string[] = [];
for (const ftp of levels) {
  const roster = club(ftp);
  for (const [name, policy] of Object.entries(strategies)) {
    const outcomes = fixtureRoutes.flatMap((route) => seeds.map((seed) => ({ route: route.name, ...race(route, seed, roster, policy) })));
    const perRoute = fixtureRoutes.map((route) => mean(outcomes.filter((o) => o.route === route.name).map((o) => o.place)).toFixed(1)).join(" / ");
    rows.push(`FTP ${ftp} · ${name.padEnd(10)} plek ${mean(outcomes.map((o) => o.place)).toFixed(1).padStart(4)}  (${perRoute})`);
    if (name === "passief") {
      const solo = outcomes.filter((o) => o.front <= 3).length;
      rows.push(`  speeltijd ${mean(outcomes.map((o) => o.play)).toFixed(1)} min (max ${Math.max(...outcomes.map((o) => o.play)).toFixed(1)}), waarvan vertraagd ${mean(outcomes.map((o) => o.key)).toFixed(1)}`);
      rows.push(`  koers: kopgroep ${mean(outcomes.map((o) => o.front)).toFixed(1)} renners, kopgroep ≤ 3 ${solo}/${outcomes.length}, winnaar na ${Math.min(...outcomes.map((o) => o.minutes)).toFixed(1)}–${Math.max(...outcomes.map((o) => o.minutes)).toFixed(1)} min`);
    }
  }
}
rows.push(`vertraagd per moment (min, alle races): ${Object.entries(kinds).map(([k, v]) => `${k} ${(v / 60).toFixed(1)}`).join(", ")}`);
process.stdout.write(`${rows.join("\n")}\n${fixtureRoutes.length} routes × ${seeds.length} seeds, ${((Date.now() - started) / 1000).toFixed(0)} s\n`);
