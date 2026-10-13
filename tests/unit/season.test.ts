import { describe, expect, it } from "vitest";
import {
  A_TARGET_MIN_GAP_DAYS,
  blockEndDate,
  CAMP_BEFORE_A_TARGET_DAYS,
  daysBetween,
  NEXT_BLOCK_LEAD_DAYS,
  nextBlockDue,
  PLAN_BLOCK_DAYS,
  seasonForAi,
  seasonRoad,
  seasonStand,
  seasonWarnings,
  shiftDays,
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
});

describe("blokken van twaalf weken", () => {
  it("eindigt een blok na twaalf weken als het doel verder weg ligt of ontbreekt", () => {
    expect(blockEndDate("2026-10-13", "2027-07-04")).toBe(shiftDays("2026-10-13", PLAN_BLOCK_DAYS));
    expect(blockEndDate("2026-10-13", null)).toBe("2027-01-05");
  });

  it("eindigt een blok op de doeldatum als die binnen twaalf weken valt", () => {
    expect(blockEndDate("2026-10-13", "2026-11-22")).toBe("2026-11-22");
    expect(blockEndDate("2026-10-13", "2026-11-22T00:00:00Z")).toBe("2026-11-22");
  });

  it("rekent een doeldatum die al voorbij is niet als einde", () => {
    expect(blockEndDate("2026-10-13", "2026-09-01")).toBe("2027-01-05");
  });

  it("biedt het volgende blok alleen aan in de laatste twee weken van een lopend schema", () => {
    const today = "2026-10-13";
    const einde = (dagen: number) => plan({ endDate: shiftDays(today, dagen) });
    expect(nextBlockDue(today, einde(NEXT_BLOCK_LEAD_DAYS))).toBe(true);
    expect(nextBlockDue(today, einde(0))).toBe(true);
    expect(nextBlockDue(today, einde(NEXT_BLOCK_LEAD_DAYS + 1))).toBe(false);
    expect(nextBlockDue(today, einde(-1))).toBe(false);
    expect(nextBlockDue(today, null)).toBe(false);
  });

  it("biedt geen volgend blok aan zolang er een concept klaarligt", () => {
    expect(nextBlockDue("2026-10-13", plan({ endDate: "2026-10-20", status: "draft" }))).toBe(
      false,
    );
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
    const zonderDoel = warn({
      targets: [target({ id: "a1", goalId: null, targetDate: "2026-05-01" })],
    }).find(
      (w) => w.code === "a_doel_zonder_schema",
    );
    expect(zonderDoel?.action?.kind).toBe("maak_doel");

    const zonderSchema = warn({
      targets: [target({ id: "a1", goalId: "g9", targetDate: "2026-05-01" })],
      plans: [plan({ goalId: "g1" })],
    }).find((w) => w.code === "a_doel_zonder_schema");
    expect(zonderSchema?.action?.kind).toBe("open_schema");
    expect(zonderSchema?.anchor).toEqual({ kind: "target", id: "a1" });
  });

  it("zwijgt over een A-doel dat verder dan een blok weg ligt", () => {
    const grens = shiftDays("2026-03-01", PLAN_BLOCK_DAYS);
    expect(codes(warn({ targets: [target({ goalId: null, targetDate: grens })] }))).toContain(
      "a_doel_zonder_schema",
    );
    expect(
      codes(warn({ targets: [target({ goalId: null, targetDate: shiftDays(grens, 1) })] })),
    ).not.toContain("a_doel_zonder_schema");
  });

  it("zwijgt over een A-doel dat wél een schema heeft", () => {
    const warnings = warn({
      targets: [target({ id: "a1", goalId: "g1", targetDate: "2026-05-01" })],
      plans: [plan({ goalId: "g1" })],
    });
    expect(codes(warnings)).not.toContain("a_doel_zonder_schema");
  });

  it("meldt niet langer dat een schema vóór een A-doel stopt of dat een event geen mikpunt is", () => {
    // Met blokken van twaalf weken stopt elk schema vóór een doel dat verder weg
    // ligt, en niet elke clubrit is een mikpunt.
    const warnings = warn({
      targets: [target({ id: "a1", goalId: "g1", targetDate: "2026-09-01" })],
      plans: [plan({ goalId: "g1", endDate: "2026-05-24" })],
      events: [event({ id: "e1" })],
    });
    expect(warnings).toEqual([]);
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

  it("meldt een trainingskamp dat vlak vóór een A-doel eindigt", () => {
    const kamp = period({
      id: "k1",
      kind: "kamp",
      title: "Mallorca",
      startDate: "2026-05-18",
      endDate: "2026-05-24",
    });
    const dichtbij = warn({
      periods: [kamp],
      targets: [target({ title: "Marmotte", targetDate: "2026-06-01" })],
    });
    const gevonden = dichtbij.find((w) => w.code === "kamp_vlak_voor_a_doel");
    expect(gevonden?.title).toBe('"Mallorca" eindigt 8 dagen vóór "Marmotte"');

    const precies = warn({
      periods: [kamp],
      targets: [target({ targetDate: shiftDays("2026-05-24", CAMP_BEFORE_A_TARGET_DAYS) })],
    });
    expect(codes(precies)).not.toContain("kamp_vlak_voor_a_doel");

    const bDoel = warn({
      periods: [kamp],
      targets: [target({ priority: "b", targetDate: "2026-06-01" })],
    });
    expect(codes(bDoel)).not.toContain("kamp_vlak_voor_a_doel");
  });

  it("ziet een trainingskamp niet als rustperiode", () => {
    const warnings = warn({
      periods: [period({ kind: "kamp" })],
      plannedWorkoutDays: ["2026-07-03"],
      events: [event({ date: "2026-07-05" })],
    });
    expect(codes(warnings)).not.toContain("schema_door_rustperiode");
    expect(codes(warnings)).not.toContain("rustperiode_botst_met_event");
  });

  it("zegt niets over een jaar zonder rustperiode", () => {
    expect(warn()).toEqual([]);
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
    expect(warnings).toEqual([]);
  });
});

describe("seasonRoad", () => {
  function road(input: Partial<Parameters<typeof seasonRoad>[0]> = {}) {
    return seasonRoad({
      today: "2026-10-13",
      from: "2026-09-12",
      targets: [],
      periods: [],
      events: [],
      plans: [],
      ...input,
    });
  }
  const soorten = (stops: ReturnType<typeof seasonRoad>) => stops.map((stop) => stop.kind);

  it("maakt van een event met een mikpunt één halte met die prioriteit", () => {
    const result = road({
      targets: [target({ id: "t1", eventId: "e1", priority: "a", targetDate: "2026-11-05" })],
      events: [event({ id: "e1", date: "2026-11-05", title: "Marmotte" })],
    }).filter((stop) => stop.kind === "mikpunt" || stop.kind === "event");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "mikpunt",
      event: { id: "e1" },
      target: { id: "t1", priority: "a" },
    });
  });

  it("koppelt op event-id, ook als de datums een dag verschillen", () => {
    // Start om 01:00 Amsterdamse tijd: UTC-dag is de dag ervoor.
    const result = road({
      targets: [target({ id: "t1", eventId: "e1", priority: "c", targetDate: "2026-11-05" })],
      events: [event({ id: "e1", date: "2026-11-04" })],
    }).filter((stop) => stop.kind === "mikpunt" || stop.kind === "event");
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-11-05");
  });

  it("houdt een mikpunt waarvan het event weg is als los mikpunt", () => {
    const result = road({
      targets: [target({ id: "weg", eventId: "afgemeld", priority: "c", targetDate: "2026-11-05" })],
      events: [event({ id: "e2", date: "2026-11-08" })],
    });
    expect(result.find((stop) => stop.kind === "mikpunt")).toMatchObject({ event: null });
    expect(result.find((stop) => stop.kind === "event")).toMatchObject({ event: { id: "e2" } });
  });

  it("zet vandaag, de maanden en de haltes op volgorde", () => {
    const result = road({
      targets: [target({ id: "t", priority: "b", targetDate: "2026-11-20" })],
      periods: [period({ startDate: "2026-10-24", endDate: "2026-11-01" })],
      events: [event({ date: "2026-10-18" })],
    });
    expect(soorten(result)).toEqual(["maand", "vandaag", "event", "periode", "maand", "mikpunt"]);
    expect(result[0]).toMatchObject({ kind: "maand", label: "oktober" });
    expect(result.find((stop) => stop.kind === "periode")).toMatchObject({ days: 9 });
  });

  it("trekt lege maanden samen tot één regel en zet het jaar bij een volgend jaar", () => {
    const result = road({
      targets: [target({ priority: "b", targetDate: "2027-03-14" })],
    });
    expect(
      result.map((stop) => ("label" in stop ? `${stop.kind}:${stop.label}` : stop.kind)),
    ).toEqual([
      "maand:oktober",
      "vandaag",
      "leeg:november t/m februari",
      "maand:maart 2027",
      "mikpunt",
    ]);
  });

  it("noemt één of twee lege maanden bij naam", () => {
    const een = road({ targets: [target({ priority: "b", targetDate: "2026-12-05" })] });
    expect(een.find((stop) => stop.kind === "leeg")).toMatchObject({ label: "november" });
    const twee = road({ targets: [target({ priority: "b", targetDate: "2027-01-05" })] });
    expect(twee.find((stop) => stop.kind === "leeg")).toMatchObject({
      label: "november en december",
    });
  });

  it("legt asfalt waar het schema is uitgewerkt en een route daarna", () => {
    const result = road({
      plans: [plan({ startDate: "2026-09-21", endDate: "2027-01-03" })],
      events: [event({ id: "in", date: "2026-11-15" }), event({ id: "na", date: "2027-02-10" })],
    });
    const dek = (id: string) =>
      result.find((stop) => stop.kind === "event" && stop.event.id === id)?.surface;
    expect(dek("in")).toBe("schema");
    expect(dek("na")).toBe("open");
    expect(result.find((stop) => stop.kind === "schema_start")).toMatchObject({
      surface: "voorbij",
    });
    expect(result.find((stop) => stop.kind === "schema_eind")).toMatchObject({
      date: "2027-01-03",
      nextBlockDue: false,
    });
  });

  it("zet het volgende blok open in de laatste twee weken", () => {
    const result = road({ plans: [plan({ startDate: "2026-08-01", endDate: "2026-10-20" })] });
    expect(result.find((stop) => stop.kind === "schema_eind")).toMatchObject({
      nextBlockDue: true,
    });
  });

  it("toont geen einde voor een schema dat al is afgelopen", () => {
    const result = road({ plans: [plan({ startDate: "2026-09-15", endDate: "2026-10-01" })] });
    expect(soorten(result)).not.toContain("schema_eind");
  });

  it("zet twaalf weken vóór een A-doel het begin van de opbouw neer", () => {
    const result = road({
      targets: [target({ id: "a", targetDate: "2027-07-04" })],
      plans: [plan({ startDate: "2026-09-21", endDate: "2027-01-03" })],
    });
    expect(result.find((stop) => stop.kind === "opbouw")).toMatchObject({
      date: shiftDays("2027-07-04", -PLAN_BLOCK_DAYS),
      target: { id: "a" },
    });
  });

  it("laat de opbouw weg als het schema daar al ligt of het doel te dichtbij is", () => {
    const gedekt = road({
      targets: [target({ targetDate: "2027-01-20" })],
      plans: [plan({ startDate: "2026-09-21", endDate: "2027-01-03" })],
    });
    expect(soorten(gedekt)).not.toContain("opbouw");
    const dichtbij = road({ targets: [target({ targetDate: "2026-12-01" })] });
    expect(soorten(dichtbij)).not.toContain("opbouw");
  });

  it("rekent een vakantie die nu loopt niet als voorbij", () => {
    const result = road({
      periods: [period({ startDate: "2026-10-10", endDate: "2026-10-17" })],
    });
    expect(result.find((stop) => stop.kind === "periode")?.surface).not.toBe("voorbij");
  });
});

describe("seasonStand", () => {
  it("geeft het lopende blok en de eerstvolgende piek in weken", () => {
    const stand = seasonStand({
      today: "2026-10-13",
      targets: [
        target({ id: "b", priority: "b", targetDate: "2027-03-14" }),
        target({ id: "a", priority: "a", targetDate: "2027-07-04" }),
      ],
      plans: [plan({ startDate: "2026-09-21", endDate: "2027-01-03" })],
    });
    expect(stand.plan?.endDate).toBe("2027-01-03");
    expect(stand.weeksPlanned).toBe(12);
    expect(stand.peak?.id).toBe("a");
    expect(stand.weeksToPeak).toBe(38);
  });

  it("is leeg zonder lopend schema en zonder A-doel", () => {
    const stand = seasonStand({
      today: "2026-10-13",
      targets: [target({ priority: "b", targetDate: "2027-03-14" })],
      plans: [plan({ startDate: "2026-06-01", endDate: "2026-09-01" })],
    });
    expect(stand.plan).toBeNull();
    expect(stand.peak).toBeNull();
  });
});
