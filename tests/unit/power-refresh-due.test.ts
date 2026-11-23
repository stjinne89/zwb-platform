import { describe, expect, it } from "vitest";
import { powerProfilesDue, type PowerRefreshRow } from "@/lib/teams/power-refresh-due";

const NOW = Date.parse("2026-11-23T15:00:00Z");
const ago = (hours: number) => new Date(NOW - hours * 60 * 60 * 1000).toISOString();
const row = (profileId: string, hoursAgo: number | null, extra: Partial<PowerRefreshRow> = {}): PowerRefreshRow => ({
  profileId,
  syncedAt: hoursAgo == null ? null : ago(hoursAgo),
  syncStatus: "ok",
  rides: [],
  ...extra,
});
const ride = (hoursAgo: number, sportType = "VirtualRide") => ({ startDate: ago(hoursAgo), movingSeconds: 3600, sportType });

describe("powerProfilesDue", () => {
  it("laat een vers profiel zonder nieuwe rit met rust", () => {
    expect(powerProfilesDue([row("a", 2)], NOW)).toEqual([]);
  });

  it("pakt een fietsrit die na het ophalen eindigde, maar geen hardloopronde", () => {
    expect(powerProfilesDue([row("a", 5, { rides: [ride(3)] })], NOW)).toEqual(["a"]);
    expect(powerProfilesDue([row("a", 5, { rides: [ride(3, "Run")] })], NOW)).toEqual([]);
  });

  it("ververst ook zonder bekende rit na 20 uur (rit alleen als stompje in intervals.icu)", () => {
    expect(powerProfilesDue([row("a", 19)], NOW)).toEqual([]);
    expect(powerProfilesDue([row("a", 21)], NOW)).toEqual(["a"]);
  });

  it("probeert een fout pas na drie uur opnieuw, ook als er een nieuwe rit is", () => {
    expect(powerProfilesDue([row("a", 2, { syncStatus: "error", rides: [ride(1)] })], NOW)).toEqual([]);
    expect(powerProfilesDue([row("a", 4, { syncStatus: "error" })], NOW)).toEqual(["a"]);
  });

  it("zet nooit opgehaald, nieuwe rit, fout en dagelijks in die volgorde, oudste eerst", () => {
    const rows = [
      row("dagelijks", 30),
      row("fout", 4, { syncStatus: "error" }),
      row("rit-jong", 5, { rides: [ride(3)] }),
      row("rit-oud", 10, { rides: [ride(3)] }),
      row("nooit", null),
    ];
    expect(powerProfilesDue(rows, NOW)).toEqual(["nooit", "rit-oud", "rit-jong", "fout", "dagelijks"]);
  });
});
