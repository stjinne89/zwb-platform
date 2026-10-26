import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeAdmin, type Row } from "./src-fake-admin";

const replans: string[] = [];

vi.mock("@/lib/training/events", () => ({
  syncEventWorkout: async () => ({ inserted: true, removed: false }),
}));
vi.mock("@/lib/training/replan", () => ({
  requestReplan: async (_admin: unknown, profileId: string) => {
    replans.push(profileId);
    return null;
  },
}));

const { followSrcProfileSex } = await import("@/lib/src/availability");

// Zondagen 18 en 25 oktober en 1 november, elk met een heren- en damesrace.
function calendar(): Record<string, Row[]> {
  const events: Row[] = [];
  const races: Row[] = [];
  for (const sunday of ["2026-10-18", "2026-10-25", "2026-11-01"]) {
    events.push({ id: `z-${sunday}`, src_sunday: sunday, parent_event_id: null });
    for (const gender of ["men", "women"]) {
      const id = `r-${sunday}-${gender}`;
      events.push({ id, src_sunday: null, parent_event_id: `z-${sunday}` });
      races.push({ event_id: id, sunday, gender });
    }
  }
  return { events, src_races: races };
}

describe("followSrcProfileSex", () => {
  beforeEach(() => {
    replans.length = 0;
  });

  it("verplaatst deze en komende maand naar dames, met het antwoord op komende zondagen", async () => {
    const tables: Record<string, Row[]> = {
      ...calendar(),
      src_month_entries: [
        { month: "2026-09-01", profile_id: "lid", team_id: "t", race: "men" },
        { month: "2026-10-01", profile_id: "lid", team_id: "t", race: "men" },
        { month: "2026-11-01", profile_id: "lid", team_id: "t", race: "men" },
        { month: "2026-11-01", profile_id: "ander", team_id: "t", race: "men" },
      ],
      team_event_availability: [
        { event_id: "z-2026-10-18", team_id: "t", profile_id: "lid", status: "available" },
        { event_id: "z-2026-10-25", team_id: "t", profile_id: "lid", status: "maybe" },
        { event_id: "z-2026-11-01", team_id: "t", profile_id: "lid", status: "available" },
      ],
      event_rsvps: [
        { event_id: "r-2026-10-18-men", profile_id: "lid", status: "yes" },
        { event_id: "r-2026-10-25-men", profile_id: "lid", status: "maybe" },
        { event_id: "r-2026-11-01-men", profile_id: "lid", status: "yes" },
      ],
    };

    const moved = await followSrcProfileSex(fakeAdmin(tables), "lid", "vrouw", "2026-10-19");

    expect(moved).toBe(2);
    const raceOf = (month: string, profile = "lid") =>
      tables.src_month_entries.find((row) => row.month === month && row.profile_id === profile)?.race;
    expect(raceOf("2026-09-01")).toBe("men");
    expect(raceOf("2026-10-01")).toBe("women");
    expect(raceOf("2026-11-01")).toBe("women");
    expect(raceOf("2026-11-01", "ander")).toBe("men");

    const rsvp = (eventId: string) =>
      tables.event_rsvps.find((row) => row.event_id === eventId && row.profile_id === "lid")?.status;
    // Gereden zondag blijft zoals hij was.
    expect(rsvp("r-2026-10-18-men")).toBe("yes");
    expect(rsvp("r-2026-10-18-women")).toBeUndefined();
    expect(rsvp("r-2026-10-25-men")).toBe("no");
    expect(rsvp("r-2026-10-25-women")).toBe("maybe");
    expect(rsvp("r-2026-11-01-men")).toBe("no");
    expect(rsvp("r-2026-11-01-women")).toBe("yes");
    expect(replans).toEqual(["lid"]);
  });

  it("laat de inschrijving staan bij 'zeg ik liever niet' of als de race al klopt", async () => {
    const tables: Record<string, Row[]> = {
      ...calendar(),
      src_month_entries: [{ month: "2026-11-01", profile_id: "lid", team_id: "t", race: "men" }],
    };
    expect(await followSrcProfileSex(fakeAdmin(tables), "lid", "zeg_ik_liever_niet", "2026-10-19")).toBe(0);
    expect(await followSrcProfileSex(fakeAdmin(tables), "lid", null, "2026-10-19")).toBe(0);
    expect(await followSrcProfileSex(fakeAdmin(tables), "lid", "man", "2026-10-19")).toBe(0);
    expect(tables.src_month_entries[0].race).toBe("men");
    expect(replans).toEqual([]);
  });
});
