import { describe, expect, it } from "vitest";
import { autoplay, BOARD_SECTORS, blockedReason, createBoard, currentSector, deckFor, HAND_SIZE, PLAYS_PER_TURN, playCard, rideSector, startSector, unplayCard, type BoardState } from "@/kopman/engine/board";
import { newSave } from "@/kopman/engine/economy";
import { results } from "@/kopman/engine/race";
import { CALENDAR } from "@/kopman/engine/world";

const save = newSave(97, "2026-11-11");
const lineup = { riders: save.lineup, kopman: save.kopman! };
const raceId = CALENDAR.find((r) => r.kind !== "tijdrit")!.id;
const playable = (b: BoardState) => b.hand.filter((c) => !blockedReason(b, c));

describe("Kopman: bordspel", () => {
  it("snijdt de koers in tien aansluitende sectoren, de laatste is de finale", () => {
    const b = createBoard(raceId, 1, lineup);
    expect(b.sectors).toHaveLength(BOARD_SECTORS);
    expect(b.sectors[0].start).toBe(0);
    expect(b.sectors.at(-1)!.end).toBe(b.race.course.length);
    for (let i = 1; i < b.sectors.length; i++) expect(b.sectors[i].start).toBe(b.sectors[i - 1].end);
    expect(b.sectors.filter((s) => s.finale).map((s) => s.index)).toEqual([BOARD_SECTORS - 1]);
  });

  it("bouwt de stapel uit de opstelling en het personeel", () => {
    expect(deckFor(lineup.riders, {})).toHaveLength(10);
    const deck = deckFor(lineup.riders, { "p-mechanieker-brons": 1, "p-fysio-goud": 1, "m-frame-goud": 1 });
    expect(deck).toHaveLength(12);
    expect(deck.filter((c) => c.rider === null).map((c) => c.card).sort()).toEqual(["herstel", "wielwissel"]);
    expect(createBoard(raceId, 1, lineup).hand).toHaveLength(HAND_SIZE);
    expect(createBoard(raceId, 1, lineup, { "p-chauffeur-brons": 1 }).hand).toHaveLength(HAND_SIZE + 1);
  });

  it("laat hooguit twee kaarten per sector spelen, kost kracht en geeft die terug bij terugnemen", () => {
    const b = createBoard(raceId, 3, lineup, { "p-trainer-brons": 1, "p-fysio-brons": 1, "p-ploegleider-brons": 1 });
    const first = playable(b)[0];
    expect(first).toBeDefined();
    const before = { ...b.kracht };
    expect(playCard(b, first.uid)).toBe(true);
    if (first.rider) {
      expect(b.kracht[first.rider]).toBeLessThanOrEqual(before[first.rider]);
      expect(unplayCard(b, first.uid)).toBe(true);
      expect(b.kracht).toEqual(before);
      playCard(b, first.uid);
    }
    for (const c of playable(b)) playCard(b, c.uid);
    expect(b.played.length).toBeLessThanOrEqual(PLAYS_PER_TURN);
    for (const c of b.hand) expect(blockedReason(b, c)).not.toBeNull();
  });

  it("weigert kaarten voor ander terrein", () => {
    const b = createBoard(raceId, 3, lineup);
    const terrain = currentSector(b).terrain;
    for (const c of b.hand) {
      if (c.card === "bergop" && terrain !== "klim") expect(blockedReason(b, c)).toMatch(/klim/);
      if (c.card === "lanceren") expect(blockedReason(b, c)).toMatch(/finale/);
    }
  });

  it("rijdt sector na sector tot de finish, en is herhaalbaar", () => {
    const greedy = (b: BoardState) => playable(b).slice(0, 2).map((c) => c.uid);
    const a = autoplay(createBoard(raceId, 7, lineup), greedy);
    const b = autoplay(createBoard(raceId, 7, lineup), greedy);
    expect(a.phase).toBe("klaar");
    expect(a.race.finished).toBe(true);
    expect(results(a.race)).toEqual(results(b.race));
    expect(a.events).toEqual(b.events);
  });

  it("speelt geen kaarten terwijl een sector rijdt", () => {
    const b = createBoard(raceId, 5, lineup);
    startSector(b);
    expect(b.phase).toBe("rijden");
    for (const c of b.hand) expect(blockedReason(b, c)).not.toBeNull();
    while (!rideSector(b, 600)) { /* ride */ }
    expect(b.sector).toBe(1);
    expect(b.phase).toBe("plannen");
  });
});
