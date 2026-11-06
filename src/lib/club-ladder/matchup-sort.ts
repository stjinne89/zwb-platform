// Sorteren van de renners in de matchup, per kolom, in watt of W/kg (2026-11-06).
// Licht gehouden: dit gaat mee naar de browser.

import type { MatchupRider } from "./matchup";
import { DURATIONS, type PowerWkg } from "./team-power";
import type { PowerDuration } from "./routes";

export type RiderSortKey = "name" | PowerDuration | "zrs" | "races";
export type RiderSort = { key: RiderSortKey; direction: "asc" | "desc" };
/** Watt of W/kg, zoals de schakelaar in de matchup. */
export type MatchupUnit = "w" | "wkg";

/** W/kg maal gewicht per duur; null zonder gewicht. */
export function riderWatts(wkg: PowerWkg | null, weightKg: number | null): PowerWkg | null {
  if (!wkg || weightKg == null || !(weightKg >= 30 && weightKg <= 200)) return null;
  const out: PowerWkg = { s15: null, m1: null, m5: null, m20: null };
  for (const d of DURATIONS) out[d] = wkg[d] == null ? null : wkg[d]! * weightKg;
  return out;
}

function sortValue(rider: MatchupRider, key: RiderSortKey, unit: MatchupUnit): string | number | null {
  if (key === "name") return rider.name;
  if (key === "zrs") return rider.racingScore;
  if (key === "races") return rider.races;
  return (unit === "w" ? riderWatts(rider.wkg, rider.weightKg) : rider.wkg)?.[key] ?? null;
}

/** Zonder sortering de volgorde zoals gegeven (startplek); zonder waarde altijd onderaan. */
export function sortMatchupRiders(riders: MatchupRider[], sort: RiderSort | null, unit: MatchupUnit = "wkg"): MatchupRider[] {
  if (!sort) return riders;
  const dir = sort.direction === "asc" ? 1 : -1;
  const byName = (a: MatchupRider, b: MatchupRider) => a.name.localeCompare(b.name, "nl");
  return [...riders].sort((a, b) => {
    const av = sortValue(a, sort.key, unit);
    const bv = sortValue(b, sort.key, unit);
    if (av == null || bv == null) return av == null && bv == null ? byName(a, b) : av == null ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") return av === bv ? byName(a, b) : (av - bv) * dir;
    return String(av).localeCompare(String(bv), "nl") * dir;
  });
}

/** Eerste klik: namen oplopend, getallen hoogste eerst; nog een klik draait om. */
export function nextRiderSort(current: RiderSort | null, key: RiderSortKey): RiderSort {
  if (current?.key === key) return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  return { key, direction: key === "name" ? "asc" : "desc" };
}
