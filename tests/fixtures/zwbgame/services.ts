import { basicRider, deriveRider, type PowerInput } from "../../../src/lib/zwbgame/roster";
import { createRace } from "../../../src/lib/zwbgame/engine";
import { buildLadderTeams } from "../../../src/lib/zwbgame/ladder";
import { saveKey, serializeRace } from "../../../src/lib/zwbgame/storage";
import type { GameBootstrap, GamePreferences } from "../../../src/lib/zwbgame/types";
import { fixtureRoutes } from "./routes";

const names = ["Jij (demo)", "Sam de Vries", "Noor Bakker", "Alex Peeters", "Robin Jacobs", "Kim Vos", "Jamie Smit", "Bo Willems", "Chris Bos", "Daan Maas", "Sas Vermeer", "Max Driessen", "Luca Groen", "Eva Martens", "Jules Dekker", "Floor van Dijk", "Rik Janssen", "Lou Meijer", "Tess van Dam", "Niek Kok", "Isa Claes", "Pim Sanders", "Mo de Groot", "Fien Hendriks", "Tom Simons", "Liv van Loon", "Ruben Aerts", "Jet Hoekstra", "Sven Mulder", "Nina Bosman", "Olaf Visser", "Mila Prins", "Teun Koster", "Lotte Wouters", "Bram Hermans", "Yara Kuipers"];
export const fixture: GameBootstrap = {
  playerId: "demo-0", available: true, preferences: { visible: true, ownProfile: false }, routes: fixtureRoutes,
  team: { name: "ZWB Demo", memberIds: ["demo-2", "demo-3"] },
  // You ride a basic profile; the fictional club around you varies in strength.
  roster: names.map((name, i) => i === 0 || i % 5 === 0 ? basicRider(`demo-${i}`, name) : deriveRider(`demo-${i}`, name, { ftp: 235 + (i * 37) % 120, weight: 64 + (i * 11) % 22, sprint: (235 + (i * 37) % 120) * (2.5 + (i % 4) * 0.3) }, "manual", "demo")),
};
export async function refreshGame() { return { ok: true as const, data: structuredClone(fixture) }; }
export async function saveGamePreferences(preferences: GamePreferences) { fixture.preferences = preferences; return { ok: true as const, data: undefined }; }
export async function saveGamePower(input: { source: "manual"; power: PowerInput } | { source: "intervals"; weight: number }) {
  if (input.source === "intervals") return { ok: false as const, error: "De demo gebruikt fictieve gegevens." };
  try { fixture.roster[0] = deriveRider("demo-0", names[0], input.power, "manual", "demo-measurement"); fixture.preferences = { ...fixture.preferences, ownProfile: true }; return { ok: true as const, data: undefined }; }
  catch (error) { return { ok: false as const, error: (error as Error).message }; }
}
/** A ladder race a few metres from the line, with you in front and your team well placed. */
export function nearFinish() {
  const route = fixture.routes[0];
  const seed = [...fixture.playerId].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0, 0x811c9dc5);
  const { own, rivals } = buildLadderTeams(fixture.roster, fixture.playerId, fixture.team, seed);
  const rival = rivals[0];
  const state = createRace({ mode: "ladder", routeId: route.id, playerId: fixture.playerId, seed: 23, teams: { own: own.riderIds, rival: rival.riderIds, rivalTeamId: rival.id } }, fixture.roster, route);
  state.tick = 8000;
  state.riders.forEach((r, i) => { r.distance = route.length - (r.rider.id === fixture.playerId ? 4 : r.team === "own" ? 12 + i : 60 + i); r.speed = 12; });
  localStorage.setItem(saveKey(fixture.playerId), serializeRace(state));
}
