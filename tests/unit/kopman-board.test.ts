import { describe, expect, it } from "vitest";
import { autoplay, BOARD_CARDS, BOARD_SECTORS, blockedReason, costOf, createBoard, currentSector, deckFor, HAND_SIZE, OFF_TYPE, PLAYS_PER_TURN, playCard, rideSector, ridersFor, startSector, unplayCard, type BoardState } from "@/kopman/engine/board";
import { cardById } from "@/kopman/engine/cards";
import { newSave } from "@/kopman/engine/economy";
import { results } from "@/kopman/engine/race";

const save = newSave(97);
const lineup = { riders: save.lineup, kopman: save.kopman! };
const raceId = "openingsomloop";
const ttId = "polderchrono";
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
    expect(deckFor(lineup.riders, {})).toHaveLength(15);
    const deck = deckFor(lineup.riders, { "p-mechanieker-brons": 1, "p-fysio-goud": 1, "p-trainer-brons": 1, "m-frame-goud": 1 });
    expect(deck).toHaveLength(17);
    expect(deck.filter((c) => c.type === null).map((c) => c.card).sort()).toEqual(["herstel", "scherp"]);
    expect(createBoard(raceId, 1, lineup).hand).toHaveLength(HAND_SIZE);
    expect(createBoard(raceId, 1, lineup, { "p-chauffeur-brons": 1 }).hand).toHaveLength(HAND_SIZE + 1);
    expect(createBoard(raceId, 1, lineup, { "p-mechanieker-zilver": 1 }).spares).toBe(1);
    expect(createBoard(raceId, 1, lineup).spares).toBe(0);
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

  it("laat je kiezen wie een kaart speelt; een renner van een ander type betaalt meer", () => {
    const b = createBoard(raceId, 3, lineup);
    for (const c of b.hand) expect(c.rider).toBeNull();
    const c = b.hand.find((x) => x.type && ridersFor(b, x).some((id) => cardById(id).type !== x.type))!;
    expect(c).toBeDefined();
    const other = ridersFor(b, c).find((id) => cardById(id).type !== c.type)!;
    const cost = Math.max(0, BOARD_CARDS[c.card].cost - (cardById(other).tier === "goud" ? 1 : 0) + OFF_TYPE);
    expect(costOf(b, c, other)).toBe(cost);
    const before = { ...b.kracht };
    expect(playCard(b, c.uid, other)).toBe(true);
    expect(c.rider).toBe(other);
    expect(b.kracht[other]).toBe(before[other] - cost);
    expect(unplayCard(b, c.uid)).toBe(true);
    expect(c.rider).toBeNull();
    expect(b.kracht).toEqual(before);
  });

  it("weigert een renner die de kaart niet kan spelen, en geeft kaarten na de sector terug aan de ploeg", () => {
    const b = createBoard(raceId, 3, lineup);
    b.hand = [{ uid: "u", card: "uitwind", type: "allrounder", rider: null }];
    expect(ridersFor(b, b.hand[0])).not.toContain(lineup.kopman);
    expect(playCard(b, "u", lineup.kopman)).toBe(false);
    expect(playCard(b, "u", "niet-van-ons")).toBe(false);
    expect(playCard(b, "u", ridersFor(b, b.hand[0])[0])).toBe(true);
    startSector(b);
    while (!rideSector(b, 600)) { /* ride */ }
    for (const c of [...b.hand, ...b.deck, ...b.discard]) expect(c.rider).toBeNull();
  });

  it("geeft elke sector een hand met alleen kaarten die je daar kunt spelen", () => {
    let checked = 0;
    autoplay(createBoard(raceId, 11, lineup, { "p-fysio-brons": 1, "p-ploegleider-brons": 1 }), (b) => {
      for (const c of b.hand) { expect(blockedReason(b, c)).toBeNull(); checked++; }
      return b.sector % 2 ? playable(b).slice(0, 1).map((c) => c.uid) : [];
    });
    expect(checked).toBeGreaterThan(20);
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

  it("maakt van een tijdrit een bord met wind, bochten en kaarten voor de kopman", () => {
    const b = createBoard(ttId, 4, lineup, { "p-fysio-brons": 1 });
    expect(b.tt).toBe(true);
    expect(b.intents).toEqual([]);
    const terrains = b.sectors.map((s) => s.terrain);
    expect(terrains[BOARD_SECTORS / 2]).toBe("bochten");
    expect(b.sectors[BOARD_SECTORS / 2].name).toBe("Keerpunt");
    expect(new Set(terrains.filter((t) => t !== "bochten"))).toEqual(new Set(["kopwind", "rugwind"]));
    expect(terrains[0]).not.toBe(terrains.at(-1));
    for (const c of [...b.deck, ...b.hand]) expect(c.rider === null || c.rider === lineup.kopman).toBe(true);
    for (const c of b.hand) expect(blockedReason(b, c)).toBeNull();
  });

  it("laat in een tijdrit één tempokeuze per sector toe", () => {
    const b = createBoard(ttId, 4, lineup);
    b.hand = [{ uid: "a", card: "volgas", type: "tijdrijder", rider: lineup.kopman }, { uid: "b", card: "volgas", type: "allrounder", rider: lineup.kopman }];
    expect(playCard(b, "a")).toBe(true);
    expect(blockedReason(b, b.hand[0])).toBe("Al een tempo gekozen");
  });

  it("beloont slim doseren in een tijdrit en straft verkeerd doseren", () => {
    const finish = (policy: (b: BoardState) => string[]) => autoplay(createBoard(ttId, 3, lineup), policy).race.riders.find((r) => r.id === lineup.kopman)!.finishTime!;
    const none = finish(() => []);
    const smart = finish((b) => {
      const s = currentSector(b);
      const late = s.index >= BOARD_SECTORS - 4;
      return playable(b).filter((c) => c.card === "allesgeven" || c.card === "bochtstrak" || c.card === "doseren" || (late && (c.card === "inwind" || c.card === "aero"))).slice(0, 2).map((c) => c.uid);
    });
    const wasteful = finish((b) => playable(b).filter((c) => c.card === "doseren" || c.card === "rugherstel").slice(0, 1).map((c) => c.uid));
    expect(smart).toBeLessThan(none);
    expect(wasteful).toBeGreaterThan(none);
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
