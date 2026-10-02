import { describe, expect, it } from "vitest";
import list from "../fixtures/src/results-list.json";
import sample from "../fixtures/src/results-sample.json";
import {
  findSrcResultEvent,
  formatRaceTime,
  oldestListDay,
  parseSrcResults,
  srcRelevantResults,
  srcRiderProgress,
  srcTeamStandings,
  type SrcApiResultRow,
  type SrcListEvent,
} from "@/lib/src/results";
import { srcRaceNeedsResults, syncSrcResults, type SrcPost } from "@/lib/src/results-sync";
import { fakeAdmin, type Row } from "./src-fake-admin";

const events = list.data.data as SrcListEvent[];
const rows = sample.data.resultData as SrcApiResultRow[];

describe("findSrcResultEvent (lijst van 2026-09-30)", () => {
  it("vindt de race op zondag en geslacht, en slaat andere races over", () => {
    expect(findSrcResultEvent(events, "2026-09-27", "men")).toEqual({
      eventId: "62b8dfe8-18db-4a8d-a019-7aa9072edbcb",
      dayId: "0167ebda-df9c-4031-a211-de6a84204920",
      status: "official",
    });
    expect(findSrcResultEvent(events, "2026-09-20", "women")?.eventId).toBe(
      "cecd754f-3017-455d-8b9d-66b65c3320d5",
    );
    expect(findSrcResultEvent(events, "2026-10-04", "men")).toBeNull();
    expect(oldestListDay(events)).toBe("2026-09-20");
  });
});

describe("parseSrcResults", () => {
  const parsed = parseSrcResults(rows);

  it("behandelt Individual als geen team", () => {
    const solo = parsed.find((row) => row.name === "Renner 3")!;
    expect(solo.teamId).toBeNull();
    expect(solo.teamName).toBeNull();
    expect(parsed.find((row) => row.name === "Renner 4")?.teamName).toBe("ZWB TESTTEAM");
  });

  it("geeft een plaats binnen de eigen categorie", () => {
    // MyWhoosh zegt 51 (over alle categorieën); in cat 3 is het de eerste.
    expect(parsed.find((row) => row.name === "Renner 3")?.categoryRank).toBe(1);
    expect(parsed.find((row) => row.name === "Renner 4")?.categoryRank).toBe(2);
    expect(parsed.find((row) => row.name === "Renner 1")?.categoryRank).toBe(1);
  });
});

describe("srcTeamStandings", () => {
  it("telt per categorie de beste drie tijden, en alleen teams met drie finishers", () => {
    expect(srcTeamStandings(parseSrcResults(rows))).toEqual([
      // Cat 1: TEAM ECHO heeft er in de steekproef maar twee.
      {
        category: 3,
        teamId: "zwb-team",
        teamName: "ZWB TESTTEAM",
        timeMs: 4902301 + 4902692 + 4906737,
        rank: 1,
        finishers: 5,
      },
      {
        category: 3,
        teamId: "team-bravo",
        teamName: "TEAM BRAVO",
        timeMs: 4906593 + 4911335 + 4922943,
        rank: 2,
        finishers: 4,
      },
      {
        category: 3,
        teamId: "team-charlie",
        teamName: "TEAM CHARLIE",
        timeMs: 5465600 + 5607447 + 6422202,
        rank: 3,
        finishers: 3,
      },
    ]);
  });

  it("rekent zoals MyWhoosh: de winnaar van de finale in 3:50:55.585", () => {
    // THE FINAL BOSSES, 27-09-2026: 1:16:51.324 + 1:17:01.900 + 1:17:02.361.
    const team = srcTeamStandings(
      parseSrcResults(
        [4611324, 4621900, 4622361].map((finishedTime, index) => ({
          userId: `u${index}`,
          userFullName: `R${index}`,
          teamId: "boss",
          teamName: "THE FINAL BOSSES",
          categoryId: 1,
          finishedTime,
        })),
      ),
    );
    expect(team[0].timeMs).toBe(3 * 3600_000 + 50 * 60_000 + 55_585);
  });
});

describe("srcRelevantResults", () => {
  const parsed = parseSrcResults(rows);
  const profiles = [
    // Gekoppeld: rijdt als Individual, maar is lid.
    { id: "p-linked", display_name: "Iemand Anders", mywhoosh_id: "00000000-0000-4000-8000-000000000003" },
    // Unieke naam: wordt voorstel.
    { id: "p-name", display_name: "Renner 8", mywhoosh_id: null },
    // Twee leden met dezelfde naam: geen voorstel.
    { id: "p-dup-1", display_name: "Renner 13", mywhoosh_id: null },
    { id: "p-dup-2", display_name: "renner 13", mywhoosh_id: null },
    // Al aan een ander MyWhoosh-account gekoppeld: geen voorstel.
    { id: "p-other", display_name: "Renner 10", mywhoosh_id: "ffffffff-0000-4000-8000-000000000000" },
  ];
  const stored = srcRelevantResults(parsed, ["zwb testteam"], profiles);

  it("bewaart ZWB-team, gekoppelde leden en unieke naamgenoten, verder niemand", () => {
    expect(stored.map((row) => row.name).sort()).toEqual(
      ["Renner 14", "Renner 16", "Renner 3", "Renner 4", "Renner 5", "Renner 8", "Renner 9"].sort(),
    );
  });

  it("koppelt alleen op id; een naam is een voorstel", () => {
    expect(stored.find((row) => row.name === "Renner 3")).toMatchObject({
      profileId: "p-linked",
      suggestedProfileId: null,
    });
    expect(stored.find((row) => row.name === "Renner 8")).toMatchObject({
      profileId: null,
      suggestedProfileId: "p-name",
    });
    expect(stored.find((row) => row.name === "Renner 4")).toMatchObject({
      profileId: null,
      suggestedProfileId: null,
    });
  });
});

describe("srcRiderProgress", () => {
  it("telt uitgereden kwalificaties van de maand en onthoudt de laatste categorie", () => {
    const progress = srcRiderProgress(
      [
        { profileId: "a", sunday: "2026-09-27", isFinal: true, category: 4, finishedMs: 5_000_000 },
        { profileId: "a", sunday: "2026-10-04", isFinal: false, category: 3, finishedMs: 4_900_000 },
        { profileId: "a", sunday: "2026-10-11", isFinal: false, category: 3, finishedMs: "4800000" },
        { profileId: "b", sunday: "2026-10-04", isFinal: false, category: 5, finishedMs: null },
      ],
      "2026-10-01",
    );
    expect(progress.get("a")).toEqual({ qualifiers: 2, finalReady: true, lastCategory: 3 });
    expect(progress.get("b")).toEqual({ qualifiers: 0, finalReady: false, lastCategory: null });
  });
});

describe("srcRaceNeedsResults", () => {
  const start = "2026-10-04T09:45:00Z";
  const at = (iso: string) => new Date(iso);

  it("wacht tot twee uur na de start, en stopt bij officieel of na twee weken", () => {
    const fresh = { results_status: null, results_synced_at: null };
    expect(srcRaceNeedsResults(fresh, start, at("2026-10-04T11:30:00Z"))).toBe(false);
    expect(srcRaceNeedsResults(fresh, start, at("2026-10-04T11:45:00Z"))).toBe(true);
    expect(
      srcRaceNeedsResults({ ...fresh, results_status: "official" }, start, at("2026-10-05T12:00:00Z")),
    ).toBe(false);
    expect(srcRaceNeedsResults(fresh, start, at("2026-10-19T12:00:00Z"))).toBe(false);
  });

  it("haalt een voorlopige uitslag hooguit eens per drie uur opnieuw op", () => {
    const synced = { results_status: "un-official", results_synced_at: "2026-10-04T12:00:00Z" };
    expect(srcRaceNeedsResults(synced, start, at("2026-10-04T14:59:00Z"))).toBe(false);
    expect(srcRaceNeedsResults(synced, start, at("2026-10-04T15:00:00Z"))).toBe(true);
  });
});

describe("syncSrcResults", () => {
  it("zoekt de race in de lijst, bladert zo nodig, en vervangt de uitslag in één aanroep", async () => {
    const tables: Record<string, Row[]> = {
      src_races: [
        {
          event_id: "men-27",
          sunday: "2026-09-27",
          gender: "men",
          results_status: null,
          results_synced_at: null,
          events: { start_at: "2026-09-27T09:45:00.000Z" },
        },
      ],
      teams: [{ type: "src", mywhoosh_team_name: "ZWB TESTTEAM" }],
      profiles: [{ id: "p-name", display_name: "Renner 8", mywhoosh_id: null, is_approved: true }],
    };
    const calls: string[] = [];
    const post: SrcPost = async (path, body) => {
      calls.push(`${path}:${JSON.stringify(body)}`);
      if (path === "src-events-list") {
        // Twee per pagina, zoals MyWhoosh.
        const page = Number(body.page);
        return { data: { data: events.slice((page - 1) * 2, page * 2) } };
      }
      return sample;
    };

    const result = await syncSrcResults(fakeAdmin(tables), {
      now: new Date("2026-09-30T18:00:00Z"),
      post,
    });
    expect(result).toEqual({ synced: 1, pending: 0, notes: [] });
    // De finale staat op pagina 1: niet verder bladeren.
    expect(calls.filter((call) => call.startsWith("src-events-list"))).toHaveLength(1);

    const [replace] = tables["rpc:src_replace_results"] as Array<{
      p_event_id: string;
      p_result_event_id: string;
      p_status: string;
      p_rows: Array<{ name: string; profile_id: string | null; suggested_profile_id: string | null }>;
      p_teams: Array<{ team_name: string; rank: number }>;
    }>;
    expect(replace.p_event_id).toBe("men-27");
    expect(replace.p_result_event_id).toBe("62b8dfe8-18db-4a8d-a019-7aa9072edbcb");
    expect(replace.p_status).toBe("official");
    expect(replace.p_rows).toHaveLength(6); // vijf ZWB-teamleden en één naamgenoot
    expect(replace.p_rows.find((row) => row.name === "Renner 8")?.suggested_profile_id).toBe(
      "p-name",
    );
    expect(replace.p_teams.map((team) => `${team.rank} ${team.team_name}`)).toEqual([
      "1 ZWB TESTTEAM",
      "2 TEAM BRAVO",
      "3 TEAM CHARLIE",
    ]);
  });

  it("noteert een race die MyWhoosh nog niet heeft, zonder fout", async () => {
    const tables: Record<string, Row[]> = {
      src_races: [
        {
          event_id: "men-04",
          sunday: "2026-10-04",
          gender: "men",
          results_status: null,
          results_synced_at: null,
          events: { start_at: "2026-10-04T09:45:00.000Z" },
        },
      ],
    };
    const post: SrcPost = async (_path, body) =>
      Number(body.page) === 1 ? { data: { data: events.slice(0, 2) } } : { data: { data: [] } };
    const result = await syncSrcResults(fakeAdmin(tables), {
      now: new Date("2026-10-04T12:00:00Z"),
      post,
    });
    expect(result.synced).toBe(0);
    expect(result.notes).toEqual(["Nog geen uitslag voor 2026-10-04 (men)."]);
    expect(tables.src_races[0].results_synced_at).toBe("2026-10-04T12:00:00.000Z");
    expect(tables.src_races[0].results_error).toBeNull();
  });
});

describe("formatRaceTime", () => {
  it("schrijft uren, minuten en seconden", () => {
    expect(formatRaceTime(4608437)).toBe("1:16:48");
    expect(formatRaceTime(75_000)).toBe("1:15");
    expect(formatRaceTime(null)).toBe("—");
  });
});
