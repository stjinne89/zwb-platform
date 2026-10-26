// Zoekt het Zwift-event bij een ZRL-teamrace en koppelt het.
//
// WTRL zet per divisie één Zwift-event klaar, met de categorieën als subgroep.
// De publieke eventlijst geeft ze met `tags=wtrl` allemaal terug (het verzoek
// achter zwift.com/events/tag/wtrl); zonder tag reikt die lijst maar een paar
// uur vooruit. De naam draagt league en divisie:
//   "Zwift Racing League 26/27: Fast & Fresh : Open Dev Aqua League Division 3 - Race 3"
// De divisie van een team staat in `wtrl_teams.division`, zoals de beheerder
// hem van WTRL My Teams plakt, in een andere volgorde en met de categorie erbij:
//   "Open Aqua Dev League Division B3"
// Gemeten 2026-10-10: 86 ZRL-events voor de racedagen van 13 en 14 oktober.
//
// Soms zet WTRL een divisie twee keer klaar (2026-10-20: elke Mint-divisie, het
// tweede event zonder één inschrijving). Dan beslist de startlijst: het event
// waarin eigen renners in de eigen subgroep staan.
//
// Een team zonder divisie, of zonder precies één passend event met zijn eigen
// subgroep, blijft ongemoeid; de beheerder plakt de link dan zelf.

import { amsterdamDateKey } from "@/lib/birthdays";
import { safeFetch } from "@/lib/net/safe-fetch";
import { fetchEntrants, zwiftClubConfigured } from "@/lib/events/zwift-club";
import type { ZwiftEventApiRow } from "@/lib/events/external-scan";
import { fillZrlEventDetails } from "@/lib/events/zrl-event-details";
import { registerZwiftRoute } from "@/lib/events/zrl-route-sync";
import {
  eventForSubgroup,
  eventRouteTotals,
  mapZwiftEvent,
  pickOwnSubgroup,
  routeFromZwiftId,
  ZWIFT_PUBLIC_EVENT_BASE,
  type ZwiftEventInfo,
  type ZwiftSubgroupStart,
} from "@/lib/events/zwift-route";

/** WTRL publiceert de events enkele dagen voor de race. */
const HORIZON_MS = 7 * 24 * 60 * 60 * 1000;

type SupabaseClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: { from: (bucket: string) => any };
};

export type ZrlDivision = {
  women: boolean;
  development: boolean;
  /** Kleur van de league, in kleine letters: "aqua", "mint". */
  league: string;
  number: number;
};

function division(
  competition: string,
  middle: string,
  number: string,
): ZrlDivision | null {
  const words = middle.trim().split(/\s+/).filter(Boolean);
  const isDev = (word: string) => /^dev(elopment)?$/i.test(word);
  const league = words.filter((word) => !isDev(word)).join(" ").toLowerCase();
  if (!league) return null;
  return {
    women: /^wom/i.test(competition),
    development: words.some(isDev),
    league,
    number: Number(number),
  };
}

/** "Open Aqua Dev League Division B3" → Open, Development, aqua, 3, categorie B. */
export function parseWtrlTeamDivision(
  label: string | null | undefined,
): (ZrlDivision & { category: string }) | null {
  const match = /^\s*(Open|Wom[ae]n'?s?)\s+(.+?)\s+League\s+Division\s+([A-E])(\d+)\s*$/i.exec(
    label ?? "",
  );
  if (!match) return null;
  const parsed = division(match[1], match[2], match[4]);
  return parsed ? { ...parsed, category: match[3].toUpperCase() } : null;
}

/** De divisie uit de naam van een ZRL-event op Zwift. */
export function parseZwiftZrlEventName(name: string | null | undefined): ZrlDivision | null {
  const match = /\b(Open|Wom[ae]n'?s?)\s+([^:]+?)\s+League\s+Division\s+(\d+)\b/i.exec(name ?? "");
  return match ? division(match[1], match[2], match[3]) : null;
}

function sameDivision(a: ZrlDivision, b: ZrlDivision): boolean {
  return (
    a.women === b.women &&
    a.development === b.development &&
    a.league === b.league &&
    a.number === b.number
  );
}

type StoredEvent = {
  external_url: string | null;
  gpx_path: string | null;
};

export type ZrlEventLink = {
  zwift_event_id: number;
  start_at: string;
  zwift_event_type: string | null;
  zwift_rules: string[];
  zwift_tags: string[];
  zwift_bike_hash: number | null;
  external_url?: string;
  zwift_route_id?: number;
  laps?: number;
  distance_km?: number;
  elevation_m?: number;
};

export type ZrlEventMatch = { info: ZwiftEventInfo; own: ZwiftSubgroupStart };

/** De events van deze divisie op deze dag (yyyy-mm-dd, Amsterdam) met de subgroep van het team. Puur. */
export function zrlEventMatches(
  teamDivision: string | null | undefined,
  dateKey: string,
  candidates: ZwiftEventInfo[],
): ZrlEventMatch[] {
  const wanted = parseWtrlTeamDivision(teamDivision);
  if (!wanted) return [];
  return candidates.flatMap((info) => {
    const found = parseZwiftZrlEventName(info.title);
    if (!found || !sameDivision(found, wanted)) return [];
    const own = pickOwnSubgroup(info.subgroups, wanted.category);
    if (!own || amsterdamDateKey(new Date(own.startAt)) !== dateKey) return [];
    return [{ info, own }];
  });
}

/**
 * Wat er op een teamrace moet komen, of null zonder precies één passend event.
 * Passen er meer, dan telt alleen het event met eigen renners in de eigen
 * subgroep (`ownSignups`: subgroep-ID → aantal). Puur.
 */
export function zrlEventLink(
  stored: StoredEvent,
  teamDivision: string | null | undefined,
  dateKey: string,
  candidates: ZwiftEventInfo[],
  ownSignups?: Map<string, number>,
): ZrlEventLink | null {
  let matches = zrlEventMatches(teamDivision, dateKey, candidates);
  if (matches.length > 1 && ownSignups) {
    matches = matches.filter(({ own }) => (ownSignups.get(own.id) ?? 0) > 0);
  }
  if (matches.length !== 1) return null;

  const [{ info, own }] = matches;
  const event = eventForSubgroup(info, own);
  const totals = eventRouteTotals(event);
  return {
    zwift_event_id: event.eventId,
    start_at: own.startAt,
    zwift_event_type: event.eventType,
    zwift_rules: event.rules,
    zwift_tags: event.tags,
    zwift_bike_hash: event.bikeHash,
    ...(stored.external_url ? {} : { external_url: event.externalUrl }),
    ...(event.route && totals
      ? {
          zwift_route_id: event.route.routeId,
          laps: totals.laps,
          // Een geüploade GPX gaat voor, net als in het eventformulier.
          ...(stored.gpx_path
            ? {}
            : { distance_km: totals.distanceKm, elevation_m: totals.elevationM }),
        }
      : {}),
  };
}

/** Alle aankomende events met de tag `wtrl`; één verzoek, geen login. */
async function fetchWtrlTaggedEvents(): Promise<ZwiftEventInfo[]> {
  const response = await safeFetch(`${ZWIFT_PUBLIC_EVENT_BASE}/upcoming?limit=200&tags=wtrl`, {
    cache: "no-store",
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Zwift gaf status ${response.status}.`);
  const rows = (await response.json()) as ZwiftEventApiRow[];
  return (Array.isArray(rows) ? rows : []).flatMap((row) => mapZwiftEvent(row) ?? []);
}

/**
 * Per subgroep het aantal eigen renners op de startlijst: de WTRL-renners en de
 * leden van het team. Een haperende startlijst telt als nul: dan valt dat event
 * af en koppelt er hoogstens niets, nooit het verkeerde.
 */
async function countOwnSignups(
  admin: SupabaseClient,
  teamId: string,
  trcRefs: string[],
  subgroupIds: string[],
): Promise<Map<string, number>> {
  const own = new Set<string>();
  if (trcRefs.length) {
    const { data } = await admin.from("wtrl_team_riders").select("zwift_id").in("trc_ref", trcRefs);
    for (const rider of (data ?? []) as Array<{ zwift_id: string | number | null }>) {
      if (rider.zwift_id) own.add(String(rider.zwift_id));
    }
  }
  const { data: members } = await admin.from("team_members").select("profiles(zwift_id)").eq("team_id", teamId);
  for (const member of (members ?? []) as Array<{ profiles: unknown }>) {
    // Supabase typeert een to-one-join soms als lijst.
    for (const profile of [member.profiles].flat() as Array<{ zwift_id?: string | null } | null>) {
      if (profile?.zwift_id) own.add(String(profile.zwift_id));
    }
  }
  const counts = new Map<string, number>();
  for (const subgroupId of subgroupIds) {
    const entrants = await fetchEntrants([subgroupId]);
    counts.set(subgroupId, entrants.filter((entrant) => own.has(entrant.zwiftId)).length);
  }
  return counts;
}

export type ZrlEventLinkResult = {
  /** Teamraces zonder Zwift-event in de komende week. */
  open: number;
  linked: string[];
  notes: string[];
};

export async function linkZrlEvents(
  admin: SupabaseClient,
  options: { now?: Date } = {},
): Promise<ZrlEventLinkResult> {
  const now = options.now ?? new Date();
  const result: ZrlEventLinkResult = { open: 0, linked: [], notes: [] };

  const { data: events, error } = await admin
    .from("events")
    .select(
      "id, title, team_id, start_at, external_url, gpx_path, location, cover_image_path, parent_event_id",
    )
    .eq("type", "zrl")
    .not("team_id", "is", null)
    .is("zwift_event_id", null)
    .gte("start_at", now.toISOString())
    .lte("start_at", new Date(now.getTime() + HORIZON_MS).toISOString());
  if (error) {
    result.notes.push(error.message);
    return result;
  }
  type EventRow = StoredEvent & {
    id: string;
    title: string;
    team_id: string;
    start_at: string;
    location: string | null;
    cover_image_path: string | null;
    parent_event_id: string | null;
  };
  const rows = (events ?? []) as EventRow[];
  result.open = rows.length;
  if (rows.length === 0) return result;

  // Per ZWB-team de laatst geplakte divisie.
  const { data: wtrlTeams } = await admin
    .from("wtrl_teams")
    .select("team_id, trc_ref, division, imported_at")
    .in("team_id", [...new Set(rows.map((row) => row.team_id))])
    .order("imported_at", { ascending: true });
  const divisionByTeam = new Map<string, string | null>();
  const trcRefsByTeam = new Map<string, string[]>();
  for (const team of (wtrlTeams ?? []) as Array<{ team_id: string; trc_ref: string; division: string | null }>) {
    divisionByTeam.set(team.team_id, team.division);
    trcRefsByTeam.set(team.team_id, [...(trcRefsByTeam.get(team.team_id) ?? []), team.trc_ref]);
  }

  const withDivision = rows.filter((row) => parseWtrlTeamDivision(divisionByTeam.get(row.team_id)));
  for (const row of rows) {
    if (!withDivision.includes(row)) result.notes.push(`${row.title}: geen WTRL-divisie bekend.`);
  }
  if (withDivision.length === 0) return result;

  const candidates = await fetchWtrlTaggedEvents();
  const details: Parameters<typeof fillZrlEventDetails>[1] = [];
  for (const row of withDivision) {
    const division = divisionByTeam.get(row.team_id);
    const dateKey = amsterdamDateKey(new Date(row.start_at));
    const matches = zrlEventMatches(division, dateKey, candidates);
    let ownSignups: Map<string, number> | undefined;
    if (matches.length > 1 && zwiftClubConfigured()) {
      ownSignups = await countOwnSignups(
        admin,
        row.team_id,
        trcRefsByTeam.get(row.team_id) ?? [],
        matches.map(({ own }) => own.id),
      ).catch((err) => {
        result.notes.push(`${row.title}: startlijst niet gelezen (${err instanceof Error ? err.message : "mislukt"}).`);
        return undefined;
      });
    }
    const link = zrlEventLink(row, division, dateKey, candidates, ownSignups);
    if (!link) {
      if (matches.length > 1) result.notes.push(`${row.title}: ${matches.length} passende events, geen eenduidige keus.`);
      continue;
    }
    const route = link.zwift_route_id ? routeFromZwiftId(link.zwift_route_id) : null;
    if (route) await registerZwiftRoute(admin, route);
    const { error: updateError } = await admin
      .from("events")
      .update(link)
      .eq("id", row.id)
      .is("zwift_event_id", null);
    if (updateError) {
      result.notes.push(`${row.title}: ${updateError.message}`);
      continue;
    }
    result.linked.push(`${row.title} → ${link.zwift_event_id}`);
    const info = candidates.find((candidate) => candidate.eventId === link.zwift_event_id);
    if (info) details.push({ row, info });
  }
  await fillZrlEventDetails(admin, details, result.notes);
  return result;
}
