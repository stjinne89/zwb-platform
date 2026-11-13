import { describe, expect, it } from "vitest";
import { createBoard, KRACHT_KOPMAN } from "@/kopman/engine/board";
import { cardById, pool } from "@/kopman/engine/cards";
import { bestLineup, currentRace, currentTour, finishRace, GC_FACTOR, newSave, raceSetup, toggleLineup, type Save } from "@/kopman/engine/economy";
import { DIVISIONS, TOP_DIVISION } from "@/kopman/engine/divisions";
import { createRace, type Placing } from "@/kopman/engine/race";
import { parseSave } from "@/kopman/engine/save";
import { BONUS_SECONDS, bookStage, generalOf, jerseysOf, newTour, TOUR_RECOVERY } from "@/kopman/engine/tour";
import { PLAYER_TEAM } from "@/kopman/engine/types";
import { tourById } from "@/kopman/engine/world";

const slot = DIVISIONS[TOP_DIVISION].races.findIndex((id) => tourById.has(id));
const tour = tourById.get(DIVISIONS[TOP_DIVISION].races[slot])!;

/** A save in the top level, at the stage race, with its five best riders. */
function atTour(): Save {
  const save = newSave(4242);
  const best = [...pool().pool].filter((c) => c.tier !== "diamant").sort((a, b) => b.overall - a.overall).slice(20, 25).map((c) => c.id);
  return { ...save, division: TOP_DIVISION, raceIndex: slot, collection: Object.fromEntries(best.map((id) => [id, 1])), lineup: best, kopman: best[0] };
}

/** A stage result without riding it: everyone of the stage, in a seeded order, one second apart. */
function placingsFor(save: Save, winner?: string): Placing[] {
  const setup = raceSetup(save)!;
  const state = createRace(setup.raceId, setup.seed, setup.lineup);
  const ids = state.riders.map((r) => r.id).sort();
  if (winner) {
    ids.splice(ids.indexOf(winner), 1);
    ids.unshift(winner);
  }
  return ids.map((id, i) => ({ id, team: state.riders.find((r) => r.id === id)!.team, place: i + 1, time: 3600 + i, gap: i }));
}

describe("Kopman: een ronde in de Wereldtour", () => {
  it("staat als één plek in de kalender van de Wereldtour, met vijf etappes", () => {
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(tour.stages).toHaveLength(5);
    const save = atTour();
    expect(currentTour(save)?.id).toBe(tour.id);
    expect(currentRace(save)?.id).toBe(tour.stages[0]);
  });

  it("rijdt etappe na etappe en boekt de ronde pas na de laatste", () => {
    let save = atTour();
    const mine = save.lineup[0];
    for (let stage = 0; stage < tour.stages.length; stage++) {
      expect(currentRace(save)?.id).toBe(tour.stages[stage]);
      const { save: next, reward } = finishRace(save, placingsFor(save, mine), {});
      expect(reward.tour?.stage).toBe(stage + 1);
      expect(reward.pack).toBe("zilver");
      if (stage < tour.stages.length - 1) {
        expect(next.raceIndex).toBe(slot);
        expect(next.tour?.stage).toBe(stage + 1);
        expect(reward.tour?.done).toBe(false);
      } else {
        expect(next.raceIndex).toBe(slot + 1);
        expect(next.tour).toBeNull();
        expect(reward.tour?.done).toBe(true);
        expect(reward.tour?.jerseys.geel).toBe(mine);
        // Gold for the yellow jersey, silver for the green and the mountains.
        expect(reward.tour?.packs).toEqual(["goud", "zilver", "zilver"]);
        const record = next.seasonResults.at(-1)!;
        expect(record.race).toBe(tour.id);
        expect(record.best).toBe(1);
        expect(record.points).toBeGreaterThanOrEqual(100 * GC_FACTOR);
      }
      save = next;
    }
  });

  it("houdt dezelfde vijf renners en dezelfde rivalen de hele ronde", () => {
    const save = atTour();
    const first = raceSetup(save)!;
    const after = finishRace(save, placingsFor(save), {}).save;
    const other = save.lineup.find((id) => id !== save.kopman)!;
    expect(toggleLineup(after, other)).toBe(after);
    expect(bestLineup(after, currentRace(after)!.id).lineup).toEqual(after.lineup);
    const second = raceSetup(after)!;
    expect(second.lineup.riders).toEqual(first.lineup.riders);
    expect(second.lineup.rivals).toEqual(first.lineup.rivals);
    const team = Object.keys(first.lineup.rivals!)[0];
    const riders = createRace(second.raceId, second.seed, second.lineup).riders.filter((r) => r.team === team).map((r) => r.id).sort();
    expect(riders).toEqual([...first.lineup.rivals![team]].sort());
  });

  it("neemt de kracht van gisteren mee, met de helft van wat ontbreekt terug", () => {
    const save = atTour();
    const k = save.kopman!;
    const setup = raceSetup(save)!;
    const fresh = createBoard(setup.raceId, setup.seed, setup.lineup, {});
    expect(fresh.kracht[k]).toBe(fresh.start[k]);
    const tired = createBoard(setup.raceId, setup.seed, setup.lineup, {}, { tired: { [k]: 0 }, player: TOUR_RECOVERY, rival: TOUR_RECOVERY });
    expect(tired.start[k]).toBe(fresh.start[k]);
    expect(tired.kracht[k]).toBe(Math.round(fresh.start[k] * TOUR_RECOVERY));
    expect(fresh.start[k]).toBeGreaterThanOrEqual(KRACHT_KOPMAN);
    // The next stage starts from what the last one left.
    const after = finishRace(save, placingsFor(save), { [k]: 3 }).save;
    expect(raceSetup(after)!.carry?.tired[k]).toBe(3);
  });

  it("telt tijd met bonificaties, en punten en berg per soort etappe", () => {
    const ids = ["a", "b", "c", "d"];
    const placings = ids.map((id, i) => ({ id, team: i ? "x" : PLAYER_TEAM, place: i + 1, time: 1000 + i * 5, gap: i * 5 }));
    const flat = bookStage(newTour(), tour.stages[0], placings, {});
    expect(flat.time.a).toBe(1000 - BONUS_SECONDS[0]);
    expect(flat.time.d).toBe(1015);
    expect(flat.points.a).toBe(50);
    expect(flat.kom.a ?? 0).toBe(0);
    const mountain = bookStage(flat, tour.stages[4], [...placings].reverse().map((p, i) => ({ ...p, place: i + 1 })), {});
    expect(mountain.kom.d).toBe(20);
    expect(generalOf(mountain)[0].gap).toBe(0);
    expect(jerseysOf(mountain).berg).toBe("d");
  });

  it("leest een save midden in een ronde terug, en een oude save zonder ronde", () => {
    const save = atTour();
    const after = finishRace(save, placingsFor(save), {}).save;
    expect(parseSave(JSON.stringify(after))?.tour?.stage).toBe(1);
    const { tour: _, ...old } = save;
    void _;
    expect(parseSave(JSON.stringify(old))?.tour).toBeNull();
    expect(cardById(after.tour!.riders[0])).toBeTruthy();
  });
});
