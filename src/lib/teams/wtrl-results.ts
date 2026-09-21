// Waar staat de uitslag van een ZRL-team op WTRL?
//
// WTRL verbiedt het ophalen en verwerken van hun uitslagen (zie
// zrl-season.ts), dus we linken alleen naar hun uitslagenpagina. Die heeft geen
// URL per team: je kiest ronde, race, league en divisie zelf. Die keuze halen we
// uit het Zwift-event dat aan het teamevent hangt, want Zwift zet ze in de naam:
// "Zwift Racing League 26/27: Fresh & Fast: Open Aqua League Division 1 - Race 1".

import { safeFetch } from "@/lib/net/safe-fetch";

export const WTRL_ZRL_RESULTS_URL = "https://www.wtrl.racing/zrl/results/";

const ZWIFT_PUBLIC_EVENT_BASE = "https://us-or-rly101.zwift.com/api/public/events";

export type ZrlPlacement = {
  round: number | null;
  race: number | null;
  league: string;
  division: number;
};

export type ZrlTeamEvent = {
  team_id: string | null;
  start_at: string;
  zwift_event_id: number | null;
};

export function parseZrlPlacement(
  name: string | null | undefined,
  description?: string | null,
): ZrlPlacement | null {
  if (!name) return null;
  const match = name.match(/:\s*([^:]+?)\s+Division\s+(\d+)(?:\s*-\s*Race\s+(\d+))?\s*$/i);
  if (!match) return null;
  const round = description?.match(/\bRound\s+(\d+)/i)?.[1];
  return {
    round: round ? Number(round) : null,
    race: match[3] ? Number(match[3]) : null,
    league: match[1].trim(),
    division: Number(match[2]),
  };
}

export function formatZrlPlacement(placement: ZrlPlacement) {
  return [
    placement.round != null ? `Round ${placement.round}` : null,
    placement.race != null ? `Race ${placement.race}` : null,
    placement.league,
    `Division ${placement.division}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Per team het event waarvan de uitslag nu telt: de laatst gestarte race, of de
 * eerstvolgende als het team nog niet gereden heeft.
 */
export function pickZrlEventPerTeam(events: ZrlTeamEvent[], now = new Date()) {
  const byTeam = new Map<string, ZrlTeamEvent>();
  const nowMs = now.getTime();
  for (const event of events) {
    if (!event.team_id || !event.zwift_event_id) continue;
    const current = byTeam.get(event.team_id);
    if (!current) {
      byTeam.set(event.team_id, event);
      continue;
    }
    const at = new Date(event.start_at).getTime();
    const currentAt = new Date(current.start_at).getTime();
    const started = at <= nowMs;
    const currentStarted = currentAt <= nowMs;
    const better =
      started !== currentStarted
        ? started
        : started
          ? at > currentAt
          : at < currentAt;
    if (better) byTeam.set(event.team_id, event);
  }
  return byTeam;
}

export async function fetchZrlPlacement(eventId: number): Promise<ZrlPlacement | null> {
  try {
    const response = await safeFetch(`${ZWIFT_PUBLIC_EVENT_BASE}/${eventId}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const event = (await response.json()) as { name?: string; description?: string | null };
    return parseZrlPlacement(event.name, event.description);
  } catch {
    return null;
  }
}
