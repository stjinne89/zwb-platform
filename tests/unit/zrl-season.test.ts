import { describe, expect, it } from "vitest";
import {
  MAX_PER_RACE,
  MAX_ROSTER,
  ZRL_2026_27_ROUNDS,
  generateZrlRound,
  isTuesday,
  validateRoundSpec,
  weeksBetween,
} from "@/lib/teams/zrl-season";

const RONDE1 = {
  season: "2026/27",
  round: 1,
  firstRaceDate: "2026-09-22",
  raceCount: 6,
  timeLocal: "20:00",
  teamName: "ZWB Cycling B1",
};

describe("generateZrlRound", () => {
  it("maakt een event per week op dinsdag", () => {
    const events = generateZrlRound(RONDE1);
    expect(events).toHaveLength(6);
    expect(events.map((e) => e.dateKey)).toEqual([
      "2026-09-22",
      "2026-09-29",
      "2026-10-06",
      "2026-10-13",
      "2026-10-20",
      "2026-10-27",
    ]);
    expect(events.every((e) => isTuesday(e.dateKey))).toBe(true);
  });

  it("zet week 1 op Race of Truth en de rest niet", () => {
    const events = generateZrlRound(RONDE1);
    expect(events[0].format).toBe("race_of_truth");
    expect(events[0].title).toContain("Race of Truth");
    expect(events.slice(1).every((e) => e.format === "race")).toBe(true);
  });

  it("zet de teamnaam in de titel", () => {
    expect(generateZrlRound(RONDE1)[1].title).toBe("ZRL 2026/27 · R1 · W2 · ZWB Cycling B1");
  });

  it("houdt de lokale starttijd vast over de zomertijdgrens heen", () => {
    // Nederland gaat op 25 oktober 2026 van zomertijd naar wintertijd. Week 5
    // valt ervoor, week 6 erna — beide moeten om 20:00 lokaal starten, dus met
    // een ándere UTC-tijd.
    const events = generateZrlRound(RONDE1);
    const week5 = events.find((e) => e.dateKey === "2026-10-20")!;
    const week6 = events.find((e) => e.dateKey === "2026-10-27")!;
    expect(week5.startAtIso).toBe("2026-10-20T18:00:00.000Z");
    expect(week6.startAtIso).toBe("2026-10-27T19:00:00.000Z");

    const lokaal = (iso: string) =>
      new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso));
    expect(lokaal(week5.startAtIso)).toBe(lokaal(week6.startAtIso));
  });

  it("levert niets bij een ongeldige opgave", () => {
    expect(generateZrlRound({ ...RONDE1, raceCount: 0 })).toEqual([]);
    expect(generateZrlRound({ ...RONDE1, timeLocal: "acht uur" })).toEqual([]);
    expect(generateZrlRound({ ...RONDE1, round: 9 })).toEqual([]);
  });

  it("werkt zonder teamnaam", () => {
    const events = generateZrlRound({ ...RONDE1, teamName: undefined });
    expect(events[1].title).toBe("ZRL 2026/27 · R1 · W2");
  });
});

describe("validateRoundSpec", () => {
  it("keurt een geldige ronde goed", () => {
    expect(validateRoundSpec(RONDE1)).toEqual([]);
  });

  it("benoemt wat er mis is", () => {
    const errors = validateRoundSpec({ ...RONDE1, season: "", round: 7 });
    expect(errors).toHaveLength(2);
  });
});

describe("de gepubliceerde rondes van 2026/27", () => {
  it("beginnen en eindigen allemaal op een dinsdag", () => {
    for (const ronde of ZRL_2026_27_ROUNDS) {
      expect(isTuesday(ronde.firstRaceDate), `R${ronde.round} start`).toBe(true);
      expect(isTuesday(ronde.lastRaceDate), `R${ronde.round} eind`).toBe(true);
    }
  });

  it("duren elk zes weken", () => {
    for (const ronde of ZRL_2026_27_ROUNDS) {
      expect(weeksBetween(ronde.firstRaceDate, ronde.lastRaceDate)).toBe(6);
    }
  });
});

describe("rostergrenzen", () => {
  it("tien op de roster, vijf aan de start", () => {
    expect(MAX_ROSTER).toBe(10);
    expect(MAX_PER_RACE).toBe(5);
  });
});
