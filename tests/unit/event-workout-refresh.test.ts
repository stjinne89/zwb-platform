import { beforeEach, describe, expect, it, vi } from "vitest";

const pushed: string[] = [];
vi.mock("@/lib/training/publish", () => ({
  pushWorkoutToIntervals: vi.fn(async (_admin: unknown, id: string) => {
    pushed.push(id);
    return { connected: true, ok: true };
  }),
}));

import {
  eventWorkoutBlocks,
  eventWorkoutDefaults,
  refreshEventWorkouts,
  type ClubEventRow,
} from "@/lib/training/events";

const future = new Date(Date.now() + 5 * 86400_000).toISOString();
const past = new Date(Date.now() - 3600_000).toISOString();

function race(over: Partial<ClubEventRow> = {}): ClubEventRow {
  return {
    id: "zrl-b2",
    title: "ZRL 2026/27 · R1 · W3 · B2",
    type: "zrl",
    start_at: future,
    end_at: null,
    distance_km: 35.42,
    elevation_m: 309,
    parent_event_id: "week-3",
    ...over,
  };
}

/** Het blok zoals syncEventWorkout het vóór 30 september 2026 maakte. */
function oldBlock(title: string) {
  return [
    {
      label: title,
      durationMinutes: 60,
      target: "",
      notes: "Clubevent uit de ZWB-kalender.",
      intensity: "race",
    },
  ];
}

type Row = Record<string, unknown>;

/**
 * Supabase-stub per tabel: leest `events` en `training_workouts`, en onthoudt
 * welke workouts met welke waarden zijn bijgewerkt.
 */
function fakeAdmin(events: ClubEventRow[], workouts: Row[]) {
  const updates: Array<{ id: unknown; values: Row }> = [];
  const from = (table: string) => {
    let values: Row | null = null;
    const filters: Array<[string, unknown]> = [];
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    Object.assign(builder, {
      select: chain,
      is: chain,
      not: chain,
      gte: chain,
      update: (next: Row) => {
        values = next;
        return builder;
      },
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      in: (column: string, value: unknown) => {
        filters.push([column, value]);
        return builder;
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (values) {
          updates.push({ id: filters.find(([c]) => c === "id")?.[1], values });
          return resolve({ data: null, error: null });
        }
        if (table === "training_workouts") return resolve({ data: workouts, error: null });
        const byParent = filters.some(([c]) => c === "parent_event_id");
        return resolve({ data: byParent ? [] : events, error: null });
      },
    });
    return builder;
  };
  return { admin: { from } as never, updates };
}

beforeEach(() => {
  pushed.length = 0;
});

describe("refreshEventWorkouts", () => {
  it("rekent een ZRL-blok van een uur om naar de route en zet hem door", async () => {
    const event = race();
    const { admin, updates } = fakeAdmin(
      [event],
      [
        {
          id: "w1",
          event_id: event.id,
          duration_minutes: 60,
          intensity: "race",
          structure_json: oldBlock(event.title),
          intervals_event_id: "123",
          publish_status: "published",
        },
      ],
    );

    const result = await refreshEventWorkouts(admin, { eventIds: [event.id] });

    expect(result).toEqual({ updated: 1, pushed: 1, failed: 0 });
    expect(updates[0].id).toBe("w1");
    expect(updates[0].values.duration_minutes).toBe(eventWorkoutDefaults(event).durationMinutes);
    expect(updates[0].values.duration_minutes).not.toBe(60);
    expect(updates[0].values.publish_status).toBe("pending");
    expect(pushed).toEqual(["w1"]);
  });

  it("laat een blok dat al klopt met rust", async () => {
    const event = race();
    const { admin, updates } = fakeAdmin(
      [event],
      [
        {
          id: "w1",
          event_id: event.id,
          duration_minutes: eventWorkoutDefaults(event).durationMinutes,
          intensity: "race",
          structure_json: eventWorkoutBlocks(event),
          intervals_event_id: "123",
          publish_status: "published",
        },
      ],
    );

    expect(await refreshEventWorkouts(admin)).toEqual({ updated: 0, pushed: 0, failed: 0 });
    expect(updates).toHaveLength(0);
  });

  it("zet een blok door dat na het opslaan van het event is blijven liggen", async () => {
    const event = race();
    const { admin } = fakeAdmin(
      [event],
      [
        {
          id: "w1",
          event_id: event.id,
          duration_minutes: eventWorkoutDefaults(event).durationMinutes,
          intensity: "race",
          structure_json: eventWorkoutBlocks(event),
          intervals_event_id: "123",
          publish_status: "pending",
        },
      ],
    );

    expect(await refreshEventWorkouts(admin)).toEqual({ updated: 0, pushed: 1, failed: 0 });
  });

  it("raakt een opgeknipt blok en een begonnen race niet aan", async () => {
    const opgeknipt = race({ id: "a" });
    const begonnen = race({ id: "b", start_at: past });
    const { admin, updates } = fakeAdmin(
      [opgeknipt, begonnen],
      [
        {
          id: "w1",
          event_id: "a",
          duration_minutes: 60,
          intensity: "race",
          structure_json: [...oldBlock("Inrijden"), ...oldBlock(opgeknipt.title)],
          intervals_event_id: null,
          publish_status: "published",
        },
        {
          id: "w2",
          event_id: "b",
          duration_minutes: 60,
          intensity: "race",
          structure_json: oldBlock(begonnen.title),
          intervals_event_id: "9",
          publish_status: "published",
        },
      ],
    );

    expect(await refreshEventWorkouts(admin)).toEqual({ updated: 0, pushed: 0, failed: 0 });
    expect(updates).toHaveLength(0);
  });

  it("stopt met doorzetten na de deadline, maar werkt het blok wel bij", async () => {
    const event = race();
    const { admin, updates } = fakeAdmin(
      [event],
      [
        {
          id: "w1",
          event_id: event.id,
          duration_minutes: 60,
          intensity: "race",
          structure_json: oldBlock(event.title),
          intervals_event_id: "123",
          publish_status: "published",
        },
      ],
    );

    const result = await refreshEventWorkouts(admin, { deadline: Date.now() - 1 });
    expect(result).toEqual({ updated: 1, pushed: 0, failed: 0 });
    expect(updates[0].values.publish_status).toBe("pending");
  });
});
