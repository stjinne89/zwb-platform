import "server-only";

// Vermogen over 90 dagen en legacy vELO van zwiftracing.app, door de server.
//
// Neemt het werk over van de geplande taak `ladder-vermogen-zwiftracing`, die
// dit tot 2026-11-11 via Chrome op de pc van de eigenaar deed: op 2026-10-20 zat
// de site achter een Vercel-controle. Op 2026-11-11 draaide hij op Railway en gaf
// de rennerpagina zonder browser antwoord (zie rider-page.ts).
//
// Wie: dezelfde selectie als die taak. Voor elke ladderwedstrijd in de komende
// 8 dagen de aanmeldingen, de huidige leden van het eigen team en wie in de
// laatste 8 bewaarde wedstrijden voor de tegenstander reed; wat langer dan 20 uur
// niet is opgehaald. Daarna de renners in `zwift_legacy_velo` die een week niet
// zijn bijgewerkt, zodat de vELO1 in de Ladderpuzzel niet meer met de hand hoeft.
//
// Eén pagina tegelijk met een pauze, binnen het budget van de aanroeper; wat niet
// past, volgt bij de volgende run. Een 429, 5xx of een pagina die we niet
// herkennen stopt de run, zodat we niet doorgaan op een site die ons weert of
// van opbouw veranderde.

import type { createAdminClient } from "@/lib/supabase/admin";
import { getClub } from "@/lib/club";
import { parseRiderPage, type RiderPageData } from "./rider-page";

type Admin = ReturnType<typeof createAdminClient>;

const PAGE_URL = "https://zwiftracing.app/riders/";
const FIXTURE_DAYS = 8;
const OPPONENT_RACES = 8;
const POWER_STALE_MS = 20 * 60 * 60 * 1000;
const LEGACY_STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** Tussen twee pagina's; de Chrome-taak deed 0,8 s zonder problemen. */
const PAGE_SPACING_MS = 1_000;
const TIMEOUT_MS = 10_000;

export type ZwiftRacingSyncResult = {
  /** Renners die nu aan de beurt waren. */
  due: number;
  fetched: number;
  power: number;
  legacy: number;
  /** Pagina zonder vermogen en zonder vELO1 (geen races in 90 dagen). */
  empty: number;
  /** Bij ZwiftRacing onbekend (404). */
  unknown: number;
  /** Niet opgehaald omdat het budget op was. */
  remaining: number;
  /** Waarom de run eerder stopte, of null. */
  stopped: string | null;
};

const validId = (value: unknown) => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const ids = (rows: Array<{ zwift_id: unknown }> | null) =>
  (rows ?? []).map((row) => validId(row.zwift_id)).filter((id): id is number => id != null);

/** Zwift-ID's van de komende ladderwedstrijden: aanmeldingen, eigen team, tegenstander. */
export async function ladderFixtureZwiftIds(admin: Admin, now = new Date()): Promise<number[]> {
  const until = new Date(now.getTime() + FIXTURE_DAYS * 24 * 60 * 60 * 1000);
  const { data: events, error } = await admin
    .from("events")
    .select("club_ladder_fixture_id, team_id, club_ladder_opponent")
    .eq("type", "ladder")
    .not("club_ladder_fixture_id", "is", null)
    .gt("start_at", now.toISOString())
    .lt("start_at", until.toISOString());
  if (error) throw new Error(`Ladderwedstrijden niet gelezen: ${error.message}`);
  const fixtures = (events ?? []) as Array<{ club_ladder_fixture_id: number | null; team_id: string | null; club_ladder_opponent: string | null }>;
  if (fixtures.length === 0) return [];

  const out = new Set<number>();
  const fixtureIds = [...new Set(fixtures.map((f) => f.club_ladder_fixture_id).filter((id): id is number => id != null))];
  const teamIds = [...new Set(fixtures.map((f) => f.team_id).filter((id): id is string => !!id))];
  const opponents = [...new Set(fixtures.map((f) => f.club_ladder_opponent?.trim()).filter((name): name is string => !!name))];

  const [{ data: signups }, { data: members }] = await Promise.all([
    admin.from("club_ladder_fixture_signups").select("zwift_id").in("fixture_id", fixtureIds),
    teamIds.length ? admin.from("team_members").select("profile_id").in("team_id", teamIds) : Promise.resolve({ data: [] }),
  ]);
  for (const id of ids(signups as Array<{ zwift_id: unknown }>)) out.add(id);

  const profileIds = [...new Set(((members ?? []) as Array<{ profile_id: string }>).map((m) => m.profile_id))];
  if (profileIds.length) {
    const { data: profiles } = await admin.from("profiles").select("zwift_id").in("id", profileIds);
    for (const row of (profiles ?? []) as Array<{ zwift_id: string | null }>) {
      const id = /^\d+$/.test(row.zwift_id?.trim() ?? "") ? validId(row.zwift_id!.trim()) : null;
      if (id) out.add(id);
    }
  }

  for (const opponent of opponents) {
    // Twee losse filters: een teamnaam met komma of haakje breekt een `.or(...)`.
    const [{ data: asChallenger }, { data: asOpponent }] = await Promise.all([
      admin.from("club_ladder_matches").select("result_id, raced_on").eq("challenger", opponent).order("raced_on", { ascending: false }).limit(OPPONENT_RACES),
      admin.from("club_ladder_matches").select("result_id, raced_on").eq("opponent", opponent).order("raced_on", { ascending: false }).limit(OPPONENT_RACES),
    ]);
    const recent = [...((asChallenger ?? []) as Array<{ result_id: number; raced_on: string }>), ...((asOpponent ?? []) as Array<{ result_id: number; raced_on: string }>)]
      .sort((a, b) => b.raced_on.localeCompare(a.raced_on))
      .slice(0, OPPONENT_RACES)
      .map((m) => m.result_id);
    if (recent.length === 0) continue;
    const { data: riders } = await admin
      .from("club_ladder_match_riders")
      .select("zwift_id")
      .in("result_id", recent)
      .eq("team", opponent)
      .not("zwift_id", "is", null);
    for (const id of ids(riders as Array<{ zwift_id: unknown }>)) out.add(id);
  }
  return [...out].sort((a, b) => a - b);
}

/** Wie nu aan de beurt is: eerst de ladderwedstrijden, dan verouderde vELO1. */
export async function dueZwiftIds(admin: Admin, now = new Date()): Promise<number[]> {
  const fixtureIds = await ladderFixtureZwiftIds(admin, now);
  const due: number[] = [];
  if (fixtureIds.length) {
    const { data } = await admin.from("zwift_rider_metrics").select("zwift_id, velo_fetched_at").in("zwift_id", fixtureIds);
    const fetchedAt = new Map(((data ?? []) as Array<{ zwift_id: number; velo_fetched_at: string | null }>).map((row) => [Number(row.zwift_id), row.velo_fetched_at]));
    for (const id of fixtureIds) {
      const at = fetchedAt.get(id);
      if (!at || now.getTime() - Date.parse(at) > POWER_STALE_MS) due.push(id);
    }
  }
  const { data: legacy } = await admin
    .from("zwift_legacy_velo")
    .select("zwift_id")
    .lt("fetched_at", new Date(now.getTime() - LEGACY_STALE_MS).toISOString())
    .order("fetched_at", { ascending: true });
  const seen = new Set(due);
  for (const id of ids(legacy as Array<{ zwift_id: unknown }>)) if (!seen.has(id)) due.push(id);
  return due;
}

type Fetched = { kind: "ok"; data: RiderPageData } | { kind: "unknown" } | { kind: "stop"; reason: string };

async function fetchRiderPage(zwiftId: number, userAgent: string): Promise<Fetched> {
  let response: Response;
  try {
    response = await fetch(`${PAGE_URL}${zwiftId}`, {
      headers: { Accept: "text/html", "User-Agent": userAgent },
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    return { kind: "stop", reason: err instanceof Error ? err.message : "geen verbinding" };
  }
  if (response.status === 404) return { kind: "unknown" };
  if (!response.ok) return { kind: "stop", reason: `status ${response.status}` };
  const data = parseRiderPage(await response.text(), zwiftId);
  return data ? { kind: "ok", data } : { kind: "stop", reason: "pagina niet herkend" };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Haalt op wie aan de beurt is tot `deadline` (ms sinds epoch). */
export async function runZwiftRacingSync(admin: Admin, deadline: number): Promise<ZwiftRacingSyncResult> {
  const due = await dueZwiftIds(admin);
  const userAgent = `${(await getClub()).texts.shortName} Platform Club Ladder`;
  const result: ZwiftRacingSyncResult = { due: due.length, fetched: 0, power: 0, legacy: 0, empty: 0, unknown: 0, remaining: 0, stopped: null };

  let index = 0;
  for (; index < due.length; index++) {
    if (Date.now() > deadline) break;
    if (index > 0) await pause(PAGE_SPACING_MS);
    const zwiftId = due[index];
    const page = await fetchRiderPage(zwiftId, userAgent);
    if (page.kind === "stop") {
      result.stopped = page.reason;
      break;
    }
    const at = new Date().toISOString();
    if (page.kind === "unknown") {
      // Onthouden dat we keken, anders vraagt elke run hem opnieuw.
      result.unknown += 1;
      await admin.from("zwift_rider_metrics").upsert({ zwift_id: zwiftId, velo_fetched_at: at, updated_at: at });
      await admin.from("zwift_legacy_velo").update({ fetched_at: at }).eq("zwift_id", zwiftId);
      continue;
    }
    result.fetched += 1;
    const { powerWkg, legacy } = page.data;
    // Geen vermogen over 90 dagen: ook de oude waarde weg, die is dan verouderd.
    const { error } = await admin
      .from("zwift_rider_metrics")
      .upsert({ zwift_id: zwiftId, power_wkg: powerWkg, velo_fetched_at: at, updated_at: at });
    if (error) {
      result.stopped = `opslaan mislukt: ${error.message}`;
      break;
    }
    if (powerWkg) result.power += 1;
    if (legacy) {
      await admin.from("zwift_legacy_velo").upsert({
        zwift_id: zwiftId,
        velo_live: legacy.live,
        velo_max30: legacy.max30,
        velo_max90: legacy.max90,
        fetched_at: at,
      });
      result.legacy += 1;
    } else {
      // Geen vELO1 meer (geen races): de laatste rating blijft staan, zoals bij
      // het ophalen met de hand (0301); alleen het moment schuift, anders komt
      // hij elke run terug.
      await admin.from("zwift_legacy_velo").update({ fetched_at: at }).eq("zwift_id", zwiftId);
    }
    if (!powerWkg && !legacy) result.empty += 1;
  }
  // Bij een stop telt de renner waar het misging ook nog mee.
  result.remaining = due.length - index;
  return result;
}
