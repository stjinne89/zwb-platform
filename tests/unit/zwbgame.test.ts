import { describe, expect, it } from "vitest";
import { applyCommand, botCommands, createRace, standings, stepRace, STEP_SECONDS } from "@/lib/zwbgame/engine";
import { COURSES } from "@/lib/zwbgame/courses";
import { basicRider, buildRoster, deriveRider, isAllowedActivity } from "@/lib/zwbgame/roster";
import { restoreRace, serializeRace } from "@/lib/zwbgame/storage";
import type { CourseId, PlayerCommand, RaceState } from "@/lib/zwbgame/types";

const roster = Array.from({ length: 30 }, (_, i) => basicRider(String(i), `Renner ${i}`));
const create = (courseId: CourseId = "polder", seed = 42) => createRace({ courseId, seed, playerId: "0" }, roster);
function run(state: RaceState, playerPolicy = botCommands, botPolicy = botCommands) {
  while (!state.finished) {
    const commands = state.tick % 10 === 0 ? playerPolicy(state, state.riders.findIndex((r) => r.rider.id === state.config.playerId)) : [];
    stepRace(state, commands, botPolicy);
  }
  return state;
}
describe("ZWBgame simulation", () => {
  it("is deterministic across save/resume and frame batch sizes", () => {
    const a = create();
    for (let i = 0; i < 113; i++) stepRace(a);
    const b = restoreRace(serializeRace(a), roster, "0")!;
    expect(b).not.toBeNull();
    for (let batch = 0; batch < 10; batch++) for (let i = 0; i < 17; i++) stepRace(a);
    for (let i = 0; i < 170; i++) stepRace(b);
    expect(a).toEqual(b);
  });
  it("selects 24 unique riders including you and rotates the opponents", () => {
    const a = create(), b = create("polder", 43);
    expect(a.riders).toHaveLength(24);
    expect(new Set(a.riders.map((r) => r.rider.id)).size).toBe(24);
    expect(a.riders.some((r) => r.rider.id === "0")).toBe(true);
    expect(a.riders.map((r) => r.rider.id)).not.toEqual(b.riders.map((r) => r.rider.id));
  });
  it("reduces energy consumption in a wheel without teleporting", () => {
    const a = create(), b = create();
    for (const state of [a, b]) state.riders.forEach((r, i) => { r.distance = i === 0 ? 0 : 500 + i * 30; r.lane = 0; });
    a.riders[1].distance = 5;
    const noBots = () => [];
    stepRace(a, [], noBots); stepRace(b, [], noBots);
    expect(a.riders[0].sheltered).toBe(true);
    expect(a.riders[0].energy).toBeGreaterThan(b.riders[0].energy);
    expect(a.riders[0].distance).toBeLessThan(4);
  });
  it("food is gradual, drinking costs a bottle and eating constrains effort", () => {
    const race = create();
    const me = race.riders[0]; me.energy = 30; me.hydration = 25;
    applyCommand(me, { type: "eat" });
    expect(me.energy).toBe(30); expect(me.gels).toBe(1);
    applyCommand(me, { type: "drink" }); expect(me.bottles).toBe(2);
    for (let i = 0; i < 30; i++) stepRace(race, [], () => []);
    expect(me.energy).toBeGreaterThan(30);
    applyCommand(me, { type: "drink" }); expect(me.bottles).toBe(1);
    for (let i = 0; i < 21; i++) stepRace(race, [], () => []);
    expect(me.hydration).toBeGreaterThan(60);
  });
  it("supplies are granted only once and capped", () => {
    const state = create(); const r = state.riders[0];
    r.distance = COURSES.polder.length * 0.52;
    for (let i = 0; i < 50; i++) stepRace(state, [], () => []);
    expect([r.fed, r.gels, r.bottles]).toEqual([true, 3, 3]);
  });
  it.each(Object.keys(COURSES) as CourseId[])("finishes %s with finite bounded resources in the target duration", (courseId) => {
    const state = run(create(courseId));
    expect(state.tick * STEP_SECONDS).toBeLessThan(1000);
    const times = state.riders.map((r) => r.finishTime!);
    expect(Math.min(...times)).toBeGreaterThan(540);
    expect(Math.max(...times)).toBeLessThan(900);
    for (const r of state.riders) {
      expect(r.finishTime).not.toBeNull(); expect(r.energy).toBeGreaterThanOrEqual(0);
      expect(r.energy).toBeLessThanOrEqual(r.maxEnergy); expect(r.reserve).toBeGreaterThanOrEqual(0);
      expect(r.hydration).toBeGreaterThanOrEqual(0); expect(r.hydration).toBeLessThanOrEqual(100);
    }
  });
  it.each(Object.keys(COURSES) as CourseId[])("a weaker prepared rider can beat stronger reckless riders on %s", (courseId) => {
    const riders = Array.from({ length: 24 }, (_, i) => deriveRider(String(i), `Renner ${i}`, { ftp: i === 0 ? 180 : 330, weight: 75 }, "manual", "v1"));
    const state = createRace({ courseId, seed: 151, playerId: "0" }, riders);
    const own = state.riders.find((r) => r.rider.id === "0")!;
    const energy = own.maxEnergy, recovery = own.recovery;
    const reckless = (): PlayerCommand[] => [{ type: "effort", value: 1.25 }, { type: "tactic", value: "attack" }];
    run(state, botCommands, reckless);
    expect(standings(state)[0].rider.id).toBe("0");
    expect(own.maxEnergy).toBe(energy); expect(own.recovery).toBe(recovery);
    expect(own.maxEnergy).toBeGreaterThan(state.riders.find((r) => r.rider.id !== "0")!.maxEnergy);
  });
  it("sorts crossing times, not array update order, and never changes finish time", () => {
    const state = create(); const a = state.riders[0], b = state.riders[1];
    a.distance = 9999.8; b.distance = 9999.9;
    stepRace(state, [], () => []);
    expect(standings(state)[0].rider.id).toBe(b.rider.id);
    const time = a.finishTime; stepRace(state); expect(a.finishTime).toBe(time);
  });
});
describe("ZWBgame roster and data boundaries", () => {
  it("deduplicates claims and Zwift ids without resurrecting hidden/pending members", () => {
    const members = [{ id: "a", display_name: "A", zwift_id: "1", is_approved: true }, { id: "b", display_name: "B", zwift_id: "2", is_approved: false }];
    const entries = [{ id: "x", name: "A", zwift_id: "1", claimed_by: null }, { id: "y", name: "B", zwift_id: "2", claimed_by: "b" }, { id: "z", name: "C", zwift_id: "3", claimed_by: null }, { id: "w", name: "C dubbel", zwift_id: "3", claimed_by: null }];
    expect(buildRoster(members, entries, new Set(["a"])).map((r) => r.name)).toEqual(["C"]);
  });
  it("accepts only explicit non-Strava origins", () => {
    expect(isAllowedActivity({ source: "UPLOAD" })).toBe(true);
    expect(isAllowedActivity({ source: "GARMIN_CONNECT" })).toBe(true);
    expect(isAllowedActivity({ source: "STRAVA" })).toBe(false);
    expect(isAllowedActivity({ source: "UPLOAD", strava_id: "123" })).toBe(false);
    expect(isAllowedActivity({})).toBe(false);
  });
  it("preserves strength ordering and rejects invalid measurements", () => {
    const weak = deriveRider("a", "A", { ftp: 180, weight: 75 }, "manual", "1");
    const strong = deriveRider("b", "B", { ftp: 330, weight: 75 }, "manual", "1");
    expect(weak.flat).toBeLessThan(strong.flat); expect(weak.climb).toBeLessThan(strong.climb);
    expect(() => deriveRider("a", "A", { ftp: NaN, weight: 75 }, "manual", "1")).toThrow();
    expect(() => deriveRider("a", "A", { ftp: 250, weight: 0 }, "manual", "1")).toThrow();
    expect(JSON.stringify(strong)).not.toMatch(/ftp|weight|watts|api_key/);
  });
  it("saves no names or sport attributes, revalidates identities and handles invalid saves", () => {
    const state = create(); const text = serializeRace(state);
    expect(text).not.toMatch(/Renner|flat|climb|sprint|ftp|weight/);
    const resumed = restoreRace(text, [roster[0]], "0")!;
    expect(resumed.riders.find((r) => r.rider.id !== "0")!.rider.name).toMatch(/^Gast/);
    expect(restoreRace(text, roster, "another-user")).toBeNull();
    expect(restoreRace(text, roster, "0", Date.now() + 8 * 86400000)).toBeNull();
    expect(restoreRace("invalid", roster, "0")).toBeNull();
    expect(restoreRace(JSON.stringify({ ...JSON.parse(text), tick: -1 }), roster, "0")).toBeNull();
  });
  it("drops a revoked or changed sport profile when resuming", () => {
    const riders = [deriveRider("0", "Renner 0", { ftp: 350, weight: 75 }, "manual", "old"), ...roster.slice(1)];
    const state = createRace({ courseId: "polder", seed: 42, playerId: "0" }, riders);
    const resumed = restoreRace(serializeRace(state), roster, "0")!;
    expect(resumed.riders.find((r) => r.rider.id === "0")!.rider.source).toBe("basic");
  });
});
