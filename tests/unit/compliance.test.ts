import { describe, expect, it } from "vitest";
import {
  COMPLIANCE_HIGH,
  COMPLIANCE_LOW,
  COMPLIANCE_LABELS,
  COMPLIANCE_PILLS,
  complianceForWorkouts,
  complianceVerdict,
  loadPercentage,
  pickRideForWorkout,
  summarizeCompliance,
  type PlannedWorkoutForCompliance,
} from "@/lib/training/compliance";
import type { StravaRideRow } from "@/lib/training/ride-metrics";

const FTP = 250;

/** 60 min op 250w NP = precies FTP een uur lang = 100 TSS. */
function ride(
  overrides: Partial<StravaRideRow> & { id: number } & { np?: number | null },
): StravaRideRow {
  const { np = 250, ...rest } = overrides;
  return {
    name: "Rit",
    start_date: "2026-07-20T09:00:00Z",
    moving_time_seconds: 3600,
    raw: {
      moving_time: rest.moving_time_seconds ?? 3600,
      device_watts: np != null,
      weighted_average_watts: np,
      average_watts: np,
      average_heartrate: 148,
      average_cadence: 88,
    },
    ...rest,
  };
}

function workout(
  overrides: Partial<PlannedWorkoutForCompliance> & { id: string },
): PlannedWorkoutForCompliance {
  return {
    scheduled_at: "2026-07-20T09:00:00+02:00",
    title: "Duur 60",
    duration_minutes: 60,
    intensity: "endurance",
    // 60 min endurance => estimateTrainingLoad = 60 * 0.6 = 36
    structure_json: [
      { label: "Duur", durationMinutes: 60, target: "65%", notes: "", intensity: "endurance" },
    ],
    ...overrides,
  };
}

describe("loadPercentage", () => {
  it("rekent werkelijk t.o.v. gepland", () => {
    expect(loadPercentage(72, 60)).toBe(120);
    expect(loadPercentage(30, 60)).toBe(50);
  });

  it("geeft null zonder bruikbare geplande belasting", () => {
    expect(loadPercentage(72, null)).toBeNull();
    expect(loadPercentage(72, 0)).toBeNull();
    expect(loadPercentage(null, 60)).toBeNull();
  });
});

describe("complianceVerdict", () => {
  it("zit op de juiste kant van elke grens", () => {
    expect(complianceVerdict(COMPLIANCE_LOW - 1, true)).toBe("te_licht");
    expect(complianceVerdict(COMPLIANCE_LOW, true)).toBe("volgens_plan");
    expect(complianceVerdict(COMPLIANCE_HIGH, true)).toBe("volgens_plan");
    expect(complianceVerdict(COMPLIANCE_HIGH + 1, true)).toBe("te_zwaar");
  });

  it("noemt een workout zonder rit niet gereden", () => {
    expect(complianceVerdict(null, false)).toBe("niet_gereden");
    expect(complianceVerdict(120, false)).toBe("niet_gereden");
  });

  it("telt een rit zonder meetbare belasting als volgens plan", () => {
    expect(complianceVerdict(null, true)).toBe("volgens_plan");
  });
});

describe("pickRideForWorkout", () => {
  it("pakt op dezelfde dag de rit met de duur die het dichtst bij het plan ligt", () => {
    const rows = [
      ride({ id: 1, moving_time_seconds: 1800 }),
      ride({ id: 2, moving_time_seconds: 5400 }),
    ];
    expect(pickRideForWorkout(rows, "2026-07-20T09:00:00+02:00", 90)?.id).toBe(2);
    expect(pickRideForWorkout(rows, "2026-07-20T09:00:00+02:00", 30)?.id).toBe(1);
  });

  it("negeert ritten van een andere dag", () => {
    const rows = [ride({ id: 1, start_date: "2026-07-19T09:00:00Z" })];
    expect(pickRideForWorkout(rows, "2026-07-20T09:00:00+02:00", 60)).toBeNull();
  });

  it("pakt zonder geplande duur de langste rit van die dag", () => {
    const rows = [
      ride({ id: 1, moving_time_seconds: 1800 }),
      ride({ id: 2, moving_time_seconds: 5400 }),
    ];
    expect(pickRideForWorkout(rows, "2026-07-20T09:00:00+02:00", null)?.id).toBe(2);
  });

  it("rekent met de kalenderdag in Amsterdam, niet met UTC", () => {
    // 22:30 UTC op 19 juli is 00:30 op 20 juli in Amsterdam.
    const rows = [ride({ id: 1, start_date: "2026-07-19T22:30:00Z" })];
    expect(pickRideForWorkout(rows, "2026-07-20T09:00:00+02:00", 60)?.id).toBe(1);
  });
});

describe("complianceForWorkouts", () => {
  it("koppelt een rit en beoordeelt de afwijking", () => {
    // 36 gepland, 100 gereden => 278%.
    const [result] = complianceForWorkouts([workout({ id: "w1" })], [ride({ id: 1 })], FTP);
    expect(result.plannedLoad).toBe(36);
    expect(result.actualLoad).toBe(100);
    expect(result.actualIf).toBe(1);
    expect(result.actualMinutes).toBe(60);
    expect(result.loadPct).toBe(278);
    expect(result.verdict).toBe("te_zwaar");
  });

  it("markeert een workout zonder rit als niet gereden", () => {
    const [result] = complianceForWorkouts([workout({ id: "w1" })], [], FTP);
    expect(result.verdict).toBe("niet_gereden");
    expect(result.actualLoad).toBeNull();
    expect(result.loadPct).toBeNull();
  });

  it("laat de belasting leeg bij een rit zonder vermogensmeter", () => {
    const [result] = complianceForWorkouts(
      [workout({ id: "w1" })],
      [ride({ id: 1, np: null })],
      FTP,
    );
    expect(result.actualLoad).toBeNull();
    expect(result.actualMinutes).toBe(60);
    expect(result.verdict).toBe("volgens_plan");
  });

  it("laat rustdagen buiten de naleving", () => {
    const result = complianceForWorkouts(
      [workout({ id: "rust", intensity: "rest", structure_json: [] })],
      [],
      FTP,
    );
    expect(result).toHaveLength(0);
  });

  it("gebruikt één rit maar voor één workout", () => {
    const results = complianceForWorkouts(
      [
        workout({ id: "ochtend", scheduled_at: "2026-07-20T08:00:00+02:00" }),
        workout({ id: "avond", scheduled_at: "2026-07-20T18:00:00+02:00" }),
      ],
      [ride({ id: 1 })],
      FTP,
    );
    expect(results.map((r) => r.verdict)).toEqual(["te_zwaar", "niet_gereden"]);
  });

  it("geeft null als geplande belasting bij een workout zonder blokken", () => {
    const [result] = complianceForWorkouts(
      [workout({ id: "w1", structure_json: [] })],
      [ride({ id: 1 })],
      FTP,
    );
    expect(result.plannedLoad).toBeNull();
    expect(result.loadPct).toBeNull();
    expect(result.verdict).toBe("volgens_plan");
  });

  it("neemt RPE en gevoel uit de rapportage over", () => {
    const [result] = complianceForWorkouts(
      [workout({ id: "w1" })],
      [ride({ id: 1 })],
      FTP,
      new Map([["w1", { workout_id: "w1", athlete_rpe: 8, athlete_feel: "zwaar" }]]),
    );
    expect(result.athleteRpe).toBe(8);
    expect(result.athleteFeel).toBe("zwaar");
  });
});

describe("summarizeCompliance", () => {
  it("telt de uitkomsten en middelt alleen de meetbare ritten", () => {
    const summary = summarizeCompliance(
      complianceForWorkouts(
        [
          workout({ id: "maandag", scheduled_at: "2026-07-20T09:00:00+02:00" }),
          workout({ id: "dinsdag", scheduled_at: "2026-07-21T09:00:00+02:00" }),
          workout({ id: "woensdag", scheduled_at: "2026-07-22T09:00:00+02:00" }),
        ],
        [
          // 36 gepland. 125w NP => 25 TSS (69%), 250w NP => 100 TSS (278%).
          ride({ id: 1, start_date: "2026-07-20T09:00:00Z", np: 125 }),
          ride({ id: 2, start_date: "2026-07-21T09:00:00Z", np: 250 }),
        ],
        FTP,
      ),
    );
    expect(summary).toEqual({
      planned: 3,
      ridden: 2,
      missed: 1,
      tooLight: 1,
      tooHard: 1,
      onPlan: 0,
      avgLoadPct: 174,
    });
  });
});

describe("COMPLIANCE_PILLS", () => {
  it("heeft een kleur voor elk oordeel", () => {
    for (const verdict of Object.keys(COMPLIANCE_LABELS) as Array<
      keyof typeof COMPLIANCE_LABELS
    >) {
      expect(COMPLIANCE_PILLS[verdict]).toBeTruthy();
    }
  });

  it("volgt het gereedscore-palet: teal goed, oranje signaal, rood actie", () => {
    expect(COMPLIANCE_PILLS.volgens_plan).toContain("zwb-teal");
    expect(COMPLIANCE_PILLS.te_licht).toContain("orange");
    expect(COMPLIANCE_PILLS.te_zwaar).toContain("destructive");
    expect(COMPLIANCE_PILLS.niet_gereden).toContain("muted");
  });

  it("geeft te licht en te zwaar niet dezelfde kleur", () => {
    // Te zwaar stapelt vermoeidheid op; te licht kost alleen prikkel.
    expect(COMPLIANCE_PILLS.te_licht).not.toBe(COMPLIANCE_PILLS.te_zwaar);
  });
});
