import { describe, expect, it } from "vitest";

import { buildClubRecognition, mentionsClub } from "@/lib/club-recognition";
import { detectZwbMatchStatus } from "@/lib/events/zwb-detection";
import { hasClubTag } from "@/lib/zrl-live/snapshot";

// Fase 4: waaraan de app ziet wat van de club is. ZWB met de waarden uit 0320.
const ZWB_MARKERS = ["zwb", "zwift belgie", "zwift belgium"];

describe("buildClubRecognition", () => {
  it("neemt de env voor de kolom en de kolom voor de korte naam", () => {
    expect(buildClubRecognition({ shortName: "ZWB", eventMarkers: ZWB_MARKERS, envMarkers: "a, b ,," }).eventMarkers).toEqual([
      "a",
      "b",
    ]);
    expect(buildClubRecognition({ shortName: "ZWB", eventMarkers: ZWB_MARKERS, envMarkers: "" }).eventMarkers).toEqual(ZWB_MARKERS);
    expect(buildClubRecognition({ shortName: "TCU", eventMarkers: null }).eventMarkers).toEqual(["TCU"]);
    expect(buildClubRecognition({ shortName: "TCU", eventMarkers: [" ", ""] }).eventMarkers).toEqual(["TCU"]);
  });

  it("valt voor de teamtag terug op de korte naam", () => {
    expect(buildClubRecognition({ shortName: "TCU", teamTag: null }).teamTag).toBe("TCU");
    expect(buildClubRecognition({ shortName: "ZWB Cycling", teamTag: "ZWB" }).teamTag).toBe("ZWB");
  });
});

describe("mentionsClub", () => {
  it("vindt de tag als los woord", () => {
    expect(mentionsClub("Jan Jansen ZWB", "ZWB")).toBe(true);
    expect(mentionsClub("[zwb] Jan", "ZWB")).toBe(true);
    expect(mentionsClub("zwbart", "ZWB")).toBe(false);
    expect(mentionsClub("Jan Jansen ZWB", "TCU")).toBe(false);
    expect(mentionsClub("Jan Jansen TCU", "TCU")).toBe(true);
  });

  it("neemt een tag met regex-tekens letterlijk en telt een lege tag niet", () => {
    expect(mentionsClub("Team C++ rijdt", "C++")).toBe(true);
    expect(mentionsClub("Team Cxx rijdt", "C..")).toBe(false);
    expect(mentionsClub("ZWB", "")).toBe(false);
  });
});

describe("hasClubTag", () => {
  it("herkent de teamtag van de club in een Zwift-naam", () => {
    expect(hasClubTag("Linda Kuiper [ZWB]", "ZWB")).toBe(true);
    expect(hasClubTag("Femke Vaessen [ZWB-Synergy]", "ZWB")).toBe(true);
    expect(hasClubTag("Linda Kuiper [ZWB]", "TCU")).toBe(false);
    expect(hasClubTag("Piet (TCU)", "TCU")).toBe(true);
    expect(hasClubTag("Linda Kuiper [ZWB]", "")).toBe(false);
  });
});

describe("detectZwbMatchStatus", () => {
  const candidate = (title: string, series = "") => ({ title, rawMetadata: { series } });

  it("geeft ZWB dezelfde uitkomst als met de oude standaardmarkers", () => {
    expect(detectZwbMatchStatus(candidate("ZWB Woensdagrit", "ZWB Series"), ZWB_MARKERS)).toBe("confirmed");
    expect(detectZwbMatchStatus(candidate("Zwift Belgie Tuesday"), ZWB_MARKERS)).toBe("likely");
    expect(detectZwbMatchStatus(candidate("Herfstrit"), ZWB_MARKERS)).toBeNull();
  });

  it("volgt de markers van een andere club", () => {
    expect(detectZwbMatchStatus(candidate("ZWB Woensdagrit"), ["TCU"])).toBeNull();
    expect(detectZwbMatchStatus(candidate("TCU Clubrit"), ["TCU"])).toBe("likely");
  });
});
