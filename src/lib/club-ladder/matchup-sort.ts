// Sorteren van de renners in de matchup, per kolom (2026-11-06).

import type { MatchupRider } from "./matchup";
import type { PowerDuration } from "./routes";

export type RiderSortKey = "name" | PowerDuration | "zrs" | "races";
export type RiderSort = { key: RiderSortKey; direction: "asc" | "desc" };

function sortValue(rider: MatchupRider, key: RiderSortKey): string | number | null {
  if (key === "name") return rider.name;
  if (key === "zrs") return rider.racingScore;
  if (key === "races") return rider.races;
  return rider.wkg?.[key] ?? null;
}

/** Zonder sortering de volgorde zoals gegeven (startplek); zonder waarde altijd onderaan. */
export function sortMatchupRiders(riders: MatchupRider[], sort: RiderSort | null): MatchupRider[] {
  if (!sort) return riders;
  const dir = sort.direction === "asc" ? 1 : -1;
  const byName = (a: MatchupRider, b: MatchupRider) => a.name.localeCompare(b.name, "nl");
  return [...riders].sort((a, b) => {
    const av = sortValue(a, sort.key);
    const bv = sortValue(b, sort.key);
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
