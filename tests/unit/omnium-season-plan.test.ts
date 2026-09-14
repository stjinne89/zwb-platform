import { describe, expect, it } from "vitest";
import {
  OMNIUM_2026_27_PLAN,
  nthWeekdayOfMonth,
  planOmniumSeason,
  validateSeasonPlanSpec,
  weekdayOf,
} from "@/lib/omnium/season-plan";
import {
  conflictsForDate,
  hasBlockingConflict,
  zrlRaceRound,
} from "@/lib/omnium/known-series";
import {
  DEFAULT_OMNIUM_PARTS,
  generateEdition,
  validateEditionSpec,
  type OmniumEditionSpec,
} from "@/lib/omnium/edition";

const SUNDAY = 0;

describe("planOmniumSeason", () => {
  it("plant zes edities op de tweede zondag van oktober tot en met maart", () => {
    const editions = planOmniumSeason(OMNIUM_2026_27_PLAN);
    expect(editions.map((edition) => edition.dateKey)).toEqual([
      "2026-10-11",
      "2026-11-08",
      "2026-12-13",
      "2027-01-10",
      "2027-02-14",
      "2027-03-14",
    ]);
    expect(editions.every((edition) => weekdayOf(edition.dateKey) === SUNDAY)).toBe(
      true,
    );
  });

  it("houdt 11:00 lokaal vast over de zomertijdwissel heen", () => {
    const editions = planOmniumSeason(OMNIUM_2026_27_PLAN);
    // Oktober valt nog in zomertijd (UTC+2), de rest in wintertijd (UTC+1).
    // Voor het internationale veld verschuift het uur dus precies één keer.
    expect(new Date(editions[0].startAtIso).getUTCHours()).toBe(9);
    expect(new Date(editions[1].startAtIso).getUTCHours()).toBe(10);
    expect(new Date(editions[5].startAtIso).getUTCHours()).toBe(10);
  });

  it("zet de voorbeschouwing een half uur voor de start", () => {
    const [first] = planOmniumSeason(OMNIUM_2026_27_PLAN);
    const gap =
      new Date(first.startAtIso).getTime() -
      new Date(first.preshowAtIso!).getTime();
    expect(gap).toBe(30 * 60_000);
  });

  it("accepteert een handmatige uitzondering per editie", () => {
    const editions = planOmniumSeason({
      ...OMNIUM_2026_27_PLAN,
      overrides: { 5: "2027-02-07" },
    });
    expect(editions[4].dateKey).toBe("2027-02-07");
    expect(editions[4].isOverride).toBe(true);
    expect(editions[3].isOverride).toBe(false);
  });

  it("slaat een maand over waarin het gevraagde voorkomen niet bestaat", () => {
    // Februari 2027 begint op maandag en heeft geen vijfde zondag.
    expect(nthWeekdayOfMonth(2027, 2, SUNDAY, 5)).toBeNull();
    const editions = planOmniumSeason({
      ...OMNIUM_2026_27_PLAN,
      occurrence: 5,
    });
    expect(editions.map((edition) => edition.dateKey)).not.toContain("2027-03-07");
    expect(editions.length).toBeLessThan(6);
  });

  it("keurt onzinnige invoer af", () => {
    expect(
      validateSeasonPlanSpec({ ...OMNIUM_2026_27_PLAN, timeLocal: "elf uur" }),
    ).toContain("Vul een tijd in als 11:00.");
    expect(
      validateSeasonPlanSpec({ ...OMNIUM_2026_27_PLAN, weekday: 9 }).length,
    ).toBeGreaterThan(0);
  });
});

describe("conflictcheck", () => {
  it("herkent een ZRL-dinsdag binnen een ronde", () => {
    expect(zrlRaceRound("2026-10-06")).toBe(1);
    expect(zrlRaceRound("2026-11-17")).toBe(2);
    // Dinsdag in de pauze tussen ronde 1 en 2.
    expect(zrlRaceRound("2026-11-03")).toBeNull();
    // Zondag is per definitie geen ZRL-dag.
    expect(zrlRaceRound("2026-10-11")).toBeNull();
  });

  it("markeert dinsdag als harde botsing", () => {
    const conflicts = conflictsForDate("2026-10-06");
    expect(hasBlockingConflict(conflicts)).toBe(true);
    expect(conflicts[0].series).toBe("Zwift Racing League");
  });

  it("waarschuwt voor de dag na een ZRL-race", () => {
    const conflicts = conflictsForDate("2026-10-07");
    expect(conflicts.map((conflict) => conflict.severity)).toContain("adjacent");
    expect(hasBlockingConflict(conflicts)).toBe(false);
  });

  it("markeert donderdag om de WTRL TTT en zaterdag om de Tiny Races", () => {
    expect(
      conflictsForDate("2026-10-08").some(
        (conflict) => conflict.series === "WTRL Team Time Trial",
      ),
    ).toBe(true);
    expect(
      conflictsForDate("2026-10-10").some(
        (conflict) => conflict.series === "Zwift Insider Tiny Races",
      ),
    ).toBe(true);
  });

  it("laat alle zes de geplande zondagen vrij van harde botsingen", () => {
    const editions = planOmniumSeason(OMNIUM_2026_27_PLAN);
    for (const edition of editions) {
      const conflicts = conflictsForDate(edition.dateKey);
      expect(hasBlockingConflict(conflicts)).toBe(false);
    }
  });

  it("meldt de meerweekse series als aandachtspunt, niet als botsing", () => {
    const januari = conflictsForDate("2027-01-10");
    const tdz = januari.find((conflict) => conflict.series === "Tour de Zwift");
    expect(tdz?.severity).toBe("series_window");
    // De 2027-datums zijn een schatting en horen ook zo getoond te worden.
    expect(tdz?.confirmed).toBe(false);

    const maart = conflictsForDate("2027-03-14");
    expect(
      maart.some((conflict) => conflict.series === "Zwift Games"),
    ).toBe(true);
  });
});

describe("generateEdition", () => {
  const SPEC: OmniumEditionSpec = {
    seasonSlug: "2026-27",
    number: 1,
    slug: "opener",
    title: "The Opener",
    dateKey: "2026-10-11",
    firstStartLocal: "11:00",
    preshowMinutesBefore: 30,
    parts: DEFAULT_OMNIUM_PARTS,
  };

  it("berekent de vier starttijden cumulatief", () => {
    const edition = generateEdition(SPEC)!;
    const localHhmm = (iso: string) =>
      new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso));

    expect(edition.parts.map((part) => localHhmm(part.startAtIso))).toEqual([
      "11:00",
      "11:20",
      "11:50",
      "12:10",
    ]);
    expect(edition.parts.map((part) => part.discipline)).toEqual([
      "prologue",
      "scratch",
      "sprint",
      "crit",
    ]);
  });

  it("komt uit op negentig minuten", () => {
    const edition = generateEdition(SPEC)!;
    expect(edition.totalMinutes).toBe(90);
    const minutes =
      (new Date(edition.endAtIso).getTime() -
        new Date(edition.startAtIso).getTime()) /
      60_000;
    expect(minutes).toBe(90);
  });

  it("laat het kalenderitem bij de voorbeschouwing beginnen", () => {
    const edition = generateEdition(SPEC)!;
    expect(edition.calendarEvent.startAtIso).toBe(edition.preshowAtIso);
    expect(edition.calendarEvent.type).toBe("omnium");
  });

  it("maakt een los kalenderitem voor de recon-rit", () => {
    const edition = generateEdition({
      ...SPEC,
      reconDateKey: "2026-10-05",
      reconTimeLocal: "19:45",
    })!;
    expect(edition.reconEvent?.title).toContain("Recon");
    expect(edition.reconEvent?.startAtIso.slice(0, 10)).toBe("2026-10-05");
  });

  it("eist alle vier de onderdelen", () => {
    const errors = validateEditionSpec({
      ...SPEC,
      parts: DEFAULT_OMNIUM_PARTS.slice(0, 2),
    });
    expect(errors).toContain("Onderdeel ontbreekt: sprint.");
    expect(errors).toContain("Onderdeel ontbreekt: crit.");
    expect(generateEdition({ ...SPEC, parts: [] })).toBeNull();
  });
});
