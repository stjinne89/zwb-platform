import { describe, expect, it } from "vitest";
import {
  planZrlReservations,
  RESERVATION_GRACE_MS,
  type ZrlAvailabilityRow,
  type ZrlBlockRow,
  type ZrlRsvpRow,
} from "@/lib/training/zrl-reservation";

const NOW = new Date("2026-10-31T10:00:00Z");
const WEEK = "week-r2w1";
const RACE_START = "2026-11-17T19:00:00Z";

function available(over: Partial<ZrlAvailabilityRow> = {}): ZrlAvailabilityRow {
  return {
    profileId: "stijn",
    eventId: WEEK,
    weekId: WEEK,
    status: "available",
    startAt: RACE_START,
    ...over,
  };
}

function rsvp(over: Partial<ZrlRsvpRow> = {}): ZrlRsvpRow {
  return { profileId: "stijn", eventId: "race-bdev", weekId: WEEK, status: "yes", ...over };
}

function block(over: Partial<ZrlBlockRow> = {}): ZrlBlockRow {
  return {
    profileId: "stijn",
    eventId: WEEK,
    weekId: WEEK,
    startAt: RACE_START,
    status: "planned",
    ...over,
  };
}

const plan = (input: {
  availability?: ZrlAvailabilityRow[];
  rsvps?: ZrlRsvpRow[];
  blocks?: ZrlBlockRow[];
  now?: Date;
}) =>
  planZrlReservations({
    availability: input.availability ?? [],
    rsvps: input.rsvps ?? [],
    blocks: input.blocks ?? [],
    now: input.now ?? NOW,
  });

describe("planZrlReservations", () => {
  it("reserveert de raceweek bij beschikbaar, nog zonder opstelling", () => {
    // Zo stond het op 31 oktober 2026: beschikbaar voor R2 W1 en een VO2max
    // op die avond in het schema.
    expect(plan({ availability: [available()] })).toEqual({
      add: [{ profileId: "stijn", eventId: WEEK }],
      remove: [],
    });
  });

  it("zet geen tweede blok als de reservering er al staat", () => {
    expect(plan({ availability: [available()], blocks: [block()] })).toEqual({ add: [], remove: [] });
  });

  it("reserveert niet bij misschien of niet beschikbaar, en haalt een oude reservering weg", () => {
    for (const status of ["maybe", "unavailable"]) {
      expect(plan({ availability: [available({ status })], blocks: [block()] })).toEqual({
        add: [],
        remove: [{ profileId: "stijn", eventId: WEEK }],
      });
    }
  });

  it("laat de opstelling het overnemen: een ja op een teamrace in die week", () => {
    const result = plan({
      availability: [available()],
      rsvps: [rsvp()],
      blocks: [block(), block({ eventId: "race-bdev" })],
    });
    expect(result.add).toEqual([]);
    expect(result.remove).toEqual([{ profileId: "stijn", eventId: WEEK }]);
  });

  it("laat het blok van een eigen ja altijd met rust", () => {
    // Team zonder subteams: beschikbaarheid en ja op dezelfde teamrace.
    const result = plan({
      availability: [available({ eventId: "race-a", weekId: WEEK })],
      rsvps: [rsvp({ eventId: "race-a" })],
      blocks: [block({ eventId: "race-a" })],
    });
    expect(result).toEqual({ add: [], remove: [] });
  });

  it("telt een nee op één teamrace niet als afzegging voor de week", () => {
    // Les van 2026-09-22 (Jeroen): nee op de race van het hoofdteam, wel beschikbaar.
    const result = plan({
      availability: [available()],
      rsvps: [rsvp({ eventId: "race-b", status: "no" })],
    });
    expect(result.add).toEqual([{ profileId: "stijn", eventId: WEEK }]);
  });

  it("laat een nee op de teamrace zelf voorgaan op beschikbaarheid voor die race", () => {
    const result = plan({
      availability: [available({ eventId: "race-a" })],
      rsvps: [rsvp({ eventId: "race-a", status: "no" })],
      blocks: [block({ eventId: "race-a" })],
    });
    expect(result).toEqual({ add: [], remove: [{ profileId: "stijn", eventId: "race-a" }] });
  });

  it("reserveert hooguit één race per raceweek, bij voorkeur de raceweek zelf", () => {
    const result = plan({
      availability: [available({ eventId: "race-a" }), available()],
      blocks: [block({ eventId: "race-a" })],
    });
    expect(result.add).toEqual([{ profileId: "stijn", eventId: WEEK }]);
    expect(result.remove).toEqual([{ profileId: "stijn", eventId: "race-a" }]);
  });

  it("meldt één lid bij twee paraplu's beschikbaar: één reservering", () => {
    // Twee rijen in team_event_availability op hetzelfde hoofdevent, per team.
    const result = plan({ availability: [available(), available()] });
    expect(result.add).toEqual([{ profileId: "stijn", eventId: WEEK }]);
  });

  it("reserveert geen race die al begonnen is", () => {
    const result = plan({
      availability: [available()],
      now: new Date(Date.parse(RACE_START) + 60_000),
    });
    expect(result.add).toEqual([]);
  });

  it("laat de reservering tijdens de race staan en haalt hem weg als het lid niet werd opgesteld", () => {
    const during = new Date(Date.parse(RACE_START) + RESERVATION_GRACE_MS - 60_000);
    expect(plan({ availability: [available()], blocks: [block()], now: during }).remove).toEqual([]);

    const after = new Date(Date.parse(RACE_START) + RESERVATION_GRACE_MS + 60_000);
    expect(plan({ availability: [available()], blocks: [block()], now: after }).remove).toEqual([
      { profileId: "stijn", eventId: WEEK },
    ]);
  });

  it("haalt een gereden reservering nooit weg", () => {
    const after = new Date(Date.parse(RACE_START) + RESERVATION_GRACE_MS + 60_000);
    expect(
      plan({ availability: [available()], blocks: [block({ status: "completed" })], now: after }).remove,
    ).toEqual([]);
  });

  it("ruimt een reservering op waarvan de beschikbaarheid verdween", () => {
    expect(plan({ blocks: [block()] }).remove).toEqual([{ profileId: "stijn", eventId: WEEK }]);
  });

  it("houdt leden uit elkaar", () => {
    const result = plan({
      availability: [available(), available({ profileId: "jeroen" })],
      rsvps: [rsvp({ profileId: "jeroen" })],
    });
    expect(result.add).toEqual([{ profileId: "stijn", eventId: WEEK }]);
  });
});

describe("withChildRoutes", () => {
  it("geeft een raceweek zonder route het parcours en format van een teamrace", async () => {
    const { withChildRoutes, eventWorkoutDefaults } = await import("@/lib/training/events");
    const children = [
      { parent_event_id: WEEK, distance_km: null, elevation_m: null, zwift_route_id: null, laps: null, zwift_event_type: null, zwift_tags: null },
      { parent_event_id: WEEK, distance_km: 29.89, elevation_m: 180, zwift_route_id: 553661379, laps: 1, zwift_event_type: "TEAM_TIME_TRIAL", zwift_tags: ["ttt"] },
    ];
    const builder = {
      select: () => builder,
      in: () => builder,
      order: () => Promise.resolve({ data: children, error: null }),
    };
    const admin = { from: () => builder } as unknown as Parameters<typeof withChildRoutes>[0];
    const week = {
      id: WEEK,
      title: "ZRL 2026/27 · R1 · W4",
      type: "zrl",
      start_at: RACE_START,
      end_at: null,
      distance_km: null,
      elevation_m: null,
      parent_event_id: null,
    };

    const [filled] = await withChildRoutes(admin, [week]);
    expect(filled.distance_km).toBe(29.89);
    expect(filled.zwift_event_type).toBe("TEAM_TIME_TRIAL");
    // Zonder teamrace was dit de terugval van 50 minuten; nu de TTT-schatting.
    expect(eventWorkoutDefaults(week).durationMinutes).toBe(50);
    expect(eventWorkoutDefaults(filled).durationMinutes).not.toBe(50);
  });
});
