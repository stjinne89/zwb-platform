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
        gte: (key: string, value: string) => { filters.push((r) => String(r[key]) >= value); return builder; },
        lte: (key: string, value: string) => { filters.push((r) => String(r[key]) <= value); return builder; },
        single: async () => ({ data: run()[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
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
describe("ZWBgame platform power data", () => {
  it("gives every member qualities from profile FTP and weight, climbing on W/kg", async () => {
    Object.assign(tables.profiles[0], { ftp_watts: 250, weight_kg: "62.5" });
    tables.profiles.push({ id: "heavy", display_name: "heavy", is_approved: true, zwift_id: null, ftp_watts: 250, weight_kg: 95 });
    tables.zwbgame_riders = [];
    const data = await loadGame();
    const own = data.roster.find((r) => r.id === "own")!, heavy = data.roster.find((r) => r.id === "heavy")!;
    expect([own.source, heavy.source]).toEqual(["platform", "platform"]);
    expect(own.flat).toBe(heavy.flat);
    expect(own.climb).toBeGreaterThan(heavy.climb);
    expect(data.roster.find((r) => r.id === "other")!.source).toBe("basic");
    expect(JSON.stringify(data)).not.toMatch(/ftp|weight|watts/);
    expect(own.revision).not.toMatch(/250|62/);
  });
  it("prefers the synced Intervals curve and keeps an own game profile on top", async () => {
    Object.assign(tables.profiles[1], { ftp_watts: 200, weight_kg: 80 });
    tables.rider_power_profiles = [{ profile_id: "other", ftp_watts: 320, weight_kg: 70, watts_15s: 1100, watts_1m: 560, watts_5m: 380, watts_20m: 335 }];
    expect((await loadGame()).roster.find((r) => r.id === "other")!.source).toBe("manual");
    tables.zwbgame_riders = [];
    const fromCurve = (await loadGame()).roster.find((r) => r.id === "other")!;
    tables.rider_power_profiles = [];
    const fromProfile = (await loadGame()).roster.find((r) => r.id === "other")!;
    expect(fromCurve.source).toBe("platform");
    expect(fromCurve.flat).toBeGreaterThan(fromProfile.flat);
    expect(fromCurve.revision).not.toBe(fromProfile.revision);
  });
  it("keeps the game open and basic when power data is missing or unreadable", async () => {
    Object.assign(tables.profiles[0], { ftp_watts: 250, weight_kg: null });
    failedTable = "rider_power_profiles";
    const data = await loadGame();
    expect(data.available).toBe(true);
    expect(data.roster.find((r) => r.id === "own")!.source).toBe("basic");
  });
});
const lapProfile = (km: number) => {
  const distanceM = Array.from({ length: Math.round(km * 40) + 1 }, (_, i) => i * 25);
  return { distanceM, altitudeM: distanceM.map((d) => (d > 900 && d < 1800 ? (d - 900) * 0.05 : d >= 1800 ? Math.max(0, 45 - (d - 1800) * 0.04) : 0)) };
};
describe("ZWBgame routes and ladder team", () => {
  it("offers ladder routes with a synced profile, rolled out over their laps", async () => {
    tables.zwift_routes = [
      { slug: "hilly-route", name: "Hilly Route", world: "watopia", profile: lapProfile(9.193) },
      // A profile of another length belongs to another course and is left out.
      { slug: "flat-route", name: "Flat Route", world: "watopia", profile: lapProfile(5) },
    ];
    const { routes } = await loadGame();
    expect(routes.map((r) => r.id)).toEqual(["hilly-route"]);
    expect(routes[0].laps).toBe(2);
    expect(routes[0].length).toBeGreaterThan(18800);
    expect(routes[0].accents.some((a) => a.banner && a.name === "Zwift KOM")).toBe(true);
    expect(JSON.stringify(routes)).not.toMatch(/ftp|weight|watts/);
  });
  it("puts your visible Club Ladder teammates in your team", async () => {
    tables.profiles.push({ id: "hidden", display_name: "hidden", is_approved: true, zwift_id: null });
    tables.zwbgame_preferences.push({ profile_id: "hidden", visible: false, data_consent_version: null, revision: "r" });
    tables.teams = [{ id: "t-old", name: "ZWBandits", type: "ladder", is_graveyard: true }, { id: "t-live", name: "ZWBeasts", type: "ladder", is_graveyard: false }, { id: "t-zrl", name: "ZRL B", type: "zrl", is_graveyard: false }];
    tables.team_members = [
      { team_id: "t-old", profile_id: "own" }, { team_id: "t-live", profile_id: "own" },
      { team_id: "t-live", profile_id: "other" }, { team_id: "t-live", profile_id: "hidden" }, { team_id: "t-zrl", profile_id: "own" },
    ];
    expect((await loadGame()).team).toEqual({ name: "ZWBeasts", memberIds: ["other"] });
    tables.team_members = [];
    expect((await loadGame()).team).toBeNull();
  });
});
describe("ZWBgame ZRL team and race", () => {
  const soon = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  beforeEach(() => {
    tables.teams = [
      { id: "b", name: "ZRL B", type: "zrl", is_graveyard: false, parent_team_id: null },
      { id: "b1", name: "ZRL B1", type: "zrl", is_graveyard: false, parent_team_id: "b" },
    ];
    tables.team_members = [{ team_id: "b", profile_id: "own" }, { team_id: "b1", profile_id: "own" }, { team_id: "b1", profile_id: "other" }];
    tables.zwift_routes = [{ route_id: 2737483381, slug: "hilly-route", name: "Hilly Route", world: "watopia", profile: lapProfile(9.193) }];
  });
  it("rides with your racing subteam, not its umbrella", async () => {
    expect((await loadGame()).zrlTeam).toEqual({ name: "ZRL B1", memberIds: ["other"] });
  });
  it("offers your team's next ZRL race from the calendar with its route and laps", async () => {
    tables.events = [
      { id: "e0", type: "zrl", title: "ZRL 2026/27 · R1 · W1 · ZRL A — Race of Truth", start_at: soon(1), team_id: "a", zwift_route_id: 2737483381, laps: 1 },
      { id: "e1", type: "zrl", title: "ZRL 2026/27 · R1 · W2 · ZRL B1", start_at: soon(6), team_id: "b1", zwift_route_id: 2737483381, laps: 3 },
      { id: "e2", type: "zrl", title: "Te ver weg", start_at: soon(30), team_id: "b1", zwift_route_id: 2737483381, laps: 1 },
    ];
    const { zrlRace } = await loadGame();
    expect(zrlRace?.title).toBe("ZRL 2026/27 · R1 · W2 · ZRL B1");
    expect(zrlRace?.route.id).toBe("zrl:hilly-route:3");
    expect(zrlRace?.route.laps).toBe(3);
    expect(zrlRace?.format).toBeNull();
    tables.events = [tables.events[0]];
    expect((await loadGame()).zrlRace?.format).toBe("rot");
  });
  it("has no ZRL race without a route or a synced profile", async () => {
    tables.events = [{ id: "e1", type: "zrl", title: "ZRL", start_at: soon(2), team_id: "b1", zwift_route_id: null, laps: 1 }];
    expect((await loadGame()).zrlRace).toBeNull();
    tables.events = [{ id: "e1", type: "zrl", title: "ZRL", start_at: soon(2), team_id: "b1", zwift_route_id: 999, laps: 1 }];
    expect((await loadGame()).zrlRace).toBeNull();
  });
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
