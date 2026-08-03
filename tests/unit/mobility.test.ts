import { describe, expect, it } from "vitest";
import {
  lastDoneOn,
  recommendSeries,
  seriesMinutes,
  sessionsLast28Days,
  shiftDayKey,
  weeklyStreak,
  type MobilityExercise,
  type MobilitySeries,
  type MobilitySeriesItem,
  type MobilitySession,
} from "@/lib/training/mobility";

function exercise(overrides: Partial<MobilityExercise> = {}): MobilityExercise {
  return {
    id: "ex-1",
    slug: "plank",
    title: "Plank",
    category: "core",
    region: "lumbaal",
    cue_md: "Steun op je onderarmen.",
    illustration_slug: "plank",
    media_json: [],
    default_hold_seconds: 30,
    default_reps: null,
    is_unilateral: false,
    level: 1,
    ...overrides,
  };
}

function item(overrides: Partial<MobilitySeriesItem> = {}): MobilitySeriesItem {
  return {
    id: "item-1",
    series_id: "series-1",
    sort_order: 0,
    sets: 1,
    reps: null,
    hold_seconds: 30,
    rest_seconds: 0,
    exercise: exercise(),
    ...overrides,
  };
}

function session(
  completed_on: string,
  series_id = "series-1",
): MobilitySession {
  return { id: `s-${series_id}-${completed_on}`, series_id, completed_on, minutes: null, feel: null };
}

function series(overrides: Partial<MobilitySeries> = {}): MobilitySeries {
  return {
    id: "series-1",
    slug: "fundament",
    title: "Fundament",
    subtitle: null,
    goal: "stabiliteit",
    timing: "rustdag",
    duration_minutes: 10,
    level: 1,
    is_standard: true,
    owner_id: null,
    ...overrides,
  };
}

const STANDARD_SERIES = [
  series(),
  series({ id: "series-2", slug: "voor-de-rit", timing: "pre_ride", goal: "mobiliteit" }),
  series({ id: "series-3", slug: "na-de-rit", timing: "post_ride", goal: "mobiliteit" }),
  series({ id: "series-4", slug: "zithouding", timing: "rustdag", goal: "houding" }),
];

describe("shiftDayKey", () => {
  it("telt dagen op en af over maand- en jaargrenzen", () => {
    expect(shiftDayKey("2026-08-03", -1)).toBe("2026-08-02");
    expect(shiftDayKey("2026-08-01", -1)).toBe("2026-07-31");
    expect(shiftDayKey("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDayKey("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("verschuift niet bij de overgang naar zomertijd", () => {
    // In Nederland gaat de klok in de nacht van 28 op 29 maart 2026 vooruit.
    expect(shiftDayKey("2026-03-30", -1)).toBe("2026-03-29");
    expect(shiftDayKey("2026-03-29", -1)).toBe("2026-03-28");
  });
});

describe("seriesMinutes", () => {
  it("telt holds, rust en sets bij elkaar op", () => {
    // 2 sets van 30 s met 30 s rust = 120 s = 2 minuten.
    const minutes = seriesMinutes([item({ sets: 2, hold_seconds: 30, rest_seconds: 30 })]);
    expect(minutes).toBe(2);
  });

  it("rekent een eenzijdige oefening voor beide kanten", () => {
    const oneSided = item({
      sets: 1,
      hold_seconds: 60,
      rest_seconds: 0,
      exercise: exercise({ is_unilateral: true }),
    });
    expect(seriesMinutes([oneSided])).toBe(2);
  });

  it("rekent herhalingen om naar tijd", () => {
    // 20 herhalingen à 3 seconden = 60 s.
    const reps = item({ sets: 1, reps: 20, hold_seconds: null, rest_seconds: 0 });
    expect(seriesMinutes([reps])).toBe(1);
  });

  it("rondt naar boven af en geeft nooit nul", () => {
    expect(seriesMinutes([item({ sets: 1, hold_seconds: 10, rest_seconds: 0 })])).toBe(1);
    expect(seriesMinutes([])).toBe(1);
  });
});

describe("sessionsLast28Days", () => {
  const today = "2026-08-03";

  it("neemt vandaag en de 27 dagen ervoor mee", () => {
    const rows = [
      session("2026-08-03"), // vandaag
      session("2026-07-08"), // precies 26 dagen terug
      session("2026-07-07"), // precies de grens (28e dag)
      session("2026-07-06"), // net buiten
    ];
    const kept = sessionsLast28Days(rows, today).map((row) => row.completed_on);
    expect(kept).toEqual(["2026-08-03", "2026-07-08", "2026-07-07"]);
  });

  it("laat sessies met een datum in de toekomst buiten het venster", () => {
    expect(sessionsLast28Days([session("2026-08-04")], today)).toEqual([]);
  });
});

describe("weeklyStreak", () => {
  const today = "2026-08-03";

  it("telt aaneengesloten weken met genoeg sessies", () => {
    const rows = [
      // week 0: 3 t/m 28 juli terugtellend — deze week twee sessies
      session("2026-08-03"),
      session("2026-07-30"),
      // week 1
      session("2026-07-27"),
      session("2026-07-24"),
      // week 2 heeft er maar één
      session("2026-07-20"),
    ];
    expect(weeklyStreak(rows, today)).toBe(2);
  });

  it("is nul zodra de huidige week het doel niet haalt", () => {
    expect(weeklyStreak([session("2026-08-03")], today)).toBe(0);
    expect(weeklyStreak([], today)).toBe(0);
  });

  it("respecteert een afwijkend weekdoel", () => {
    // Eén sessie in deze week, één in de week ervoor.
    const rows = [session("2026-08-03"), session("2026-07-25")];
    expect(weeklyStreak(rows, today, 1)).toBe(2);
    expect(weeklyStreak(rows, today, 3)).toBe(0);
  });
});

describe("lastDoneOn", () => {
  it("geeft de meest recente datum per serie", () => {
    const rows = [
      session("2026-07-01", "series-1"),
      session("2026-07-20", "series-1"),
      session("2026-07-25", "series-4"),
    ];
    expect(lastDoneOn(rows, "series-1")).toBe("2026-07-20");
    expect(lastDoneOn(rows, "series-4")).toBe("2026-07-25");
    expect(lastDoneOn(rows, "series-2")).toBeNull();
  });
});

describe("recommendSeries", () => {
  const today = "2026-08-03";

  it("stelt na de rit voor als er al gereden is", () => {
    const pick = recommendSeries(STANDARD_SERIES, [], today, {
      hasPlannedWorkoutToday: true,
      rodeToday: true,
    });
    expect(pick?.slug).toBe("na-de-rit");
  });

  it("stelt voor de rit voor als er nog een workout wacht", () => {
    const pick = recommendSeries(STANDARD_SERIES, [], today, {
      hasPlannedWorkoutToday: true,
      rodeToday: false,
    });
    expect(pick?.slug).toBe("voor-de-rit");
  });

  it("kiest op een rustdag de serie die het langst geleden is", () => {
    const rows = [
      session("2026-08-01", "series-1"), // Fundament recent
      session("2026-07-10", "series-4"), // Zithouding lang geleden
    ];
    const pick = recommendSeries(STANDARD_SERIES, rows, today, {
      hasPlannedWorkoutToday: false,
      rodeToday: false,
    });
    expect(pick?.slug).toBe("zithouding");
  });

  it("behandelt een nooit gedane serie als het langst geleden", () => {
    const rows = [session("2026-07-10", "series-4")];
    const pick = recommendSeries(STANDARD_SERIES, rows, today, {
      hasPlannedWorkoutToday: false,
      rodeToday: false,
    });
    expect(pick?.slug).toBe("fundament");
  });

  it("geeft null zonder series", () => {
    expect(
      recommendSeries([], [], today, { hasPlannedWorkoutToday: false, rodeToday: false }),
    ).toBeNull();
  });
});
