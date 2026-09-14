import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALES,
  DEFAULT_SCORING,
  descending,
} from "@/lib/omnium/scales";
import {
  compareEdition,
  pointsForPosition,
  rankWithinLeague,
  scoreCritRoyale,
  scoreEdition,
  scoreFinishOrder,
  scoreSeason,
  scoreStoredEdition,
  type EditionStanding,
  type ScoredResult,
  type FinishEntry,
} from "@/lib/omnium/scoring";

const RUBY = "DIAMOND-RUBY";
const GOLD = "GOLD-SILVER";

function finishers(league: string, ids: string[]): FinishEntry[] {
  return ids.map((riderId, index) => ({
    riderId,
    league,
    overallPosition: index + 1,
  }));
}

function standingFor(
  standings: EditionStanding[],
  riderId: string,
): EditionStanding {
  const found = standings.find((row) => row.riderId === riderId);
  if (!found) throw new Error(`Geen stand voor ${riderId}`);
  return found;
}

describe("puntenschalen", () => {
  it("loopt van 40 tot 2 in stappen van twee", () => {
    expect(descending(40, 2, 2)).toHaveLength(20);
    expect(DEFAULT_SCALES.prologue.table[0]).toBe(40);
    expect(DEFAULT_SCALES.prologue.table[19]).toBe(2);
  });

  it("geeft elke finisher buiten de tabel 1 punt bij prologue en scratch", () => {
    expect(pointsForPosition(DEFAULT_SCALES.prologue, 20)).toBe(2);
    expect(pointsForPosition(DEFAULT_SCALES.prologue, 21)).toBe(1);
    expect(pointsForPosition(DEFAULT_SCALES.prologue, 250)).toBe(1);
  });

  it("geeft niets buiten de tabel bij sprint en crit", () => {
    expect(pointsForPosition(DEFAULT_SCALES.sprint, 10)).toBe(2);
    expect(pointsForPosition(DEFAULT_SCALES.sprint, 11)).toBe(0);
    expect(pointsForPosition(DEFAULT_SCALES.critFinish, 20)).toBe(1);
    expect(pointsForPosition(DEFAULT_SCALES.critFinish, 21)).toBe(0);
  });
});

describe("positie binnen de league", () => {
  it("telt per league opnieuw als categorieen zijn samengevoegd", () => {
    // Eén startgroep, twee leagues door elkaar: de nummers 2 en 4 van het veld
    // zijn de nummers 1 en 2 van hun eigen league.
    const entries: FinishEntry[] = [
      { riderId: "a", league: RUBY, overallPosition: 1 },
      { riderId: "b", league: GOLD, overallPosition: 2 },
      { riderId: "c", league: RUBY, overallPosition: 3 },
      { riderId: "d", league: GOLD, overallPosition: 4 },
    ];
    const results = scoreFinishOrder(entries, DEFAULT_SCALES.scratch, {
      discipline: "scratch",
    });
    const byId = new Map(results.map((row) => [row.riderId, row]));
    expect(byId.get("a")?.position).toBe(1);
    expect(byId.get("c")?.position).toBe(2);
    expect(byId.get("b")?.position).toBe(1);
    expect(byId.get("d")?.position).toBe(2);
    expect(byId.get("b")?.points).toBe(40);
  });

  it("valt terug op de aangeleverde volgorde zonder sleutel", () => {
    const entries: FinishEntry[] = [
      { riderId: "a", league: RUBY },
      { riderId: "b", league: RUBY },
      { riderId: "c", league: RUBY },
    ];
    expect(rankWithinLeague(entries).map((row) => row.position)).toEqual([1, 2, 3]);
  });

  it("rangschikt de sprint quali op segmenttijd", () => {
    const entries: FinishEntry[] = [
      { riderId: "traag", league: RUBY, segmentSeconds: 62 },
      { riderId: "snel", league: RUBY, segmentSeconds: 58 },
    ];
    const results = scoreFinishOrder(entries, DEFAULT_SCALES.sprint, {
      discipline: "sprint",
      rankBy: "segment",
    });
    const byId = new Map(results.map((row) => [row.riderId, row]));
    expect(byId.get("snel")?.position).toBe(1);
    expect(byId.get("snel")?.points).toBe(20);
    expect(byId.get("traag")?.points).toBe(18);
  });
});

describe("status", () => {
  it("geeft DNF nul punten maar telt hem als gereden", () => {
    const results = scoreFinishOrder(
      [
        { riderId: "a", league: RUBY, overallPosition: 1 },
        { riderId: "uitvaller", league: RUBY, status: "dnf" },
      ],
      DEFAULT_SCALES.scratch,
      { discipline: "scratch" },
    );
    const dnf = results.find((row) => row.riderId === "uitvaller");
    expect(dnf?.points).toBe(0);
    expect(dnf?.position).toBeNull();
    expect(dnf?.raced).toBe(true);
  });

  it("telt DNS en DSQ niet als gereden", () => {
    const results = scoreFinishOrder(
      [
        { riderId: "afwezig", league: RUBY, status: "dns" },
        { riderId: "uitgesloten", league: RUBY, status: "dsq" },
      ],
      DEFAULT_SCALES.scratch,
      { discipline: "scratch" },
    );
    expect(results.every((row) => row.raced === false)).toBe(true);
    expect(results.every((row) => row.points === 0)).toBe(true);
  });

  it("laat een uitvaller de plaatsen van de finishers niet verschuiven", () => {
    const results = scoreFinishOrder(
      [
        { riderId: "a", league: RUBY, overallPosition: 1 },
        { riderId: "uitvaller", league: RUBY, status: "dnf" },
        { riderId: "b", league: RUBY, overallPosition: 3 },
      ],
      DEFAULT_SCALES.scratch,
      { discipline: "scratch" },
    );
    const byId = new Map(results.map((row) => [row.riderId, row]));
    expect(byId.get("b")?.position).toBe(2);
    expect(byId.get("b")?.points).toBe(38);
  });
});

describe("ex aequo", () => {
  it("geeft bij gelijke tijd beiden de hoogste punten en slaat de plaats over", () => {
    const results = scoreFinishOrder(
      [
        { riderId: "a", league: RUBY, segmentSeconds: 58 },
        { riderId: "b", league: RUBY, segmentSeconds: 60 },
        { riderId: "c", league: RUBY, segmentSeconds: 60 },
        { riderId: "d", league: RUBY, segmentSeconds: 61 },
      ],
      DEFAULT_SCALES.sprint,
      { discipline: "sprint", rankBy: "segment", tiePolicy: "high" },
    );
    const byId = new Map(results.map((row) => [row.riderId, row]));
    expect(byId.get("b")?.position).toBe(2);
    expect(byId.get("c")?.position).toBe(2);
    expect(byId.get("b")?.points).toBe(18);
    expect(byId.get("c")?.points).toBe(18);
    // De derde plaats is opgebruikt, dus de volgende renner staat vierde.
    expect(byId.get("d")?.position).toBe(4);
    expect(byId.get("d")?.points).toBe(14);
  });

  it("houdt bij share het totaal aantal uitgedeelde punten gelijk", () => {
    const results = scoreFinishOrder(
      [
        { riderId: "b", league: RUBY, segmentSeconds: 60 },
        { riderId: "c", league: RUBY, segmentSeconds: 60 },
      ],
      DEFAULT_SCALES.sprint,
      { discipline: "sprint", rankBy: "segment", tiePolicy: "share" },
    );
    // (20 + 18) / 2 = 19 elk, samen 38 — net zoveel als zonder gelijkstand.
    expect(results.map((row) => row.points)).toEqual([19, 19]);
  });
});

describe("Crit Royale", () => {
  it("telt tussensprints en finish bij elkaar op", () => {
    const results = scoreCritRoyale(
      {
        mode: "detailed",
        sprints: [finishers(RUBY, ["a", "b"]), finishers(RUBY, ["b", "a"])],
        finish: finishers(RUBY, ["a", "b"]),
      },
      DEFAULT_SCALES,
    );
    const byId = new Map(results.map((row) => [row.riderId, row]));
    // a: sprint 10 + 9, finish 20 = 39. b: 9 + 10 + 19 = 38.
    expect(byId.get("a")?.points).toBe(39);
    expect(byId.get("b")?.points).toBe(38);
    expect(byId.get("a")?.sprintPoints).toBe(19);
    expect(byId.get("a")?.finishPoints).toBe(20);
  });

  it("laat een uitvaller de al gepakte sprintpunten houden", () => {
    const results = scoreCritRoyale(
      {
        mode: "detailed",
        sprints: [finishers(RUBY, ["vlucht", "peloton"])],
        finish: [
          { riderId: "peloton", league: RUBY, overallPosition: 1 },
          { riderId: "vlucht", league: RUBY, status: "dnf" },
        ],
      },
      DEFAULT_SCALES,
    );
    const vlucht = results.find((row) => row.riderId === "vlucht");
    expect(vlucht?.sprintPoints).toBe(10);
    expect(vlucht?.finishPoints).toBe(0);
    expect(vlucht?.points).toBe(10);
    expect(vlucht?.status).toBe("dnf");
  });

  it("neemt in direct-modus het totaal van de bron over", () => {
    const results = scoreCritRoyale(
      {
        mode: "direct",
        entries: [{ riderId: "a", league: RUBY, points: 27 }],
      },
      DEFAULT_SCALES,
    );
    expect(results[0].points).toBe(27);
  });
});

describe("crit-nulregel", () => {
  it("zet de punten op nul bij wie geen ander onderdeel reed", () => {
    const score = scoreEdition({
      scratch: finishers(RUBY, ["vaste-klant"]),
      sprint: finishers(RUBY, ["vaste-klant"]),
      crit: {
        mode: "direct",
        entries: [
          { riderId: "vaste-klant", league: RUBY, points: 20 },
          { riderId: "invaller", league: RUBY, points: 18 },
        ],
      },
    });
    const invaller = score.results.find(
      (row) => row.riderId === "invaller" && row.discipline === "crit",
    );
    expect(invaller?.pointsRaw).toBe(18);
    expect(invaller?.points).toBe(0);
    expect(invaller?.voidedReason).toBe("no_other_race");
    expect(standingFor(score.standings, "invaller").totalPoints).toBe(0);
  });

  it("telt een DNF elders wel als gereden", () => {
    const score = scoreEdition({
      scratch: [{ riderId: "pechvogel", league: RUBY, status: "dnf" }],
      crit: {
        mode: "direct",
        entries: [{ riderId: "pechvogel", league: RUBY, points: 12 }],
      },
    });
    const crit = score.results.find((row) => row.discipline === "crit");
    expect(crit?.points).toBe(12);
    expect(crit?.voidedReason).toBeNull();
  });

  it("past de regel niet toe als de crit het enige onderdeel is", () => {
    // Anders zou een tussenstand met alleen de crit iedereen op nul zetten.
    const score = scoreEdition({
      crit: {
        mode: "direct",
        entries: [{ riderId: "a", league: RUBY, points: 20 }],
      },
    });
    expect(score.results[0].points).toBe(20);
    expect(score.isProvisional).toBe(true);
  });
});

describe("editieklassement", () => {
  it("telt de vier onderdelen op en rangschikt per league", () => {
    const score = scoreEdition({
      prologue: finishers(RUBY, ["a", "b"]),
      scratch: finishers(RUBY, ["b", "a"]),
      sprint: finishers(RUBY, ["a", "b"]),
      crit: {
        mode: "direct",
        entries: [
          { riderId: "a", league: RUBY, points: 10 },
          { riderId: "b", league: RUBY, points: 20 },
        ],
      },
    });
    // a: 40 + 38 + 20 + 10 = 108. b: 38 + 40 + 18 + 20 = 116.
    expect(standingFor(score.standings, "a").totalPoints).toBe(108);
    expect(standingFor(score.standings, "b").totalPoints).toBe(116);
    expect(standingFor(score.standings, "b").rank).toBe(1);
    expect(score.isProvisional).toBe(false);
  });

  it("markeert een tussenstand als voorlopig", () => {
    const score = scoreEdition({ prologue: finishers(RUBY, ["a"]) });
    expect(score.isProvisional).toBe(true);
    expect(score.standings[0].isProvisional).toBe(true);
    expect(score.disciplines).toEqual(["prologue"]);
  });

  it("rangschikt leagues onafhankelijk van elkaar", () => {
    const score = scoreEdition({
      scratch: [
        { riderId: "ruby", league: RUBY, overallPosition: 1 },
        { riderId: "gold", league: GOLD, overallPosition: 2 },
      ],
    });
    expect(standingFor(score.standings, "ruby").rank).toBe(1);
    expect(standingFor(score.standings, "gold").rank).toBe(1);
  });
});

describe("tiebreak per editie", () => {
  function base(riderId: string): EditionStanding {
    return {
      riderId,
      league: RUBY,
      prologuePoints: 0,
      scratchPoints: 0,
      sprintPoints: 0,
      critPoints: 0,
      totalPoints: 40,
      rank: 0,
      rankShared: false,
      wins: 0,
      positions: [],
      isProvisional: false,
    };
  }

  it("laat de Crit Royale beslissen bij een gelijk totaal", () => {
    const score = scoreEdition({
      scratch: [
        { riderId: "sprinter", league: RUBY, overallPosition: 1 },
        { riderId: "punter", league: RUBY, overallPosition: 2 },
      ],
      crit: {
        mode: "direct",
        entries: [
          { riderId: "sprinter", league: RUBY, points: 10 },
          { riderId: "punter", league: RUBY, points: 12 },
        ],
      },
    });
    // sprinter 40 + 10 = 50, punter 38 + 12 = 50. De crit breekt het gelijkspel.
    expect(standingFor(score.standings, "punter").rank).toBe(1);
    expect(standingFor(score.standings, "sprinter").rank).toBe(2);
  });

  it("gebruikt daarna het aantal overwinningen", () => {
    const winnaar = { ...base("winnaar"), critPoints: 10, wins: 2, positions: [1, 1] };
    const consistent = {
      ...base("consistent"),
      critPoints: 10,
      wins: 0,
      positions: [2, 2],
    };
    expect(
      compareEdition(winnaar, consistent, DEFAULT_SCORING.editionTiebreaks),
    ).toBeLessThan(0);
  });

  it("valt terug op de countback als punten, crit en zeges gelijk zijn", () => {
    const scherp = { ...base("scherp"), critPoints: 10, wins: 0, positions: [2, 9] };
    const vlak = { ...base("vlak"), critPoints: 10, wins: 0, positions: [3, 4] };
    // Beste enkele klassering wint, ook al is het gemiddelde slechter.
    expect(
      compareEdition(scherp, vlak, DEFAULT_SCORING.editionTiebreaks),
    ).toBeLessThan(0);
  });

  it("deelt een plaats als geen enkel criterium breekt", () => {
    const score = scoreEdition({
      scratch: [
        { riderId: "a", league: RUBY, overallPosition: 1 },
        { riderId: "b", league: RUBY, overallPosition: 1 },
      ],
    });
    expect(standingFor(score.standings, "a").rank).toBe(1);
    expect(standingFor(score.standings, "b").rank).toBe(1);
    expect(standingFor(score.standings, "a").rankShared).toBe(true);
  });
});

describe("seizoensklassement", () => {
  function editionOf(
    number: number,
    rows: Array<{ riderId: string; total: number; wins?: number; positions?: number[] }>,
  ) {
    return {
      number,
      standings: rows.map((row) => ({
        riderId: row.riderId,
        league: RUBY,
        prologuePoints: row.total,
        scratchPoints: 0,
        sprintPoints: 0,
        critPoints: 0,
        totalPoints: row.total,
        rank: 0,
        rankShared: false,
        wins: row.wins ?? 0,
        positions: row.positions ?? [],
        isProvisional: false,
      })),
    };
  }

  it("telt de edities op en houdt de punten per editie bij", () => {
    const season = scoreSeason([
      editionOf(1, [{ riderId: "a", total: 80 }]),
      editionOf(2, [{ riderId: "a", total: 60 }]),
    ]);
    expect(season[0].totalPoints).toBe(140);
    expect(season[0].pointsByEdition).toEqual({ "1": 80, "2": 60 });
    expect(season[0].editionsRaced).toBe(2);
  });

  it("laat bij een gelijk totaal wie vaker startte voorgaan", () => {
    const season = scoreSeason([
      editionOf(1, [
        { riderId: "trouw", total: 50 },
        { riderId: "piek", total: 100 },
      ]),
      editionOf(2, [{ riderId: "trouw", total: 50 }]),
    ]);
    const trouw = season.find((row) => row.riderId === "trouw");
    const piek = season.find((row) => row.riderId === "piek");
    expect(trouw?.totalPoints).toBe(100);
    expect(piek?.totalPoints).toBe(100);
    expect(trouw?.rank).toBe(1);
    expect(piek?.rank).toBe(2);
  });

  it("gebruikt de league van de meest recente editie", () => {
    const season = scoreSeason([
      {
        number: 1,
        standings: [
          {
            riderId: "stijger",
            league: GOLD,
            prologuePoints: 10,
            scratchPoints: 0,
            sprintPoints: 0,
            critPoints: 0,
            totalPoints: 10,
            rank: 1,
            rankShared: false,
            wins: 0,
            positions: [1],
            isProvisional: false,
          },
        ],
      },
      {
        number: 2,
        standings: [
          {
            riderId: "stijger",
            league: RUBY,
            prologuePoints: 10,
            scratchPoints: 0,
            sprintPoints: 0,
            critPoints: 0,
            totalPoints: 10,
            rank: 1,
            rankShared: false,
            wins: 0,
            positions: [1],
            isProvisional: false,
          },
        ],
      },
    ]);
    expect(season[0].league).toBe(RUBY);
  });

  it("gebruikt de standaard tiebreakvolgorde", () => {
    expect(DEFAULT_SCORING.seasonTiebreaks[0]).toBe("editions_raced");
    expect(DEFAULT_SCORING.editionTiebreaks[0]).toBe("crit_points");
    expect(DEFAULT_SCORING.tiePolicy).toBe("high");
  });
});

describe("herberekenen uit opgeslagen resultaten", () => {
  function critRow(
    riderId: string,
    points: number,
    voided = false,
  ): ScoredResult {
    return {
      riderId,
      discipline: "crit" as const,
      league: RUBY,
      status: "finished" as const,
      position: null,
      overallPosition: null,
      timeSeconds: null,
      timeText: null,
      segmentSeconds: null,
      finishPoints: 0,
      sprintPoints: 0,
      points: voided ? 0 : points,
      pointsRaw: points,
      voidedReason: voided ? "no_other_race" : null,
      raced: true,
    };
  }

  it("draait de crit-nulregel terug als de ontbrekende uitslag alsnog binnenkomt", () => {
    // Eerst stond alleen de crit erin en was deze renner op nul gezet.
    const stored: ScoredResult[] = [critRow("laatkomer", 18, true)];
    // Nu komt de scratch-uitslag er alsnog bij.
    stored.push({
      riderId: "laatkomer",
      discipline: "scratch",
      league: RUBY,
      status: "finished",
      position: 3,
      overallPosition: 3,
      timeSeconds: null,
      timeText: null,
      segmentSeconds: null,
      finishPoints: 36,
      sprintPoints: 0,
      points: 36,
      pointsRaw: 36,
      voidedReason: null,
      raced: true,
    });

    const score = scoreStoredEdition(stored, ["scratch", "crit"]);
    const crit = score.results.find((row) => row.discipline === "crit");
    expect(crit?.points).toBe(18);
    expect(crit?.voidedReason).toBeNull();
    expect(standingFor(score.standings, "laatkomer").totalPoints).toBe(54);
  });

  it("blijft de regel toepassen op wie echt niets anders reed", () => {
    const stored: ScoredResult[] = [
      critRow("invaller", 18),
      {
        riderId: "vaste-klant",
        discipline: "scratch" as const,
        league: RUBY,
        status: "finished" as const,
        position: 1,
        overallPosition: 1,
        timeSeconds: null,
        timeText: null,
        segmentSeconds: null,
        finishPoints: 40,
        sprintPoints: 0,
        points: 40,
        pointsRaw: 40,
        voidedReason: null,
        raced: true,
      },
    ];
    const score = scoreStoredEdition(stored, ["scratch", "crit"]);
    const crit = score.results.find((row) => row.riderId === "invaller");
    expect(crit?.points).toBe(0);
    expect(crit?.voidedReason).toBe("no_other_race");
  });
});
