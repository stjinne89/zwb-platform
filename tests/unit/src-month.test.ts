import { describe, expect, it } from "vitest";
import feed from "../fixtures/src/events-feed.json";
import { groupSrcFeed, type SrcFeedRow } from "@/lib/src/feed";
import {
  isSrcMonthKey,
  nextSrcMonth,
  srcMonthKey,
  srcMonthSundays,
  srcSundayCoverage,
  srcTeamLocked,
  type SrcAvailabilityStatus,
  type SrcPlanRider,
} from "@/lib/src/month";
import { srcSundaysToImport } from "@/lib/src/sync";

describe("maanden", () => {
  it("rekent maandsleutels", () => {
    expect(srcMonthKey("2026-10-04")).toBe("2026-10-01");
    expect(srcMonthKey(new Date("2026-12-31T23:00:00Z"))).toBe("2026-12-01");
    expect(nextSrcMonth("2026-12-01")).toBe("2027-01-01");
    expect(isSrcMonthKey("2026-10-01")).toBe(true);
    expect(isSrcMonthKey("2026-10-04")).toBe(false);
  });

  it("maakt van de laatste zondag de finale", () => {
    // Zelfde indeling als MyWhoosh in september 2026: drie kwalificaties en de
    // finale op 27 september.
    expect(srcMonthSundays("2026-09-01")).toEqual([
      { sunday: "2026-09-06", round: 1, isFinal: false },
      { sunday: "2026-09-13", round: 2, isFinal: false },
      { sunday: "2026-09-20", round: 3, isFinal: false },
      { sunday: "2026-09-27", round: null, isFinal: true },
    ]);
    // November 2026 heeft vijf zondagen.
    const november = srcMonthSundays("2026-11-01");
    expect(november).toHaveLength(5);
    expect(november[3]).toEqual({ sunday: "2026-11-22", round: 4, isFinal: false });
    expect(november[4].sunday).toBe("2026-11-29");
  });
});

describe("srcTeamLocked", () => {
  it("laat wisselen toe tot de eerste race van de maand begint", () => {
    const first = "2026-10-04T07:25:00.000Z";
    expect(srcTeamLocked(null, new Date("2026-10-20T12:00:00Z"))).toBe(false);
    expect(srcTeamLocked(first, new Date("2026-10-04T07:24:00Z"))).toBe(false);
    expect(srcTeamLocked(first, new Date("2026-10-04T07:25:00Z"))).toBe(true);
  });
});

describe("srcSundayCoverage", () => {
  const riders: SrcPlanRider[] = [
    { profileId: "a", teamId: "t", race: "men", category: 3 },
    { profileId: "b", teamId: "t", race: "men", category: 3 },
    { profileId: "c", teamId: "t", race: "men", category: 3 },
    { profileId: "d", teamId: "t", race: "men", category: 4 },
    { profileId: "e", teamId: "t", race: "women", category: null },
  ];
  const statuses: Record<string, SrcAvailabilityStatus> = {
    a: "available",
    b: "available",
    c: "available",
    d: "maybe",
    e: "available",
  };

  it("telt per race en categorie, en noemt drie zekere renners genoeg", () => {
    expect(srcSundayCoverage(riders, (id) => statuses[id] ?? null)).toEqual([
      { teamId: "t", race: "men", category: 3, available: 3, maybe: 0, enough: true },
      { teamId: "t", race: "men", category: 4, available: 0, maybe: 1, enough: false },
      { teamId: "t", race: "women", category: null, available: 1, maybe: 0, enough: false },
    ]);
  });

  it("telt wie niet kan of niets opgaf niet mee", () => {
    const coverage = srcSundayCoverage(riders, (id) => (id === "a" ? "unavailable" : null));
    expect(coverage).toEqual([]);
  });
});

describe("srcSundaysToImport", () => {
  const fromFeed = groupSrcFeed(feed.data as SrcFeedRow[]).sundays;

  it("zet alle zondagen van deze en volgende maand klaar, met de races uit de feed", () => {
    const sundays = srcSundaysToImport(fromFeed, new Date("2026-09-30T18:00:00Z"));
    // September heeft geen zondag meer na de 30e; oktober heeft er vier.
    expect(sundays.map((sunday) => sunday.sunday)).toEqual([
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ]);
    expect(sundays[0].races).toHaveLength(2);
    expect(sundays[3]).toEqual({ sunday: "2026-10-25", round: null, isFinal: true, races: [] });
  });

  it("neemt de hele volgende maand mee en slaat verleden zondagen over", () => {
    const sundays = srcSundaysToImport([], new Date("2026-10-20T12:00:00Z"));
    expect(sundays[0].sunday).toBe("2026-10-25");
    expect(sundays.at(-1)).toMatchObject({ sunday: "2026-11-29", isFinal: true });
    expect(sundays).toHaveLength(6);
  });
});
