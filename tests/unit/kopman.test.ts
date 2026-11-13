import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPool, cardById, overallOf, pool, statsFor, tierOf } from "@/kopman/engine/cards";
import { buildCourse, courseWeights, fitFor } from "@/kopman/engine/course";
import { buyPack, calendarOf, currentRace, divisionFor, DUPLICATE_COINS, finishRace, newSave, newSeason, openPackOf, packFor, seasonDone, sellSpares, sparesByTier, toggleLineup, tradeCards, tradeUp, type Save } from "@/kopman/engine/economy";
import { DIVISIONS, divisionOfRace, SEASON_RACES, TOP_DIVISION } from "@/kopman/engine/divisions";
import { ITEMS, itemById, NO_BONUS, teamBonus, type TeamBonus } from "@/kopman/engine/items";
import { KIND_ODDS, openPack, PACK_SIZE, PITY_PACKS } from "@/kopman/engine/packs";
import { createRace, results, runToEnd, stepRace } from "@/kopman/engine/race";
import { availableRadio, handPlayed, playRadio } from "@/kopman/engine/radio";
import { rng } from "@/kopman/engine/rng";
import { parseSave } from "@/kopman/engine/save";
import { lineupFor, rivalTeams } from "@/kopman/engine/teams";
import { PLAYER_TEAM, RIDER_TYPES } from "@/kopman/engine/types";
import { climbById, RACES, raceById, sectorById, tourById } from "@/kopman/engine/world";

const starter = () => newSave(12345);
const lineupOf = (save: Save) => ({ riders: save.lineup, kopman: save.kopman! });

describe("Kopman: rennerkaarten", () => {
  it("bouwt elke keer dezelfde pool, met unieke namen en kloppende kleuren", () => {
    const a = buildPool();
    const b = buildPool();
    expect(a).toEqual(b);
    expect(new Set(a.map((c) => `${c.first} ${c.last}`)).size).toBe(a.length);
    for (const c of a) {
      expect(overallOf(c.type, c.stats)).toBe(c.overall);
      expect(tierOf(c.overall)).toBe(c.tier);
    }
    const tiers = new Set(a.map((c) => c.tier));
    expect(tiers).toEqual(new Set(["brons", "zilver", "goud"]));
  });

  it("raakt de gevraagde totaalscore per type", () => {
    const random = rng(1);
    for (const type of RIDER_TYPES) for (const target of [55, 68, 80]) expect(Math.abs(overallOf(type, statsFor(type, target, random)) - target)).toBeLessThanOrEqual(1);
  });

  it("geeft elk type zijn eigen sterkte", () => {
    const random = rng(2);
    const s = statsFor("sprinter", 75, random), k = statsFor("klimmer", 75, random), t = statsFor("tijdrijder", 75, random), c = statsFor("klassieker", 75, random);
    expect(s.sprint).toBeGreaterThan(k.sprint + 20);
    expect(k.klim).toBeGreaterThan(s.klim + 25);
    expect(t.tijdrit).toBeGreaterThan(c.tijdrit + 15);
    expect(c.kasseien).toBeGreaterThan(k.kasseien + 15);
  });
});

describe("Kopman: pakketten", () => {
  it("opent een pakket steeds hetzelfde, zonder dezelfde renner twee keer", () => {
    const a = openPack("zilver", 9, 3, 0);
    expect(openPack("zilver", 9, 3, 0)).toEqual(a);
    expect(a.cards).toHaveLength(PACK_SIZE);
    expect(new Set(a.cards).size).toBe(PACK_SIZE);
  });

  it("garandeert goud na de vangnetgrens en in een gouden pakket", () => {
    for (let n = 0; n < 50; n++) {
      const top = (id: string) => tierOf_(id) === "goud" || tierOf_(id) === "diamant";
      expect(openPack("zilver", 1, n, PITY_PACKS - 1).cards.some(top)).toBe(true);
      expect(openPack("goud", 1, n, 0).cards.some(top)).toBe(true);
      expect(openPack("diamant", 1, n, 0).cards.some((id) => tierOf_(id) === "diamant")).toBe(true);
    }
  });

  it("volgt ongeveer de getoonde kansen", () => {
    let gold = 0, silver = 0, total = 0;
    for (let n = 0; n < 2000; n++) for (const id of openPack("zilver", 7, n, 0).cards) { total++; if (tierOf_(id) === "goud") gold++; if (tierOf_(id) === "zilver") silver++; }
    expect(gold / total).toBeGreaterThan(0.08);
    expect(gold / total).toBeLessThan(0.12);
    expect(silver / total).toBeGreaterThan(0.62);
    expect(silver / total).toBeLessThan(0.68);
  });

  it("stopt naast renners ook materiaal en personeel in een pakket, volgens de getoonde kansen", () => {
    const kinds = { renner: 0, materiaal: 0, personeel: 0 };
    let total = 0;
    for (let n = 0; n < 2000; n++) for (const id of openPack("zilver", 5, n, 0).cards) { total++; kinds[itemById.get(id)?.group ?? "renner"]++; }
    for (const kind of ["renner", "materiaal", "personeel"] as const) {
      expect(Math.abs(kinds[kind] / total - KIND_ODDS[kind])).toBeLessThan(0.03);
    }
  });

  it("zet het vangnet terug na goud en telt anders op", () => {
    expect(openPack("goud", 1, 0, 5).pity).toBe(0);
    let pity = 0;
    for (let n = 0; n < 40; n++) {
      const pack = openPack("zilver", 3, n, pity);
      const gold = pack.cards.some((id) => tierOf_(id) === "goud");
      expect(pack.pity).toBe(gold ? 0 : pity + 1);
      expect(pack.pity).toBeLessThan(PITY_PACKS);
      pity = pack.pity;
    }
  });
});

const tierOf_ = (id: string) => itemById.get(id)?.tier ?? cardById(id).tier;

describe("Kopman: materiaal en personeel", () => {
  it("telt per vak alleen het beste exemplaar, en de mechanieker versterkt het materiaal", () => {
    expect(teamBonus({})).toEqual(NO_BONUS);
    const plain = teamBonus({ "m-frame-brons": 2, "m-frame-goud": 1, "m-wielen-zilver": 1, "m-kleding-goud": 1, "p-trainer-zilver": 1 });
    expect(plain.bikeMass).toBeCloseTo(0.09);
    expect(plain.cda).toBeCloseTo(0.04);
    expect(plain.power).toBeCloseTo(0.02);
    const tuned = teamBonus({ "m-frame-goud": 1, "p-mechanieker-goud": 1, "p-trainer-zilver": 1 });
    expect(tuned.bikeMass).toBeCloseTo(0.09 * 1.3);
    // The mechanic works on equipment, not on the riders.
    expect(tuned.power).toBeCloseTo(0.02);
  });

  it("maakt de eigen ploeg sneller in dezelfde koers", () => {
    const save = starter();
    const ride = (bonus?: TeamBonus) => {
      const state = runToEnd(createRace("polderchrono", 4, { riders: save.lineup, kopman: save.kopman!, bonus }));
      const mine = state.riders.filter((r) => r.team === PLAYER_TEAM);
      return mine.reduce((sum, r) => sum + (r.finishTime ?? 0), 0);
    };
    const all = Object.fromEntries(ITEMS.filter((x) => x.tier === "goud").map((x) => [x.id, 1]));
    expect(ride(teamBonus(all))).toBeLessThan(ride());
  }, 30_000);

  it("geeft meer startgeld met een buschauffeur", () => {
    const save = starter();
    const placings = results(runToEnd(createRace(currentRace(save)!.id, 2, { riders: save.lineup, kopman: save.kopman! })));
    const plain = finishRace(save, placings).reward.coins;
    const bus = finishRace({ ...save, items: { "p-chauffeur-goud": 1 } }, placings).reward.coins;
    expect(bus).toBeGreaterThan(plain);
  }, 30_000);

  it("leest een oude spelstand zonder materiaal", () => {
    const { items: _items, ...old } = starter();
    void _items;
    expect(parseSave(JSON.stringify(old))?.items).toEqual({});
    expect(parseSave(JSON.stringify({ ...starter(), items: { "m-frame-platina": 1 } }))).toBeNull();
  });

  it("legt materiaal uit een pakket bij het materiaal, niet bij de renners", () => {
    let save: Save = { ...starter(), packs: Array(40).fill("zilver") };
    for (let i = 0; i < 40; i++) save = openPackOf(save, "zilver")!.save;
    expect(Object.keys(save.items).length).toBeGreaterThan(0);
    expect(Object.keys(save.items).every((id) => itemById.has(id))).toBe(true);
    expect(Object.keys(save.collection).some((id) => itemById.has(id))).toBe(false);
  });
});

describe("Kopman: economie", () => {
  it("begint in de Kermis met vijf bronzen renners van elk type, munten en een bronzen pakket", () => {
    const save = starter();
    expect(save.division).toBe(0);
    expect(save.lineup).toHaveLength(5);
    expect(new Set(save.lineup.map((id) => cardById(id).type))).toEqual(new Set(RIDER_TYPES));
    expect(save.lineup.every((id) => cardById(id).tier === "brons" && cardById(id).overall <= 57)).toBe(true);
    expect(divisionFor(save.collection)).toBe(0);
    expect(save.packs).toEqual(["brons"]);
    expect(save.kopman).toBe(save.lineup[0]);
  });

  it("bewaart een dubbele kaart als reserve, zonder munten", () => {
    let save = starter();
    const first = openPack("zilver", save.seed, 0, 0).cards[0];
    save = { ...save, packs: ["zilver"], collection: { ...save.collection, [first]: 1 } };
    const opened = openPackOf(save, "zilver")!;
    const dup = opened.pulls.find((p) => p.id === first)!;
    expect(dup.duplicate).toBe(true);
    expect(opened.save.coins).toBe(save.coins);
    expect(opened.save.collection[first]).toBe(2);
    expect(opened.save.packs).toEqual([]);
  });

  it("ruilt vijf reservekaarten van een niveau in voor een kaart van het niveau erboven", () => {
    const base = starter();
    const [a, b] = base.lineup;
    const save: Save = { ...base, collection: { ...base.collection, [a]: 4 }, items: { "m-frame-brons": 3 } };
    expect(sparesByTier(save).brons).toBe(5);
    const traded = tradeUp(save, "brons")!;
    expect(traded.save.collection[a]).toBe(1);
    expect(traded.save.items["m-frame-brons"]).toBe(1);
    expect(traded.save.collection[b]).toBe(1);
    const got = traded.pull.id;
    expect(itemById.get(got)?.tier ?? cardById(got).tier).toBe("zilver");
    expect(traded.save.trades).toBe(1);
    expect(tradeUp(save, "brons")).toEqual(traded);
    expect(tradeUp(traded.save, "brons")).toBeNull();
    expect(tradeUp({ ...base, collection: { ...base.collection, [a]: 9 } }, "goud")).toBeNull();
  });

  it("ruilt vijf zelfgekozen kaarten, ook enkele, maar nooit het laatste exemplaar van een renner in de ploeg", () => {
    const base = starter();
    const extra = pool().pool.filter((c) => c.tier === "brons" && !base.collection[c.id]).slice(0, 3).map((c) => c.id);
    const save: Save = { ...base, collection: { ...base.collection, ...Object.fromEntries(extra.map((id) => [id, 1])), [base.lineup[0]]: 2 }, items: { "m-banden-brons": 1 } };
    const picks = { [extra[0]]: 1, [extra[1]]: 1, [extra[2]]: 1, [base.lineup[0]]: 1, "m-banden-brons": 1 };
    const traded = tradeCards(save, picks)!;
    expect(traded).not.toBeNull();
    for (const id of extra) expect(traded.save.collection[id]).toBeUndefined();
    expect(traded.save.items["m-banden-brons"]).toBeUndefined();
    expect(traded.save.collection[base.lineup[0]]).toBe(1);
    expect(parseSave(JSON.stringify(traded.save))).not.toBeNull();
    expect(tradeCards(save, { ...picks, [base.lineup[0]]: 2, "m-banden-brons": 0 })).toBeNull();
    expect(tradeCards(save, { [base.lineup[1]]: 1, [extra[0]]: 1, [extra[1]]: 1, [extra[2]]: 1, "m-banden-brons": 1 })).toBeNull();
    expect(tradeCards(save, { [extra[0]]: 1, [extra[1]]: 1, [extra[2]]: 1, "m-banden-brons": 1 })).toBeNull();
    expect(tradeCards(save, { ...picks, "m-banden-brons": 0, "p-trainer-zilver": 1 })).toBeNull();
  });

  it("verkoopt alle reservekaarten van een niveau, nooit het laatste exemplaar", () => {
    const base = starter();
    const save: Save = { ...base, collection: { ...base.collection, [base.lineup[0]]: 3 } };
    const sold = sellSpares(save, "brons")!;
    expect(sold.coins).toBe(2 * DUPLICATE_COINS.brons);
    expect(sold.save.coins).toBe(save.coins + sold.coins);
    expect(sold.save.collection[base.lineup[0]]).toBe(1);
    expect(sellSpares(sold.save, "brons")).toBeNull();
  });

  it("verkoopt geen pakket zonder genoeg munten", () => {
    const save = { ...starter(), coins: 999 };
    expect(buyPack(save, "brons", 1000)).toBeNull();
    expect(buyPack({ ...save, coins: 1000 }, "brons", 1000)!.coins).toBe(0);
  });

  it("houdt de opstelling op vijf renners die je hebt", () => {
    const save = starter();
    const outsider = pool().pool.find((c) => !save.collection[c.id])!;
    expect(toggleLineup(save, outsider.id)).toBe(save);
    const fewer = toggleLineup(save, save.lineup[0]);
    expect(fewer.lineup).toHaveLength(4);
    expect(fewer.kopman).toBe(fewer.lineup[0]);
  });

  it("geeft per niveau een ander pakket, en buiten de top 10 geen", () => {
    expect(packFor(1, 0)).toBe("brons");
    expect(packFor(5, 0)).toBeNull();
    expect(packFor(1, 1)).toBe("brons");
    expect(packFor(8, 2)).toBeNull();
    expect(packFor(1, 3)).toBe("zilver");
    expect(packFor(3, TOP_DIVISION)).toBe("zilver");
    expect(packFor(10, TOP_DIVISION)).toBe("brons");
    expect(packFor(11, TOP_DIVISION)).toBeNull();
    expect(packFor(0, TOP_DIVISION)).toBeNull();
  });

  it("geeft elke koers een pakket bij een goede uitslag, zonder daglimiet", () => {
    let save = starter();
    const team = DIVISIONS[0].teams[0].id;
    const placings = [{ id: save.lineup[0], team: PLAYER_TEAM, place: 2, time: 100, gap: 0 }, { id: "r999", team, place: 1, time: 99, gap: 0 }];
    for (let i = 0; i < 5; i++) {
      const { save: next, reward } = finishRace(save, placings);
      expect(reward.pack).toBe("brons");
      expect(reward.coins).toBeGreaterThan(0);
      save = next;
    }
    expect(save.packs.filter((p) => p === "brons")).toHaveLength(6);
  });

  it("betaalt in een hoger niveau meer prijzengeld", () => {
    const low = starter();
    const high = { ...low, division: TOP_DIVISION };
    const placings = (s: Save) => [{ id: s.lineup[0], team: PLAYER_TEAM, place: 4, time: 1, gap: 0 }];
    expect(finishRace(high, placings(high)).reward.coins).toBeGreaterThan(finishRace(low, placings(low)).reward.coins * 2);
  });

  it("promoveert de top 2 en degradeert de laatste 2", () => {
    const save = starter();
    const last = (s: Save) => ({ ...s, raceIndex: SEASON_RACES - 1 });
    const winner = [{ id: save.lineup[0], team: PLAYER_TEAM, place: 1, time: 1, gap: 0 }];
    const { save: done, reward } = finishRace(last(save), winner);
    expect(seasonDone(done)).toBe(true);
    expect(reward.season).toMatchObject({ rank: 1, move: 1, pack: "brons" });
    const up = newSeason(done);
    expect(up).toMatchObject({ season: 2, division: 1, raceIndex: 0, seasonPoints: {}, seasonResults: [] });
    expect(currentRace(up)!.id).toBe(DIVISIONS[1].races[0]);

    // Rivals score, you do not: last place goes down, but not below the Kermis.
    const rivals = (division: number) => DIVISIONS[division].teams.map((t, i) => ({ id: `r${i}`, team: t.id, place: i + 1, time: 1, gap: 0 }));
    const down = finishRace(last({ ...save, division: 2 }), rivals(2));
    expect(down.reward.season).toMatchObject({ rank: 12, move: -1, pack: null });
    expect(newSeason(down.save).division).toBe(1);
    expect(newSeason(finishRace(last(save), rivals(0)).save).division).toBe(0);
    // The top level has no level above it.
    expect(newSeason(finishRace(last({ ...save, division: TOP_DIVISION }), winner).save).division).toBe(TOP_DIVISION);
  });

  it("heeft vijf niveaus van acht koersen, elke koers in precies één niveau", () => {
    expect(DIVISIONS).toHaveLength(5);
    // A stage race takes one slot; its stages are the races.
    const all = DIVISIONS.flatMap((d) => d.races.flatMap((id) => tourById.get(id)?.stages ?? [id]));
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(all)).toEqual(new Set(RACES.map((r) => r.id)));
    DIVISIONS.forEach((d, i) => {
      expect(calendarOf(i)).toHaveLength(SEASON_RACES);
      for (const id of d.races) expect(divisionOfRace(id)).toBe(i);
    });
    expect(new Set(DIVISIONS.flatMap((d) => d.teams.map((t) => t.id))).size).toBe(DIVISIONS.length * 11);
  });

  it("zet elk niveau een sterker peloton neer dan het niveau eronder", () => {
    const top5 = (ids: string[]) => ids.map((id) => cardById(id).overall).sort((a, b) => b - a).slice(0, 5).reduce((sum, n) => sum + n, 0) / 5;
    const avg = DIVISIONS.map((_, i) => rivalTeams(i).reduce((sum, t) => sum + top5(t.riders), 0) / 11);
    for (let i = 1; i < avg.length; i++) expect(avg[i]).toBeGreaterThan(avg[i - 1] + 3);
    for (let i = 0; i < DIVISIONS.length; i++) {
      const strength = rivalTeams(i).map((t) => top5(t.riders));
      expect([...strength].sort((a, b) => b - a)).toEqual(strength);
      expect(new Set(rivalTeams(i).flatMap((t) => t.riders)).size).toBe(88 + DIVISIONS[i].rivals.diamonds);
    }
  });

  it("stopt geen goud in een bronzen pakket, en telt die niet mee voor gegarandeerd goud", () => {
    for (let n = 0; n < 200; n++) {
      const pack = openPack("brons", 7, n, PITY_PACKS - 1);
      expect(pack.cards.every((id) => (itemById.get(id)?.tier ?? cardById(id).tier) !== "goud")).toBe(true);
      expect(pack.pity).toBe(PITY_PACKS - 1);
    }
  });
});

describe("Kopman: opslag", () => {
  it("leest een eigen opslag terug", () => {
    const save = starter();
    expect(parseSave(JSON.stringify(save))).toEqual(save);
  });

  it("weigert een kapotte of aangepaste opslag", () => {
    const save = starter();
    expect(parseSave("{")).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, coins: -5 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, collection: { ...save.collection, x999: 1 } }))).toBeNull();
    const notOwned = pool().pool.find((c) => !save.collection[c.id])!.id;
    expect(parseSave(JSON.stringify({ ...save, lineup: [...save.lineup.slice(0, 4), notOwned] }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, v: 3 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, division: 5 }))).toBeNull();
    expect(parseSave(JSON.stringify({ ...save, raceIndex: SEASON_RACES + 1 }))).toBeNull();
  });

  it("zet een opslag van voor de piramide in het niveau van zijn beste vijf", () => {
    const { division: _d, ...rest } = starter();
    void _d;
    const v1 = { ...rest, v: 1, raceIndex: 12, seasonPoints: { zvk: 300 }, seasonResults: [{ race: "kustprijs", winner: "r001", best: 3, points: 65, coins: 2000, pack: "zilver" }], day: { date: "2026-11-11", rewarded: 3 } };
    const bronze = parseSave(JSON.stringify(v1))!;
    expect(bronze.v).toBe(2);
    expect(bronze.division).toBe(0);
    expect(bronze.raceIndex).toBe(0);
    expect(bronze.seasonResults).toEqual([]);
    expect(bronze.coins).toBe(v1.coins);
    expect(bronze.season).toBe(v1.season);
    const gold = pool().pool.filter((c) => c.tier === "goud").sort((a, b) => b.overall - a.overall).slice(0, 5).map((c) => c.id);
    const strong = parseSave(JSON.stringify({ ...v1, collection: { ...v1.collection, ...Object.fromEntries(gold.map((id) => [id, 1])) } }))!;
    expect(strong.division).toBe(TOP_DIVISION);
    expect(parseSave(JSON.stringify(strong))).toEqual(strong);
  });
});

describe("Kopman: koers", () => {
  const save = starter();

  it("rijdt dezelfde koers met dezelfde seed hetzelfde", () => {
    const a = results(runToEnd(createRace("limburgprijs", 5, lineupOf(save))));
    const b = results(runToEnd(createRace("limburgprijs", 5, lineupOf(save))));
    expect(a).toEqual(b);
    expect(a.every((p) => p.place > 0)).toBe(true);
  }, 30_000);

  it("start zestig renners: vijf per ploeg, zonder je eigen renners bij een ander", () => {
    const state = createRace("kustprijs", 1, lineupOf(save));
    expect(state.riders).toHaveLength(60);
    expect(new Set(state.riders.map((r) => r.id)).size).toBe(60);
    expect(state.riders.filter((r) => r.team === PLAYER_TEAM && r.kopman)).toHaveLength(1);
  });

  it("laat klimmers de bergrit winnen, sprinters de vlakke koers en tijdrijders de chrono", () => {
    const winnerType = (race: string, seed: number) => cardById(results(runToEnd(createRace(race, seed, lineupOf(save))))[0].id).type;
    const mountain = [1, 2, 3].map((s) => winnerType("provence-bergrit", s));
    expect(mountain.filter((t) => t === "klimmer" || t === "allrounder").length).toBeGreaterThanOrEqual(2);
    expect(mountain).not.toContain("sprinter");
    expect(["sprinter", "klassieker"]).toContain(winnerType("kustprijs", 1));
    expect(["tijdrijder", "allrounder"]).toContain(winnerType("polderchrono", 1));
  }, 30_000);

  it("geeft geen slipstream in de tijdrit en daar ook geen orders", () => {
    const state = createRace("polderchrono", 1, lineupOf(save));
    for (let i = 0; i < 300; i++) stepRace(state);
    expect(state.riders.some((r) => r.sheltered)).toBe(false);
    expect(availableRadio(state)).toEqual([]);
  });

  it("laat de kopman aanvallen op de radio", () => {
    const state = createRace("kwaremont", 1, lineupOf(save));
    for (let i = 0; i < 600; i++) stepRace(state);
    expect(availableRadio(state)).toContain("aanval");
    expect(playRadio(state, "aanval")).toBe(true);
    const kopman = state.riders.find((r) => r.team === PLAYER_TEAM && r.kopman)!;
    expect(kopman.override?.mode).toBe("aanval");
    stepRace(state);
    expect(kopman.effort).toBeGreaterThan(1.3);
  });

  it("laat per hand maar één order spelen", () => {
    const state = createRace("kwaremont", 1, lineupOf(save));
    for (let i = 0; i < 600; i++) stepRace(state);
    const options = availableRadio(state);
    expect(options.length).toBeGreaterThan(1);
    expect(playRadio(state, options[0], 3)).toBe(true);
    expect(handPlayed(state, 3)).toBe(true);
    expect(playRadio(state, options[1], 3)).toBe(false);
    expect(playRadio(state, options[1], 2)).toBe(false);
    expect(handPlayed(state, 4)).toBe(false);
  });

  it("daalt na elke klim waar nog vlakke weg volgt, zonder de koers langer te maken", () => {
    for (const def of RACES) {
      const course = buildCourse(def);
      const climbs = course.features.filter((f) => f.kind === "klim");
      def.items.forEach((item, i) => {
        if (item.kind !== "klim") return;
        const next = def.items[i + 1];
        const feature = climbs.shift()!;
        const after = course.grades[feature.end / 100];
        if (next?.kind === "vlak" && next.km >= 2.5) expect(after, `${def.id}: ${item.climb}`).toBeLessThan(-0.02);
        if (!next) expect(feature.end).toBe(course.length);
      });
      const km = def.items.reduce((sum, item) => sum + (item.kind === "klim" ? climbById.get(item.climb)!.km : item.kind === "sector" ? sectorById.get(item.sector)!.km : item.km), 0);
      expect(Math.abs(course.length / 1000 - km), def.id).toBeLessThan(0.5);
    }
  });

  it("kiest per koers de vijf renners die het best passen", () => {
    const team = rivalTeams(TOP_DIVISION)[0];
    const course = buildCourse(raceById.get("alpenrit")!);
    const weights = courseWeights(course);
    const five = lineupFor(team.riders.map(cardById), course);
    expect(five).toHaveLength(5);
    const fits = team.riders.map((id) => fitFor(cardById(id), weights)).sort((a, b) => b - a);
    expect(fitFor(five[0], weights)).toBe(fits[0]);
  });
});

describe("Kopman: los van het platform", () => {
  it("importeert niets van buiten src/kopman", () => {
    const root = path.join(process.cwd(), "src", "kopman");
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((name) => { const full = path.join(dir, name); if (statSync(full).isDirectory()) walk(full); else if (/\.(ts|tsx)$/.test(name)) files.push(full); });
    walk(root);
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const [, spec] of source.matchAll(/from\s+"([^"]+)"/g)) {
        if (spec.startsWith(".")) expect(path.resolve(path.dirname(file), spec).startsWith(root), `${file} → ${spec}`).toBe(true);
        else expect(["react", "lucide-react", "zod"], `${file} → ${spec}`).toContain(spec);
      }
    }
  });
});
