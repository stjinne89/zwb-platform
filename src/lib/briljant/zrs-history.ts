import "server-only";

// ZWBriljant: de ZRS van vroeger in de terugblik. ZRS heeft bij Zwift geen
// historie, maar elke race-uitslag geeft per renner de score vóór en na die race
// (`scoreHistory`). Per terugblikmaand nemen we de score na de laatste race tot het
// maandeinde, of de score vóór de eerste race erna; niet elke race heeft er een.
//
// Sinds 0271 (2026-10-23) bewaren we per race wat Zwift gaf (`zwift_race_scores`)
// en waar we in de activiteitenlijst zijn (`zwift_race_score_sync`). Elke run gaat
// verder waar de vorige stopte, en de maand-ZRS is uit de tabel af te leiden: een
// nieuwe schaal hoeft niets opnieuw op te halen (storeTerugblik leest de tabel).
// Is een maand (nog) niet beslist, dan blijft de actuele ZRS de terugval.
//
// Langzaam: de activiteitenlijst gaat per 20, en de uitslagen zijn bij Zwift twee
// vragen per seconde voor het hele serviceaccount. Daarom per run zoveel als het
// budget toelaat, in de wekelijkse job en in een eigen job.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  ACTIVITIES_PER_PAGE,
  fetchActivitySubgroup,
  fetchRiderRacePage,
  fetchRiderScoreChange,
  type RaceScoreChange,
  type RiderRaceActivity,
} from "@/lib/events/zwift-club";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { SCALE_VERSION, ZRS_ANCHORS } from "./norms";
import { FACETS, levelAt, scoreFor, type Facet } from "./score";
import { monthEndOfWeek, zrsAtMonthEnd, type BriljantSources, type KnownRace } from "./snapshot";

type Admin = ReturnType<typeof createAdminClient>;

/** Zoveel races proberen we per maand als een uitslag geen score geeft. */
export const TRIES_PER_MONTH = 4;
/** Tussen twee vragen naar activiteiten of details; de uitslagen hebben hun eigen wachtrij. */
const SPACING_MS = 300;
/** Minstens zoveel tijd over voor nog een pagina van de lijst. */
const LIST_RESERVE_MS = 2_000;
/** Minstens zoveel tijd over voor het opzoeken van één race (detail plus uitslag). */
const LOOKUP_RESERVE_MS = 6_000;
/** Minder tijd dan dit: aan geen nieuw lid meer beginnen. */
const RIDER_MIN_MS = 4_000;
/** PostgREST geeft hooguit zoveel rijen per vraag. */
const PAGE_ROWS = 1000;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Zwift weigert de lijst of het lid bestaat niet: niet blijven proberen. */
const refused = (error: unknown) => error instanceof Error && /status (401|403|404)\b/.test(error.message);

/** Een race zoals we hem kennen, met het tijdstip om de volgorde te bewaren. */
type StoredRace = KnownRace & { racedAt: string };

type SyncState = {
  next_start: number;
  list_complete: boolean;
  refused: boolean;
  newest_at: string | null;
  settled_at: string | null;
};

type RiderState = { zwiftId: string; races: StoredRace[]; sync: SyncState };

type RaceRow = {
  activity_id: string;
  raced_at: string;
  raced_on: string;
  score_before: number | null;
  score_after: number | null;
  looked_up_at: string | null;
};

const SYNC_START: SyncState = { next_start: 0, list_complete: false, refused: false, newest_at: null, settled_at: null };

const byNewest = (a: StoredRace, b: StoredRace) => Date.parse(b.racedAt) - Date.parse(a.racedAt);

const toRace = (row: RaceRow): StoredRace => ({
  activityId: row.activity_id,
  racedAt: row.raced_at,
  day: row.raced_on,
  lookedUp: row.looked_up_at != null,
  before: row.score_before,
  after: row.score_after,
});

/** Alle bewaarde races van een renner, nieuw naar oud; null als de tabel (0271) er niet is. */
async function loadRaces(admin: Admin, zwiftId: string): Promise<StoredRace[] | null> {
  const races: StoredRace[] = [];
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await admin
      .from("zwift_race_scores")
      .select("activity_id, raced_at, raced_on, score_before, score_after, looked_up_at")
      .eq("zwift_id", zwiftId)
      .order("raced_at", { ascending: false })
      .order("activity_id", { ascending: false })
      .range(from, from + PAGE_ROWS - 1);
    if (error) return null;
    const rows = (data ?? []) as RaceRow[];
    races.push(...rows.map(toRace));
    if (rows.length < PAGE_ROWS) return races;
  }
}

async function loadState(admin: Admin, zwiftId: string): Promise<RiderState | null> {
  const [races, sync] = await Promise.all([
    loadRaces(admin, zwiftId),
    admin
      .from("zwift_race_score_sync")
      .select("next_start, list_complete, refused, newest_at, settled_at")
      .eq("zwift_id", zwiftId)
      .maybeSingle(),
  ]);
  if (!races || sync.error) return null;
  return { zwiftId, races, sync: { ...SYNC_START, ...((sync.data ?? {}) as Partial<SyncState>) } };
}

/**
 * Wat de tabel weet voor de terugblik: de races (nieuw naar oud) en of de lijst af
 * is. Null zonder Zwift-ID-tabel of bij een fout; dan blijft de actuele ZRS staan.
 */
export async function loadRaceScores(
  admin: Admin,
  zwiftId: string,
): Promise<{ races: KnownRace[]; listComplete: boolean } | null> {
  if (!/^\d+$/.test(zwiftId)) return null;
  const state = await loadState(admin, zwiftId).catch(() => null);
  return state ? { races: state.races, listComplete: state.sync.list_complete } : null;
}

/** De ZRS op een maandeinde als de tabel hem kent, anders null (dan de actuele ZRS). */
export function decidedZrs(scores: { races: KnownRace[]; listComplete: boolean } | null, monthEnd: string) {
  if (!scores) return null;
  const result = zrsAtMonthEnd(scores.races, monthEnd, scores.listComplete, TRIES_PER_MONTH);
  return result.kind === "found" || result.kind === "none" ? result : null;
}

async function saveSync(admin: Admin, state: RiderState, extra: { attempted_at?: string } = {}) {
  const { error } = await admin
    .from("zwift_race_score_sync")
    .upsert(
      { zwift_id: Number(state.zwiftId), ...state.sync, ...extra, updated_at: new Date().toISOString() },
      { onConflict: "zwift_id" },
    );
  if (error) throw new Error(error.message);
}

/** Nieuwe races uit de lijst bewaren (bestaande blijven staan, met hun scores). */
async function addRaces(admin: Admin, state: RiderState, races: RiderRaceActivity[]) {
  const known = new Set(state.races.map((race) => race.activityId));
  const fresh = races.filter((race) => !known.has(race.activityId));
  if (fresh.length === 0) return;
  const rows = fresh.map((race) => ({
    zwift_id: Number(state.zwiftId),
    activity_id: race.activityId,
    raced_at: race.startedAt,
    raced_on: amsterdamDayKey(new Date(race.startedAt)),
  }));
  const { error } = await admin
    .from("zwift_race_scores")
    .upsert(rows, { onConflict: "zwift_id,activity_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  state.races.push(
    ...rows.map((row) => ({
      activityId: row.activity_id,
      racedAt: row.raced_at,
      day: row.raced_on,
      lookedUp: false,
      before: null,
      after: null,
    })),
  );
  state.races.sort(byNewest);
}

const latest = (current: string | null, times: string[]) =>
  times.reduce<string | null>((max, time) => (!max || Date.parse(time) > Date.parse(max) ? time : max), current);

/**
 * Nieuwe activiteiten bovenaan de lijst sinds de vorige run. Die schuiven de rest
 * op, dus de cursor schuift mee, maar alleen als we zeker weten hoeveel het er
 * waren: te weinig opschuiven geeft overlap (onschuldig), te veel een gat.
 */
async function topUp(admin: Admin, state: RiderState, left: () => number): Promise<void> {
  const since = state.sync.newest_at;
  if (!since || state.sync.refused) return;
  const known = Date.parse(since);
  let added = 0;
  let newest: string | null = since;
  for (let start = 0; ; start += ACTIVITIES_PER_PAGE) {
    if (left() < LIST_RESERVE_MS) return;
    const page = await fetchRiderRacePage(state.zwiftId, start);
    const fresh = page.startedAts.filter((time) => Date.parse(time) > known);
    await addRaces(admin, state, page.races.filter((race) => Date.parse(race.startedAt) > known));
    added += fresh.length;
    newest = latest(newest, fresh);
    await pause(SPACING_MS);
    if (fresh.length < page.count || page.count < ACTIVITIES_PER_PAGE) break;
  }
  if (added === 0) return;
  if (!state.sync.list_complete) state.sync.next_start += added;
  state.sync.newest_at = newest;
  await saveSync(admin, state);
}

/** De volgende pagina van de lijst, waar de vorige run stopte. */
async function listMore(admin: Admin, state: RiderState): Promise<void> {
  try {
    const page = await fetchRiderRacePage(state.zwiftId, state.sync.next_start);
    await addRaces(admin, state, page.races);
    if (state.sync.next_start === 0) state.sync.newest_at = latest(state.sync.newest_at, page.startedAts);
    state.sync.next_start += page.count;
    if (page.count < ACTIVITIES_PER_PAGE) state.sync.list_complete = true;
  } catch (error) {
    if (!refused(error)) throw error;
    state.sync.list_complete = true;
    state.sync.refused = true;
  }
  await saveSync(admin, state);
  await pause(SPACING_MS);
}

/** De ZRS rond één race opzoeken en bewaren, ook als Zwift er geen geeft. */
async function lookUp(admin: Admin, state: RiderState, race: KnownRace): Promise<void> {
  let change: RaceScoreChange | null = null;
  try {
    const subgroup = await fetchActivitySubgroup(race.activityId);
    await pause(SPACING_MS);
    change = subgroup ? await fetchRiderScoreChange(subgroup, state.zwiftId) : null;
  } catch (error) {
    if (!refused(error)) throw error;
  }
  const round = (value: number | null | undefined) => (value == null ? null : Math.round(value));
  const before = round(change?.before);
  const after = round(change?.after);
  const { error } = await admin
    .from("zwift_race_scores")
    .update({ score_before: before, score_after: after, looked_up_at: new Date().toISOString() })
    .eq("zwift_id", state.zwiftId)
    .eq("activity_id", race.activityId);
  if (error) throw new Error(error.message);
  const stored = state.races.find((item) => item.activityId === race.activityId);
  if (stored) Object.assign(stored, { lookedUp: true, before, after });
}

type TerugblikRow = {
  week: string;
  facets: Partial<Record<Facet, number | null>>;
  consistency: number | string | null;
  provenance: BriljantSources;
};

/**
 * Een beslissing in de terugblik zetten. Gevonden: het niveau van die ZRS en de
 * score opnieuw. Niets gevonden: "geen", met de actuele ZRS die er al staat.
 * Een eerder gevonden ZRS gaat nooit terug naar "geen". Geeft of er iets veranderde.
 */
async function markMonth(admin: Admin, profileId: string, row: TerugblikRow, zrs: number | null): Promise<boolean> {
  const stored = row.provenance.racen ?? null;
  const facets = { ...row.facets };
  if (zrs != null) {
    const level = Math.round(levelAt(ZRS_ANCHORS, zrs) * 100) / 100;
    if (stored === "historie" && Number(row.facets.racen) === level) return false;
    facets.racen = level;
  } else if (stored != null) {
    return false;
  }
  const levels = Object.fromEntries(FACETS.map((facet) => [facet, facets[facet] ?? null])) as Record<Facet, number | null>;
  const consistency = row.consistency == null ? null : Number(row.consistency);
  const provenance = { ...row.provenance, racen: zrs != null ? ("historie" as const) : ("geen" as const) };
  const { error } = await admin
    .from("zwbriljant_snapshots")
    .update({ facets, score: scoreFor(levels, consistency), provenance })
    .eq("profile_id", profileId)
    .eq("week", row.week)
    .eq("source", "terugblik");
  if (error) throw new Error(error.message);
  Object.assign(row, { facets, provenance });
  return true;
}

/** Het resultaat van één lid: hoeveel maanden veranderden, en of de run moet stoppen (429, 5xx, geen tabel). */
export type ZrsFillResult = { months: number; stop: boolean };

/**
 * Vult voor één lid de ZRS van vroeger in tot het budget op is: eerst de maanden
 * die nog niets hebben (nieuwste eerst), daarna de maanden met een ZRS van vóór
 * 0271, zodat ook die in de tabel komen. Alles beslist: `settled_at`.
 */
export async function fillZrsHistory(
  admin: Admin,
  profileId: string,
  terugblikSpan: string,
  options: { budgetMs: number },
): Promise<ZrsFillResult> {
  const started = Date.now();
  const left = () => options.budgetMs - (Date.now() - started);

  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    admin.from("profiles").select("zwift_id").eq("id", profileId).maybeSingle(),
    admin
      .from("zwbriljant_snapshots")
      .select("week, facets, consistency, provenance")
      .eq("profile_id", profileId)
      .eq("source", "terugblik")
      .eq("provenance->>scale", SCALE_VERSION)
      .eq("provenance->>terugblik", terugblikSpan)
      .order("week", { ascending: false }),
  ]);
  if (error) return { months: 0, stop: true };
  const months = (rows ?? []) as TerugblikRow[];
  if (months.length === 0) return { months: 0, stop: false };

  let handled = 0;
  const zwiftId = String((profile as { zwift_id: string | null } | null)?.zwift_id ?? "").trim();
  if (!/^\d+$/.test(zwiftId)) {
    // Zonder Zwift-ID valt er niets op te zoeken: de actuele ZRS (er is er geen) blijft.
    for (const row of months) if (await markMonth(admin, profileId, row, null)) handled += 1;
    return { months: handled, stop: false };
  }

  const state = await loadState(admin, zwiftId);
  if (!state) return { months: 0, stop: true };

  try {
    await saveSync(admin, state, { attempted_at: new Date().toISOString() });
    await topUp(admin, state, left);
    const pendingFirst = [
      ...months.filter((row) => row.provenance.racen == null),
      ...months.filter((row) => row.provenance.racen != null),
    ];
    for (const row of pendingFirst) {
      const monthEnd = monthEndOfWeek(row.week);
      for (;;) {
        const result = zrsAtMonthEnd(state.races, monthEnd, state.sync.list_complete, TRIES_PER_MONTH);
        if (result.kind === "list") {
          if (left() < LIST_RESERVE_MS) return { months: handled, stop: false };
          await listMore(admin, state);
          continue;
        }
        if (result.kind === "lookup") {
          if (left() < LOOKUP_RESERVE_MS) return { months: handled, stop: false };
          await lookUp(admin, state, result.race);
          continue;
        }
        if (await markMonth(admin, profileId, row, result.kind === "found" ? result.zrs : null)) handled += 1;
        break;
      }
    }
    state.sync.settled_at = new Date().toISOString();
    await saveSync(admin, state);
    return { months: handled, stop: false };
  } catch {
    // 429 of 5xx bij Zwift, of een schrijffout: de volgende run gaat hier verder.
    return { months: handled, stop: true };
  }
}

/**
 * Wie er werk heeft: leden met een maand zonder beslissing, daarna leden met een
 * Zwift-ID die nog niet helemaal uit de tabel beslist zijn. Binnen beide groepen
 * wie het langst niet aan de beurt was eerst, zodat één vastgelopen lid niet elke
 * run het budget opeet.
 */
export async function membersWithZrsWork(admin: Admin, terugblikSpan: string): Promise<string[]> {
  const pending = new Set<string>();
  const withTerugblik = new Set<string>();
  for (let from = 0; ; from += PAGE_ROWS) {
    const { data, error } = await admin
      .from("zwbriljant_snapshots")
      .select("profile_id, racen:provenance->>racen")
      .eq("source", "terugblik")
      .eq("provenance->>scale", SCALE_VERSION)
      .eq("provenance->>terugblik", terugblikSpan)
      .order("profile_id")
      .order("week")
      .range(from, from + PAGE_ROWS - 1);
    if (error) return [];
    const rows = (data ?? []) as Array<{ profile_id: string; racen: string | null }>;
    for (const row of rows) {
      withTerugblik.add(row.profile_id);
      if (row.racen == null) pending.add(row.profile_id);
    }
    if (rows.length < PAGE_ROWS) break;
  }
  if (withTerugblik.size === 0) return [];

  const { data: profiles } = await admin.from("profiles").select("id, zwift_id").in("id", [...withTerugblik]);
  const zwiftOf = new Map<string, string>();
  for (const row of (profiles ?? []) as Array<{ id: string; zwift_id: string | null }>) {
    const id = String(row.zwift_id ?? "").trim();
    if (/^\d+$/.test(id)) zwiftOf.set(row.id, id);
  }
  const { data: syncs, error } = zwiftOf.size
    ? await admin
        .from("zwift_race_score_sync")
        .select("zwift_id, settled_at, attempted_at")
        .in("zwift_id", [...new Set(zwiftOf.values())].map(Number))
    : { data: [], error: null };
  // Zonder tabel (0271 niet toegepast) alleen de maanden zonder beslissing; die
  // stoppen dan meteen, en er verandert niets.
  if (error) return [];
  const syncOf = new Map(
    ((syncs ?? []) as Array<{ zwift_id: number | string; settled_at: string | null; attempted_at: string | null }>).map(
      (row) => [String(row.zwift_id), row],
    ),
  );
  const attempted = (id: string) => {
    const at = syncOf.get(zwiftOf.get(id) ?? "")?.attempted_at;
    return at ? Date.parse(at) : 0;
  };
  const unsettled = [...withTerugblik].filter(
    (id) => !pending.has(id) && zwiftOf.has(id) && !syncOf.get(zwiftOf.get(id)!)?.settled_at,
  );
  const byTurn = (a: string, b: string) => attempted(a) - attempted(b);
  return [...[...pending].sort(byTurn), ...unsettled.sort(byTurn)];
}

/** Zoveel leden als er tot `deadline` (epoch-ms) passen; stopt bij 429/5xx. */
export async function runZrsHistory(
  admin: Admin,
  terugblikSpan: string,
  deadline: number,
): Promise<{ riders: number; months: number; stopped: boolean }> {
  let riders = 0;
  let months = 0;
  for (const profileId of await membersWithZrsWork(admin, terugblikSpan)) {
    const budgetMs = deadline - Date.now();
    if (budgetMs < RIDER_MIN_MS) break;
    const result = await fillZrsHistory(admin, profileId, terugblikSpan, { budgetMs });
    riders += 1;
    months += result.months;
    if (result.stop) return { riders, months, stopped: true };
  }
  return { riders, months, stopped: false };
}
