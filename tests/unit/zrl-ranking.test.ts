import { describe, expect, it } from "vitest";
import {
  categoryFromTeamName,
  estimateZ,
  orderRankingTeams,
  rankRider,
  riderLevel,
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
