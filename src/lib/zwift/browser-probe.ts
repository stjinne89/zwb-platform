// Meetpagina voor de losse live-ZRL-app (docs/losse-apps-onderzoek-2026-11-11.md):
// kan een browser zelf inloggen bij Zwift en de segmentresultaten en uitslag
// ophalen? Hier staan alleen de pure delen; de pagina zelf staat in
// src/app/dev/zwift-probe en draait alleen bij `next dev`.
//
// Bewust zonder de app-headers van zwift-club.ts (Platform, Source, de
// game-user-agent): een browser mag de user-agent niet zetten, en de
// CORS-voorcontrole van het token-endpoint staat Platform en Source niet toe
// (gezien 2026-11-11). Werkt het zonder, dan werkt het in de losse app.

import type { SegmentResult } from "@/lib/zwift/segment-results-pb";

export const ZWIFT_TOKEN_URL =
  "https://secure.zwift.com/auth/realms/zwift/protocol/openid-connect/token";
export const ZWIFT_API_BASE = "https://us-or-rly101.zwift.com/api";
export const ZWIFT_CLIENT_ID = "Zwift_Mobile_Link";

/** "2026-09-22T12:00:00Z": Zwift weigert milliseconden (400, gemeten 2026-09-22). */
export function zwiftDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, -5) + "Z";
}

export function loginBody(username: string, password: string): URLSearchParams {
  return new URLSearchParams({
    client_id: ZWIFT_CLIENT_ID,
    grant_type: "password",
    username,
    password,
  });
}

export function segmentResultsUrl(segmentId: string, from: number, to?: number): string {
  if (!/^-?\d+$/.test(segmentId)) throw new Error("Ongeldig segment-ID.");
  const query = new URLSearchParams({ world_id: "1", segment_id: segmentId, from: zwiftDate(from) });
  if (to) query.set("to", zwiftDate(to));
  return `${ZWIFT_API_BASE}/segment-results?${query}`;
}

export function subgroupResultsUrl(subgroupId: string, start = 0): string {
  if (!/^\d+$/.test(subgroupId)) throw new Error("Ongeldig subgroep-ID.");
  return `${ZWIFT_API_BASE}/race-results/entries?event_subgroup_id=${subgroupId}&start=${start}&limit=50`;
}

/** Wat de pagina van een antwoord toont: aantallen, geen namen. */
export type PassageSummary = {
  passages: number;
  riders: number;
  /** Seconden tussen de laatste passage en `now`; null zonder passages. */
  newestAgeS: number | null;
};

export function summarizePassages(results: SegmentResult[], now: number): PassageSummary {
  const riders = new Set(results.map((result) => result.athleteId)).size;
  const newest = results.reduce<number | null>(
    (max, result) => (max === null || result.ts > max ? result.ts : max),
    null,
  );
  return {
    passages: results.length,
    riders,
    newestAgeS: newest === null ? null : Math.round((now - newest) / 1000),
  };
}

/**
 * Telt de statuscodes van een burst, en bij welk verzoek het eerste niet-200
 * antwoord kwam. "fout" telt mee: Zwift zet de CORS-kop niet op een foutantwoord
 * (een 401 had er geen, gezien 2026-11-11), dus een 429 komt in de browser
 * waarschijnlijk binnen als "fout" en niet als 429.
 */
export type BurstTally = {
  sent: number;
  byStatus: Record<string, number>;
  firstFailAt: number | null;
};

export function tallyBurst(statuses: Array<number | "fout">): BurstTally {
  const byStatus: Record<string, number> = {};
  let firstFailAt: number | null = null;
  statuses.forEach((status, index) => {
    const key = String(status);
    byStatus[key] = (byStatus[key] ?? 0) + 1;
    if (status !== 200 && firstFailAt === null) firstFailAt = index + 1;
  });
  return { sent: statuses.length, byStatus, firstFailAt };
}

/**
 * Een fetch zonder leesbaar antwoord gooit een TypeError zonder status: CORS, het
 * netwerk, of een foutstatus van Zwift zonder CORS-kop (zoals een 401).
 */
export function describeFetchError(error: unknown): string {
  if (error instanceof TypeError) return "geen leesbaar antwoord (CORS, netwerk of foutstatus)";
  return error instanceof Error ? error.message : "onbekende fout";
}
