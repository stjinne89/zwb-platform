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
// Sinds 2026-11-12 ook: de renners van een racebriefje (de ZRL). Het briefje
// zet hun ZRS in `zwift_rider_metrics`; wie daar de laatste twee dagen bij kwam
// en nog geen verse rennerpagina heeft, komt na de ladderrenners. Hun vELO1 is
// de terugval als ZwiftRacing het event zelf niet kent (race-briefing/field.ts).
// En vóór de renners: hooguit twee uitslagpagina's van bewaarde races, voor de
// verwachting van ZwiftRacing achteraf (race-expectations.ts, 0326).
//
// Eén pagina tegelijk met een pauze, binnen het budget van de aanroeper; wat niet
// past, volgt bij de volgende run. Een 429, 5xx of een pagina die we niet
// herkennen stopt de run, zodat we niet doorgaan op een site die ons weert of
// van opbouw veranderde.
//
// Sinds 2026-11-23 twee pagina's per renner: de rennerpagina (vELO1, type) en de
// vermogenspagina, omdat het vermogen op de rennerpagina een race kan missen
// (zie rider-page.ts). Zonder bruikbare curve blijft het vermogen van de
// rennerpagina staan en telt de run `noCurve`.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchZwiftRacingPage, zwiftRacingUserAgent } from "./fetch-page";
import { harvestRaceExpectations, type RaceExpectationResult } from "./race-expectations";
import { highestPower, isRiderNotFound, parseRiderPage, parseRiderPowerCurve, type RiderPageData } from "./rider-page";

type Admin = ReturnType<typeof createAdminClient>;

const FIXTURE_DAYS = 8;
/** Renners van een racebriefje: wie in zoveel tijd een ZRS kreeg. */
const BRIEFING_RECENT_MS = 2 * 24 * 60 * 60 * 1000;
const BRIEFING_MAX = 400;
/** Uitslagpagina's per run; de rest volgt bij de volgende run. */
const RESULT_PAGES_PER_RUN = 2;
const OPPONENT_RACES = 8;
const POWER_STALE_MS = 20 * 60 * 60 * 1000;
/**
 * Ladderrenners vaker: op 2026-11-24 werd een renner 25 minuten na zijn race
 * opgehaald, voordat ZwiftRacing die had verwerkt, en bleef 20 uur op de oude
 * vELO1 staan. Om de 6 uur loopt een rating hooguit zo lang achter.
 */
const LADDER_STALE_MS = 6 * 60 * 60 * 1000;
/** De knop slaat over wie in dit venster al is opgehaald. */
const LADDER_BUTTON_FRESH_MS = 60 * 60 * 1000;
const LEGACY_STALE_MS = 7 * 24 * 60 * 60 * 1000;
/** Tussen twee pagina's; de Chrome-taak deed 0,8 s zonder problemen. */
const PAGE_SPACING_MS = 1_000;
/** De tweede pagina krijgt minder tijd, zodat de run binnen `maxDuration` blijft. */
const CURVE_TIMEOUT_MS = 8_000;

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
  /** Opgehaald zonder bruikbare curve op de vermogenspagina. */
  noCurve: number;
  /** Niet opgehaald omdat het budget op was. */
  remaining: number;
  /** Waarom de run eerder stopte, of null. */
  stopped: string | null;
  /** Uitslagpagina's voor de verwachting achteraf (0326). */
  expectations: RaceExpectationResult;
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

/**
 * Zwift-ID's van iedereen in de Ladderpuzzel: leden van ladderteams (ook in het
 * archief), de ladderpool en de rosterrenners zonder account.
 */
export async function ladderRiderZwiftIds(admin: Admin): Promise<number[]> {
  const { data: teams, error } = await admin.from("teams").select("id").eq("type", "ladder");
  if (error) throw new Error(`Ladderteams niet gelezen: ${error.message}`);
  const teamIds = ((teams ?? []) as Array<{ id: string }>).map((team) => team.id);

  // De pool (0285) en het rooster kunnen ontbreken; dan zijn ze gewoon leeg.
  const [{ data: members }, { data: pool }, { data: roster }] = await Promise.all([
    teamIds.length ? admin.from("team_members").select("profile_id").in("team_id", teamIds) : Promise.resolve({ data: [] }),
    admin.from("ladder_pool").select("profile_id"),
    admin.from("ladder_roster_riders").select("roster_entry_id"),
  ]);
  const profileIds = [
    ...new Set(
      [...((members ?? []) as Array<{ profile_id: string }>), ...((pool ?? []) as Array<{ profile_id: string }>)].map((row) => row.profile_id),
    ),
  ];
  const entryIds = [...new Set(((roster ?? []) as Array<{ roster_entry_id: string }>).map((row) => row.roster_entry_id))];
  const [{ data: profiles }, { data: entries }] = await Promise.all([
    profileIds.length ? admin.from("profiles").select("zwift_id").in("id", profileIds) : Promise.resolve({ data: [] }),
    entryIds.length ? admin.from("roster_entries").select("zwift_id").in("id", entryIds) : Promise.resolve({ data: [] }),
  ]);

  const out = new Set<number>();
  for (const row of [...((profiles ?? []) as Array<{ zwift_id: string | null }>), ...((entries ?? []) as Array<{ zwift_id: string | null }>)]) {
    const raw = row.zwift_id?.trim() ?? "";
    const id = /^\d+$/.test(raw) ? validId(raw) : null;
    if (id) out.add(id);
  }
  return [...out].sort((a, b) => a - b);
}

const staleAfter = (at: string | null | undefined, now: Date, ms: number) => !at || now.getTime() - Date.parse(at) > ms;
const stale = (at: string | null | undefined, now: Date) => staleAfter(at, now, POWER_STALE_MS);

/** Renners van een racebriefje van de laatste twee dagen, zonder verse rennerpagina. */
async function briefingZwiftIds(admin: Admin, now: Date): Promise<number[]> {
  const { data } = await admin
    .from("zwift_rider_metrics")
    .select("zwift_id, velo_fetched_at")
    .gt("zrs_fetched_at", new Date(now.getTime() - BRIEFING_RECENT_MS).toISOString())
    .order("zrs_fetched_at", { ascending: false })
    .limit(BRIEFING_MAX);
  return ((data ?? []) as Array<{ zwift_id: number; velo_fetched_at: string | null }>)
    .filter((row) => stale(row.velo_fetched_at, now))
    .map((row) => validId(row.zwift_id))
    .filter((id): id is number => id != null);
}

/**
 * Wie nu aan de beurt is: eerst de ladderwedstrijden (na 20 uur), dan iedereen
 * in de Ladderpuzzel (na 6 uur), dan de racebriefjes, dan verouderde vELO1.
 */
export async function dueZwiftIds(admin: Admin, now = new Date()): Promise<number[]> {
  const [fixtureIds, ladderIds] = await Promise.all([ladderFixtureZwiftIds(admin, now), ladderRiderZwiftIds(admin)]);
  const due: number[] = [];
  const lookup = [...new Set([...fixtureIds, ...ladderIds])];
  if (lookup.length) {
    const { data } = await admin.from("zwift_rider_metrics").select("zwift_id, velo_fetched_at").in("zwift_id", lookup);
    const fetchedAt = new Map(((data ?? []) as Array<{ zwift_id: number; velo_fetched_at: string | null }>).map((row) => [Number(row.zwift_id), row.velo_fetched_at]));
    for (const id of fixtureIds) if (stale(fetchedAt.get(id), now)) due.push(id);
    const queued = new Set(due);
    for (const id of ladderIds) if (!queued.has(id) && staleAfter(fetchedAt.get(id), now, LADDER_STALE_MS)) due.push(id);
  }
  const seen = new Set(due);
  for (const id of await briefingZwiftIds(admin, now)) {
    if (seen.has(id)) continue;
    seen.add(id);
    due.push(id);
  }
  const { data: legacy } = await admin
    .from("zwift_legacy_velo")
    .select("zwift_id")
    .lt("fetched_at", new Date(now.getTime() - LEGACY_STALE_MS).toISOString())
    .order("fetched_at", { ascending: true });
  for (const id of ids(legacy as Array<{ zwift_id: unknown }>)) if (!seen.has(id)) due.push(id);
  return due;
}

type Fetched =
  | { kind: "ok"; data: RiderPageData; hasCurve: boolean }
  | { kind: "unknown" }
  | { kind: "later" }
  | { kind: "stop"; reason: string };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchRiderPage(zwiftId: number, userAgent: string, deadline: number): Promise<Fetched> {
  const page = await fetchZwiftRacingPage(`/riders/${zwiftId}`, userAgent);
  if (page.kind !== "ok") return page;
  if (isRiderNotFound(page.html, zwiftId)) return { kind: "unknown" };
  const data = parseRiderPage(page.html, zwiftId);
  if (!data) return { kind: "stop", reason: "pagina niet herkend" };

  // Geen tijd meer voor de curve: niets opslaan, de volgende run begint met hem.
  if (Date.now() > deadline) return { kind: "later" };
  await pause(PAGE_SPACING_MS);
  const powerPage = await fetchZwiftRacingPage(`/riders/${zwiftId}/power`, userAgent, CURVE_TIMEOUT_MS);
  if (powerPage.kind === "stop") return powerPage;
  const curve = powerPage.kind === "ok" ? parseRiderPowerCurve(powerPage.html, zwiftId) : null;
  return { kind: "ok", data: { ...data, powerWkg: highestPower(data.powerWkg, curve) }, hasCurve: curve != null };
}

/** Haalt op wie aan de beurt is tot `deadline` (ms sinds epoch). */
export async function runZwiftRacingSync(admin: Admin, deadline: number): Promise<ZwiftRacingSyncResult> {
  const userAgent = await zwiftRacingUserAgent();
  // Eerst een paar uitslagpagina's: een klein, vast deel van het budget.
  const expectations = await harvestRaceExpectations(admin, deadline, userAgent, RESULT_PAGES_PER_RUN);
  const due = await dueZwiftIds(admin);
  const result: ZwiftRacingSyncResult = { due: due.length, fetched: 0, power: 0, legacy: 0, empty: 0, unknown: 0, noCurve: 0, remaining: 0, stopped: expectations.stopped, expectations };
  // Weert ZwiftRacing ons op de uitslagpagina, dan ook geen rennerpagina's.
  if (result.stopped) {
    result.remaining = due.length;
    return result;
  }

  let index = 0;
  for (; index < due.length; index++) {
    if (Date.now() > deadline) break;
    if (index > 0) await pause(PAGE_SPACING_MS);
    const zwiftId = due[index];
    const page = await fetchRiderPage(zwiftId, userAgent, deadline);
    if (page.kind === "later") break;
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
    if (!page.hasCurve) result.noCurve += 1;
    const { powerWkg, legacy, phenotype } = page.data;
    // Geen vermogen over 90 dagen: ook de oude waarde weg, die is dan verouderd.
    const { error } = await admin
      .from("zwift_rider_metrics")
      .upsert({ zwift_id: zwiftId, power_wkg: powerWkg, phenotype, velo_fetched_at: at, updated_at: at });
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

export type LadderVeloSyncResult = {
  /** Ladderrenners die nu aan de beurt waren. */
  due: number;
  fetched: number;
  legacy: number;
  unknown: number;
  /** Niet opgehaald omdat de tijd op was of een pagina te traag was. */
  remaining: number;
  /** Waarom de run stopte (429, 5xx, onbekende pagina), of null. */
  stopped: string | null;
};

/**
 * Voor de knop "Teams en resultaten ophalen": alleen de vELO1 van iedereen in
 * de Ladderpuzzel, de oudste eerst, zonder de 20 uur van de cron. Alleen de
 * rennerpagina, want daar staat de vELO1; het vermogen blijft bij de cron, dus
 * `zwift_rider_metrics` blijft onaangeroerd.
 */
export async function runLadderVeloSync(admin: Admin, deadline: number, pageTimeoutMs?: number): Promise<LadderVeloSyncResult> {
  const now = new Date();
  const ids = await ladderRiderZwiftIds(admin);
  const { data } = ids.length
    ? await admin.from("zwift_legacy_velo").select("zwift_id, fetched_at").in("zwift_id", ids)
    : { data: [] };
  const fetchedAt = new Map(((data ?? []) as Array<{ zwift_id: number; fetched_at: string | null }>).map((row) => [Number(row.zwift_id), row.fetched_at]));
  const due = ids
    .filter((id) => staleAfter(fetchedAt.get(id), now, LADDER_BUTTON_FRESH_MS))
    .sort((a, b) => (Date.parse(fetchedAt.get(a) ?? "") || 0) - (Date.parse(fetchedAt.get(b) ?? "") || 0));

  const result: LadderVeloSyncResult = { due: due.length, fetched: 0, legacy: 0, unknown: 0, remaining: 0, stopped: null };
  const userAgent = await zwiftRacingUserAgent();
  let index = 0;
  for (; index < due.length; index++) {
    if (Date.now() > deadline) break;
    if (index > 0) await pause(PAGE_SPACING_MS);
    const zwiftId = due[index];
    const page = await fetchZwiftRacingPage(`/riders/${zwiftId}`, userAgent, pageTimeoutMs);
    // Te traag: stoppen zonder melding, de volgende klik of de cron neemt hem.
    if (page.kind === "stop" && page.timeout) break;
    if (page.kind === "stop") {
      result.stopped = page.reason;
      break;
    }
    const at = new Date().toISOString();
    if (page.kind === "unknown" || isRiderNotFound(page.html, zwiftId)) {
      result.unknown += 1;
      await admin.from("zwift_legacy_velo").update({ fetched_at: at }).eq("zwift_id", zwiftId);
      continue;
    }
    const parsed = parseRiderPage(page.html, zwiftId);
    if (!parsed) {
      result.stopped = "pagina niet herkend";
      break;
    }
    result.fetched += 1;
    if (parsed.legacy) {
      const { error } = await admin.from("zwift_legacy_velo").upsert({
        zwift_id: zwiftId,
        velo_live: parsed.legacy.live,
        velo_max30: parsed.legacy.max30,
        velo_max90: parsed.legacy.max90,
        fetched_at: at,
      });
      if (error) {
        result.stopped = `opslaan mislukt: ${error.message}`;
        break;
      }
      result.legacy += 1;
    } else {
      // Geen vELO1 meer: de laatste rating blijft staan, zoals in de cron.
      await admin.from("zwift_legacy_velo").update({ fetched_at: at }).eq("zwift_id", zwiftId);
    }
  }
  result.remaining = due.length - index;
  return result;
}
