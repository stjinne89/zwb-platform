import { describe, expect, it } from "vitest";
import feed from "../fixtures/frr/ignite-feed.json";
import gc from "../fixtures/frr/gc-rows.json";
import {
  amsterdamDay,
  frrSlotLabel,
  frrSlotTitle,
  frrStageTitle,
  groupFrrFeed,
  isGeneratedFrrTitle,
  parseFrrStageName,
} from "@/lib/frr/feed";
import { extractWdtTable, gcTourCodes, latestGcStage, parseGcRows } from "@/lib/frr/gc";
import { computeWatchList, type GcStanding } from "@/lib/frr/watch";
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
  it("laten subEventLabel alleen de tijd overhouden", () => {
    const parent = frrStageTitle("Tour Ignite", 3, "iTT");
    expect(parent).toBe("FRR Ignite · Etappe 3 — iTT");
    const slot = frrSlotTitle("Tour Ignite", 3, "01:30 (+1)");
    expect(subEventLabel(slot, parent)).toBe("01:30 (+1)");
    expect(frrStageTitle("Tour Ignite", 8, "Queen")).toBe(
      "FRR Ignite · Etappe 8 — Koninginnenrit",
    );
  });

  it("herkent alleen zelf gemaakte titels", () => {
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
      egapS: 51.4,
    });
    expect(first.tourTimeS).toBeGreaterThan(10000);
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
