import { createRace, START_SECONDS, STEP_SECONDS, standings } from "./engine";
import { basicRider, strength } from "./roster";
import { GRID_METERS } from "./routes";
import { OWN_TEAM, type DrillId, type GameAccent, type GameRider, type GameRoute, type RaceState, type RoughSection } from "./types";
import { buildZrlTeams, ownTeamResult, scoreZrl } from "./zrl";

/**
 * Practice races: one short course, one tactic, one goal. Courses are drawn here,
 * not taken from the route library, so a drill is never saved or resumed.
 */
export type { DrillId };
export type Drill = { id: DrillId; title: string; goal: string };
export const DRILLS: Drill[] = [
  { id: "selection", title: "Eerste selectie", goal: "Zit bij de kopgroep na de start." },
  { id: "crest", title: "Over de top", goal: "Blijf bij de groep over drie korte klimmen." },
  { id: "slingshot", title: "Slingshot", goal: "Win de sprint uit het wiel." },
  { id: "bridge", title: "Overbruggen", goal: "Sluit aan bij de groep van vijf voor je." },
  { id: "escape", title: "Wegrijden", goal: "Win na het onverhard." },
  { id: "points", title: "Puntenjacht", goal: "Kom als eerste over twee van de drie bogen." },
  { id: "ttt", title: "Ploegentijdrit", goal: "Je vierde renner is sneller dan die van de andere ploeg." },
];

type Piece = [fromM: number, toM: number, grade: number];
function course(id: DrillId, meters: number, pieces: Piece[], accents: GameAccent[] = [], rough: RoughSection[] = []): GameRoute {
  const grades = Array.from({ length: Math.ceil(meters / GRID_METERS) }, (_, i) => pieces.find(([from, to]) => i * GRID_METERS >= from && i * GRID_METERS < to)?.[2] ?? 0);
  return { id: `drill:${id}`, name: DRILLS.find((d) => d.id === id)!.title, world: "watopia", laps: 1, length: meters, grades, accents, lapLines: [], ...(rough.length ? { rough } : {}) };
}
export const DRILL_ROUTES: Record<DrillId, GameRoute> = {
  selection: course("selection", 3000, [[1200, 1500, 0.02]]),
  crest: course("crest", 4000, [[600, 900, 0.05], [900, 1300, -0.02], [1700, 2000, 0.05], [2000, 2400, -0.02], [2800, 3100, 0.05], [3100, 3500, -0.02]]),
  slingshot: course("slingshot", 1500, []),
  bridge: course("bridge", 3000, [[400, 1600, -0.06]]),
  escape: course("escape", 4000, [[1000, 1600, 0.01]], [], [{ start: 1000, end: 1600, surface: "dirt" }]),
  points: course("points", 5000, [[2200, 2600, 0.06], [2600, 3000, -0.03]], [
    { name: "Sprint 1", kind: "sprint", start: 1300, end: 1500, banner: true },
    { name: "KOM", kind: "climb", start: 2200, end: 2600, banner: true },
    { name: "Sprint 2", kind: "sprint", start: 3800, end: 4000, banner: true },
  ]),
  ttt: course("ttt", 5000, [[1500, 2000, 0.02], [3200, 3600, 0.025]]),
};

/** Keeps you and the riders closest to your level. */
function trim(state: RaceState, keep: number) {
  const me = state.riders.find((r) => r.rider.id === state.config.playerId)!;
  const others = state.riders.filter((r) => r !== me).sort((a, b) => Math.abs(strength(a.rider) - strength(me.rider)) - Math.abs(strength(b.rider) - strength(me.rider)) || a.rider.id.localeCompare(b.rider.id)).slice(0, keep);
  state.riders = state.riders.filter((r) => r === me || others.includes(r));
}
/** Past the start: the race is already rolling. */
function rolling(state: RaceState) {
  state.tick = Math.ceil(START_SECONDS / STEP_SECONDS);
  for (const r of state.riders) r.speed = 11;
}
export function createDrill(id: DrillId, roster: GameRider[], playerId: string, seed: number, zrlTeam: { name: string; memberIds: string[] } | null = null): RaceState {
  const route = DRILL_ROUTES[id];
  if (id === "ttt") {
    const { own } = buildZrlTeams(roster, playerId, zrlTeam, seed);
    // Against five reference riders just above your team's level: only a team that
    // works on the front wins, so your own turns decide.
    const byId = new Map(roster.map((r) => [r.id, r]));
    const mates = own.riderIds.map((rid) => byId.get(rid) ?? basicRider(rid, "Gast"));
    const level = (key: "flat" | "climb") => +(mates.reduce((sum, r) => sum + r[key], 0) / mates.length * 1.01).toFixed(3);
    const reference = Array.from({ length: 5 }, (_, i): GameRider => ({ ...basicRider(`ttt:${i + 1}`, `Tijdrijder ${i + 1}`), flat: level("flat"), climb: level("climb") }));
    const rival = { id: "z1", riderIds: reference.map((r) => r.id) };
    roster = [...roster, ...reference];
    return createRace({ mode: "zrl", format: "ttt", routeId: route.id, seed, playerId, squads: [{ id: OWN_TEAM, riders: own.riderIds }, { id: rival.id, riders: rival.riderIds }], drill: id }, roster, route);
  }
  const state = createRace({ mode: "free", routeId: route.id, seed, playerId, drill: id }, roster, route);
  const me = state.riders.find((r) => r.rider.id === playerId)!;
  if (id === "selection") { trim(state, 14); return state; }
  trim(state, id === "slingshot" ? 5 : id === "bridge" ? 5 : 11);
  rolling(state);
  if (id === "bridge") {
    // You alone, a group of five 60 m up the road, a descent ahead.
    state.riders.forEach((r, i) => { r.distance = r === me ? 0 : 60 + (i % 5) * 2.2; r.lane = r === me ? 0 : ((i % 2) - 0.5) * 0.9; });
  } else {
    state.riders.forEach((r, i) => { r.distance = 60 - Math.floor(i / 3) * 2.4; r.lane = (i % 3 - 1) * 0.9; });
  }
  return state;
}

/** Did the drill succeed? Asked once the race is over for you. */
export function drillPassed(state: RaceState): boolean {
  const id = state.config.drill;
  const me = state.riders.find((r) => r.rider.id === state.config.playerId);
  if (!id || !me || me.finishTime === null) return false;
  const order = standings(state);
  const winner = order[0].finishTime ?? Infinity;
  switch (id) {
    case "bridge":
      // You reached the group in front at some point.
      return state.log.events.some((e) => e.kind === "back");
    case "selection": case "crest":
      // In the front group: no more than three seconds behind the winner.
      return me.finishTime - winner <= 3;
    case "slingshot": case "escape":
      return order[0] === me;
    case "points": {
      const index = state.riders.indexOf(me);
      const banners = state.route.accents.map((a, i) => (a.banner ? i : -1)).filter((i) => i >= 0);
      const firsts = banners.filter((a) => {
        const crossed = state.passes.filter((p) => p.a === a && p.e !== null).sort((x, y) => x.e! - y.e!);
        return crossed[0]?.r === index;
      });
      return firsts.length >= 2;
    }
    case "ttt": {
      const own = ownTeamResult(scoreZrl(state));
      return own.rank === 1 && own.time !== null;
    }
  }
}
