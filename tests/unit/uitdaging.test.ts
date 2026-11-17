import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  daysUntil,
  parseEntryForm,
  percentOf,
  sortEntries,
  teamTotals,
  type ChallengeEntry,
} from "@/lib/uitdaging";
import { moduleForPath } from "@/lib/modules";

function form(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

function entry(overrides: Partial<ChallengeEntry> = {}): ChallengeEntry {
  return {
    profileId: "p",
    targetClimbs: 1,
    climbsDone: null,
    fundraisingTargetEur: null,
    raisedEur: null,
    fundraisingUrl: null,
    ...overrides,
  };
}

describe("formulier Uitdaging", () => {
  it("leest een volledige deelname", () => {
    const res = parseEntryForm(
      form({
        target_climbs: "6",
        climbs_done: "4",
        fundraising_target_eur: "2.500",
        raised_eur: "€ 1250",
        fundraising_url: "https://www.example.org/actie/123",
      }),
    );
    expect(res).toEqual({
      ok: true,
      value: {
        targetClimbs: 6,
        climbsDone: 4,
        fundraisingTargetEur: 2500,
        raisedEur: 1250,
        fundraisingUrl: "https://www.example.org/actie/123",
      },
    });
  });

  it("laat lege velden leeg", () => {
    const res = parseEntryForm(form({ target_climbs: "2" }));
    expect(res).toEqual({
      ok: true,
      value: { targetClimbs: 2, climbsDone: null, fundraisingTargetEur: null, raisedEur: null, fundraisingUrl: null },
    });
  });

  it.each([
    [{ target_climbs: "" }],
    [{ target_climbs: "0" }],
    [{ target_climbs: "11" }],
    [{ target_climbs: "2,5" }],
    [{ target_climbs: "2", climbs_done: "-1" }],
    [{ target_climbs: "2", raised_eur: "12,50" }],
    [{ target_climbs: "2", fundraising_target_eur: "abc" }],
    [{ target_climbs: "2", fundraising_url: "http://example.org" }],
    [{ target_climbs: "2", fundraising_url: "javascript:alert(1)" }],
  ])("weigert %j", (values) => {
    expect(parseEntryForm(form(values)).ok).toBe(false);
  });
});

describe("teamtotaal", () => {
  it("telt beklimmingen en bedragen op", () => {
    const totals = teamTotals([
      entry({ targetClimbs: 6, raisedEur: 1000, fundraisingTargetEur: 2500 }),
      entry({ targetClimbs: 3, raisedEur: null, fundraisingTargetEur: 500 }),
    ]);
    expect(totals).toEqual({ riders: 2, plannedClimbs: 9, doneClimbs: null, raisedEur: 1000, targetEur: 3000 });
  });

  it("telt gehaald pas als iemand het heeft ingevuld", () => {
    const totals = teamTotals([entry({ targetClimbs: 6, climbsDone: 5 }), entry({ targetClimbs: 2 })]);
    expect(totals.doneClimbs).toBe(5);
  });

  it("geeft een percentage tot 100", () => {
    expect(percentOf(1500, 3000)).toBe(50);
    expect(percentOf(4000, 3000)).toBe(100);
    expect(percentOf(100, 0)).toBeNull();
  });
});

describe("aftellen", () => {
  const now = new Date("2027-06-01T22:30:00Z"); // 2 juni 00:30 in Amsterdam

  it("telt kalenderdagen in Amsterdamse tijd", () => {
    expect(daysUntil("2027-06-03T04:00:00Z", now)).toBe(1);
    expect(daysUntil("2027-06-02T04:00:00Z", now)).toBe(0);
    expect(daysUntil("2027-06-01T10:00:00Z", now)).toBe(-1);
  });

  it("geeft een kort label", () => {
    expect(countdownLabel(30)).toBe("Nog 30 dagen");
    expect(countdownLabel(1)).toBe("Morgen");
    expect(countdownLabel(0)).toBe("Vandaag");
    expect(countdownLabel(-2)).toBe("Geweest");
  });
});

describe("volgorde en module", () => {
  it("zet wie het meest ophaalde bovenaan", () => {
    const sorted = sortEntries([
      { ...entry({ profileId: "a", raisedEur: 100 }), name: "Bram" },
      { ...entry({ profileId: "b", raisedEur: 900 }), name: "Anna" },
      { ...entry({ profileId: "c", raisedEur: 100, targetClimbs: 6 }), name: "Cas" },
    ]);
    expect(sorted.map((e) => e.profileId)).toEqual(["b", "c", "a"]);
  });

  it("hangt /uitdaging aan de module", () => {
    expect(moduleForPath("/uitdaging")).toBe("uitdaging");
  });
});
