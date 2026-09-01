import { describe, expect, it } from "vitest";
import { syncableRoutes } from "@/lib/events/zwift-route-sync";

/**
 * De sync zelf praat met Strava en met de database, dus die draait hier niet.
 * Wat wél te testen is: de volgorde waarin routes aan de beurt komen. Dat was de
 * bug — bij "alles opnieuw" stond `todo` in vaste volgorde, dus elke klik
 * herhaalde dezelfde eerste vijftien routes en kwam de sweep nooit verder.
 *
 * De sorteerregel staat hieronder nagebouwd, zodat de eigenschap vastligt: de
 * langst niet-ververste eerst, nooit-opgehaald bovenaan.
 */
function order<T extends { id: number }>(
  candidates: T[],
  syncedAt: Map<number, string | null>,
): T[] {
  return [...candidates].sort((a, b) => {
    const left = syncedAt.get(a.id) ?? "";
    const right = syncedAt.get(b.id) ?? "";
    return left.localeCompare(right);
  });
}

const CANDIDATES = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

describe("volgorde van de routesync", () => {
  it("zet nooit-opgehaalde routes vooraan", () => {
    const synced = new Map<number, string | null>([
      [1, "2026-09-01T10:00:00Z"],
      [2, null],
      [3, "2026-09-01T09:00:00Z"],
    ]);
    // 4 staat niet in de tabel, 2 wel maar zonder tijdstempel: allebei nieuw.
    expect(order(CANDIDATES, synced).slice(0, 2).map((r) => r.id).sort()).toEqual([2, 4]);
  });

  it("pakt daarna de langst niet-ververste", () => {
    const synced = new Map<number, string | null>([
      [1, "2026-09-01T12:00:00Z"],
      [2, "2026-09-01T08:00:00Z"],
      [3, "2026-09-01T10:00:00Z"],
      [4, "2026-09-01T09:00:00Z"],
    ]);
    expect(order(CANDIDATES, synced).map((r) => r.id)).toEqual([2, 4, 3, 1]);
  });

  it("schiet op bij herhaald verversen in plaats van dezelfde kop te herhalen", () => {
    // Simuleer drie klikken van elk twee routes: iedereen komt aan de beurt.
    const synced = new Map<number, string | null>(
      CANDIDATES.map((r) => [r.id, `2026-09-01T08:0${r.id}:00Z`]),
    );
    const seen: number[] = [];
    for (let click = 0; click < 2; click++) {
      const batch = order(CANDIDATES, synced).slice(0, 2);
      for (const route of batch) {
        seen.push(route.id);
        synced.set(route.id, `2026-09-01T1${click}:00:00Z`);
      }
    }
    expect([...new Set(seen)].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("syncableRoutes", () => {
  it("levert alleen fietsroutes met een Strava-segment", () => {
    const list = syncableRoutes();
    expect(list.length).toBeGreaterThan(200);
    expect(list.every((route) => route.stravaSegmentId)).toBe(true);
    expect(list.every((route) => route.sports.includes("cycling"))).toBe(true);
  });
});
