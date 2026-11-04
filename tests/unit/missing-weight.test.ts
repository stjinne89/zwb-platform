import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWeightMissing, weightKnown } from "@/lib/teams/missing-weight";
import { syncPowerProfileFor } from "@/lib/teams/power-sync";

type Tables = {
  profiles?: { weight_kg: number | string | null } | null;
  rider_power_profiles?: { weight_kg: number | string | null } | null;
  team_members?: number;
  intervals_connections?: null;
};

// Genoeg van de querybouwer voor maybeSingle() en een head-count.
function fakeClient(tables: Tables) {
  return {
    from(table: keyof Tables) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: tables[table] ?? null }),
        then: (resolve: (value: { count: number }) => void) =>
          resolve({ count: (tables.team_members as number | undefined) ?? 0 }),
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("weightKnown", () => {
  it("kent een gewicht uit het profiel of uit het powerprofiel", () => {
    expect(weightKnown(62.5, null)).toBe(true);
    expect(weightKnown(null, "58")).toBe(true);
  });

  it("telt leeg, nul en onzin niet als gewicht", () => {
    expect(weightKnown(null, null)).toBe(false);
    expect(weightKnown(0, undefined)).toBe(false);
    expect(weightKnown("", "abc")).toBe(false);
  });
});

describe("loadWeightMissing", () => {
  it("meldt een teamlid zonder gewicht in profiel en powerprofiel", async () => {
    const client = fakeClient({
      profiles: { weight_kg: null },
      rider_power_profiles: { weight_kg: null },
      team_members: 2,
    });
    expect(await loadWeightMissing(client, "p1", { inTeam: true })).toBe(true);
  });

  it("meldt niets als intervals.icu het gewicht wel kent", async () => {
    const client = fakeClient({
      profiles: { weight_kg: null },
      rider_power_profiles: { weight_kg: 61 },
      team_members: 1,
    });
    expect(await loadWeightMissing(client, "p1", { inTeam: true })).toBe(false);
  });

  it("meldt niets aan wie in geen enkel team zit", async () => {
    const client = fakeClient({ profiles: { weight_kg: null }, team_members: 0 });
    expect(await loadWeightMissing(client, "p1", { inTeam: true })).toBe(false);
  });

  it("meldt zonder teamcheck ook zonder powerprofiel", async () => {
    const client = fakeClient({ profiles: { weight_kg: null } });
    expect(await loadWeightMissing(client, "p1")).toBe(true);
  });

  it("meldt niets zonder leesbare profielrij", async () => {
    expect(await loadWeightMissing(fakeClient({}), "p1")).toBe(false);
  });
});

describe("syncPowerProfileFor", () => {
  it("doet niets zonder intervals-koppeling", async () => {
    expect(await syncPowerProfileFor(fakeClient({ intervals_connections: null }), "p1")).toBeNull();
  });
});
