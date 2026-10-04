import { describe, expect, it } from "vitest";
import feed from "../fixtures/frr/ignite-feed.json";
import gc from "../fixtures/frr/gc-rows.json";
import {
  amsterdamDay,
  frrSlotLabel,
  frrSlotTitle,
  frrStageTitle,
  frrTourTitle,
  groupFrrFeed,
  isGeneratedFrrTitle,
  parseFrrStageName,
} from "@/lib/frr/feed";
import {
  extractWdtTable,
  gcTourCodes,
  latestGcStage,
  parseGcDuration,
  parseGcPenalty,
  parseGcRows,
} from "@/lib/frr/gc";
import { computeProvisionalGc, type ProvisionalResult } from "@/lib/frr/provisional";
import { isRateLimited, zwiftEventPens } from "@/lib/frr/stage-results";
import { compareFrrClass, computeWatchList, type GcStanding } from "@/lib/frr/watch";
import { stageResultsDeadline } from "@/lib/frr/sync";
import { subEventLabel } from "@/lib/events/sub-events";
import type { ZwiftEventApiRow } from "@/lib/events/external-scan";

describe("parseFrrStageName", () => {
  it("herkent gewone, iTT- en koninginnenetappes", () => {
    expect(parseFrrStageName("Tour Ignite - Stage 1")).toEqual({
      tourName: "Tour Ignite",
      stage: 1,
      suffix: null,
    });
    expect(parseFrrStageName("Tour Ignite - Stage 3 iTT")?.suffix).toBe("iTT");
    expect(parseFrrStageName("Tour Ignite - Queen Stage 8")).toEqual({
      tourName: "Tour Ignite",
      stage: 8,
      suffix: "Queen",
    });
    expect(parseFrrStageName("FRR Group Ride")).toBeNull();
  });
});

describe("groupFrrFeed (Ignite-feed van 2026-09-29)", () => {
  const grouped = groupFrrFeed(feed as ZwiftEventApiRow[]);

  it("maakt 8 etappes met samen 44 tijdsloten", () => {
    expect(grouped.tourName).toBe("Tour Ignite");
    expect(grouped.stages.map((stage) => stage.stage)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(grouped.stages.reduce((sum, stage) => sum + stage.slots.length, 0)).toBe(44);
    expect(grouped.unrecognised).toEqual([]);
    expect(grouped.warnings).toEqual([]);
  });

  it("houdt het slot na middernacht bij de etappe van de dag ervoor", () => {
    const stage1 = grouped.stages[0];
    const last = stage1.slots[stage1.slots.length - 1];
    const stageDay = amsterdamDay(stage1.slots[0].startAt);
    expect(stageDay).toBe("2026-10-03");
    expect(amsterdamDay(last.startAt)).toBe("2026-10-04");
    expect(frrSlotLabel(stage1.slots[0].startAt, stageDay)).toBe("07:00");
    expect(frrSlotLabel(last.startAt, stageDay)).toBe("01:30 (+1)");
  });

  it("geeft de iTT-etappes hun extra slots", () => {
    expect(grouped.stages[2].suffix).toBe("iTT");
    expect(grouped.stages[2].slots).toHaveLength(7);
  });
});

describe("FRR-titels", () => {
  it("geven op elk niveau via subEventLabel het korte label", () => {
    const tour = frrTourTitle("Tour Ignite");
    expect(tour).toBe("FRR Ignite");
    const stage = frrStageTitle("Tour Ignite", 3, "iTT");
    expect(stage).toBe("FRR Ignite · Etappe 3 · iTT");
    expect(subEventLabel(stage, tour)).toBe("Etappe 3 · iTT");
    const slot = frrSlotTitle("Tour Ignite", 3, "iTT", "01:30 (+1)");
    expect(subEventLabel(slot, stage)).toBe("01:30 (+1)");
    expect(subEventLabel(frrStageTitle("Tour Ignite", 8, "Queen"), tour)).toBe(
      "Etappe 8 · Koninginnenrit",
    );
    expect(subEventLabel(frrStageTitle("Tour Ignite", 1, null), tour)).toBe("Etappe 1");
  });

  it("herkent alleen zelf gemaakte titels, ook de vorm van vóór het tourevent", () => {
    expect(isGeneratedFrrTitle("FRR Ignite")).toBe(true);
    expect(isGeneratedFrrTitle("FRR Ignite · Etappe 3 · iTT")).toBe(true);
    expect(isGeneratedFrrTitle("FRR Ignite · Etappe 3 · iTT · 07:00")).toBe(true);
    expect(isGeneratedFrrTitle("FRR Ignite · Etappe 3 — iTT")).toBe(true);
    expect(isGeneratedFrrTitle("FRR Ignite · Etappe 3 · 07:00")).toBe(true);
    expect(isGeneratedFrrTitle("FRR Ignite · Etappe 1 · 01:30 (+1)")).toBe(true);
    expect(isGeneratedFrrTitle("Etappe 3 met de ploeg")).toBe(false);
  });
});

describe("FRR-klassement", () => {
  it("vindt tabel en nonce in de pagina", () => {
    const html =
      '<table data-wpdatatable_id="228"></table>' +
      '<input type="hidden" id="wdtNonceFrontendServerSide_228" name="wdtNonceFrontendServerSide_228" value="4116af27a6">';
    expect(extractWdtTable(html)).toEqual({ tableId: "228", nonce: "4116af27a6" });
    expect(extractWdtTable("<p>niets</p>")).toBeNull();
  });

  const rows = parseGcRows(gc.data);

  it("leest de rijen op positie", () => {
    const first = rows[0];
    expect(first).toMatchObject({
      tourCode: "FTQ.5",
      stage: 21,
      genderClass: "M-BON",
      gender: "M",
      classCode: "BON",
      position: 1,
      zwiftId: "1525667",
      stagesRidden: 21,
      // De leider: FRR toont "-", ook al is zijn opgetelde verlies 51,40 s.
      egapS: 0,
      penaltyS: 0,
    });
    expect(first.tourTimeS).toBeGreaterThan(10000);
    // "4 m 39.317 s": opgeteld verlies 330,72 min de 51,40 van de leider.
    expect(rows[1].egapS).toBe(279.317);
  });

  it("telt de straf voor een upgrade bij de eGAP", () => {
    // Ignite na etappe 2 (2026-10-04): 9,42 s verlies, 30 s straf, leider 8,05 s.
    const cells = [...(gc.data[0] as unknown[])];
    cells[19] = "9.42";
    cells[20] = "(30s)";
    cells[21] = "8.05";
    cells[23] = "31.373 s";
    expect(parseGcRows([cells])[0]).toMatchObject({ egapS: 31.373, penaltyS: 30 });
    // Zonder leesbare eGAP rekenen we hem zelf uit.
    cells[23] = "?";
    expect(parseGcRows([cells])[0]).toMatchObject({ egapS: 31.37, penaltyS: 30 });
  });

  it("leest straf en duur zoals FRR ze schrijft", () => {
    expect(parseGcPenalty("(30s)")).toBe(30);
    expect(parseGcPenalty("-")).toBe(0);
    expect(parseGcPenalty("DQ")).toBeNull();
    expect(parseGcDuration("31.373 s")).toBe(31.373);
    expect(parseGcDuration("1 m 10.886 s")).toBe(70.886);
    expect(parseGcDuration("1 hrs, 7 m 54.663 s")).toBeCloseTo(4074.663, 3);
    expect(parseGcDuration("-")).toBeNull();
  });

  it("decodeert HTML-entiteiten in namen", () => {
    expect(rows.some((row) => row.name.includes("André"))).toBe(true);
    expect(rows.every((row) => !/&[a-z#0-9]+;/i.test(row.name))).toBe(true);
  });

  it("neemt alleen de laatste etappe van de gevraagde tour", () => {
    expect(gcTourCodes(rows)).toEqual(["FTQ.5"]);
    const latest = latestGcStage(rows, "FTQ.5");
    expect(latest?.stage).toBe(21);
    expect(latest?.rows.every((row) => row.stage === 21)).toBe(true);
    expect(latestGcStage(rows, "FTI.6")).toBeNull();
  });

  it("weigert een tabel die van vorm veranderd is", () => {
    const broken = structuredClone(gc.data) as unknown[][];
    broken[0][11] = "geen id";
    expect(() => parseGcRows(broken)).toThrow(/kolom 11 \(Zwift-ID\)/);
    expect(() => parseGcRows([["te kort"]])).toThrow(/rij 1/);
  });
});

describe("compareFrrClass", () => {
  it("zet de hoogste klasse eerst en een onbekende achteraan", () => {
    expect(["BEL", "XYZ", "BON", "CAP", "HAB", "DRA"].sort(compareFrrClass)).toEqual([
      "CAP",
      "DRA",
      "HAB",
      "BON",
      "BEL",
      "XYZ",
    ]);
  });
});

describe("computeWatchList", () => {
  const standing = (
    zwiftId: string,
    position: number,
    egapS: number | null,
    genderClass = "M-BON",
  ): GcStanding => ({
    zwiftId,
    name: `Renner ${zwiftId}`,
    club: null,
    genderClass,
    classCode: genderClass.split("-")[1],
    position,
    egapS,
  });
  const standings = [
    standing("1", 1, 0),
    standing("2", 2, 500),
    standing("3", 3, 900),
    standing("4", 4, 930),
    standing("5", 5, 2000),
    standing("9", 9, 5000),
    standing("20", 20, 6000),
    standing("77", 1, 0, "F-BON"),
  ];

  it("neemt buren op plaatsen of op eGAP in dezelfde klasse", () => {
    const { me, riders } = computeWatchList({
      myZwiftId: "3",
      standings,
      favourites: [],
      entrantSlots: new Map([["4", ["slot-b"]]]),
      window: { places: 1, seconds: 40 },
    });
    expect(me?.position).toBe(3);
    expect(riders.map((rider) => rider.zwiftId)).toEqual(["2", "4"]);
    expect(riders[1]).toMatchObject({ placesDiff: 1, gapS: 30, slotIds: ["slot-b"] });
  });

  it("voegt favorieten toe, ook van buiten het klassement", () => {
    const { riders } = computeWatchList({
      myZwiftId: "3",
      standings,
      favourites: [
        { zwiftId: "4", name: "Renner 4" },
        { zwiftId: "20", name: "Renner 20" },
        { zwiftId: "999", name: "Onbekend" },
        { zwiftId: "3", name: "Ikzelf" },
      ],
      entrantSlots: new Map([["999", ["slot-a"]]]),
      window: { places: 1, seconds: 0 },
    });
    expect(riders.map((rider) => [rider.zwiftId, rider.neighbour, rider.favourite])).toEqual([
      ["2", true, false],
      ["4", true, true],
      ["20", false, true],
      ["999", false, true],
    ]);
    expect(riders[3].slotIds).toEqual(["slot-a"]);
  });

  it("geeft zonder eigen klassering alleen de favorieten", () => {
    const { me, riders } = computeWatchList({
      myZwiftId: "12345",
      standings,
      favourites: [{ zwiftId: "1", name: "Renner 1" }],
      entrantSlots: new Map(),
    });
    expect(me).toBeNull();
    expect(riders).toHaveLength(1);
    expect(riders[0].placesDiff).toBeNull();
  });
});

// Tijden van M-BON in Tour Ignite, etappe 1 en 2 (2026-10-04), met andere namen.
describe("computeProvisionalGc", () => {
  const riders = ["ik", "buur", "snel", "ander", "laat", "nieuw"].map((zwiftId) => ({
    zwiftId,
    name: zwiftId,
    club: null,
  }));
  const result = (
    stage: number,
    slotId: string,
    zwiftId: string,
    timeS: number,
    pen = "D",
  ): ProvisionalResult => ({ stage, slotId, zwiftId, pen, timeS });
  const results = [
    result(1, "s1-a", "ander", 4004.0),
    result(1, "s1-a", "ik", 4012.953),
    result(1, "s1-a", "laat", 4011.0),
    result(1, "s1-b", "snel", 4026.132),
    result(1, "s1-b", "buur", 4030.714),
    result(2, "s2-a", "snel", 5172.8, "C"),
    result(2, "s2-a", "ik", 5465.4),
    result(2, "s2-a", "ander", 5469.0),
    result(2, "s2-b", "buur", 5486.7),
    // Niet in de klasse: mag geen tijd zetten.
    result(2, "s2-b", "vreemd", 5000),
  ];

  it("telt per tijdslot het verlies op de eerste van de klasse op", () => {
    const gc = computeProvisionalGc({ riders, results });
    expect(gc.stages).toEqual([1, 2]);
    expect(gc.ranked.map((row) => [row.zwiftId, row.position, row.egapS])).toEqual([
      ["snel", 1, 0],
      ["buur", 2, 4.582],
      ["ander", 3, 296.2],
      ["ik", 4, 301.553],
    ]);
  });

  it("zet wie een etappe mist apart, met wat hij wel reed", () => {
    const gc = computeProvisionalGc({ riders, results });
    expect(gc.pending.map((row) => [row.zwiftId, row.position, row.stagesRidden, row.egapS])).toEqual([
      ["laat", null, 1, 7],
      ["nieuw", null, 0, 0],
    ]);
  });

  it("noemt de startgroep die afwijkt van de rest van de klasse", () => {
    const gc = computeProvisionalGc({ riders, results });
    expect(gc.ranked.find((row) => row.zwiftId === "snel")?.otherPens).toEqual(["C"]);
    expect(gc.ranked.find((row) => row.zwiftId === "ik")?.otherPens).toEqual([]);
  });

  it("telt de straf van FRR op bij het verlies", () => {
    const gc = computeProvisionalGc({
      riders: riders.map((rider) => (rider.zwiftId === "buur" ? { ...rider, penaltyS: 30 } : rider)),
      results,
      excluded: new Set(["snel"]),
    });
    expect(gc.ranked.map((row) => [row.zwiftId, row.egapS, row.penaltyS])).toEqual([
      ["ander", 3.6, 0],
      ["ik", 8.953, 0],
      ["buur", 30, 30],
    ]);
  });

  it("laat een verwijderde renner geen tijd zetten", () => {
    const gc = computeProvisionalGc({ riders, results, excluded: new Set(["snel"]) });
    expect(gc.ranked.map((row) => [row.zwiftId, row.position, row.egapS])).toEqual([
      ["buur", 1, 0],
      ["ander", 2, 3.6],
      ["ik", 3, 8.953],
    ]);
    expect(gc.pending.some((row) => row.zwiftId === "snel")).toBe(false);
  });

  it("is leeg zonder uitslagen", () => {
    const gc = computeProvisionalGc({ riders, results: [] });
    expect(gc.stages).toEqual([]);
    expect(gc.ranked).toEqual([]);
    expect(gc.pending).toHaveLength(riders.length);
  });
});

describe("zwiftEventPens", () => {
  it("leest id en letter van elke startgroep", () => {
    expect(
      zwiftEventPens({
        eventSubgroups: [
          { id: 101, subgroupLabel: "A" },
          { id: "102", subgroupLabel: "" },
          { subgroupLabel: "C" },
        ],
      }),
    ).toEqual([
      { id: "101", pen: "A" },
      { id: "102", pen: null },
    ]);
    expect(zwiftEventPens(null)).toEqual([]);
  });
});

describe("isRateLimited", () => {
  it("herkent de 429 van de Zwift-API", () => {
    expect(isRateLimited(new Error("Zwift-API gaf status 429 voor https://x/api/y."))).toBe(true);
    expect(isRateLimited(new Error("Zwift-API gaf status 404 voor https://x/api/4290."))).toBe(false);
    expect(isRateLimited("status 429")).toBe(false);
  });
});

describe("stageResultsDeadline", () => {
  it("geeft de uitslagen eigen tijd, tot vijf seconden over het budget", () => {
    // Ruim op tijd klaar: het gewone budget.
    expect(stageResultsDeadline(20_000, 5_000)).toBe(20_000);
    // Krap: tien seconden vanaf nu.
    expect(stageResultsDeadline(20_000, 15_000)).toBe(25_000);
    // Budget al op: niet verder dan vijf seconden erover.
    expect(stageResultsDeadline(20_000, 21_000)).toBe(25_000);
  });
});
