import { describe, expect, it } from "vitest";
import { createBoard } from "@/kopman/engine/board";
import { cardById, pool } from "@/kopman/engine/cards";
import { buildCourse, courseKind } from "@/kopman/engine/course";
import { raceById } from "@/kopman/engine/world";
import { answerEvent, canStart, chooseSponsor, champCountries, champOpen, champSetup, finishChampionship, finishRace, handIn, handInPicks, newSave, raceSetup, skipRace, withLives, type Save } from "@/kopman/engine/economy";
import { CHAMPIONSHIP_AFTER, DIVISIONS } from "@/kopman/engine/divisions";
import { drawEvent, EVENT_FORM, GROWTH_POINTS, GROWTH_STAT, PERS } from "@/kopman/engine/events";
import { createRace, type Placing } from "@/kopman/engine/race";
import { parseSave } from "@/kopman/engine/save";
import { PLAYER_TEAM } from "@/kopman/engine/types";

function placingsFor(save: Save, winner?: string): Placing[] {
  const setup = raceSetup(save)!;
  const riders = createRace(setup.raceId, setup.seed, setup.lineup).riders.map((r) => ({ id: r.id, team: r.team }));
  riders.sort((a, b) => Number(b.id === winner) - Number(a.id === winner) || Number(a.team === PLAYER_TEAM) - Number(b.team === PLAYER_TEAM));
  return riders.map((r, i) => ({ ...r, place: i + 1, time: 3600 + i, gap: i }));
}

const ready = (seed: number) => chooseSponsor(newSave(seed), 2);

describe("Kopman: een seizoen met keuzes", () => {
  it("trekt soms een keuze na een koers, en die wacht op een antwoord", () => {
    let found: Save | null = null;
    for (let seed = 1; seed < 40 && !found; seed++) {
      const save = ready(seed);
      const after = finishRace(save, placingsFor(save)).save;
      if (after.event) found = after;
    }
    expect(found).not.toBeNull();
    expect(canStart(found!)).toBe(false);
    expect(canStart(answerEvent(found!, 1))).toBe(true);
    // The same race gives the same event.
    expect(drawEvent(1, [1, 0, 0, 0], ["a", "b"], "a", [], [], () => 1)).toEqual(drawEvent(1, [1, 0, 0, 0], ["a", "b"], "a", [], [], () => 1));
  });

  it("maakt een knecht kopman of zet hem op zijn plaats", () => {
    const save = ready(41);
    const knecht = save.lineup[1];
    const asked: Save = { ...save, event: { kind: "kopman", rider: knecht } };
    const yes = answerEvent(asked, 0);
    expect(yes.kopman).toBe(knecht);
    expect(yes.event).toBeNull();
    const tired: Save = { ...asked, riders: { ...asked.riders, [knecht]: { ...asked.riders[knecht], form: 80 } } };
    expect(answerEvent(tired, 1).riders[knecht].form).toBe(80 + EVENT_FORM.no);
  });

  it("verkoopt een renner op een bod, of laat hem rusten na een val", () => {
    const base = ready(42);
    const spare = pool().pool.find((c) => !base.collection[c.id] && c.tier === "brons")!.id;
    const save = withLives({ ...base, collection: { ...base.collection, [spare]: 1 } });
    const sold = answerEvent({ ...save, event: { kind: "bod", rider: spare, team: "k01", coins: 300 } }, 0);
    expect(sold.collection[spare]).toBeUndefined();
    expect(sold.coins).toBe(save.coins + 300);
    const kept = answerEvent({ ...save, event: { kind: "bod", rider: spare, team: "k01", coins: 300 } }, 1);
    expect(kept.collection[spare]).toBe(1);
    const rest = answerEvent({ ...save, event: { kind: "val", rider: save.lineup[0] } }, 0);
    expect(rest.riders[save.lineup[0]].form).toBe(100 + EVENT_FORM.rest);
  });

  it("neemt de uitdaging van de pers aan: een podium maakt populairder", () => {
    const save = ready(43);
    const pledged = answerEvent({ ...save, event: { kind: "pers" } }, 0);
    expect(pledged.pledge).toBe("pers");
    const won = finishRace(pledged, placingsFor(pledged, pledged.kopman!)).save;
    expect(won.pledge).toBeNull();
    const lost = finishRace(pledged, placingsFor(pledged)).save;
    expect(won.fame - lost.fame).toBe(PERS.win - PERS.lose + 5 + 1);
  });

  it("geeft drie opdrachten per seizoen, en levert renners in voor een betere", () => {
    const base = ready(44);
    expect(base.tasks).toHaveLength(3);
    const task = base.tasks!.find((t) => t.kind === "soort")!;
    if (task.kind !== "soort") throw new Error("geen soort");
    const fits = pool().pool.filter((c) => c.type === task.type && c.tier === task.tier && !base.lineup.includes(c.id)).slice(0, task.n).map((c) => c.id);
    const save = withLives({ ...base, collection: { ...base.collection, ...Object.fromEntries(fits.map((id) => [id, 1])) } });
    expect(handInPicks(save, task)).toHaveLength(task.n);
    const done = handIn(save, save.tasks!.indexOf(task))!;
    expect(done.pull).not.toBeNull();
    expect(cardById(done.pull!.id).type).toBe(task.type);
    expect(cardById(done.pull!.id).tier).not.toBe(task.tier);
    for (const id of fits) expect(done.save.collection[id]).toBeUndefined();
    expect(done.save.tasks!.find((t) => t.kind === "soort")!.done).toBe(true);
    expect(handIn(done.save, save.tasks!.indexOf(task))).toBeNull();
    // Riders in the lineup never go.
    expect(handInPicks(base, task).every((id) => !base.lineup.includes(id) || base.collection[id] > 1)).toBe(true);
  });

  it("laat een renner groeien op de waarde van een opdracht", () => {
    let save = ready(45);
    const rider = save.lineup[0];
    const setup = raceSetup(save)!;
    const kind = courseKind(buildCourse(raceById.get(setup.raceId)!));
    save = { ...save, kopman: rider, tasks: [{ kind: "groei", rider, soort: kind, n: 1, progress: 0, done: false }] };
    if (!GROWTH_STAT[kind]) return;
    const after = finishRace(save, placingsFor(save, rider)).save;
    expect(after.tasks![0].done).toBe(true);
    expect(after.riders[rider].extra[GROWTH_STAT[kind]]).toBe(GROWTH_POINTS);
  });

  it("rijdt een kampioenschap met renners van één land, zonder seizoenspunten", () => {
    let save = ready(46);
    for (let i = 0; i < CHAMPIONSHIP_AFTER; i++) save = skipRace(save)!;
    const country = cardById(save.lineup[0]).country;
    const same = pool().pool.filter((c) => c.country === country && !save.collection[c.id] && c.tier === "brons").slice(0, 2).map((c) => c.id);
    save = withLives({ ...save, collection: { ...save.collection, ...Object.fromEntries(same.map((id) => [id, 1])) } });
    expect(champOpen(save)).toBe(true);
    expect(champCountries(save).map((c) => c.country)).toContain(country);
    const setup = champSetup(save, country)!;
    expect(setup.lineup.riders.length).toBeGreaterThanOrEqual(3);
    expect(setup.lineup.riders.every((id) => cardById(id).country === country)).toBe(true);
    // A board with fewer than five of yours plays.
    const board = createBoard(setup.raceId, setup.seed, setup.lineup, save.items);
    expect(board.race.riders.filter((r) => r.team === PLAYER_TEAM)).toHaveLength(setup.lineup.riders.length);
    const state = createRace(setup.raceId, setup.seed, setup.lineup);
    const winner = setup.lineup.kopman;
    const placings = state.riders.map((r) => ({ id: r.id, team: r.team })).sort((a, b) => Number(b.id === winner) - Number(a.id === winner)).map((r, i) => ({ ...r, place: i + 1, time: 3000 + i, gap: i }));
    const { save: after, reward } = finishChampionship(save, placings);
    expect(after.seasonPoints).toEqual(save.seasonPoints);
    expect(after.raceIndex).toBe(save.raceIndex);
    expect(after.riders[winner].titles).toBe(1);
    expect(reward.pack).toBe(DIVISIONS[save.division].packs.win);
    expect(champOpen(after)).toBe(false);
  });

  it("leest een save met een keuze en opdrachten terug, en een zonder", () => {
    const save: Save = { ...ready(47), event: { kind: "pers" }, pledge: "pers" };
    const back = parseSave(JSON.stringify(save))!;
    expect(back.event).toEqual({ kind: "pers" });
    expect(back.tasks).toEqual(save.tasks);
    const { event: _e, pledge: _p, tasks: _t, champ: _c, ...old } = save;
    void _e; void _p; void _t; void _c;
    const fresh = parseSave(JSON.stringify(old))!;
    expect(fresh.event).toBeNull();
    expect(fresh.tasks).toHaveLength(3);
  });
});
