import { describe, expect, it } from "vitest";
import {
  A_TARGET_MIN_GAP_DAYS,
  dayOffsetPct,
  daysBetween,
  monthsInWindow,
  PLAN_TAIL_SLACK_DAYS,
  seasonForAi,
  seasonWarnings,
  shiftDays,
  spanPct,
  type SeasonEvent,
  type SeasonPeriod,
  type SeasonPlanBar,
  type SeasonTarget,
  type SeasonWarningCode,
} from "@/lib/training/season";

function target(patch: Partial<SeasonTarget> = {}): SeasonTarget {
  return {
    id: patch.id ?? "t1",
    title: patch.title ?? "Gran fondo",
    targetDate: patch.targetDate ?? "2026-06-01",
    priority: patch.priority ?? "a",
    eventId: patch.eventId ?? null,
    goalId: patch.goalId ?? null,
    note: patch.note ?? null,
  };
}

function period(patch: Partial<SeasonPeriod> = {}): SeasonPeriod {
  return {
    id: patch.id ?? "p1",
    title: patch.title ?? "Vakantie",
    startDate: patch.startDate ?? "2026-07-01",
    endDate: patch.endDate ?? "2026-07-14",
    kind: patch.kind ?? "rust",
    note: patch.note ?? null,
  };
}

function plan(patch: Partial<SeasonPlanBar> = {}): SeasonPlanBar {
  return {
    rootId: patch.rootId ?? "r1",
    title: patch.title ?? "Schema",
    startDate: patch.startDate ?? "2026-03-01",
    endDate: patch.endDate ?? "2026-06-01",
    status: patch.status ?? "published",
    goalId: patch.goalId ?? "g1",
  };
}

function event(patch: Partial<SeasonEvent> = {}): SeasonEvent {
  return {
    id: patch.id ?? "e1",
    title: patch.title ?? "Clubrit",
    type: patch.type ?? "outdoor",
    date: patch.date ?? "2026-05-01",
    rsvp: patch.rsvp ?? "yes",
  };
}

function warn(input: Partial<Parameters<typeof seasonWarnings>[0]> = {}) {
  return seasonWarnings({
    today: "2026-03-01",
    from: "2026-02-01",
    to: "2027-01-31",
    targets: [],
    periods: [],
    plans: [],
    events: [],
    plannedWorkoutDays: [],
    ...input,
  });
}

function codes(warnings: ReturnType<typeof seasonWarnings>): SeasonWarningCode[] {
  return warnings.map((warning) => warning.code);
}

describe("datumrekenwerk", () => {
  it("telt dagen over een schrikkeljaar heen", () => {
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
  });

  it("laat een zomertijdgrens de lengte van een periode niet veranderen", () => {
    // Laatste zondag van maart 2026: de klok gaat vooruit.
    expect(daysBetween("2026-03-27", "2026-03-31")).toBe(4);
    expect(shiftDays("2026-03-27", 4)).toBe("2026-03-31");
    // En in oktober weer terug.
    expect(daysBetween("2026-10-23", "2026-10-27")).toBe(4);
  });

  it("zet de eerste en de laatste dag van het venster op 0% en tegen 100%", () => {
    const from = "2026-01-01";
    const to = "2026-12-31";
    expect(dayOffsetPct(from, from, to)).toBe(0);
    expect(dayOffsetPct(to, from, to)).toBeGreaterThan(99);
    expect(dayOffsetPct(to, from, to)).toBeLessThan(100);
  });

  it("knipt een dag buiten het venster af in plaats van hem te laten ontsporen", () => {
    expect(dayOffsetPct("2025-06-01", "2026-01-01", "2026-12-31")).toBe(0);
    expect(dayOffsetPct("2027-06-01", "2026-01-01", "2026-12-31")).toBe(100);
  });

  it("knipt een periode af die half buiten het venster valt", () => {
    // Vakantie van 20 dec t/m 10 jan, venster begint 1 jan: tien dagen zichtbaar.
    const breedte = spanPct("2025-12-20", "2026-01-10", "2026-01-01", "2026-12-31");
    expect(breedte).toBeCloseTo((10 / 365) * 100, 5);
  });

  it("geeft 0% voor een periode die het venster helemaal niet raakt", () => {
    expect(spanPct("2025-01-01", "2025-02-01", "2026-01-01", "2026-12-31")).toBe(0);
  });

  it("verdeelt de maanden over de volle breedte van het venster", () => {
    const maanden = monthsInWindow("2026-01-01", "2026-12-31");
    expect(maanden).toHaveLength(12);
    expect(maanden[0].leftPct).toBe(0);
    const totaal = maanden.reduce((som, maand) => som + maand.widthPct, 0);
    expect(totaal).toBeCloseTo(100, 5);
  });
});

describe("seasonForAi", () => {
  it("laat alles buiten de planperiode weg", () => {
    const result = seasonForAi({
      targets: [target({ id: "in", targetDate: "2026-05-01" }), target({ id: "uit", targetDate: "2026-09-01" })],
      periods: [period({ startDate: "2026-09-01", endDate: "2026-09-10" })],
      from: "2026-03-01",
      to: "2026-06-01",
    });
    expect(result?.targets.map((t) => t.date)).toEqual(["2026-05-01"]);
    expect(result?.periods).toEqual([]);
  });

  it("neemt een periode mee die vóór het venster begon en er doorheen loopt", () => {
    const result = seasonForAi({
      targets: [],
      periods: [period({ startDate: "2026-02-20", endDate: "2026-03-10" })],
      from: "2026-03-01",
      to: "2026-06-01",
    });
    expect(result?.periods).toHaveLength(1);
  });

  it("wijst het eerstvolgende A/B-mikpunt ná de planperiode aan", () => {
    const result = seasonForAi({
      targets: [
        target({ id: "c", priority: "c", targetDate: "2026-06-15" }),
        target({ id: "b", priority: "b", targetDate: "2026-07-01" }),
        target({ id: "a", priority: "a", targetDate: "2026-08-01" }),
      ],
      periods: [],
      from: "2026-03-01",
      to: "2026-06-01",
    });
    // Het C-doel telt niet mee; het eerste dat wél telt is het B-doel.
    expect(result?.nextTargetAfterPlan).toEqual({
      title: "Gran fondo",
      date: "2026-07-01",
      priority: "b",
    });
  });

  it("geeft null als er niets in de jaarplanning staat", () => {
    expect(seasonForAi({ targets: [], periods: [], from: "2026-03-01", to: "2026-06-01" })).toBeNull();
  });
});

describe("seasonWarnings", () => {
  it("meldt trainingen die in een rustperiode staan", () => {
    const warnings = warn({
      periods: [period({ startDate: "2026-07-01", endDate: "2026-07-14" })],
      plannedWorkoutDays: ["2026-07-03", "2026-07-05"],
    });
    const gevonden = warnings.find((w) => w.code === "schema_door_rustperiode");
    expect(gevonden?.detail).toContain("2 trainingen");
    expect(gevonden?.action).toEqual({ kind: "herzie_schema", label: "Laat je schema herzien" });
  });

  it("meldt niets als de geplande trainingen naast de rustperiode vallen", () => {
    const warnings = warn({
      periods: [period({ startDate: "2026-07-01", endDate: "2026-07-14" })],
      plannedWorkoutDays: ["2026-06-30", "2026-07-15"],
    });
    expect(codes(warnings)).not.toContain("schema_door_rustperiode");
  });

  it("negeert een periode met kind 'rustig' voor die waarschuwing", () => {
    const warnings = warn({
      periods: [period({ kind: "rustig" })],
      plannedWorkoutDays: ["2026-07-03"],
    });
    expect(codes(warnings)).not.toContain("schema_door_rustperiode");
  });

  it("meldt twee A-doelen die te dicht op elkaar liggen", () => {
    const eerste = target({ id: "a1", targetDate: "2026-05-01", title: "Eerste" });
    const tweede = target({
      id: "a2",
      targetDate: shiftDays("2026-05-01", A_TARGET_MIN_GAP_DAYS - 1),
      title: "Tweede",
    });
    const warnings = warn({ targets: [eerste, tweede] });
    const gevonden = warnings.find((w) => w.code === "twee_a_doelen_dicht_bij_elkaar");
    expect(gevonden?.action).toEqual({
      kind: "verlaag_prioriteit",
      label: 'Zet "Tweede" op B',
      targetId: "a2",
    });
  });

  it("laat precies de drempelafstand met rust", () => {
    const warnings = warn({
      targets: [
        target({ id: "a1", targetDate: "2026-05-01" }),
        target({ id: "a2", targetDate: shiftDays("2026-05-01", A_TARGET_MIN_GAP_DAYS) }),
      ],
    });
    expect(codes(warnings)).not.toContain("twee_a_doelen_dicht_bij_elkaar");
  });

  it("meldt een A-doel zonder doel én een A-doel waarvan het doel geen schema heeft", () => {
    const zonderDoel = warn({ targets: [target({ id: "a1", goalId: null })] }).find(
      (w) => w.code === "a_doel_zonder_schema",
    );
    expect(zonderDoel?.action?.kind).toBe("maak_doel");

    const zonderSchema = warn({
      targets: [target({ id: "a1", goalId: "g9" })],
      plans: [plan({ goalId: "g1" })],
    }).find((w) => w.code === "a_doel_zonder_schema");
    expect(zonderSchema?.action?.kind).toBe("open_schema");
  });

  it("zwijgt over een A-doel dat wél een schema heeft", () => {
    const warnings = warn({
      targets: [target({ id: "a1", goalId: "g1" })],
      plans: [plan({ goalId: "g1" })],
    });
    expect(codes(warnings)).not.toContain("a_doel_zonder_schema");
  });

  it("meldt een schema dat ruim vóór het A-doel stopt", () => {
    const targetDate = shiftDays("2026-06-01", PLAN_TAIL_SLACK_DAYS + 1);
    const warnings = warn({
      targets: [target({ id: "a1", goalId: "g1", targetDate })],
      plans: [plan({ goalId: "g1", endDate: "2026-06-01" })],
    });
    expect(codes(warnings)).toContain("schema_eindigt_voor_a_doel");
  });

  it("accepteert een schema dat precies binnen de speling eindigt", () => {
    const targetDate = shiftDays("2026-06-01", PLAN_TAIL_SLACK_DAYS);
    const warnings = warn({
      targets: [target({ id: "a1", goalId: "g1", targetDate })],
      plans: [plan({ goalId: "g1", endDate: "2026-06-01" })],
    });
    expect(codes(warnings)).not.toContain("schema_eindigt_voor_a_doel");
  });

  it("meldt een toegezegd event dat nog geen mikpunt is, en zwijgt zodra dat wel zo is", () => {
    const zonder = warn({ events: [event({ id: "e1" })] });
    const gevonden = zonder.find((w) => w.code === "toegezegd_event_niet_op_tijdlijn");
    expect(gevonden?.action).toMatchObject({ kind: "voeg_mikpunt_toe", eventId: "e1" });

    const met = warn({
      events: [event({ id: "e1" })],
      targets: [target({ id: "t1", eventId: "e1", priority: "c" })],
    });
    expect(codes(met)).not.toContain("toegezegd_event_niet_op_tijdlijn");
  });

  it("meldt een 'misschien' niet als ontbrekend mikpunt", () => {
    const warnings = warn({ events: [event({ rsvp: "maybe" })] });
    expect(codes(warnings)).not.toContain("toegezegd_event_niet_op_tijdlijn");
  });

  it("meldt een event dat midden in een rustperiode valt", () => {
    const warnings = warn({
      periods: [period({ startDate: "2026-07-01", endDate: "2026-07-14" })],
      events: [event({ id: "e1", date: "2026-07-05", rsvp: "maybe" })],
    });
    const gevonden = warnings.find((w) => w.code === "rustperiode_botst_met_event");
    expect(gevonden?.action).toEqual({
      kind: "open_event",
      label: "Bekijk het event",
      eventId: "e1",
    });
  });

  it("tipt over een jaar zonder enkele rustperiode, maar niet over een kort venster", () => {
    expect(codes(warn())).toContain("geen_rustperiode_in_seizoen");
    expect(codes(warn({ from: "2026-03-01", to: "2026-06-01" }))).not.toContain(
      "geen_rustperiode_in_seizoen",
    );
    expect(codes(warn({ periods: [period()] }))).not.toContain("geen_rustperiode_in_seizoen");
  });

  it("laat alles wat al geweest is met rust", () => {
    const warnings = warn({
      today: "2026-08-01",
      targets: [target({ targetDate: "2026-06-01" })],
      periods: [period({ startDate: "2026-07-01", endDate: "2026-07-14" })],
      events: [event({ date: "2026-05-01" })],
      plannedWorkoutDays: ["2026-07-03"],
    });
    expect(codes(warnings)).not.toContain("schema_door_rustperiode");
    expect(codes(warnings)).not.toContain("a_doel_zonder_schema");
    expect(codes(warnings)).not.toContain("toegezegd_event_niet_op_tijdlijn");
  });

  it("zet 'let op' boven een tip", () => {
    const warnings = warn({ targets: [target({ goalId: null })] });
    expect(warnings[0].severity).toBe("let_op");
    expect(warnings.at(-1)?.severity).toBe("tip");
  });
});
