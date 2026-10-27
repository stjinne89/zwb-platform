import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/net/safe-fetch", () => ({ assertSafeUrl: vi.fn(async (raw: string) => new URL(raw)) }));

import { parseClubLadderSummary } from "@/lib/club-ladder/summary";
import {
  clubLadderResultFromSummary,
  syncTeamResults,
  SyncSkip,
  type SourceRow,
} from "@/lib/team-results/sync";
import { ladderRow, ladderSection, summaryPage } from "../fixtures/club-ladder";

const stay = { cls: "staticMove" } as const;
const SUMMARY_HTML = summaryPage(
  [],
  [
    ladderSection("EMEA", [
      ladderRow(1, "Cryo-Gen Handlebar Heroes", ["WIN"], stay),
      ladderRow(2, "ZWBeasts", ["WIN"], stay),
      ladderRow(3, "Devil Dogs [DBR]", ["LOSS"], stay),
    ]),
    ladderSection("AMER", [ladderRow(1, "Some US Team", ["WIN"], stay)]),
  ],
);

function source(matchName: string, isGraveyard = false): SourceRow {
  return {
    id: `src-${matchName}`,
    team_id: `team-${matchName}`,
    provider: "club_ladder",
    source_url: "https://ladder.cycleracing.club/summary",
    match_name: matchName,
    teams: { name: matchName, type: "ladder", division: null, is_graveyard: isGraveyard },
  };
}

describe("clubLadderResultFromSummary", () => {
  const summary = parseClubLadderSummary(SUMMARY_HTML);

  it("haalt de positie uit de geparste stand", () => {
    const [result] = clubLadderResultFromSummary(source("ZWBeasts"), summary);
    expect(result.position).toBe(2);
    expect(result.totalTeams).toBe(3);
    expect(result.metadata).toMatchObject({ name: "ZWBeasts", region: "EMEA" });
  });

  it("negeert hoofdletters, spaties en clubtags in de naam", () => {
    const [result] = clubLadderResultFromSummary(source("devil dogs"), summary);
    expect(result.position).toBe(3);
  });

  it("slaat een team op het kerkhof over", () => {
    expect(() => clubLadderResultFromSummary(source("ZWBullets", true), summary)).toThrow(SyncSkip);
  });

  it("geeft een fout voor een actief team dat ontbreekt", () => {
    let error: unknown;
    try {
      clubLadderResultFromSummary(source("ZWBullets"), summary);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(SyncSkip);
  });
});

// Een minimale Supabase-nabootsing: elke keten is thenable, updates op
// team_result_sources worden vastgelegd.
function fakeSupabase(sources: SourceRow[]) {
  const updates: { id: string; values: Record<string, unknown> }[] = [];
  function builder(table: string) {
    const state: { op: string; values?: Record<string, unknown>; id?: string; single?: boolean } = { op: "select" };
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "ilike", "limit", "order", "in"]) chain[method] = () => chain;
    chain.insert = () => ((state.op = "insert"), chain);
    chain.update = (values: Record<string, unknown>) => ((state.op = "update"), (state.values = values), chain);
    chain.eq = (column: string, value: string) => (column === "id" && (state.id = value), chain);
    chain.maybeSingle = chain.single = () => ((state.single = true), chain);
    chain.then = (resolve: (value: unknown) => unknown) => {
      if (state.op === "update") {
        if (table === "team_result_sources" && state.id) updates.push({ id: state.id, values: state.values! });
        return resolve({ data: null, error: null });
      }
      if (state.op === "insert") return resolve({ data: { id: "new" }, error: null });
      if (table === "team_result_sources" && !state.single) return resolve({ data: sources, error: null });
      return resolve({ data: { id: `${table}-existing` }, error: null });
    };
    return chain;
  }
  return { client: { from: builder }, updates };
}

describe("syncTeamResults voor de Club Ladder", () => {
  const fetchMock = vi.fn(async () => new Response(SUMMARY_HTML, { status: 200 }));

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("LADDER_COOKIE", "connect.sid=test");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockClear();
  });

  it("stuurt LADDER_COOKIE mee", async () => {
    const { client } = fakeSupabase([source("ZWBeasts")]);
    await syncTeamResults(client);
    const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>;
    expect(headers.Cookie).toBe("connect.sid=test");
  });

  it("wist last_error niet bij een overgeslagen bron", async () => {
    const { client, updates } = fakeSupabase([source("ZWBullets", true)]);
    const summary = await syncTeamResults(client);
    expect(summary.sources[0].skipped).toBeTruthy();
    const update = updates.find((u) => u.id === "src-ZWBullets");
    expect(update?.values).not.toHaveProperty("last_error");
    expect(update?.values).toHaveProperty("last_synced_at");
  });

  it("legt een ontbrekend actief team vast als fout", async () => {
    const { client, updates } = fakeSupabase([source("ZWBullets")]);
    const summary = await syncTeamResults(client);
    expect(summary.ok).toBe(false);
    expect(updates.find((u) => u.id === "src-ZWBullets")?.values.last_error).toMatch(/ZWBullets/);
  });

  it("wist last_error na een gelukte sync", async () => {
    const { client, updates } = fakeSupabase([source("ZWBeasts")]);
    const summary = await syncTeamResults(client);
    expect(summary.insertedOrUpdated).toBe(1);
    expect(updates.find((u) => u.id === "src-ZWBeasts")?.values).toMatchObject({ last_error: null });
  });
});
