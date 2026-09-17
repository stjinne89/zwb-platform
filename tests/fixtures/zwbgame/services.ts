import { basicRider, deriveRider, type PowerInput } from "../../../src/lib/zwbgame/roster";
import { createRace } from "../../../src/lib/zwbgame/engine";
import { COURSES } from "../../../src/lib/zwbgame/courses";
import { saveKey, serializeRace } from "../../../src/lib/zwbgame/storage";
import type { GameBootstrap, GamePreferences } from "../../../src/lib/zwbgame/types";

const names = ["Jij (demo)", "Sam de Vries", "Noor Bakker", "Alex Peeters", "Robin Jacobs", "Kim Vos", "Jamie Smit", "Bo Willems", "Chris Bos", "Daan Maas", "Sas Vermeer", "Max Driessen", "Luca Groen", "Eva Martens", "Jules Dekker", "Floor van Dijk", "Rik Janssen", "Lou Meijer", "Tess van Dam", "Niek Kok", "Isa Claes", "Pim Sanders", "Mo de Groot", "Fien Hendriks", "Tom Simons", "Liv van Loon"];
export const fixture: GameBootstrap = {
  playerId: "demo-0", available: true, preferences: { visible: true, dataConsent: false },
  // You ride a basic profile; the fictional club around you varies in strength.
  roster: names.map((name, i) => i === 0 || i % 5 === 0 ? basicRider(`demo-${i}`, name) : deriveRider(`demo-${i}`, name, { ftp: 235 + (i * 37) % 120, weight: 64 + (i * 11) % 22, sprint: (235 + (i * 37) % 120) * (2.5 + (i % 4) * 0.3) }, "manual", "demo")),
};
export async function refreshGame() { return { ok: true as const, data: structuredClone(fixture) }; }
export async function saveGamePreferences(preferences: GamePreferences) { fixture.preferences = preferences; return { ok: true as const, data: undefined }; }
export async function saveGamePower(input: { source: "manual"; power: PowerInput } | { source: "intervals"; weight: number }) {
  if (input.source === "intervals") return { ok: false as const, error: "De demo gebruikt fictieve gegevens." };
  try { fixture.roster[0] = deriveRider("demo-0", names[0], input.power, "manual", "demo-measurement"); return { ok: true as const, data: undefined }; }
  catch (error) { return { ok: false as const, error: (error as Error).message }; }
}
export function nearFinish() {
  const state = createRace({ courseId: "polder", playerId: fixture.playerId, seed: 23 }, fixture.roster);
  state.tick = 3500;
  state.riders.forEach((r, i) => { r.distance = COURSES.polder.length - (r.rider.id === fixture.playerId ? 4 : 40 + i); r.speed = 12; });
  localStorage.setItem(saveKey(fixture.playerId), serializeRace(state));
}
