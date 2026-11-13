import { describe, expect, it } from "vitest";
import { cardById, pool } from "@/kopman/engine/cards";
import { bestLineup, budgetOf, canStart, chooseSponsor, currentRace, finishRace, lineupSalary, needsSponsor, newSave, newSeason, offersFor, raceSetup, salaryFor, skipRace, type Save } from "@/kopman/engine/economy";
import { createRace, type Placing } from "@/kopman/engine/race";
import { parseSave } from "@/kopman/engine/save";
import { BASE_BUDGET, FAME_GAIN, FAME_START, fameAfter, salaryOf, sponsorOffers, type Sponsor } from "@/kopman/engine/sponsors";
import { PLAYER_TEAM } from "@/kopman/engine/types";

/** A finished race; `mineFirst` puts your kopman on top. */
function placingsFor(save: Save, mineFirst = false): Placing[] {
  const setup = raceSetup(save)!;
  const riders = createRace(setup.raceId, setup.seed, setup.lineup).riders.map((r) => ({ id: r.id, team: r.team }));
  if (mineFirst) riders.sort((a, b) => Number(b.id === save.kopman) - Number(a.id === save.kopman));
  else riders.sort((a, b) => Number(a.team === PLAYER_TEAM) - Number(b.team === PLAYER_TEAM));
  return riders.map((r, i) => ({ ...r, place: i + 1, time: 3600 + i, gap: i }));
}

const withSponsor = (save: Save, sponsor: Partial<Sponsor>): Save => ({ ...save, sponsor: { name: "Test", pay: 100, budget: 999, goal: { kind: "zeges", n: 1 }, bonus: 500, progress: 0, met: false, ...sponsor } });

describe("Kopman: sponsors, populariteit en een plafond", () => {
  it("begint een seizoen met drie sponsors om uit te kiezen", () => {
    const save = newSave(21);
    expect(needsSponsor(save)).toBe(true);
    expect(canStart(save)).toBe(false);
    const offers = offersFor(save);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((o) => o.name)).size).toBe(3);
    // The same season gives the same offers.
    expect(offersFor(save)).toEqual(offers);
    const chosen = chooseSponsor(save, 1);
    expect(chosen.sponsor).toEqual(offers[1]);
    expect(needsSponsor(chosen)).toBe(false);
    expect(canStart(chosen)).toBe(true);
  });

  it("geeft betere aanbiedingen aan een populaire ploeg", () => {
    const low = sponsorOffers(1, 1, 2, 0, null);
    const high = sponsorOffers(1, 1, 2, 100, null);
    low.forEach((o, i) => {
      expect(high[i].pay).toBeGreaterThan(o.pay);
      expect(high[i].budget).toBeGreaterThanOrEqual(o.budget);
    });
  });

  it("betaalt per koers en een bonus voor het doel", () => {
    const save = withSponsor(newSave(22), {});
    const lost = finishRace(save, placingsFor(save));
    expect(lost.reward.pay).toBe(100);
    expect(lost.reward.bonus).toBe(0);
    expect(lost.save.sponsor?.met).toBe(false);
    const won = finishRace(save, placingsFor(save, true));
    expect(won.reward.bonus).toBe(500);
    expect(won.save.sponsor?.met).toBe(true);
    expect(won.save.coins).toBe(save.coins + won.reward.coins + 500);
    // A met goal pays once.
    const again = finishRace(won.save, placingsFor(won.save, true));
    expect(again.reward.bonus).toBe(0);
  });

  it("komt terug na een gehaald doel en betaalt een tiende meer", () => {
    let save = withSponsor(newSave(23), { name: "Melkerij De Weide", met: true });
    while (currentRace(save)) save = skipRace(save)!;
    const next = newSeason(save);
    expect(next.loyal).toBe("Melkerij De Weide");
    expect(next.sponsor).toBeNull();
    expect(offersFor(next)[0].name).toBe("Melkerij De Weide");
    const fresh = sponsorOffers(next.seed, next.season, next.division, next.fame, null);
    expect(offersFor(next)[0].pay).toBeGreaterThan(fresh[0].pay);
  });

  it("maakt populairder met zeges, en wat minder zonder top 10", () => {
    expect(fameAfter(FAME_START, 1)).toBe(FAME_START + FAME_GAIN.win);
    expect(fameAfter(FAME_START, 50)).toBe(FAME_START + FAME_GAIN.none);
    expect(fameAfter(FAME_START, 1, 1, 0.4)).toBeGreaterThan(fameAfter(FAME_START, 1));
    expect(fameAfter(100, 1)).toBe(100);
    const save = newSave(24);
    expect(finishRace(save, placingsFor(save, true)).save.fame).toBe(FAME_START + FAME_GAIN.win);
  });

  it("houdt de vijf die starten binnen het budget", () => {
    expect(salaryOf(55)).toBeLessThan(salaryOf(75));
    expect(salaryOf(92)).toBeGreaterThan(100);
    // Gold riders on an Interclub budget: not all of them fit.
    const gold = pool().pool.filter((c) => c.tier === "goud").slice(0, 8).map((c) => c.id);
    const bronze = pool().pool.filter((c) => c.tier === "brons").slice(0, 8).map((c) => c.id);
    const base = newSave(25);
    const save: Save = withSponsor({ ...base, collection: Object.fromEntries([...gold, ...bronze].map((id) => [id, 1])), lineup: gold.slice(0, 5), kopman: gold[0] }, { budget: BASE_BUDGET[1] });
    expect(lineupSalary(save)).toBeGreaterThan(budgetOf(save));
    expect(canStart(save)).toBe(false);
    const best = bestLineup(save, currentRace(save)!.id);
    expect(best.lineup).toHaveLength(5);
    expect(lineupSalary(best)).toBeLessThanOrEqual(budgetOf(best));
    expect(best.lineup.some((id) => cardById(id).tier === "goud")).toBe(true);
    expect(salaryFor(best, best.lineup[0])).toBeGreaterThan(0);
    // Only gold riders: the budget stretches to the cheapest five, so the team can start.
    const rich: Save = withSponsor({ ...base, collection: Object.fromEntries(gold.slice(0, 5).map((id) => [id, 1])), lineup: gold.slice(0, 5), kopman: gold[0] }, { budget: BASE_BUDGET[0] });
    expect(budgetOf(rich)).toBe(lineupSalary(rich));
    expect(canStart(rich)).toBe(true);
  });

  it("leest een save zonder sponsor en populariteit", () => {
    const save = newSave(26);
    const { fame: _f, sponsor: _s, loyal: _l, ...old } = save;
    void _f; void _s; void _l;
    const back = parseSave(JSON.stringify(old))!;
    expect(back.fame).toBe(FAME_START);
    expect(back.sponsor).toBeNull();
    expect(parseSave(JSON.stringify(chooseSponsor(save, 0)))?.sponsor?.name).toBe(offersFor(save)[0].name);
  });
});
