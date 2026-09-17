import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIVACY_STATEMENT_VERSION } from "@/lib/privacy";
import { deriveRider } from "@/lib/zwbgame/roster";
type Row = Record<string, unknown>;
let tables: Record<string, Row[]>;
let signedIn = true;
let failedTable = "";
function fake() {
  return {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: "own" } : null } }) },
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = [];
      const run = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => { filters.push((r) => r[key] === value); return builder; },
        in: (key: string, values: unknown[]) => { filters.push((r) => values.includes(r[key])); return builder; },
        single: async () => ({ data: run()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: run(), error: failedTable === table ? { message: "unavailable" } : null }).then(resolve),
      }; return builder;
    },
  };
}
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => fake() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fake() }));
const { loadGame, requireGameMember } = await import("@/lib/zwbgame/server");
beforeEach(() => {
  signedIn = true; failedTable = "";
  tables = {
    profiles: ["own", "other"].map((id) => ({ id, display_name: id, is_approved: true, privacy_accepted_version: PRIVACY_STATEMENT_VERSION, zwift_id: id })),
    roster_entries: [{ id: "roster-other", name: "other", zwift_id: "other", claimed_by: "other" }],
    zwbgame_preferences: [{ profile_id: "other", visible: true, data_consent_version: "2026-09-17", revision: "consent" }],
    zwbgame_riders: [{ profile_id: "other", consent_revision: "consent", attributes: deriveRider("other", "other", { ftp: 350, weight: 75 }, "manual", "revision"), expires_at: new Date(Date.now() + 86400000).toISOString() }],
    zwbgame_roster_exclusions: [],
  };
});
describe("ZWBgame server boundary", () => {
  it("rejects signed-out, unapproved and unsigned privacy accounts", async () => {
    signedIn = false; await expect(requireGameMember()).rejects.toThrow(/Log in/);
    signedIn = true; tables.profiles[0].is_approved = false; await expect(requireGameMember()).rejects.toThrow(/goedgekeurde/);
    tables.profiles[0].is_approved = true; tables.profiles[0].privacy_accepted_version = null;
    await expect(requireGameMember()).rejects.toThrow(/privacy/);
  });
  it("returns only game attributes with current consent", async () => {
    const data = await loadGame();
    expect(data.roster.find((r) => r.id === "other")?.source).toBe("manual");
    expect(JSON.stringify(data)).not.toMatch(/ftp|weight|api_key|provenance|privacy_accepted/);
    tables.zwbgame_preferences[0].data_consent_version = null;
    expect((await loadGame()).roster.find((r) => r.id === "other")?.source).toBe("basic");
  });
  it("excludes hidden riders including their roster aliases", async () => {
    tables.zwbgame_preferences[0].visible = false;
    expect((await loadGame()).roster.map((r) => r.id)).toEqual(["own"]);
  });
  it("fails closed if preferences or exclusions cannot be read", async () => {
    failedTable = "zwbgame_preferences";
    expect((await loadGame()).available).toBe(false);
    expect((await loadGame()).roster).toEqual([]);
  });
  it("rejects stale consent, expired profiles and disconnected Intervals profiles", async () => {
    tables.zwbgame_riders[0].consent_revision = "old";
    expect((await loadGame()).roster[1].source).toBe("basic");
    tables.zwbgame_riders[0].consent_revision = "consent";
    tables.zwbgame_riders[0].expires_at = "2000-01-01";
    expect((await loadGame()).roster[1].source).toBe("basic");
    tables.zwbgame_riders[0].expires_at = new Date(Date.now() + 86400000).toISOString();
    (tables.zwbgame_riders[0].attributes as Row).source = "intervals";
    expect((await loadGame()).roster[1].source).toBe("basic");
  });
});
