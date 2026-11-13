import { describe, expect, it } from "vitest";
import { cardById } from "@/kopman/engine/cards";
import { ruleEffects } from "@/kopman/engine/career";
import { budgetOf, buyPack, calendarOf, canNewCareer, LOWER_PACK, priceAt, chooseSponsor, finishRace, newCareer, newSave, newSeason, raceSetup, rivalsOf, type Save } from "@/kopman/engine/economy";
import { DIVISIONS, TOP_DIVISION } from "@/kopman/engine/divisions";
import { createRace, type Placing } from "@/kopman/engine/race";
import { parseSave } from "@/kopman/engine/save";
import { rivalTeams } from "@/kopman/engine/teams";
import { liftedCard, NEMESIS_ABOVE, NEMESIS_MIN, nemesisCard, OVERALL_MAX, rivalCards, seasonRosters, teamTarget, TRANSFERS } from "@/kopman/engine/transfers";
import { PLAYER_TEAM } from "@/kopman/engine/types";

const ready = (seed: number) => chooseSponsor(newSave(seed), 2);

/** Placings with the given rivals first, then yours, then the rest. */
function placingsFor(save: Save, ahead: string[] = [], winner?: string): Placing[] {
  const setup = raceSetup(save)!;
  const riders = createRace(setup.raceId, setup.seed, setup.lineup).riders.map((r) => ({ id: r.id, team: r.team }));
  const rank = (r: { id: string; team: string }) => (r.id === winner ? -1 : ahead.includes(r.id) ? ahead.indexOf(r.id) : r.team === PLAYER_TEAM ? 10 : 20);
  riders.sort((a, b) => rank(a) - rank(b));
  return riders.map((r, i) => ({ ...r, place: i + 1, time: 3600 + i, gap: i }));
}

/** A finished season in the Wereldtour, with you on top. */
function champion(seed: number): Save {
  const save = ready(seed);
  return { ...save, division: TOP_DIVISION, raceIndex: calendarOf(TOP_DIVISION).length, seasonPoints: { [PLAYER_TEAM]: 999 } };
}

describe("Kopman: een wereld die beweegt", () => {
  it("ruilt elk seizoen renners tussen de ploegen, en de sterkste kopen goud", () => {
    const fixed = Object.fromEntries(rivalTeams(1).map((t) => [t.id, t.riders]));
    expect(seasonRosters(1, 5, 1)).toEqual(fixed);
    const next = seasonRosters(1, 5, 2);
    expect(seasonRosters(1, 5, 2)).toBe(next);
    const all = Object.values(next).flat();
    expect(new Set(all).size).toBe(all.length);
    for (const [id, riders] of Object.entries(next)) {
      const changed = riders.filter((r) => !fixed[id].includes(r)).length;
      expect(changed).toBeLessThanOrEqual(TRANSFERS.perTeam);
      expect(riders).toHaveLength(fixed[id].length);
    }
    const strongest = rivalTeams(1)[0].id;
    expect(next[strongest].filter((r) => !fixed[strongest].includes(r)).some((r) => cardById(r).tier === "goud")).toBe(true);
    // A different career moves differently.
    expect(seasonRosters(1, 6, 2)).not.toEqual(next);
  });

  it("maakt wie je het vaakst klopte tot aartsrivaal, op de kracht van je niveau", () => {
    let save = ready(51);
    const setup = raceSetup(save)!;
    const rival = createRace(setup.raceId, setup.seed, setup.lineup).riders.find((r) => r.team !== PLAYER_TEAM)!.id;
    for (let i = 0; i < NEMESIS_MIN; i++) save = finishRace(save, placingsFor(save, [rival])).save;
    expect(save.beaten[rival]).toBe(NEMESIS_MIN);
    const next = newSeason(save);
    expect(next.nemesis).toBe(rival);
    expect(next.beaten).toEqual({});
    // He rides for the strongest team, and only there.
    const world = rivalsOf(next);
    const strongest = rivalTeams(next.division)[0].id;
    expect(world.rosters[strongest]).toContain(rival);
    expect(Object.entries(world.rosters).filter(([, riders]) => riders.includes(rival)).map(([id]) => id)).toEqual([strongest]);
    expect(world.cards[rival].overall).toBeGreaterThanOrEqual(cardById(rival).overall);
    expect(nemesisCard(rival, 1).overall).toBeGreaterThanOrEqual(DIVISIONS[1].band[0] + NEMESIS_ABOVE - 1);
    expect(nemesisCard(rival, TOP_DIVISION).overall).toBeGreaterThanOrEqual(OVERALL_MAX - 2);
    expect(nemesisCard(rival, TOP_DIVISION).overall).toBeLessThanOrEqual(OVERALL_MAX);
    // A rival you own is never your arch-rival.
    const owned: Save = { ...save, collection: { ...save.collection, [rival]: 1 } };
    expect(newSeason(owned).nemesis).toBeNull();
  });

  it("tilt de rivalen in de Wereldtour op tot hun plek in de band, tot 100", () => {
    expect(DIVISIONS[TOP_DIVISION].band[0]).toBe(100);
    expect(rivalCards(TOP_DIVISION - 1, seasonRosters(TOP_DIVISION - 1, 7, 1))).toEqual({});
    const rosters = seasonRosters(TOP_DIVISION, 7, 3);
    const cards = rivalCards(TOP_DIVISION, rosters);
    const top5 = (id: string) => {
      const best = rosters[id].map((r) => (cards[r] ?? cardById(r)).overall).sort((a, b) => b - a).slice(0, 5);
      return best.reduce((sum, n) => sum + n, 0) / best.length;
    };
    const teams = rivalTeams(TOP_DIVISION);
    expect(top5(teams[0].id)).toBeGreaterThan(95);
    expect(top5(teams[0].id)).toBeLessThanOrEqual(OVERALL_MAX);
    teams.slice(3).forEach((t, i) => expect(Math.abs(top5(t.id) - teamTarget(TOP_DIVISION, i + 3))).toBeLessThan(1.5));
    for (const card of Object.values(cards)) {
      expect(card.overall).toBeGreaterThanOrEqual(cardById(card.id).overall);
      expect(Math.max(...Object.values(card.stats))).toBeLessThanOrEqual(99);
    }
    expect(liftedCard(cardById(teams[0].riders[0]), 200).overall).toBeLessThanOrEqual(OVERALL_MAX);
    // In a race the rivals ride on their lifted cards, your riders on your own.
    const save: Save = { ...ready(56), division: TOP_DIVISION };
    const setup = raceSetup(save)!;
    const race = createRace(setup.raceId, setup.seed, setup.lineup);
    const rival = race.riders.find((r) => r.team !== PLAYER_TEAM && rivalsOf(save).cards[r.id])!;
    expect(rival.card.overall).toBe(rivalsOf(save).cards[rival.id].overall);
    for (const r of race.riders.filter((x) => x.team === PLAYER_TEAM)) expect(rivalsOf(save).cards[r.id]).toBeUndefined();
  });

  it("verkoopt goud vanaf de Proftour en diamant in de Wereldtour, voor veel munten", () => {
    const at = (division: number, type: "goud" | "diamant") => priceAt({ ...ready(57), division }, type);
    expect([0, 1, 2, 3, 4].map((d) => at(d, "goud"))).toEqual([undefined, undefined, undefined, 25000, 25000]);
    expect([0, 1, 2, 3, 4].map((d) => at(d, "diamant"))).toEqual([undefined, undefined, undefined, undefined, 75000]);
    const save: Save = { ...ready(57), division: TOP_DIVISION, coins: 80000 };
    const bought = buyPack(save, "diamant", priceAt(save, "diamant"))!;
    expect(bought.coins).toBe(5000);
    expect(bought.packs.at(-1)).toBe("diamant");
    expect(buyPack(bought, "goud", priceAt(bought, "goud"))).toBeNull();
  });

  it("legt de regels van een zwaardere carrière op", () => {
    const save = ready(52);
    const hard: Save = { ...save, career: { level: 2, rules: ["minder-pakketten", "sterkere-rivalen", "krap-budget"] } };
    const setup = raceSetup(hard)!;
    const rivals = createRace(setup.raceId, setup.seed, setup.lineup).riders.filter((r) => r.team !== PLAYER_TEAM).slice(0, 3).map((r) => r.id);
    // Fourth in the Proftour: a top-10 pack in a normal career, none under the rule.
    const pro: Save = { ...save, division: 3 };
    const proHard: Save = { ...hard, division: 3 };
    const proSetup = raceSetup(pro)!;
    const ahead = createRace(proSetup.raceId, proSetup.seed, proSetup.lineup).riders.filter((r) => r.team !== PLAYER_TEAM).slice(0, 3).map((r) => r.id);
    expect(finishRace(pro, placingsFor(pro, ahead)).save.packs).toHaveLength(pro.packs.length + 1);
    expect(finishRace(proHard, placingsFor(proHard, ahead)).save.packs).toEqual(proHard.packs);
    // Second: a podium still gives a pack, one tier lower.
    expect(finishRace(hard, placingsFor(hard, rivals.slice(0, 1))).save.packs).toEqual([...hard.packs, LOWER_PACK[DIVISIONS[hard.division].packs.podium!]]);
    const top: Save = { ...hard, division: TOP_DIVISION };
    const topSetup = raceSetup(top)!;
    const topWinner = createRace(topSetup.raceId, topSetup.seed, topSetup.lineup).riders.find((r) => r.team === PLAYER_TEAM)!.id;
    expect(finishRace(top, placingsFor(top, [], topWinner)).save.packs.at(-1)).toBe("zilver");
    expect(finishRace({ ...top, career: { level: 2, rules: [] } }, placingsFor(top, [], topWinner)).save.packs.at(-1)).toBe("goud");
    expect(raceSetup(hard)!.lineup.xp).toBe(1);
    expect(raceSetup(save)!.lineup.xp).toBe(0);
    expect(budgetOf(hard)).toBeLessThanOrEqual(budgetOf(save));
    expect(ruleEffects({ level: 2, rules: ["sneller-oud"] }).ageShift).toBe(2);
    const won = finishRace(hard, placingsFor(hard, [], hard.kopman!)).save;
    expect(won.packs).toHaveLength(hard.packs.length + 1);
  });

  it("begint na een wereldtitel een nieuwe carrière, met één erfstuk en een regel meer", () => {
    const save = champion(53);
    expect(canNewCareer(save)).toBe(true);
    expect(canNewCareer(ready(53))).toBe(false);
    const heirloom = save.lineup[0];
    expect(newCareer(save, "geen-renner", "krap-budget", 9)).toBeNull();
    const next = newCareer(save, heirloom, "krap-budget", 9)!;
    expect(next.division).toBe(0);
    expect(next.season).toBe(1);
    expect(next.career).toEqual({ level: 2, rules: ["krap-budget"] });
    expect(next.collection[heirloom]).toBe(1);
    expect(next.riders[heirloom].age).toBe(save.riders[heirloom].age);
    expect(next.teamName).toBe(save.teamName);
    // The same rule twice is no harder career.
    const again = { ...champion(54), career: next.career };
    expect(newCareer(again, again.lineup[0], "krap-budget", 9)).toBeNull();
    // The title goes into the erelijst when the last race closes the season.
    const last: Save = { ...save, raceIndex: calendarOf(TOP_DIVISION).length - 1 };
    const closed = finishRace(last, placingsFor(last, [], last.kopman!)).save;
    expect(closed.titles).toEqual([{ career: 1, season: last.season }]);
  });

  it("leest een save met een aartsrivaal en een carrière terug, en een zonder", () => {
    const save: Save = { ...ready(55), nemesis: rivalTeams(0)[0].riders[0], beaten: { [rivalTeams(0)[0].riders[1]]: 1 }, career: { level: 3, rules: ["sneller-oud", "krap-budget"] }, titles: [{ career: 1, season: 9 }] };
    const back = parseSave(JSON.stringify(save))!;
    expect(back.nemesis).toBe(save.nemesis);
    expect(back.beaten).toEqual(save.beaten);
    expect(back.career).toEqual(save.career);
    expect(back.titles).toEqual(save.titles);
    const { nemesis: _n, beaten: _b, career: _c, titles: _t, ...old } = save;
    void _n; void _b; void _c; void _t;
    const fresh = parseSave(JSON.stringify(old))!;
    expect(fresh.nemesis).toBeNull();
    expect(fresh.career).toEqual({ level: 1, rules: [] });
    expect(fresh.titles).toEqual([]);
  });
});
