import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadLadderRouteProfile } from "@/lib/club-ladder/route-profile";

/** Nep-client die één rij uit zwift_routes teruggeeft. */
function client(profile: { distanceM: number[]; altitudeM: number[] } | null) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: profile ? { profile } : null, error: null }),
  };
  return { from: () => query };
}

/** Castle Crit is 3,47 km per ronde: een heuvel van 20 m halverwege. */
function castleCritProfile(lengthM = 3450) {
  const distanceM: number[] = [];
  const altitudeM: number[] = [];
  for (let d = 0; d <= lengthM; d += 25) {
    distanceM.push(d);
    altitudeM.push(180 + 20 * Math.sin((Math.PI * d) / lengthM));
  }
  return { distanceM, altitudeM };
}

describe("hoogteprofiel van een ladderparcours", () => {
  it("rolt het profiel uit over lead-in en het kleinste toegestane rondental", async () => {
    const profile = await loadLadderRouteProfile(client(castleCritProfile()), "castle-crit");
    expect(profile?.laps).toBe(4);
    expect(profile?.totalKm).toBeGreaterThan(15);
    expect(profile?.totalKm).toBeLessThan(16);
    expect(profile?.segments.length).toBeGreaterThan(100);
  });

  it("geeft niets zonder profiel of met een profiel van een andere lengte", async () => {
    expect(await loadLadderRouteProfile(client(null), "castle-crit")).toBeNull();
    expect(await loadLadderRouteProfile(client(castleCritProfile(8000)), "castle-crit")).toBeNull();
  });

  it("geeft niets voor een route buiten de ladderregel", async () => {
    expect(await loadLadderRouteProfile(client(castleCritProfile()), "castle-crit-run")).toBeNull();
  });
});
