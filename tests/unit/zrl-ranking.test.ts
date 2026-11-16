import { describe, expect, it } from "vitest";
import {
  bestPower,
  categoryFromTeamName,
  estimateZ,
  laterWeeksInRound,
  lineupBlocks,
  orderRankingTeams,
  rankRider,
  riderLevel,
  roundOfTitle,
  sortRanking,
  splitIntoTeams,
  type RankingRider,
} from "@/lib/teams/zrl-ranking";

function rider(
  key: string,
  power: RankingRider["power"],
  wtrl: RankingRider["wtrl"] = null,
): RankingRider {
  return { key, name: `Renner ${key}`, profileId: key, power, wtrl };
}

describe("estimateZ", () => {
  it("schat zFTP uit 20 min en zMAP uit 5 min", () => {
    const z = estimateZ(rider("a", { m1: 7, m5: 4.4, m20: 3.8 }));
    expect(z.zftp).toEqual({ value: 3.56, source: "estimate" });
    expect(z.zmap).toEqual({ value: 4.27, source: "estimate" });
  });

  it("valt terug op WTRL zonder ZwiftRacing", () => {
    const z = estimateZ(rider("a", null, { zftpWkg: 3.4, zmapWkg: 4.2 }));
    expect(z.zftp).toEqual({ value: 3.4, source: "wtrl" });
    expect(z.zmap).toEqual({ value: 4.2, source: "wtrl" });
  });

  it("geeft niets zonder bron", () => {
    expect(estimateZ(rider("a", null))).toEqual({ zftp: null, zmap: null });
  });
});

describe("grenzen in een B-hoofdteam", () => {
  it("te sterk voor B vanaf de A-grens, krap binnen 0,22", () => {
    // zFTP 4,22 ≥ 4,2.
    expect(rankRider(rider("a", { m1: 8, m5: 5, m20: 4.5 }), "B", false).category).toBe("over");
    // zMAP 4,95: binnen 0,22 onder 5,1.
    expect(rankRider(rider("b", { m1: 8, m5: 5.1, m20: 4 }), "B", false).category).toBe("near");
    expect(rankRider(rider("c", { m1: 6, m5: 4.2, m20: 3.6 }), "B", false).category).toBe("ok");
  });

  it("Dev: beide onder 3,74 / 4,53", () => {
    // zFTP 3,28 en zMAP 3,98: ruim eronder.
    expect(rankRider(rider("a", { m1: 6, m5: 4.1, m20: 3.5 }), "B", false).dev).toBe("ok");
    // zMAP 4,47: krap.
    expect(rankRider(rider("b", { m1: 6, m5: 4.6, m20: 3.5 }), "B", false).dev).toBe("near");
    // zFTP 3,75: boven het plafond.
    expect(rankRider(rider("c", { m1: 6, m5: 4.2, m20: 4 }), "B", false).dev).toBe("over");
    // Zonder zMAP onbekend.
    expect(rankRider(rider("d", null, { zftpWkg: 3, zmapWkg: null }), "B", false).dev).toBeNull();
  });

  it("geen toets zonder categorie", () => {
    const ranked = rankRider(rider("a", { m1: 9, m5: 6, m20: 5 }), null, false);
    expect(ranked.category).toBeNull();
    expect(ranked.dev).toBeNull();
  });
});

describe("teams en blokken", () => {
  it("leest de categorie uit de naam", () => {
    expect(categoryFromTeamName("ZRL B")).toBe("B");
    expect(categoryFromTeamName("ZRL Zwiftladies")).toBeNull();
  });

  it("zet Dev achteraan en B10 na B2", () => {
    const order = orderRankingTeams([
      { id: "dev", name: "Bdev" },
      { id: "b10", name: "B10" },
      { id: "b2", name: "B2" },
      { id: "b1", name: "B1" },
    ]).map((team) => team.id);
    expect(order).toEqual(["b1", "b2", "b10", "dev"]);
  });

  it("sorteert sterk naar zwak, zonder waarde onderaan", () => {
    const riders = [
      rankRider(rider("laag", { m1: 5, m5: 3.5, m20: 3 }), "B", false),
      rankRider(rider("leeg", null), "B", false),
      rankRider(rider("hoog", { m1: 7, m5: 4.8, m20: 4.1 }), "B", false),
    ];
    expect(sortRanking(riders, "zftp").map((r) => r.key)).toEqual(["hoog", "laag", "leeg"]);
    expect(sortRanking(riders, "m1").map((r) => r.key)).toEqual(["hoog", "laag", "leeg"]);
  });

  it("knipt per 5, reserves erachter, en kleurt het Dev-blok rood bij een te sterke renner", () => {
    const teams = orderRankingTeams([
      { id: "b1", name: "B1" },
      { id: "dev", name: "Bdev" },
    ]);
    // Twaalf renners, sterk naar zwak; nummer 6 tot en met 10 vallen in Bdev.
    const riders = Array.from({ length: 12 }, (_, index) =>
      rankRider(rider(String(index + 1), { m1: 6, m5: 4.5 - index * 0.1, m20: 4 - index * 0.06 }), "B", false),
    );
    const blocks = splitIntoTeams(sortRanking(riders, "zftp"), teams);
    expect(blocks.map((block) => block.team?.id ?? "reserve")).toEqual(["b1", "dev", "reserve"]);
    expect(blocks.map((block) => block.riders.length)).toEqual([5, 5, 2]);
    // Nummer 6: zFTP 0,937 × 3,70 = 3,47 (onder 3,74), zMAP 0,971 × 3,99 = 3,87 → ok.
    // Toch rood als er een te sterke in zit: maak nummer 6 sterker.
    const strong = rankRider(rider("x", { m1: 6, m5: 4.4, m20: 4.05 }), "B", false);
    const devBlock = splitIntoTeams([...blocks[0].riders, strong, ...blocks[1].riders.slice(1)], teams)[1];
    expect(devBlock.level).toBe("over");
    expect(riderLevel(strong, true)).toBe("over");
    expect(riderLevel(strong, false)).toBe("ok");
  });
});

describe("indeling per raceweek", () => {
  const teams = orderRankingTeams([
    { id: "b1", name: "B1" },
    { id: "dev", name: "Bdev" },
  ]);
  const riders = ["a", "b", "c", "d", "e", "f", "g"].map((key, index) =>
    rankRider(rider(key, { m1: 6, m5: 4.4 - index * 0.1, m20: 3.9 - index * 0.1 }), "B", false),
  );
  const line = (id: string, teamId: string, riderKey: string) => ({ id, eventId: "w1", teamId, riderKey });

  it("blokken uit de opstelling, los van de sortering, met een renner in twee teams", () => {
    const { blocks, assigned } = lineupBlocks(
      riders,
      [line("1", "dev", "a"), line("2", "b1", "g"), line("3", "b1", "c"), line("4", "dev", "c"), line("5", "b1", "onbekend")],
      teams,
      "zftp",
    );
    expect(blocks.map((block) => block.team.id)).toEqual(["b1", "dev"]);
    expect(blocks[0].rows.map((row) => row.rider.key)).toEqual(["c", "g"]);
    expect(blocks[1].rows.map((row) => [row.rider.key, row.lineupId])).toEqual([
      ["a", "1"],
      ["c", "4"],
    ]);
    expect([...assigned].sort()).toEqual(["a", "c", "g"]);
    // a is de sterkste: zFTP 0,937 × 3,9 = 3,65, net onder het Dev-plafond van 3,74 → krap.
    expect(blocks[1].level).toBe("near");
    expect(blocks[0].level).toBe("ok");
  });

  it("meer dan 5 in een team is vol", () => {
    const { blocks } = lineupBlocks(
      riders,
      riders.slice(0, 6).map((r, index) => line(String(index), "b1", r.key)),
      teams,
      "zftp",
    );
    expect(blocks[0].crowded).toBe(true);
    expect(blocks[1].rows).toHaveLength(0);
  });

  it("de ronde komt uit de titel, met het seizoen", () => {
    expect(roundOfTitle("ZRL 2026/27 · R2 · W1 — Team Time Trial")).toBe("ZRL 2026/27 · R2");
    expect(roundOfTitle("Losse race")).toBeNull();
  });

  it("de latere weken van dezelfde ronde", () => {
    const weeks = [
      { id: "r1w6", title: "ZRL 2026/27 · R1 · W6", startAt: "2026-10-27T19:00:00+00:00" },
      { id: "r2w2", title: "ZRL 2026/27 · R2 · W2", startAt: "2026-11-24T19:00:00+00:00" },
      { id: "r2w1", title: "ZRL 2026/27 · R2 · W1", startAt: "2026-11-17T19:00:00+00:00" },
      { id: "r2w3", title: "ZRL 2026/27 · R2 · W3", startAt: "2026-12-01T19:00:00+00:00" },
      { id: "r3w1", title: "ZRL 2026/27 · R3 · W1", startAt: "2027-01-05T19:00:00+00:00" },
      { id: "r2next", title: "ZRL 2027/28 · R2 · W1", startAt: "2027-11-16T19:00:00+00:00" },
    ];
    expect(laterWeeksInRound(weeks, "r2w1").map((week) => week.id)).toEqual(["r2w2", "r2w3"]);
    expect(laterWeeksInRound(weeks, "r2w3")).toEqual([]);
    expect(laterWeeksInRound(weeks, "onbekend")).toEqual([]);
  });
});

describe("bestPower", () => {
  it("per duur de hoogste van ZwiftRacing en intervals.icu, met de bron", () => {
    const best = bestPower({ s15: 9.06, m1: 5.54, m5: 4.34, m20: 3.44 }, { s15: 8.95, m1: 6.59, m5: 4.29, m20: 3.4 });
    expect(best?.power).toEqual({ s15: 9.06, m1: 6.59, m5: 4.34, m20: 3.44 });
    expect(best?.source).toEqual({ s15: "zwiftracing", m1: "intervals", m5: "zwiftracing", m20: "zwiftracing" });
  });

  it("vult aan uit de andere bron; nul en onzin tellen niet", () => {
    const best = bestPower({ m1: null, m5: 0, m20: 3.5 }, { m1: 6, m5: Number.NaN, m20: null });
    expect(best?.power).toEqual({ s15: null, m1: 6, m5: null, m20: 3.5 });
    expect(best?.source).toEqual({ m1: "intervals", m20: "zwiftracing" });
  });

  it("null zonder vermogen; bij gelijke waarde ZwiftRacing", () => {
    expect(bestPower(null, undefined)).toBeNull();
    expect(bestPower({ m20: 0 }, { m20: null })).toBeNull();
    expect(bestPower({ m20: 4 }, { m20: 4 })?.source.m20).toBe("zwiftracing");
  });

  it("de schatting zegt uit welke bron hij komt", () => {
    const best = bestPower({ m5: 4.34, m20: 3.2 }, { m5: 4.29, m20: 3.4 })!;
    const z = estimateZ({ key: "s", name: "S", profileId: "s", power: best.power, powerSource: best.source, wtrl: null });
    expect(z.zftp).toEqual({ value: 3.19, source: "estimate", from: "intervals" });
    expect(z.zmap?.from).toBe("zwiftracing");
  });
});
