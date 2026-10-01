import { describe, expect, it } from "vitest";
import { ensureSrcMonthEntry, SRC_DEFAULT_TEAM_NAME } from "@/lib/src/auto-join";
import { fakeAdmin, type Row } from "./src-fake-admin";

const month = "2026-10-01";

describe("ensureSrcMonthEntry", () => {
  it("maakt zonder SRC-team een standaardteam en schrijft het lid in", async () => {
    const tables: Record<string, Row[]> = {
      teams: [{ id: "zrl", type: "zrl", is_graveyard: false }],
      profiles: [{ id: "lid", sex: null }],
      src_month_entries: [],
      src_results: [],
    };
    const result = await ensureSrcMonthEntry(fakeAdmin(tables), "lid", month);
    const team = tables.teams.find((row) => row.type === "src")!;
    expect(team.name).toBe(SRC_DEFAULT_TEAM_NAME);
    expect(result).toEqual({ ok: true, joined: true, entry: { team_id: team.id, race: "men" } });
    expect(tables.src_month_entries).toEqual([
      expect.objectContaining({ month, profile_id: "lid", team_id: team.id, race: "men", category: null }),
    ]);
  });

  it("gebruikt het ene bestaande team, dames volgens het profiel en de laatst gereden categorie", async () => {
    const tables: Record<string, Row[]> = {
      teams: [
        { id: "src-1", type: "src", is_graveyard: false },
        { id: "oud", type: "src", is_graveyard: true },
      ],
      profiles: [{ id: "lid", sex: "vrouw" }],
      src_month_entries: [],
      src_results: [
        { race_event_id: "r-sep6", profile_id: "lid", category: 5 },
        { race_event_id: "r-sep27", profile_id: "lid", category: 4 },
      ],
      src_races: [
        { event_id: "r-sep6", sunday: "2026-09-06" },
        { event_id: "r-sep27", sunday: "2026-09-27" },
      ],
    };
    const result = await ensureSrcMonthEntry(fakeAdmin(tables), "lid", month);
    expect(result).toMatchObject({ ok: true, joined: true, entry: { team_id: "src-1", race: "women" } });
    expect(tables.src_month_entries[0]).toMatchObject({ category: 4 });
    expect(tables.teams).toHaveLength(2);
  });

  it("laat een bestaande inschrijving staan", async () => {
    const tables: Record<string, Row[]> = {
      teams: [],
      src_month_entries: [{ month, profile_id: "lid", team_id: "t", race: "women" }],
    };
    const result = await ensureSrcMonthEntry(fakeAdmin(tables), "lid", month);
    expect(result).toEqual({ ok: true, joined: false, entry: expect.objectContaining({ team_id: "t" }) });
    expect(tables.teams).toHaveLength(0);
  });

  it("vraagt om een keuze als er meer SRC-teams zijn", async () => {
    const tables: Record<string, Row[]> = {
      teams: [
        { id: "a", type: "src", is_graveyard: false },
        { id: "b", type: "src", is_graveyard: false },
      ],
      src_month_entries: [],
    };
    const result = await ensureSrcMonthEntry(fakeAdmin(tables), "lid", month);
    expect(result).toEqual({ ok: false, error: "Kies eerst je team op Sunday Race Club." });
    expect(tables.src_month_entries).toHaveLength(0);
  });
});
