import { describe, expect, it } from "vitest";
import feed from "../fixtures/src/events-feed.json";
import { groupSrcFeed, type SrcFeedRow } from "@/lib/src/feed";
import { importSrcSundays } from "@/lib/src/import";
import { syncSrcCalendar } from "@/lib/src/sync";
import { fakeAdmin, type Row } from "./src-fake-admin";

const rows = feed.data as SrcFeedRow[];

describe("importSrcSundays", () => {
  it("maakt één zondag met twee races, en maakt bij herhalen niets dubbel", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [] };
    const admin = fakeAdmin(tables);
    const { sundays } = groupSrcFeed(rows);

    const first = await importSrcSundays(admin, sundays, "beheerder");
    expect(first).toMatchObject({ sundaysCreated: 1, racesCreated: 2, updated: 0 });
    expect(first.created.map((race) => race.gender)).toEqual(["women", "men"]);

    const parent = tables.events.find((row) => row.src_sunday === "2026-10-04")!;
    expect(parent).toMatchObject({
      type: "src",
      title: "SRC oktober · Kwalificatie 1",
      start_at: "2026-10-04T07:25:00.000Z",
      created_by: "beheerder",
    });
    const children = tables.events.filter((row) => row.parent_event_id === parent.id);
    expect(children.map((row) => row.title).sort()).toEqual([
      "SRC oktober · Kwalificatie 1 · Dames",
      "SRC oktober · Kwalificatie 1 · Heren",
    ]);
    expect(tables.src_races).toHaveLength(2);
    expect(tables.src_races.find((row) => row.gender === "men")).toMatchObject({
      registration_closes_at: "2026-10-01T03:00:00.000Z",
      pre_weight_categories: [1, 2],
      round: 1,
    });

    const again = await importSrcSundays(admin, sundays, "beheerder");
    expect(again).toEqual({ sundaysCreated: 0, racesCreated: 0, updated: 0, created: [] });
    expect(tables.events).toHaveLength(3);
    expect(tables.src_races).toHaveLength(2);
  });

  it("werkt een verschoven starttijd bij en laat een hernoemde titel staan", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [] };
    const admin = fakeAdmin(tables);
    await importSrcSundays(admin, groupSrcFeed(rows).sundays, "beheerder");
    const women = tables.src_races.find((row) => row.gender === "women")!;
    const womenEvent = tables.events.find((row) => row.id === women.event_id)!;
    womenEvent.title = "SRC-dames met de hele club";

    const shifted = rows.map((row) =>
      row.name?.includes("Women") ? { ...row, time: "11:30 AM", categories: null } : row,
    );
    const result = await importSrcSundays(admin, groupSrcFeed(shifted).sundays, "beheerder");

    expect(result.updated).toBe(2); // de race en de zondag erboven
    expect(womenEvent.start_at).toBe("2026-10-04T07:30:00.000Z");
    expect(womenEvent.title).toBe("SRC-dames met de hele club");
    const parent = tables.events.find((row) => row.src_sunday === "2026-10-04")!;
    expect(parent.start_at).toBe("2026-10-04T07:30:00.000Z");
  });
});

describe("syncSrcCalendar", () => {
  it("weigert zonder maker en onthoudt de beheerder voor de cron", async () => {
    const tables: Record<string, Row[]> = { events: [], src_races: [], src_sync_state: [] };
    const admin = fakeAdmin(tables);

    const now = new Date("2026-09-30T18:00:00Z");
    const cron = await syncSrcCalendar(admin, { rows, now });
    expect(cron.error).toMatch(/beheer\/src/);
    expect(tables.events).toHaveLength(0);

    const manual = await syncSrcCalendar(admin, { rows, now, createdBy: "beheerder" });
    // Vier zondagen in oktober; alleen de eerste heeft al races.
    expect(manual).toMatchObject({
      error: null,
      racesInFeed: 2,
      sundaysCreated: 4,
      racesCreated: 2,
      rsvps: 0,
    });
    const final = tables.events.find((row) => row.src_sunday === "2026-10-25")!;
    expect(final).toMatchObject({ title: "SRC oktober · Finale", start_at: "2026-10-25T07:25:00.000Z" });

    const later = await syncSrcCalendar(admin, { rows, now });
    expect(later.error).toBeNull();
    expect(tables.src_sync_state[0]).toMatchObject({
      created_by: "beheerder",
      sync_error: null,
      races_in_feed: 2,
    });
  });
});

describe("RSVP's uit de zondagplanning", () => {
  it("zet beschikbaarheid om in een antwoord op de eigen race zodra die in de kalender komt", async () => {
    const now = new Date("2026-09-30T18:00:00Z");
    const tables: Record<string, Row[]> = {
      events: [],
      src_races: [],
      src_sync_state: [],
      team_event_availability: [],
      src_month_entries: [],
      event_rsvps: [],
    };
    const admin = fakeAdmin(tables);
    // Eerst alleen de zondagen, zonder races: de feed is nog leeg.
    await syncSrcCalendar(admin, { rows: [], now, createdBy: "beheerder" });
    const sunday = tables.events.find((row) => row.src_sunday === "2026-10-04")!;
    expect(tables.events.filter((row) => row.parent_event_id)).toHaveLength(0);

    const entry = (profile_id: string, race: string, team_id = "zwb") => ({
      month: "2026-10-01",
      profile_id,
      team_id,
      race,
    });
    tables.src_month_entries.push(
      entry("heer", "men"),
      entry("dame", "women"),
      entry("afwezig", "men"),
      entry("ander-team", "men", "ander"),
    );
    const available = (profile_id: string, status: string, team_id = "zwb") => ({
      event_id: sunday.id,
      team_id,
      profile_id,
      status,
    });
    tables.team_event_availability.push(
      available("heer", "available"),
      available("dame", "maybe"),
      available("afwezig", "unavailable"),
      // Beschikbaarheid voor een team waar het lid deze maand niet in zit.
      available("ander-team", "available", "zwb"),
    );

    // De races komen in de feed.
    const result = await syncSrcCalendar(admin, { rows, now });
    const men = tables.src_races.find((row) => row.gender === "men")!.event_id;
    const women = tables.src_races.find((row) => row.gender === "women")!.event_id;
    expect(result.racesCreated).toBe(2);

    const answers = Object.fromEntries(
      tables.event_rsvps.map((row) => [`${row.profile_id}@${row.event_id}`, row.status]),
    );
    expect(answers).toEqual({
      [`heer@${men}`]: "yes",
      [`dame@${women}`]: "maybe",
      [`afwezig@${men}`]: "no",
    });
    expect(result.rsvps).toBe(3);
  });
});
