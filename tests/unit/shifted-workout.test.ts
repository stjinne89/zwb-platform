import { describe, expect, it } from "vitest";
import { complianceForWorkouts, type PlannedWorkoutForCompliance } from "@/lib/training/compliance";
import {
  pickPendingReview,
  reassignCandidates,
  type PendingReviewReport,
  type PendingReviewWorkout,
} from "@/lib/training/completion";
import { yesterdayContextFrom } from "@/lib/training/adapt-context";
import type { StravaRideRow } from "@/lib/training/ride-metrics";

// Meldingen 1, 14 en 17 (plannenboek, 4 en 12 september 2026). Een lid sloeg de
// sweetspot van donderdag 10 september over en reed hem op vrijdag 11 september,
// waar een rustige duurrit gepland stond. De app vroeg RPE bij de duurrit, noemde
// de rit te zwaar, en de dagaanpassing zette op zaterdag "kort herstel na extra
// sweet spot" neer, terwijl er niets extra was gereden.

const FTP = 250;

const donderdag: PlannedWorkoutForCompliance & { status: string; origin?: string } = {
  id: "do-sweetspot",
  scheduled_at: "2026-09-10T16:00:00Z",
  title: "Sweetspot 3x12",
  duration_minutes: 60,
  intensity: "sweet_spot",
  structure_json: [
    { label: "Sweetspot", durationMinutes: 60, target: "90%", notes: "", intensity: "sweet_spot" },
  ],
  status: "planned",
};

const vrijdag: PlannedWorkoutForCompliance & { status: string; origin?: string } = {
  id: "vr-duur",
  scheduled_at: "2026-09-11T16:00:00Z",
  title: "Rustige duurrit",
  duration_minutes: 60,
  intensity: "endurance",
  structure_json: [
    { label: "Duur", durationMinutes: 60, target: "65%", notes: "", intensity: "endurance" },
  ],
  status: "completed",
};

/** 60 min op 225w NP bij FTP 250: IF 0,9, 81 TSS. */
const vrijdagrit: StravaRideRow = {
  id: 9001,
  name: "Sweetspot op vrijdag",
  start_date: "2026-09-11T17:00:00Z",
  moving_time_seconds: 3600,
  raw: { moving_time: 3600, device_watts: true, weighted_average_watts: 225, average_watts: 215 },
};

describe("naleving met een verschoven training", () => {
  it("koppelt zonder vastlegging op kalenderdag: donderdag gemist, vrijdag te zwaar", () => {
    // Het oude gedrag, en nog steeds het gedrag zonder bevestiging: gelijke dag.
    const [thu, fri] = complianceForWorkouts([donderdag, vrijdag], [vrijdagrit], FTP);
    expect(thu.verdict).toBe("niet_gereden");
    expect(fri.verdict).toBe("te_zwaar");
    expect(fri.actualDate).toBe("2026-09-11");
  });

  it("volgt een bevestigde koppeling naar donderdag en telt de rit precies één keer", () => {
    const results = complianceForWorkouts(
      [donderdag, vrijdag],
      [vrijdagrit],
      FTP,
      new Map([
        [
          "do-sweetspot",
          {
            workout_id: "do-sweetspot",
            athlete_rpe: 7,
            athlete_feel: "goed",
            athlete_report: null,
            paired_activity_id: "9001",
          },
        ],
      ]),
    );
    const [thu, fri] = results;
    expect(thu.verdict).toBe("volgens_plan");
    expect(thu.date).toBe("2026-09-10");
    expect(thu.actualDate).toBe("2026-09-11");
    expect(thu.athleteFeel).toBe("goed");
    // Vrijdag levert geen fictieve belasting op.
    expect(fri.verdict).toBe("niet_gereden");
    expect(fri.actualLoad).toBeNull();
    expect(results.filter((row) => row.actualLoad != null)).toHaveLength(1);
  });

  it("laat een koppeling van buiten het venster de rit ook blokkeren", () => {
    const [fri] = complianceForWorkouts(
      [vrijdag],
      [vrijdagrit],
      FTP,
      new Map(),
      new Map([["do-sweetspot", "9001"]]),
    );
    expect(fri.verdict).toBe("niet_gereden");
  });

  it("telt dezelfde rit uit twee overlappende queries één keer", () => {
    const tweede = { ...vrijdag, id: "vr-avond", scheduled_at: "2026-09-11T19:00:00Z" };
    const results = complianceForWorkouts([vrijdag, tweede], [vrijdagrit, { ...vrijdagrit }], FTP);
    expect(results.map((row) => row.verdict)).toEqual(["te_zwaar", "niet_gereden"]);
  });

  it("rekent de daggrens in Amsterdam: 23:30 UTC op donderdag is vrijdag", () => {
    const laat = { ...vrijdagrit, id: 9002, start_date: "2026-09-10T22:30:00Z" };
    const [thu, fri] = complianceForWorkouts([donderdag, vrijdag], [laat], FTP);
    expect(thu.verdict).toBe("niet_gereden");
    expect(fri.actualDate).toBe("2026-09-11");
  });
});

describe("reassignCandidates", () => {
  const workouts = [
    { ...donderdag },
    { ...vrijdag },
    { ...donderdag, id: "wo-rust", scheduled_at: "2026-09-09T16:00:00Z", intensity: "rest" },
    { ...donderdag, id: "zo-later", scheduled_at: "2026-09-13T16:00:00Z" },
    { ...donderdag, id: "event", scheduled_at: "2026-09-08T16:00:00Z", origin: "event" },
    { ...donderdag, id: "oud", scheduled_at: "2026-09-01T16:00:00Z" },
    { ...donderdag, id: "al-gekoppeld", scheduled_at: "2026-09-07T16:00:00Z" },
  ];

  it("biedt alleen open trainingen uit de week tot en met de ritdag aan", () => {
    const candidates = reassignCandidates(
      workouts,
      "2026-09-11",
      "vr-duur",
      new Set(["al-gekoppeld"]),
    );
    expect(candidates.map((candidate) => candidate.id)).toEqual(["do-sweetspot"]);
    expect(candidates[0].dayKey).toBe("2026-09-10");
  });
});

describe("pickPendingReview", () => {
  const report = (workoutId: string, extra: Partial<PendingReviewReport> = {}): PendingReviewReport => ({
    workout_id: workoutId,
    paired_activity_id: `rit-${workoutId}`,
    metrics_json: { plannedTitle: workoutId },
    athlete_rpe: null,
    athlete_feel: null,
    athlete_report: null,
    athlete_confirmed_at: null,
    ...extra,
  });
  const workout = (scheduledAt: string, extra: Partial<PendingReviewWorkout> = {}) => ({
    scheduled_at: scheduledAt,
    status: "completed",
    superseded_at: null,
    ...extra,
  });

  const workouts = new Map<string, PendingReviewWorkout>([
    ["woensdag", workout("2026-09-09T16:00:00Z")],
    ["vrijdag", workout("2026-09-11T16:00:00Z")],
    ["oud", workout("2026-08-20T16:00:00Z")],
    ["vervangen", workout("2026-09-12T08:00:00Z", { superseded_at: "2026-09-12T09:00:00Z" })],
    ["terug-gepland", workout("2026-09-12T10:00:00Z", { status: "planned" })],
  ]);

  it("kiest de nieuwste open rit, ongeacht de volgorde of updated_at", () => {
    const reports = [report("woensdag"), report("vrijdag"), report("oud")];
    expect(pickPendingReview(reports, workouts, "2026-09-13")?.workout_id).toBe("vrijdag");
    expect(pickPendingReview([...reports].reverse(), workouts, "2026-09-13")?.workout_id).toBe(
      "vrijdag",
    );
  });

  it("vraagt nooit opnieuw naar een bevestigde training", () => {
    const reports = [report("vrijdag", { athlete_confirmed_at: "2026-09-12T08:00:00Z" }), report("woensdag")];
    expect(pickPendingReview(reports, workouts, "2026-09-13")?.workout_id).toBe("woensdag");
  });

  it("slaat een rapportage zonder momentopname over in plaats van niets te tonen", () => {
    const reports = [report("vrijdag", { metrics_json: {} }), report("woensdag")];
    expect(pickPendingReview(reports, workouts, "2026-09-13")?.workout_id).toBe("woensdag");
  });

  it("negeert vervangen, teruggezette, ongekoppelde en oude trainingen", () => {
    const reports = [
      report("vervangen"),
      report("terug-gepland"),
      report("oud"),
      report("woensdag", { paired_activity_id: null }),
    ];
    expect(pickPendingReview(reports, workouts, "2026-09-13")).toBeNull();
  });
});

describe("yesterdayContextFrom", () => {
  const base = {
    yesterdayKey: "2026-09-11",
    workouts: [donderdag, vrijdag].map((row) => ({ ...row, duration_minutes: 60 })),
    rides: [vrijdagrit],
    ftpWatts: FTP,
  };

  it("geeft de net gemiste donderdag mee bij een onbevestigde koppeling op vrijdag", () => {
    const context = yesterdayContextFrom({
      ...base,
      pairings: [
        {
          workout_id: "vr-duur",
          paired_activity_id: "9001",
          athlete_confirmed_at: null,
          athlete_rpe: null,
          athlete_feel: null,
          athlete_report: null,
        },
      ],
    });
    expect(context?.plannedTitle).toBe("Rustige duurrit");
    expect(context?.actualLoad).toBe(81);
    expect(context?.actualCountsFor).toBeNull();
    expect(context?.recentlyMissed).toEqual([
      { date: "2026-09-10", title: "Sweetspot 3x12", intensity: "sweet_spot" },
    ]);
  });

  it("zegt waar de rit voor telt als het lid hem aan donderdag hing", () => {
    const context = yesterdayContextFrom({
      ...base,
      workouts: [
        { ...donderdag, status: "completed" },
        { ...vrijdag, status: "planned" },
      ],
      pairings: [
        {
          workout_id: "do-sweetspot",
          paired_activity_id: "9001",
          athlete_confirmed_at: "2026-09-11T20:00:00Z",
          athlete_rpe: 7,
          athlete_feel: "goed",
          athlete_report: null,
        },
      ],
    });
    expect(context?.actualCountsFor).toEqual({
      date: "2026-09-10",
      title: "Sweetspot 3x12",
      intensity: "sweet_spot",
      confirmed: true,
    });
    // Donderdag is gereden, dus niet gemist.
    expect(context?.recentlyMissed).toEqual([]);
    expect(context?.athleteFeel).toBe("goed");
  });

  it("verzint geen belasting als de rit nog niet is geïmporteerd", () => {
    const context = yesterdayContextFrom({ ...base, rides: [], pairings: [] });
    expect(context?.plannedTitle).toBe("Rustige duurrit");
    expect(context?.actualName).toBeNull();
    expect(context?.actualLoad).toBeNull();
  });

  it("geeft niets mee zonder training en zonder rit", () => {
    expect(
      yesterdayContextFrom({ ...base, yesterdayKey: "2026-09-05", rides: [], pairings: [] }),
    ).toBeNull();
  });
});
