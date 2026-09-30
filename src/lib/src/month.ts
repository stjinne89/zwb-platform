// De SRC-maand (migr. 0201): welke zondagen erin vallen, wanneer een renner niet
// meer van team mag wisselen, en of er per zondag genoeg renners in één
// categorie zijn voor een team. Puur: geen netwerk, geen database.

import type { SrcGender } from "@/lib/src/feed";

/** Minimaal en maximaal aantal renners in een SRC-team (roadbook V7.0.7). */
export const SRC_TEAM_MIN = 3;
export const SRC_TEAM_MAX = 5;

/** De maand van een datum of tijdstip, als eerste dag: "2026-10-01". */
export function srcMonthKey(value: string | Date) {
  const iso = typeof value === "string" ? value : value.toISOString();
  return `${iso.slice(0, 7)}-01`;
}

/** De maand erna: "2026-12-01" → "2027-01-01". */
export function nextSrcMonth(month: string) {
  const date = new Date(`${month}T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return srcMonthKey(date);
}

export function isSrcMonthKey(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])-01$/.test(value);
}

export type SrcSundaySlot = { sunday: string; round: number | null; isFinal: boolean };

/**
 * Alle zondagen van een maand. De laatste is de finale, de andere zijn
 * kwalificatie 1 tot en met 3 of 4. MyWhoosh houdt zich daar tot nu toe aan; wat
 * de feed later zegt, gaat voor.
 */
export function srcMonthSundays(month: string): SrcSundaySlot[] {
  const date = new Date(`${month}T12:00:00Z`);
  const days: string[] = [];
  while (srcMonthKey(date) === month) {
    if (date.getUTCDay() === 0) days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days.map((sunday, index) => {
    const isFinal = index === days.length - 1;
    return { sunday, round: isFinal ? null : index + 1, isFinal };
  });
}

/**
 * Wisselen van team mag tot de eerste race van de maand begint. Daarna niet
 * meer: bij MyWhoosh telt je team de hele maand (roadbook: "a rider cannot
 * switch teams mid-month"). Instappen mag wel altijd.
 */
export function srcTeamLocked(firstRaceStart: string | null, now: Date) {
  if (!firstRaceStart) return false;
  return new Date(firstRaceStart).getTime() <= now.getTime();
}

export type SrcAvailabilityStatus = "available" | "maybe" | "unavailable";

export type SrcPlanRider = {
  profileId: string;
  teamId: string;
  race: SrcGender;
  category: number | null;
};

export type SrcCoverage = {
  teamId: string;
  race: SrcGender;
  /** null: categorie nog niet opgegeven. */
  category: number | null;
  available: number;
  maybe: number;
  /** Genoeg zekere renners voor een teamuitslag. */
  enough: boolean;
};

/**
 * Per team, race en categorie: hoeveel renners er op een zondag kunnen. Een
 * team telt alleen mee in een categorie met minstens drie renners.
 */
export function srcSundayCoverage(
  riders: SrcPlanRider[],
  statusOf: (profileId: string) => SrcAvailabilityStatus | null,
): SrcCoverage[] {
  const groups = new Map<string, SrcCoverage>();
  for (const rider of riders) {
    const status = statusOf(rider.profileId);
    if (status !== "available" && status !== "maybe") continue;
    const key = `${rider.teamId}|${rider.race}|${rider.category ?? "?"}`;
    const group = groups.get(key) ?? {
      teamId: rider.teamId,
      race: rider.race,
      category: rider.category,
      available: 0,
      maybe: 0,
      enough: false,
    };
    if (status === "available") group.available += 1;
    else group.maybe += 1;
    group.enough = group.category !== null && group.available >= SRC_TEAM_MIN;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      a.teamId.localeCompare(b.teamId) ||
      a.race.localeCompare(b.race) ||
      (a.category ?? 99) - (b.category ?? 99),
  );
}

/** Beschikbaarheid voor een zondag → antwoord op de race van het lid. */
export const RSVP_FOR_AVAILABILITY: Record<SrcAvailabilityStatus, "yes" | "maybe" | "no"> = {
  available: "yes",
  maybe: "maybe",
  unavailable: "no",
};
