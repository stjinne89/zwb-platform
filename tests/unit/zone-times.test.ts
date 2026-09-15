import { describe, expect, it } from "vitest";
import {
  pickIntervalsActivity,
  plannedZoneSeconds,
  zoneSecondsFromStream,
  type IntervalsCandidate,
} from "@/lib/training/zone-times";

const FTP = 250;

describe("zoneSecondsFromStream", () => {
  it("deelt 1 Hz-samples in op de Zwift-grenzen", () => {
    // 59% → Z1, 60% → Z2, 76% → Z3, 90% → Z4, 105% → Z5, 119% → Z6
    const watts = [147.5, 150, 190, 225, 262.5, 297.5];
    expect(zoneSecondsFromStream(watts, null, FTP)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("slaat uitval van de meter over en telt pauzes niet mee", () => {
    const watts = [200, null, 200, 200, 200];
    const time = [0, 1, 2, 60, 61];
    // Sample 0: 1 s; null telt niet; sample 2: gat van 58 s = pauze → 0; 3: 1 s; laatste: 1 s.
    expect(zoneSecondsFromStream(watts, time, FTP)[2]).toBe(3);
  });

  it("gebruikt de tijdstappen bij een lagere samplefrequentie", () => {
    expect(zoneSecondsFromStream([200, 200, 200], [0, 2, 4], FTP)[2]).toBe(5);
  });

  it("geeft nullen zonder FTP", () => {
    expect(zoneSecondsFromStream([200], null, 0)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("plannedZoneSeconds", () => {
  it("telt blokminuten op het midden van hun doel", () => {
    const seconds = plannedZoneSeconds(
      [
        { label: "In", durationMinutes: 10, target: "50-60%", notes: "", intensity: "recovery" },
        { label: "Blok", durationMinutes: 20, target: "95-100%", notes: "", intensity: "threshold" },
        { label: "Rust", durationMinutes: 5, target: "", notes: "", intensity: "rest" },
      ],
      FTP,
    );
    expect(seconds).toEqual([15 * 60, 0, 0, 20 * 60, 0, 0]);
  });
});

describe("pickIntervalsActivity", () => {
  const candidates: IntervalsCandidate[] = [
    { intervalsId: "strava-stub", startLocal: "2026-09-14T17:56:13", movingSeconds: 5400, source: "STRAVA" },
    { intervalsId: "garmin", startLocal: "2026-09-14T17:58:00", movingSeconds: 5300, source: "GARMIN_CONNECT" },
    { intervalsId: "later", startLocal: "2026-09-14T19:30:00", movingSeconds: 1800, source: "WAHOO" },
  ];

  it("kiest de rit met dezelfde lokale start en rijtijd, niet de Strava-stub", () => {
    const pick = pickIntervalsActivity({ startLocal: "2026-09-14T17:56:13Z", movingSeconds: 5400 }, candidates);
    expect(pick?.intervalsId).toBe("garmin");
  });

  it("negeert een rit met een heel andere rijtijd of starttijd", () => {
    expect(
      pickIntervalsActivity({ startLocal: "2026-09-14T17:56:13Z", movingSeconds: 3000 }, candidates),
    ).toBeNull();
    expect(
      pickIntervalsActivity({ startLocal: "2026-09-14T12:00:00Z", movingSeconds: 5400 }, candidates),
    ).toBeNull();
  });

  it("neemt bij twee kandidaten de dichtstbijzijnde start", () => {
    const pick = pickIntervalsActivity({ startLocal: "2026-09-14T19:32:00", movingSeconds: 1800 }, [
      ...candidates,
      { intervalsId: "dubbel", startLocal: "2026-09-14T19:38:00", movingSeconds: 1800, source: "WAHOO" },
    ]);
    expect(pick?.intervalsId).toBe("later");
  });
});
