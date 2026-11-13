import { describe, expect, it } from "vitest";
import { cardById, pool } from "@/kopman/engine/cards";
import { ageRiders, altitudeCamp, campCost, currentRace, finishRace, liveCard, newSave, openPackOf, raceSetup, skipRace, type Save } from "@/kopman/engine/economy";
import { createRace, type Placing } from "@/kopman/engine/race";
import { AGE, FORM_CAMP, FORM_COST, FORM_REST, FORM_SKIP, formPenalty, lifeFor, retireAge, type RiderLife } from "@/kopman/engine/riders";
import { parseSave } from "@/kopman/engine/save";
import { PLAYER_TEAM, STAT_KEYS } from "@/kopman/engine/types";

/** A finished race without riding it: everyone in a seeded order. */
function placingsFor(save: Save): Placing[] {
  const setup = raceSetup(save)!;
  const state = createRace(setup.raceId, setup.seed, setup.lineup);
  return state.riders.map((r, i) => ({ id: r.id, team: r.team, place: i + 1, time: 3600 + i, gap: i }));
}

const withLife = (save: Save, id: string, life: Partial<RiderLife>): Save => ({ ...save, riders: { ...save.riders, [id]: { ...save.riders[id], ...life } } });

describe("Kopman: renners leven", () => {
  it("geeft elke renner een leeftijd en een talent", () => {
    const save = newSave(11);
    for (const id of Object.keys(save.collection)) {
      const life = save.riders[id];
      expect(life.age).toBeGreaterThanOrEqual(AGE.min);
      expect(life.age).toBeLessThanOrEqual(AGE.max);
      expect(life.talent).toBeGreaterThanOrEqual(cardById(id).overall);
      expect(life.form).toBe(100);
    }
    // The same seed gives the same lives.
    expect(lifeFor(11, save.lineup[0])).toEqual(save.riders[save.lineup[0]]);
  });

  it("rijdt minder hard zonder vorm", () => {
    const save = newSave(12);
    const id = save.lineup[0];
    const tired = withLife(save, id, { form: 40 });
    const penalty = formPenalty(40);
    expect(penalty).toBe(5);
    for (const k of STAT_KEYS) expect(liveCard(tired, id).stats[k]).toBe(Math.max(30, cardById(id).stats[k] - penalty));
    expect(raceSetup(tired)!.lineup.cards![id].overall).toBeLessThan(cardById(id).overall);
  });

  it("kost vorm voor wie rijdt en geeft vorm terug aan wie rust", () => {
    let save = newSave(13);
    const spare = pool().pool.find((c) => !save.collection[c.id] && c.tier === "brons")!.id;
    save = { ...save, collection: { ...save.collection, [spare]: 1 }, riders: { ...save.riders, [spare]: { ...lifeFor(13, spare), form: 50 } } };
    const after = finishRace(save, placingsFor(save)).save;
    for (const id of save.lineup) expect(after.riders[id].form).toBe(100 - FORM_COST.race);
    expect(after.riders[spare].form).toBe(50 + FORM_REST);
    const winner = placingsFor(save)[0];
    if (winner.team === PLAYER_TEAM) expect(after.riders[winner.id].wins).toBe(1);
  });

  it("slaat een koers over: rust voor de ploeg, punten voor de anderen", () => {
    const save = withLife(newSave(14), newSave(14).lineup[0], { form: 40 });
    const skipped = skipRace(save)!;
    expect(skipped.raceIndex).toBe(1);
    expect(skipped.seasonPoints[PLAYER_TEAM] ?? 0).toBe(0);
    expect(Object.values(skipped.seasonPoints).reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    expect(skipped.riders[save.lineup[0]].form).toBe(40 + FORM_SKIP);
    expect(skipped.seasonResults[0]).toMatchObject({ winner: "", best: 0, points: 0 });
  });

  it("gaat één keer per koers op hoogtestage, voor munten", () => {
    const base = newSave(15);
    const save = { ...withLife(base, base.lineup[0], { form: 30 }), coins: 10_000 };
    const camp = altitudeCamp(save)!;
    expect(camp.coins).toBe(10_000 - campCost(save));
    expect(camp.riders[save.lineup[0]].form).toBe(30 + FORM_CAMP);
    expect(altitudeCamp(camp)).toBeNull();
    expect(altitudeCamp({ ...save, coins: 0 })).toBeNull();
    // After the race the next camp may go.
    expect(altitudeCamp(finishRace(camp, placingsFor(camp)).save)).not.toBeNull();
  });

  it("laat jonge renners groeien en oude zakken, en laat ze stoppen", () => {
    const base = newSave(16);
    const [young, old, stopping] = base.lineup;
    let save = withLife(base, young, { age: 20, talent: cardById(young).overall + 10, growth: 0 });
    save = withLife(save, old, { age: 33, growth: 0 });
    save = withLife(save, stopping, { age: retireAge(16, stopping) - 1 });
    const aged = ageRiders(save);
    expect(aged.riders[young].age).toBe(21);
    expect(aged.riders[young].growth).toBe(3);
    expect(liveCard(aged, young).overall).toBeGreaterThan(cardById(young).overall);
    expect(aged.riders[old].growth).toBeLessThan(0);
    expect(aged.collection[stopping]).toBeUndefined();
    expect(aged.legends.map((l) => l.id)).toContain(stopping);
    expect(aged.coins).toBeGreaterThan(save.coins);
    // The team stays five strong: a young rider fills the place.
    expect(Object.keys(aged.collection).length).toBeGreaterThanOrEqual(5);
    expect(aged.lineup).toHaveLength(5);
    expect(aged.report?.retired.map((r) => r.id)).toEqual([stopping]);
    expect(aged.report?.neo).toHaveLength(1);
    expect(aged.riders[aged.report!.neo[0]].age).toBeLessThanOrEqual(AGE.min + 2);
  });

  it("groeit nooit voorbij het talent", () => {
    const base = newSave(17);
    const id = base.lineup[0];
    let save = withLife(base, id, { age: 19, talent: cardById(id).overall + 4 });
    for (let i = 0; i < 4; i++) save = ageRiders(save);
    expect(liveCard(save, id).overall).toBe(cardById(id).overall + 4);
  });

  it("geeft munten voor een gestopte renner uit een pakket", () => {
    const save = newSave(18);
    const probe = openPackOf({ ...save, packs: ["brons"] }, "brons")!;
    const rider = probe.pulls.find((p) => pool().byId.has(p.id));
    if (!rider) return;
    const gone: Save = { ...save, packs: ["brons"], legends: [{ id: rider.id, season: 1, age: 35, wins: 0, titles: 0 }] };
    const opened = openPackOf(gone, "brons")!;
    const back = opened.pulls.find((p) => p.id === rider.id)!;
    expect(back.retired).toBeGreaterThan(0);
    expect(opened.save.collection[rider.id]).toBeUndefined();
  });

  it("leest een save van voor de levens en geeft de renners er een", () => {
    const save = newSave(19);
    const { riders: _r, legends: _l, camp: _c, report: _p, ...old } = save;
    void _r; void _l; void _c; void _p;
    const back = parseSave(JSON.stringify(old))!;
    expect(Object.keys(back.riders).sort()).toEqual(Object.keys(save.collection).sort());
    expect(back.legends).toEqual([]);
    expect(currentRace(back)?.id).toBe(currentRace(save)?.id);
    expect(parseSave(JSON.stringify(finishRace(save, placingsFor(save)).save))).not.toBeNull();
  });
});
