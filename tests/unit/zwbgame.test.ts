import { describe, expect, it } from "vitest";
import { applyCommand, botCommands, createRace, fatigueOf, standings, stepRace, STEP_SECONDS, timeScale } from "@/lib/zwbgame/engine";
import { applyChallenge, buildLadderTeams, challengeable, challengeWon, initialLadder, normalizeLadder, OWN_TEAM, teamScore } from "@/lib/zwbgame/ladder";
import { basicRider, buildRoster, deriveRider, isAllowedActivity, strength } from "@/lib/zwbgame/roster";
import { elevationAt, gameRouteFrom } from "@/lib/zwbgame/routes";
import { readResults, restoreRace, serializeRace } from "@/lib/zwbgame/storage";
import type { GameRoute, PlayerCommand, RaceState } from "@/lib/zwbgame/types";
import { fixtureRoutes } from "../fixtures/zwbgame/routes";

const roster = Array.from({ length: 30 }, (_, i) => basicRider(String(i), `Renner ${i}`));
const flat = fixtureRoutes[0];
const create = (route: GameRoute = flat, seed = 42) => createRace({ mode: "free", routeId: route.id, seed, playerId: "0" }, roster, route);
/** A straight test road: one gradient, optional banners. */
const road = (grade: number, meters = 3000, banners: number[] = []): GameRoute => ({
  id: "test", name: "Test", world: "watopia", laps: 1, length: meters, grades: Array(Math.ceil(meters / 100)).fill(grade),
  accents: banners.map((end, i) => ({ name: `Sprint ${i}`, kind: "sprint", start: end - 200, end, banner: true })), lapLines: [],
});
const idle = () => [];
type Policy = (s: RaceState, i: number) => PlayerCommand[];
function run(state: RaceState, player: Policy = botCommands) {
  const index = state.riders.findIndex((r) => r.rider.id === state.config.playerId);
  while (!state.finished) stepRace(state, state.tick % 10 === 0 ? player(state, index) : []);
  return state;
}
/** Two riders on a test road: a leader riding along and you at a set distance behind it. */
function pair(route: GameRoute, gap: number) {
  const state = createRace({ mode: "free", routeId: route.id, seed: 1, playerId: "0" }, roster.slice(0, 8), route);
  const me = state.riders.find((r) => r.rider.id === "0")!;
  const lead = state.riders.find((r) => r.rider.id === "1")!;
  state.riders.forEach((r) => { if (r !== me && r !== lead) r.finishTime = 1; });
  for (const r of [me, lead]) { r.lane = 0; r.speed = 10; r.form = 1; }
  lead.distance = 100 + gap; me.distance = 100; lead.mode = "ride"; me.mode = "save";
  return { state, me, lead };
}

describe("ZWBgame Zwift physics", () => {
  it("is deterministic across save/resume and frame batch sizes", () => {
    const a = create();
    for (let i = 0; i < 413; i++) stepRace(a);
    const b = restoreRace(serializeRace(a), roster, fixtureRoutes, "0")!;
    expect(b).not.toBeNull();
    for (let batch = 0; batch < 10; batch++) for (let i = 0; i < 17; i++) stepRace(a);
    for (let i = 0; i < 170; i++) stepRace(b);
    expect(a).toEqual(b);
  });
  it("draws a field around your level and never picks a rider twice", () => {
    const field = Array.from({ length: 60 }, (_, i) => deriveRider(`r${i}`, `R${i}`, { ftp: 150 + i * 5, weight: 75 }, "manual", "v"));
    const state = createRace({ mode: "free", routeId: flat.id, seed: 3, playerId: "r30" }, field, flat);
    expect(state.riders).toHaveLength(24);
    expect(new Set(state.riders.map((r) => r.rider.id)).size).toBe(24);
    const levels = state.riders.map((r) => strength(r.rider));
    // The strongest and weakest of the club are not in your race.
    expect(Math.max(...levels)).toBeLessThan(strength(field[59]));
    expect(Math.min(...levels)).toBeGreaterThan(strength(field[0]));
  });
  it("the wheel saves a lot on the flat and hardly anything on a steep climb", () => {
    const share = (grade: number) => {
      const { state, me, lead } = pair(road(grade), 2);
      let mine = 0, theirs = 0;
      for (let i = 0; i < 150; i++) { stepRace(state, [], idle); if (i > 50) { mine += me.effort; theirs += lead.effort; } }
      expect(me.sheltered).toBe(true);
      return mine / theirs;
    };
    expect(share(0)).toBeLessThan(0.8);
    expect(share(0.07)).toBeGreaterThan(0.9);
  });
  it("burns W′ above threshold, refills it below, and every match tires you", () => {
    const { state, me } = pair(road(0, 6000), 4000);
    applyCommand(state, me, { type: "mode", value: "attack" });
    for (let i = 0; i < 400; i++) stepRace(state, [], idle);
    expect(me.wbal).toBeLessThan(me.wprime * 0.7);
    expect(fatigueOf(me)).toBeGreaterThan(0);
    const low = me.wbal;
    applyCommand(state, me, { type: "mode", value: "save" });
    for (let i = 0; i < 300; i++) stepRace(state, [], idle);
    expect(me.wbal).toBeGreaterThan(low);
  });
  it("an empty W′ leaves you at threshold", () => {
    const { state, me } = pair(road(0), 200);
    me.wbal = 0; applyCommand(state, me, { type: "mode", value: "attack" });
    stepRace(state, [], idle);
    expect(me.effort).toBeLessThan(1);
  });
  it("supertuck on a steep descent beats riding along and rests the legs", () => {
    const descend = (mode: "save" | "ride") => {
      const { state, me } = pair(road(-0.06), 2000);
      me.speed = 18; me.mode = mode; me.wbal = me.wprime / 2;
      for (let i = 0; i < 100; i++) stepRace(state, [], idle);
      return me;
    };
    const tuck = descend("save"), pedal = descend("ride");
    expect(tuck.tucked).toBe(true);
    expect(tuck.distance).toBeGreaterThan(pedal.distance);
    expect(tuck.wbal).toBeGreaterThan(pedal.wbal);
  });
  it("hands out powerups only at a banner, one at a time, and they run out", () => {
    const { state, me } = pair(road(0, 3000, [400, 800]), 2000);
    for (let i = 0; i < 40 && me.distance < 390; i++) stepRace(state, [], idle);
    expect(me.powerup).toBeNull();
    while (me.distance < 420) stepRace(state, [], idle);
    const held = me.powerup;
    expect(held).not.toBeNull();
    while (me.distance < 820) stepRace(state, [], idle);
    expect(me.powerup).toBe(held);
    applyCommand(state, me, { type: "powerup" });
    expect(me.powerup).toBeNull();
    expect(me.active?.id).toBe(held);
    for (let i = 0; i < 40 / STEP_SECONDS + 1; i++) stepRace(state, [], idle);
    expect(me.active).toBeNull();
  });
  it.each(fixtureRoutes.map((r) => [r.name, r] as const))("%s plays in five to eight minutes", (_, route) => {
    const state = run(create(route, 7));
    const scale = timeScale(route);
    const times = state.riders.map((r) => r.finishTime!);
    expect(times.every((t) => t !== null)).toBe(true);
    expect(Math.min(...times) / scale / 60).toBeGreaterThan(4.5);
    expect(Math.max(...times) / scale / 60).toBeLessThan(8);
    for (const r of state.riders) { expect(r.wbal).toBeGreaterThanOrEqual(0); expect(r.wbal).toBeLessThanOrEqual(r.wprime); }
  }, 30000);
  it("saving from the gun misses the front group; attacking whenever you can wears you out", () => {
    const field = Array.from({ length: 40 }, (_, i) => deriveRider(`r${String(i).padStart(2, "0")}`, `R${i}`, { ftp: 220 + (i * 37) % 100, weight: 65 + (i * 13) % 20, sprint: (220 + (i * 37) % 100) * (2.4 + (i % 5) * 0.3) }, "manual", "v"));
    const sprintAt = (s: RaceState, i: number, rest: "ride" | "save"): PlayerCommand[] => [{ type: "mode", value: s.route.length - s.riders[i].distance < 300 ? "attack" : rest }];
    const sitter: Policy = (s, i) => sprintAt(s, i, "ride");
    const saver: Policy = (s, i) => sprintAt(s, i, "save");
    const reckless: Policy = (s, i) => { const r = s.riders[i]; return [{ type: "mode", value: r.wbal > r.wprime * 0.6 || (r.mode === "attack" && r.wbal > 1) ? "attack" : "ride" }]; };
    const ride = (policy: Policy, seed: number) => {
      const state = run(createRace({ mode: "free", routeId: flat.id, seed, playerId: "r20" }, field, flat), policy);
      const me = state.riders.find((r) => r.rider.id === "r20")!;
      return { place: standings(state).indexOf(me) + 1, fatigue: fatigueOf(me) };
    };
    const seeds = [11, 22, 33, 44, 55];
    const sitting = seeds.map((seed) => ride(sitter, seed)), saving = seeds.map((seed) => ride(saver, seed)), attacking = seeds.map((seed) => ride(reckless, seed));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(sitting.map((x) => x.place))).toBeLessThan(mean(saving.map((x) => x.place)) - 4);
    expect(mean(attacking.map((x) => x.fatigue))).toBeGreaterThan(mean(sitting.map((x) => x.fatigue)) + 0.03);
  }, 60000);
  it("sorts crossing times, not array order, and never changes a finish time", () => {
    const state = create(); const a = state.riders[0], b = state.riders[1];
    a.distance = flat.length - 0.2; b.distance = flat.length - 0.1;
    stepRace(state, [], idle);
    expect(standings(state)[0].rider.id).toBe(b.rider.id);
    const time = a.finishTime; stepRace(state); expect(a.finishTime).toBe(time);
  });
});

describe("ZWBgame Club Ladder", () => {
  const club = Array.from({ length: 60 }, (_, i) => deriveRider(`c${String(i).padStart(2, "0")}`, `C${i}`, { ftp: 170 + i * 3, weight: 75 }, "manual", "v"));
  it("builds your team with your real ladder teammates and nine club teams around your level", () => {
    const { own, rivals } = buildLadderTeams(club, "c30", { name: "ZWBeasts", memberIds: ["c02", "c58", "nobody"] }, 5);
    expect(own.name).toBe("ZWBeasts");
    expect(own.riderIds.slice(0, 3)).toEqual(["c30", "c02", "c58"]);
    expect(own.riderIds).toHaveLength(5);
    expect(rivals).toHaveLength(9);
    const all = [own, ...rivals].flatMap((t) => t.riderIds);
    expect(new Set(all).size).toBe(all.length);
    const level = (ids: string[]) => ids.reduce((sum, id) => sum + strength(club.find((r) => r.id === id)!), 0);
    for (let i = 1; i < rivals.length; i++) expect(level(rivals[i].riderIds)).toBeGreaterThanOrEqual(level(rivals[i - 1].riderIds));
  });
  it("scores 10 to 1 by finishing position, a tie is a loss and a non-finisher scores nothing", () => {
    const { own, rivals } = buildLadderTeams(club, "c30", null, 5);
    const state = createRace({ mode: "ladder", routeId: flat.id, seed: 1, playerId: "c30", teams: { own: own.riderIds, rival: rivals[0].riderIds, rivalTeamId: rivals[0].id } }, club, flat);
    expect(state.riders).toHaveLength(10);
    // Alternate: own, rival, own, rival…
    const ordered = [...state.riders].sort((a, b) => (a.team === b.team ? a.rider.id.localeCompare(b.rider.id) : a.team === "own" ? -1 : 1));
    const owns = ordered.filter((r) => r.team === "own"), others = ordered.filter((r) => r.team === "rival");
    owns.forEach((r, i) => { r.finishTime = 100 + i * 2; }); others.forEach((r, i) => { r.finishTime = 101 + i * 2; });
    state.finished = true;
    expect(teamScore(state)).toEqual([30, 25]);
    expect(challengeWon([30, 25])).toBe(true);
    expect(challengeWon([27, 27])).toBe(false);
    others[0].finishTime = null;
    expect(teamScore(state)[1]).toBeLessThan(25);
  });
  it("leapfrogs a winning challenger onto the loser's place, within seven places", () => {
    const order = ["t9", "t8", "t7", "t6", "t5", "t4", "t3", "t2", "t1", OWN_TEAM];
    expect(challengeable(order)).toEqual(["t7", "t6", "t5", "t4", "t3", "t2", "t1"]);
    expect(applyChallenge(order, OWN_TEAM, "t5", true)).toEqual(["t9", "t8", "t7", "t6", OWN_TEAM, "t5", "t4", "t3", "t2", "t1"]);
    expect(applyChallenge(order, OWN_TEAM, "t5", false)).toEqual(order);
    expect(applyChallenge(order, OWN_TEAM, "t9", true)).toEqual(order);
    const rivals = ["t1", "t2"].map((id) => ({ id, name: id, riderIds: [] }));
    expect(initialLadder(rivals).order).toEqual(["t2", "t1", OWN_TEAM]);
    expect(normalizeLadder({ version: 1, order: ["t2", OWN_TEAM, "gone"], history: [] }, rivals).order).toEqual(["t2", "t1", OWN_TEAM]);
  });
  it("teammates bring you back when you ask and lead you out in the final", () => {
    const { own, rivals } = buildLadderTeams(club, "c30", null, 5);
    const state = createRace({ mode: "ladder", routeId: flat.id, seed: 2, playerId: "c30", teams: { own: own.riderIds, rival: rivals[0].riderIds, rivalTeamId: rivals[0].id } }, club, flat);
    const me = state.riders.find((r) => r.rider.id === "c30")!;
    state.riders.forEach((r) => { r.distance = r === me ? 5000 : 5100; });
    applyCommand(state, me, { type: "order", value: "bring" });
    stepRace(state);
    expect(state.riders.filter((r) => r.job?.kind === "bring" && r.job.for === "c30")).toHaveLength(1);
    state.riders.forEach((r) => { r.distance = flat.length - 800; });
    applyCommand(state, me, { type: "order", value: "leadout" });
    while (state.tick % 10 !== 0) stepRace(state);
    stepRace(state);
    expect(state.riders.some((r) => r.job?.kind === "leadout" && r.job.for === "c30")).toBe(true);
  });
});

describe("ZWBgame routes, roster and storage", () => {
  it("rolls a Zwift route out over laps with banners only for named segments", () => {
    const hilly = fixtureRoutes[1];
    expect(hilly.laps).toBe(2);
    expect(hilly.lapLines).toEqual([Math.round((0.502 + 9.193) * 1000)]);
    expect(hilly.accents.filter((a) => a.banner && a.kind === "climb").map((a) => a.name)).toEqual(["Zwift KOM", "Zwift KOM"]);
    expect(hilly.grades.length).toBe(Math.ceil(hilly.length / 100));
    expect(elevationAt(hilly, 2300)).toBeGreaterThan(35);
    const detected = gameRouteFrom({ source: "zwift", totalKm: 1, hasElevation: true, leadInApproximated: false, segments: [], accents: [{ id: "klim-1", name: "Klim km 0.2", kind: "climb", startKm: 0.2, endKm: 0.6, avgGradient: 0.04, lap: null }] }, { slug: "x", name: "X", world: "w", laps: 1, leadInKm: 0, lapKm: 1 });
    expect(detected.accents[0].banner).toBe(false);
  });
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
  it("saves no names, sport attributes or route profile, and revalidates on resume", () => {
    const state = create(); const text = serializeRace(state);
    expect(text).not.toMatch(/Renner|flat"|climb"|sprint"|ftp|weight|grades/);
    const resumed = restoreRace(text, [roster[0]], fixtureRoutes, "0")!;
    expect(resumed.riders.find((r) => r.rider.id !== "0")!.rider.name).toMatch(/^Gast/);
    expect(restoreRace(text, roster, fixtureRoutes, "another-user")).toBeNull();
    expect(restoreRace(text, roster, fixtureRoutes, "0", Date.now() + 8 * 86400000)).toBeNull();
    expect(restoreRace(text, roster, fixtureRoutes.slice(1), "0")).toBeNull();
    expect(restoreRace(text, roster, [{ ...flat, length: flat.length + 100 }], "0")).toBeNull();
    expect(restoreRace("invalid", roster, fixtureRoutes, "0")).toBeNull();
    expect(restoreRace(JSON.stringify({ ...JSON.parse(text), tick: -1 }), roster, fixtureRoutes, "0")).toBeNull();
    const saved = JSON.parse(text); saved.riders[1].job = { for: "nobody", kind: "bring" };
    expect(restoreRace(JSON.stringify(saved), roster, fixtureRoutes, "0")).toBeNull();
  });
  it("drops a revoked or changed sport profile when resuming", () => {
    const riders = [deriveRider("0", "Renner 0", { ftp: 350, weight: 75 }, "manual", "old"), ...roster.slice(1)];
    const state = createRace({ mode: "free", routeId: flat.id, seed: 42, playerId: "0" }, riders, flat);
    const resumed = restoreRace(serializeRace(state), roster, fixtureRoutes, "0")!;
    expect(resumed.riders.find((r) => r.rider.id === "0")!.rider.source).toBe("basic");
  });
  it("keeps results from the earlier Flamme Rouge-style versions", () => {
    const results = readResults(JSON.stringify([{ id: "1", courseId: "polder", date: "2026-09-19", place: 3, count: 24, seconds: 240 }, { id: "2", mode: "ladder", route: "Flat Route", date: "2026-09-28", place: 2, count: 10, seconds: 1900, score: [30, 25] }]));
    expect(results.map((r) => r.route)).toEqual(["Polderkoers", "Flat Route"]);
  });
});
