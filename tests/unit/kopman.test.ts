import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPool, cardById, overallOf, pool, statsFor, tierOf } from "@/kopman/engine/cards";
import { buildCourse, courseWeights, fitFor } from "@/kopman/engine/course";
import { buyPack, DAILY_PACK_RACES, finishRace, newSave, newSeason, openPackOf, packFor, seasonDone, toggleLineup, type Save } from "@/kopman/engine/economy";
import { openPack, PACK_SIZE, PITY_PACKS } from "@/kopman/engine/packs";
import { createRace, results, runToEnd, stepRace } from "@/kopman/engine/race";
import { availableRadio, playRadio } from "@/kopman/engine/radio";
import { rng } from "@/kopman/engine/rng";
import { parseSave } from "@/kopman/engine/save";
import { lineupFor, rivalTeams } from "@/kopman/engine/teams";
import { PLAYER_TEAM, RIDER_TYPES } from "@/kopman/engine/types";
import { CALENDAR, raceById } from "@/kopman/engine/world";

const DATE = "2026-11-11";
const starter = () => newSave(12345, DATE);
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
      expect(openPack("brons", 1, n, PITY_PACKS - 1).cards.some((id) => cardById(id).tier === "goud")).toBe(true);
      expect(openPack("goud", 1, n, 0).cards.some((id) => cardById(id).tier === "goud")).toBe(true);
    }
  });

  it("volgt ongeveer de getoonde kansen", () => {
    let gold = 0, silver = 0, total = 0;
    for (let n = 0; n < 2000; n++) for (const id of openPack("brons", 7, n, 0).cards) { total++; if (cardById(id).tier === "goud") gold++; if (cardById(id).tier === "zilver") silver++; }
    expect(gold / total).toBeGreaterThan(0.01);
    expect(gold / total).toBeLessThan(0.035);
    expect(silver / total).toBeGreaterThan(0.17);
    expect(silver / total).toBeLessThan(0.23);
  });

  it("zet het vangnet terug na goud en telt anders op", () => {
    expect(openPack("goud", 1, 0, 5).pity).toBe(0);
    let pity = 0;
    for (let n = 0; n < 40; n++) {
      const pack = openPack("brons", 3, n, pity);
      const gold = pack.cards.some((id) => cardById(id).tier === "goud");
      expect(pack.pity).toBe(gold ? 0 : pity + 1);
      expect(pack.pity).toBeLessThan(PITY_PACKS);
      pity = pack.pity;
    }
  });
});

describe("Kopman: economie", () => {
  it("begint met vijf bronzen renners van elk type, munten en een zilveren pakket", () => {
    const save = starter();
    expect(save.lineup).toHaveLength(5);
    expect(new Set(save.lineup.map((id) => cardById(id).type))).toEqual(new Set(RIDER_TYPES));
    expect(save.lineup.every((id) => cardById(id).tier === "brons")).toBe(true);
    expect(save.packs).toEqual(["zilver"]);
    expect(save.kopman).toBe(save.lineup[0]);
  });

  it("maakt van een dubbele kaart munten", () => {
    let save = starter();
    const first = openPack("zilver", save.seed, 0, 0).cards[0];
    save = { ...save, collection: { ...save.collection, [first]: 1 } };
    const opened = openPackOf(save, "zilver")!;
    const dup = opened.pulls.find((p) => p.id === first)!;
    expect(dup.duplicate).toBe(true);
    expect(dup.coins).toBeGreaterThan(0);
    expect(opened.save.collection[first]).toBe(2);
    expect(opened.save.packs).toEqual([]);
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

  it("beloont het podium met zilver, een monumentzege met goud", () => {
    expect(packFor(1, true)).toBe("goud");
    expect(packFor(1, false)).toBe("zilver");
    expect(packFor(3, false)).toBe("zilver");
    expect(packFor(40, false)).toBe("brons");
    expect(packFor(0, false)).toBeNull();
  });

  it("geeft maar drie koersen per dag een pakket, munten en punten altijd", () => {
    let save = starter();
    const placings = [{ id: save.lineup[0], team: PLAYER_TEAM, place: 5, time: 100, gap: 0 }, { id: "r999", team: "zvk", place: 1, time: 99, gap: 0 }];
    for (let i = 0; i < DAILY_PACK_RACES; i++) {
      const { save: next, reward } = finishRace(save, placings, DATE);
      expect(reward.pack).toBe("brons");
      save = next;
    }
    const { save: after, reward } = finishRace(save, placings, DATE);
    expect(reward.pack).toBeNull();
    expect(reward.coins).toBeGreaterThan(0);
    expect(reward.points).toBeGreaterThan(0);
    expect(after.raceIndex).toBe(DAILY_PACK_RACES + 1);
    expect(finishRace(after, placings, "2026-11-12").reward.pack).toBe("brons");
  });

  it("sluit het seizoen af met een seizoensbeloning en begint opnieuw", () => {
    let save = { ...starter(), raceIndex: CALENDAR.length - 1 };
    const { save: done, reward } = finishRace(save, [{ id: save.lineup[0], team: PLAYER_TEAM, place: 1, time: 1, gap: 0 }], DATE);
    expect(seasonDone(done)).toBe(true);
    expect(reward.season?.rank).toBe(1);
    expect(done.packs).toContain("goud");
    save = newSeason(done);
    expect(save.season).toBe(2);
    expect(save.raceIndex).toBe(0);
    expect(save.seasonPoints).toEqual({});
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
    expect(parseSave(JSON.stringify({ ...save, v: 2 }))).toBeNull();
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

  it("kiest per koers de vijf renners die het best passen", () => {
    const team = rivalTeams()[0];
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
