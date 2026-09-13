import { describe, expect, it } from "vitest";
import { reassignRideToWorkout } from "@/lib/training/completion";

// Melding 17 (plannenboek, 12 september 2026): de RPE-vraag hing aan de blauwe
// training van vrijdag, terwijl het lid de groene van donderdag had gereden. Het
// bevestigscherm laat het lid de rit nu aan die andere training hangen; deze
// tests bewaken wat er in de database gebeurt.

type Row = Record<string, unknown>;

/**
 * Supabase-stub met net genoeg querytaal: filters, update/delete die rijen echt
 * aanpassen, upsert op een samengestelde sleutel, en een optionele fout op de
 * upsert om een halverwege mislukte verhuizing na te bootsen.
 */
function fakeAdmin(tables: Record<string, Row[]>, options: { failUpsert?: boolean } = {}) {
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    let remove = false;

    const run = () => {
      const rows = tables[table] ?? [];
      const matched = rows.filter((row) => filters.every((f) => f(row)));
      if (patch) for (const row of matched) Object.assign(row, patch);
      if (remove) tables[table] = rows.filter((row) => !matched.includes(row));
      return matched.map((row) => ({ ...row }));
    };

    const builder = {
      select: () => builder,
      update: (values: Row) => {
        patch = values;
        return builder;
      },
      delete: () => {
        remove = true;
        return builder;
      },
      upsert: async (values: Row) => {
        if (options.failUpsert) return { error: { message: "schrijven faalde" } };
        const rows = (tables[table] ??= []);
        const existing = rows.find(
          (row) => row.workout_id === values.workout_id && row.profile_id === values.profile_id,
        );
        if (existing) Object.assign(existing, values);
        else rows.push({ ...values });
        return { error: null };
      },
      eq: (column: string, value: unknown) => {
        filters.push((row) => String(row[column] ?? "") === String(value));
        return builder;
      },
      is: (column: string, value: unknown) => {
        filters.push((row) => (row[column] ?? null) === value);
        return builder;
      },
      maybeSingle: async () => ({ data: run()[0] ?? null }),
      then: (resolve: (value: { data: Row[]; error: null }) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    return builder;
  }
  return { from } as never;
}

function world() {
  return {
    training_workouts: [
      {
        id: "do",
        profile_id: "lid",
        trainer_id: "trainer",
        scheduled_at: "2026-09-10T16:00:00Z",
        title: "Sweetspot 3x12",
        duration_minutes: 60,
        intensity: "sweet_spot",
        target_type: "power",
        structure_json: [
          { label: "Sweetspot", durationMinutes: 60, target: "90%", notes: "", intensity: "sweet_spot" },
        ],
        intervals_event_id: null,
        status: "planned",
        origin: "ai",
        superseded_at: null,
      },
      {
        id: "vr",
        profile_id: "lid",
        trainer_id: "trainer",
        scheduled_at: "2026-09-11T16:00:00Z",
        title: "Rustige duurrit",
        duration_minutes: 60,
        intensity: "endurance",
        target_type: "power",
        structure_json: [],
        intervals_event_id: null,
        status: "completed",
        origin: "ai",
        superseded_at: null,
      },
    ] as Row[],
    training_workout_reports: [
      {
        workout_id: "vr",
        profile_id: "lid",
        paired_activity_id: "9001",
        metrics_json: { plannedTitle: "Rustige duurrit", ctlBefore: 50, ctlAfter: 51, readinessScore: 60 },
        athlete_confirmed_at: null,
        trainer_feedback: null,
      },
    ] as Row[],
    strava_activities: [
      {
        id: 9001,
        profile_id: "lid",
        name: "Sweetspot op vrijdag",
        start_date: "2026-09-11T17:00:00Z",
        moving_time_seconds: 3600,
        raw: { moving_time: 3600, device_watts: true, weighted_average_watts: 225 },
      },
    ] as Row[],
    profiles: [{ id: "lid", ftp_watts: 250 }] as Row[],
  };
}

const input = {
  profileId: "lid",
  fromWorkoutId: "vr",
  toWorkoutId: "do",
  review: { rpe: 7, feel: "goed", report: "Donderdag ingehaald" },
  confirmedAt: "2026-09-12T08:00:00Z",
};

describe("reassignRideToWorkout", () => {
  it("verhuist rit, cijfers en beleving naar donderdag en zet vrijdag terug", async () => {
    const tables = world();
    const result = await reassignRideToWorkout(fakeAdmin(tables), input);

    expect(result.ok).toBe(true);
    const [thursday, friday] = tables.training_workouts;
    expect(thursday.status).toBe("completed");
    expect(friday.status).toBe("planned");

    expect(tables.training_workout_reports).toHaveLength(1);
    const report = tables.training_workout_reports[0];
    expect(report.workout_id).toBe("do");
    expect(report.paired_activity_id).toBe("9001");
    expect(report.athlete_feel).toBe("goed");
    expect(report.athlete_rpe).toBe(7);
    expect(report.athlete_confirmed_at).toBe("2026-09-12T08:00:00Z");
    const metrics = report.metrics_json as Record<string, unknown>;
    // Vergeleken met de sweetspot, niet meer met de duurrit.
    expect(metrics.plannedTitle).toBe("Sweetspot 3x12");
    expect(metrics.verdict).toBe("volgens_plan");
    // CTL en gereedscore horen bij de ritdag en blijven staan.
    expect(metrics.ctlBefore).toBe(50);
    expect(metrics.readinessScore).toBe(60);
  });

  it("weigert een training die intussen al is afgerond, zonder iets te veranderen", async () => {
    const tables = world();
    tables.training_workouts[0].status = "completed";
    const result = await reassignRideToWorkout(fakeAdmin(tables), input);

    expect(result).toEqual({ ok: false, error: "Deze rit kan niet bij die training horen." });
    expect(tables.training_workout_reports[0].workout_id).toBe("vr");
    expect(tables.training_workouts[1].status).toBe("completed");
  });

  it("weigert een training na de ritdag", async () => {
    const tables = world();
    tables.training_workouts[0].scheduled_at = "2026-09-13T16:00:00Z";
    const result = await reassignRideToWorkout(fakeAdmin(tables), input);
    expect(result.ok).toBe(false);
    expect(tables.training_workouts[0].status).toBe("planned");
  });

  it("zet de claim terug en laat vrijdag intact als schrijven faalt", async () => {
    const tables = world();
    const result = await reassignRideToWorkout(fakeAdmin(tables, { failUpsert: true }), input);

    expect(result).toEqual({ ok: false, error: "schrijven faalde" });
    expect(tables.training_workouts[0].status).toBe("planned");
    expect(tables.training_workouts[1].status).toBe("completed");
    expect(tables.training_workout_reports[0].paired_activity_id).toBe("9001");
  });

  it("gooit trainerfeedback op de oude training niet weg", async () => {
    const tables = world();
    tables.training_workout_reports[0].trainer_feedback = "Mooi gereden";
    await reassignRideToWorkout(fakeAdmin(tables), input);

    const old = tables.training_workout_reports.find((row) => row.workout_id === "vr");
    expect(old?.trainer_feedback).toBe("Mooi gereden");
    expect(old?.paired_activity_id).toBeNull();
  });

  it("weigert een al bevestigde training", async () => {
    const tables = world();
    tables.training_workout_reports[0].athlete_confirmed_at = "2026-09-11T20:00:00Z";
    const result = await reassignRideToWorkout(fakeAdmin(tables), input);
    expect(result.ok).toBe(false);
    expect(tables.training_workouts[0].status).toBe("planned");
  });
});
