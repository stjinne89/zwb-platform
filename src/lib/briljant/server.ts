import "server-only";

// ZWBriljant op de server: per lid de waarden verzamelen, de snapshot van
// deze week vastleggen en bij het eerste gebruik een terugblik maken.
//
// Altijd met de admin-client: snapshots schrijft alleen de server (0265). Lezen
// voor de pagina gaat met de sessie van het lid, zodat RLS bepaalt welke stenen
// van anderen zichtbaar zijn.

import type { createAdminClient } from "@/lib/supabase/admin";
import { fetchZwiftWeightKg } from "@/lib/events/zwift-club";
import {
  fetchIntervalsPowerCurve,
  fetchIntervalsPowerCurveRanges,
  fetchIntervalsWellness,
  latestWellnessValue,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import { isCyclingSportType } from "@/lib/strava/sports";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { syncOnePowerProfile, type IntervalsConnectionRow } from "@/lib/teams/power-sync";
import { CONSISTENCY_WEEKS, valueAt, type BriljantInput, type ConsistencyInput, type HistoryPoint } from "./score";
import { PREVIOUS_SCALE_VERSION, SCALE_VERSION, ZRS_ANCHORS, type Sex } from "./norms";
import { clubAverages, storedScore, type StoredSnapshot } from "./compare";
import {
  complianceFrom,
  consistencyWeeks,
  curveRange,
  fatigueInputs,
  mondayKey,
  monthEnds,
  monthsSince,
  powerFromCurve,
  shiftDay,
  snapshotFrom,
  terugblikRows,
  type CurvePoint,
  type PlannedWorkout,
  type RideDay,
  type SnapshotRow,
} from "./snapshot";

type Admin = ReturnType<typeof createAdminClient>;

/** Ouder dan dit wordt het powerprofiel in de wekelijkse job ververst. */
const POWER_STALE_MS = 6 * 24 * 60 * 60 * 1000;
/**
 * De terugblik gaat over de hele historie in intervals.icu (eigenaar, 2026-10-21),
 * vanaf de eerste dag met een CTL; tien jaar is een vangnet, geen keuze.
 */
const TERUGBLIK_MAX_MONTHS = 120;
/** Zonder wellness (geen CTL te vinden) blijft het bij een jaar. */
const TERUGBLIK_FALLBACK_MONTHS = 12;
/**
 * Gezet in `provenance.terugblik`: de hele historie, met de huidige ZRS voor racen
 * (ZRS heeft geen historie), durability per maand, en sinds 2026-10-22 het gewicht
 * uit intervals.icu of Zwift en consistentie in TSS (eigenaar). Een terugblik met
 * een andere waarde wordt bij het volgende bezoek of door de job opnieuw gemaakt;
 * de ZRS van vroeger die de job al vond, blijft staan.
 */
export const TERUGBLIK_SPAN = "alles-gewicht-tss";
/** PostgREST geeft hooguit zoveel rijen per vraag. */
const PAGE = 1000;
/** Zoveel weken terug voor de norm (mediaan) en de reeks. */
const HISTORY_WEEKS = 52;

export type Weather = { tsb: number; atl: number } | null;

export type Collected = {
  input: BriljantInput;
  consistency: ConsistencyInput;
  weather: Weather;
  /**
   * Of de wellness uit intervals.icu (CTL, gewicht, TSS) binnenkwam; true zonder
   * intervals.icu (er was niets op te halen). Bij false ontbreken fitheid en de TSS.
   */
  wellness: boolean;
};

/**
 * De wellness ophalen, met één nieuwe poging na een korte pauze. In de wekelijkse
 * job mislukte die soms na de zware vraag van de terugblik, en dan viel fitheid
 * stil weg (2026-10-22, vier leden). Null als het ook de tweede keer mislukt.
 */
async function wellnessWithRetry(apiKey: string, athleteId: string, days: number): Promise<IntervalsWellness[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1_500));
    try {
      return await fetchIntervalsWellness(apiKey, athleteId, days);
    } catch {}
  }
  return null;
}

type ProfileRow = { sex: string | null; weight_kg: number | string | null; zwift_id: string | null };
type PowerRow = {
  wkg_15s: number | string | null;
  wkg_1m: number | string | null;
  wkg_5m: number | string | null;
  wkg_20m: number | string | null;
  weight_kg: number | string | null;
  curve_points: CurvePoint[] | null;
  curve_points_fatigue: Array<{ afterKj: number; points: CurvePoint[] }> | null;
};

const num = (value: unknown) => {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const sexOf = (value: string | null): Sex | null => (value === "man" || value === "vrouw" ? value : null);

function zwiftIdOf(value: string | null): number | null {
  const id = Number(String(value ?? "").trim());
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function loadConnection(admin: Admin, profileId: string): Promise<IntervalsConnectionRow | null> {
  const { data } = await admin
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, profiles(ftp_watts, weight_kg, auto_sync_physique)")
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as unknown as IntervalsConnectionRow | null) ?? null;
}

/** Ritten op de fiets vanaf `from`, per dag in Amsterdamse tijd. */
async function loadRides(admin: Admin, profileId: string, from: string): Promise<RideDay[]> {
  // In pagina's: over jaren historie zijn het er meer dan PostgREST in één keer geeft.
  const rows: Array<{ start_date: string; moving_time_seconds: number | null; sport_type: string | null }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await admin
      .from("strava_activities")
      .select("start_date, moving_time_seconds, sport_type")
      .eq("profile_id", profileId)
      .gte("start_date", `${from}T00:00:00Z`)
      .order("start_date", { ascending: true })
      .range(offset, offset + PAGE - 1);
    rows.push(...((data ?? []) as typeof rows));
    if (!data || data.length < PAGE) break;
  }
  return rows
    .filter((row) => isCyclingSportType(row.sport_type))
    .map((row) => ({ day: amsterdamDayKey(new Date(row.start_date)), minutes: Math.round((row.moving_time_seconds ?? 0) / 60) }));
}

/**
 * Geplande trainingen vanaf `from`: zonder vervangen workouts en zonder
 * niet-toegepaste dagvoorstellen, net als in de voedingsmodule.
 */
async function loadPlanned(admin: Admin, profileId: string, from: string, to: string): Promise<PlannedWorkout[]> {
  const [{ data: workouts }, { data: drafts }] = await Promise.all([
    admin
      .from("training_workouts")
      .select("scheduled_at, duration_minutes, intensity, status, plan_id")
      .eq("profile_id", profileId)
      .is("superseded_at", null)
      .gte("scheduled_at", `${from}T00:00:00Z`)
      .lt("scheduled_at", `${to}T00:00:00Z`),
    admin
      .from("training_plans")
      .select("id")
      .eq("profile_id", profileId)
      .eq("status", "draft")
      .eq("adaptation_kind", "daily"),
  ]);
  const skip = new Set((drafts ?? []).map((plan) => plan.id as string));
  return ((workouts ?? []) as Array<{
    scheduled_at: string;
    duration_minutes: number | null;
    intensity: string | null;
    status: string | null;
    plan_id: string | null;
  }>)
    .filter((row) => !skip.has(row.plan_id ?? "") && row.intensity !== "rest")
    .map((row) => ({
      day: amsterdamDayKey(new Date(row.scheduled_at)),
      minutes: row.duration_minutes ?? 0,
      status: row.status === "completed" ? "completed" : row.status === "skipped" ? "skipped" : "planned",
      intensity: row.intensity,
    }));
}

/** De invoer voor de consistentie tot de week van `day`. */
async function loadConsistency(admin: Admin, profileId: string, day: string, loads?: Map<string, number>): Promise<ConsistencyInput> {
  const from = shiftDay(mondayKey(day), -HISTORY_WEEKS * 7 - 7);
  // De norm per week is wat het schema plande (zie consistencyFrom), niet de
  // beschikbaarheid: die is een plafond voor het plannen.
  const [allRides, planned] = await Promise.all([loadRides(admin, profileId, from), loadPlanned(admin, profileId, from, mondayKey(day))]);
  return consistencyAt(allRides, planned, day, loads);
}

/** De TSS per dag uit de wellness van intervals.icu (de belasting voor de CTL). */
function loadsFrom(wellness: IntervalsWellness[]): Map<string, number> {
  const loads = new Map<string, number>();
  for (const row of wellness) {
    const load = Number(row.ctl_load ?? row.ctlLoad);
    if (Number.isFinite(load)) loads.set(row.id, load);
  }
  return loads;
}

/** De consistentie tot `day` uit ritten en planning die al geladen zijn (mag ruimer). */
function consistencyAt(allRides: RideDay[], planned: PlannedWorkout[], day: string, loads?: Map<string, number>): ConsistencyInput {
  return {
    weeks: consistencyWeeks(allRides, planned, day, HISTORY_WEEKS, loads),
    compliance: complianceFrom(planned, shiftDay(mondayKey(day), -CONSISTENCY_WEEKS * 7), day),
  };
}

function latestWellness(rows: IntervalsWellness[]): IntervalsWellness | null {
  const filled = rows.filter((row) => Number.isFinite(Number(row.ctl)));
  return filled.reduce<IntervalsWellness | null>((best, row) => (!best || row.id > best.id ? row : best), null);
}

/** Alles wat de steen van dit lid nu nodig heeft. Ontbrekende bronnen blijven leeg. */
export async function collectBriljant(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<Collected> {
  const [{ data: profile }, { data: power }, connection] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg, zwift_id").eq("id", profileId).maybeSingle(),
    admin
      .from("rider_power_profiles")
      .select("wkg_15s, wkg_1m, wkg_5m, wkg_20m, weight_kg, curve_points, curve_points_fatigue")
      .eq("profile_id", profileId)
      .maybeSingle(),
    loadConnection(admin, profileId),
  ]);
  const p = profile as ProfileRow | null;
  const pw = power as PowerRow | null;

  let ctl: number | null = null;
  let weather: Weather = null;
  let wellness: IntervalsWellness[] = [];
  let wellnessOk = true;
  if (connection?.athlete_id) {
    // Ruim een jaar: CTL van de laatste dag, het laatste gewicht dat er staat, en de
    // TSS per dag voor de consistentie (die kijkt tot een jaar terug).
    const fetched = await wellnessWithRetry(connection.api_key, connection.athlete_id, HISTORY_WEEKS * 7 + 21);
    wellnessOk = fetched != null;
    wellness = fetched ?? [];
    const latest = latestWellness(wellness);
    if (latest) {
      ctl = Number(latest.ctl);
      const atl = Number(latest.atl);
      if (Number.isFinite(atl)) weather = { tsb: Math.round(ctl - atl), atl: Math.round(atl) };
    }
  }

  const zwiftId = zwiftIdOf(p?.zwift_id ?? null);
  const zrs = zwiftId ? ((await loadRiderMetrics([zwiftId])).get(zwiftId)?.racingScore ?? null) : null;
  // Zonder gewicht geen W/kg: dan uit intervals.icu, en anders het Zwift-gewicht
  // (eigenaar, 2026-10-21). Bij vijf leden stond er nergens een gewicht.
  const weightKg =
    num(pw?.weight_kg) ??
    num(p?.weight_kg) ??
    latestWellnessValue(wellness, "weight") ??
    (zwiftId ? await fetchZwiftWeightKg(String(zwiftId)).catch(() => null) : null);
  const fromCurve = powerFromCurve(pw?.curve_points ?? [], weightKg);
  const consistency = await loadConsistency(admin, profileId, today, loadsFrom(wellness));

  return {
    input: {
      sex: sexOf(p?.sex ?? null),
      weightKg,
      // De W/kg uit het profiel, en waar die ontbreekt uit de curve met het gewicht hierboven.
      power: pw
        ? {
            s15: num(pw.wkg_15s) ?? fromCurve?.s15 ?? null,
            m1: num(pw.wkg_1m) ?? fromCurve?.m1 ?? null,
            m5: num(pw.wkg_5m) ?? fromCurve?.m5 ?? null,
            m20: num(pw.wkg_20m) ?? fromCurve?.m20 ?? null,
          }
        : null,
      fatigue: fatigueInputs(pw?.curve_points ?? [], pw?.curve_points_fatigue ?? []),
      ctl,
      zrs,
    },
    consistency,
    weather,
    wellness: wellnessOk,
  };
}

/**
 * Voor de wekelijkse job: het powerprofiel en de ZRS verversen als ze oud zijn.
 * Nu gebeurt dat alleen via een knop op Teams of een racebriefing.
 */
export async function refreshSources(admin: Admin, profileId: string, budgetMs: number): Promise<void> {
  const [{ data: power }, { data: profile }, connection] = await Promise.all([
    admin.from("rider_power_profiles").select("synced_at").eq("profile_id", profileId).maybeSingle(),
    admin.from("profiles").select("zwift_id").eq("id", profileId).maybeSingle(),
    loadConnection(admin, profileId),
  ]);
  const syncedAt = (power as { synced_at: string | null } | null)?.synced_at;
  if (connection && (!syncedAt || Date.now() - Date.parse(syncedAt) > POWER_STALE_MS)) {
    await syncOnePowerProfile(admin, connection).catch(() => null);
  }
  const zwiftId = zwiftIdOf((profile as { zwift_id: string | null } | null)?.zwift_id ?? null);
  if (zwiftId) {
    const known = await loadRiderMetrics([zwiftId]);
    await refreshRiderMetrics([zwiftId], known, { budgetMs }).catch(() => null);
  }
}

/** De weeksnapshot, met in `provenance.wellness` of intervals.icu antwoordde. */
function weekRow(profileId: string, today: string, collected: Collected): SnapshotRow {
  const row = snapshotFrom({ profileId, day: today, source: "week", input: collected.input, consistency: collected.consistency });
  return { ...row, provenance: { ...row.provenance, wellness: collected.wellness } };
}

/**
 * De snapshot van deze week vastleggen (overschrijft die van deze week). Mislukte
 * de wellness, dan staat dat in `provenance.wellness` en probeert de job het later
 * opnieuw.
 */
export async function storeWeek(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<SnapshotRow> {
  const collected = await collectBriljant(admin, profileId, today);
  const row = weekRow(profileId, today, collected);
  const { error } = await admin.from("zwbriljant_snapshots").upsert(row, { onConflict: "profile_id,week" });
  if (error) throw new Error(error.message);
  return row;
}

/**
 * Bij het openen van de pagina: het lid gebruikt ZWBriljant (een voorkeur zonder
 * toestemming om te delen, zodat de wekelijkse job het meeneemt) en de snapshot
 * van deze week uit wat de pagina toch al verzamelde. Fouten zijn stil: zonder
 * migratie 0265 werkt de pagina gewoon, alleen zonder historie.
 */
export async function rememberVisit(admin: Admin, profileId: string, collected: Collected, today = amsterdamDayKey()) {
  const row = weekRow(profileId, today, collected);
  await Promise.all([
    admin.from("zwbriljant_preferences").upsert({ profile_id: profileId }, { onConflict: "profile_id", ignoreDuplicates: true }),
    // Zonder wellness geen goede snapshot overschrijven: alleen schrijven als er nog geen is.
    admin
      .from("zwbriljant_snapshots")
      .upsert(row, { onConflict: "profile_id,week", ignoreDuplicates: !collected.wellness }),
  ]).catch(() => null);
}

/** Heeft dit lid een terugblik over de hele historie op de huidige schaal? */
export async function hasTerugblik(admin: Admin, profileId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("zwbriljant_snapshots")
    .select("week")
    .eq("profile_id", profileId)
    .eq("source", "terugblik")
    .eq("provenance->>scale", SCALE_VERSION)
    .eq("provenance->>terugblik", TERUGBLIK_SPAN)
    .limit(1);
  // Bij een fout niet opnieuw beginnen: dat zou bij elk bezoek gebeuren.
  return error ? true : (data ?? []).length > 0;
}

/** De eigen scores van de afgelopen weken, oud naar nieuw, zonder de huidige week; leeg zonder migratie. */
export async function loadHistory(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<HistoryPoint[]> {
  const current = mondayKey(today);
  const { data, error } = await admin
    .from("zwbriljant_snapshots")
    .select("week, facets, consistency")
    .eq("profile_id", profileId)
    .eq("provenance->>scale", SCALE_VERSION)
    .lt("week", current)
    .gte("week", shiftDay(current, -7 * 12))
    .order("week", { ascending: true });
  if (error) return [];
  type Row = { week: string; facets: StoredSnapshot["facets"] | null; consistency: number | string | null };
  const byWeek = new Map(
    ((data ?? []) as Row[]).map((row) => [
      row.week,
      storedScore(row.facets ?? {}, row.consistency == null ? null : Number(row.consistency)),
    ]),
  );
  // Elke week een plek, ook zonder snapshot, zodat "vier weken geleden" klopt.
  return Array.from({ length: 12 }, (_, index) => {
    const week = shiftDay(current, -7 * (12 - index));
    return { week, score: byWeek.get(week) ?? null };
  });
}

/**
 * Eenmalig: per maand van je hele intervals.icu-historie een snapshot (de beste 90
 * dagen tot het eind van die maand en de CTL van die dag) en de consistentie tot die
 * maand. Durability uit de vermoeide curves per bereik (met de huidige kJ-drempels);
 * racen krijgt de ZRS van nu. Weeksnapshots worden
 * niet overschreven; een eerdere terugblik wel, en pas na het schrijven van de nieuwe
 * gaat de oude weg, zodat een afgebroken run niets kwijtmaakt.
 */
export async function storeTerugblik(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<number> {
  const connection = await loadConnection(admin, profileId);
  let wellness: IntervalsWellness[] = [];
  // De kJ-drempels van de vermoeide curves (after_kj0/after_kj1 in intervals.icu):
  // per bereik geeft intervals die curves met `-kj0`/`-kj1`, maar zonder de drempel
  // zelf. Die staat in de gewone vraag met vermoeide curves; het zijn de huidige
  // instellingen, ook voor maanden van voordat ze zo stonden.
  let thresholds: number[] = [];
  if (connection?.athlete_id) {
    [wellness, thresholds] = await Promise.all([
      fetchIntervalsWellness(connection.api_key, connection.athlete_id, TERUGBLIK_MAX_MONTHS * 31 + 7).catch(() => []),
      fetchIntervalsPowerCurve(connection.api_key, connection.athlete_id, "90d", { includeFatigue: true })
        .then((curve) => curve.fatigueCurves.map((fatigued) => fatigued.afterKj).slice(0, 2))
        .catch(() => []),
    ]);
  }
  const firstDay = wellness
    .filter((row) => Number(row.ctl) > 0)
    .reduce<string | null>((first, row) => (!first || row.id < first ? row.id : first), null);
  const months = firstDay ? monthsSince(today, firstDay, TERUGBLIK_MAX_MONTHS) : TERUGBLIK_FALLBACK_MONTHS;
  const ends = monthEnds(today, Math.max(1, months));
  const from = shiftDay(ends[0], -HISTORY_WEEKS * 7 - 7);

  const [{ data: profile }, rides, planned, curves, { data: weeks }] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg, zwift_id").eq("id", profileId).maybeSingle(),
    loadRides(admin, profileId, from),
    loadPlanned(admin, profileId, from, mondayKey(today)),
    connection?.athlete_id
      ? fetchIntervalsPowerCurveRanges(
          connection.api_key,
          connection.athlete_id,
          ends.flatMap((end) => [curveRange(end), ...thresholds.map((_, index) => `${curveRange(end)}-kj${index}`)]),
        ).catch(
          () => new Map<string, CurvePoint[]>(),
        )
      : Promise.resolve(new Map<string, CurvePoint[]>()),
    admin
      .from("zwbriljant_snapshots")
      .select("week, source, facets, provenance")
      .eq("profile_id", profileId)
      .eq("provenance->>scale", SCALE_VERSION),
  ]);
  const p = profile as ProfileRow | null;
  const byDay = new Map(wellness.map((row) => [row.id, row]));
  const loads = loadsFrom(wellness);
  // Racen heeft geen historie: elke maand krijgt de ZRS van nu.
  const zwiftId = zwiftIdOf(p?.zwift_id ?? null);
  // Een maand zonder gewicht: het profiel, het laatste gewicht in intervals.icu, of Zwift.
  const fallbackWeight =
    num(p?.weight_kg) ??
    latestWellnessValue(wellness, "weight") ??
    (zwiftId ? await fetchZwiftWeightKg(String(zwiftId)).catch(() => null) : null);
  const zrs = zwiftId ? ((await loadRiderMetrics([zwiftId]).catch(() => new Map())).get(zwiftId)?.racingScore ?? null) : null;
  type Existing = { week: string; source: string; facets: { racen?: number | null } | null; provenance: { racen?: string } | null };
  const existing = (weeks ?? []) as Existing[];
  const taken = new Set(existing.filter((row) => row.source === "week").map((row) => row.week));
  // De ZRS van vroeger die de job al opzocht, blijft bij een nieuwe terugblik staan.
  const zrsBefore = new Map(
    existing
      .filter((row) => row.source === "terugblik" && row.provenance?.racen === "historie" && row.facets?.racen != null)
      .map((row) => [row.week, valueAt(ZRS_ANCHORS, Number(row.facets!.racen))]),
  );

  const rows = ends.map((end) => {
    const day = byDay.get(end);
    const weightKg = num(day?.weight) ?? fallbackWeight;
    const ctl = day && Number.isFinite(Number(day.ctl)) ? Number(day.ctl) : null;
    const input: BriljantInput = {
      sex: sexOf(p?.sex ?? null),
      weightKg,
      power: powerFromCurve(curves.get(curveRange(end)) ?? [], weightKg),
      // Durability net als nu: de beste minuut vers tegen die na elke drempel.
      fatigue: fatigueInputs(
        curves.get(curveRange(end)) ?? [],
        thresholds.map((afterKj, index) => ({ afterKj, points: curves.get(`${curveRange(end)}-kj${index}`) ?? [] })),
      ),
      ctl,
      zrs,
    };
    // De week na het maandeinde: de consistentie telt dan tot en met die maand.
    const consistency = consistencyAt(rides, planned, shiftDay(end, 1), loads);
    const earlier = zrsBefore.get(mondayKey(end));
    if (earlier != null) input.zrs = earlier;
    const row = snapshotFrom({ profileId, day: end, source: "terugblik", input, consistency });
    return {
      ...row,
      provenance: { ...row.provenance, terugblik: TERUGBLIK_SPAN, ...(earlier != null ? { racen: "historie" as const } : {}) },
    };
  });
  const useful = terugblikRows(rows).filter((row) => !taken.has(row.week));

  if (useful.length > 0) {
    const { error } = await admin.from("zwbriljant_snapshots").upsert(useful, { onConflict: "profile_id,week" });
    if (error) throw new Error(error.message);
  }
  // Pas nu opruimen: een eerdere terugblik buiten de nieuwe weken, en snapshots van
  // oudere schalen (daarin staan alleen niveaus, geen metingen om mee te herrekenen).
  // De vorige schaal blijft staan: die zet een migratie om (0269).
  const kept = useful.map((row) => row.week);
  let stale = admin.from("zwbriljant_snapshots").delete().eq("profile_id", profileId).eq("source", "terugblik");
  if (kept.length > 0) stale = stale.not("week", "in", `(${kept.join(",")})`);
  await stale;
  await admin
    .from("zwbriljant_snapshots")
    .delete()
    .eq("profile_id", profileId)
    .or(
      `provenance->>scale.is.null,and(provenance->>scale.neq.${SCALE_VERSION},provenance->>scale.neq.${PREVIOUS_SCALE_VERSION})`,
    );
  return useful.length;
}

type SnapshotRecord = { profile_id: string; week: string; score: number | string | null; facets: unknown; consistency: number | string | null };

const toStored = (row: SnapshotRecord): StoredSnapshot => {
  const facets = (row.facets ?? {}) as StoredSnapshot["facets"];
  const consistency = row.consistency == null ? null : Number(row.consistency);
  return { week: row.week, score: storedScore(facets, consistency), facets, consistency };
};

/** Alle eigen snapshots van de huidige schalen, oud naar nieuw; leeg zonder migratie. */
export async function loadOwnSnapshots(admin: Admin, profileId: string): Promise<StoredSnapshot[]> {
  const { data, error } = await admin
    .from("zwbriljant_snapshots")
    .select("profile_id, week, score, facets, consistency")
    .eq("profile_id", profileId)
    .eq("provenance->>scale", SCALE_VERSION)
    .order("week", { ascending: true });
  return error ? [] : ((data ?? []) as SnapshotRecord[]).map(toStored);
}

/** Zoveel weken terug telt een snapshot nog mee voor het ZWB-gemiddelde. */
const AVERAGE_WEEKS = 8;

/**
 * Het ZWB-gemiddelde over de laatste snapshot van iedereen die ZWBriljant
 * gebruikt, en apart van mannen en van vrouwen naar het geslacht in het profiel
 * (anoniem, pas vanaf vijf leden; zie clubAverage). Met de admin-client: de
 * gemiddelden verlaten de server alleen als getal, nooit per lid.
 */
export async function loadClubAverages(admin: Admin, today = amsterdamDayKey()) {
  const { data, error } = await admin
    .from("zwbriljant_snapshots")
    .select("profile_id, week, score, facets, consistency")
    .eq("provenance->>scale", SCALE_VERSION)
    .gte("week", shiftDay(mondayKey(today), -7 * AVERAGE_WEEKS))
    .order("week", { ascending: false });
  if (error) return clubAverages([]);
  const latest = new Map<string, StoredSnapshot>();
  for (const row of (data ?? []) as SnapshotRecord[]) if (!latest.has(row.profile_id)) latest.set(row.profile_id, toStored(row));
  const { data: profiles } = latest.size
    ? await admin.from("profiles").select("id, sex").in("id", [...latest.keys()])
    : { data: [] };
  const sexById = new Map(((profiles ?? []) as Array<{ id: string; sex: string | null }>).map((row) => [row.id, sexOf(row.sex)]));
  return clubAverages([...latest].map(([id, snapshot]) => ({ ...snapshot, sex: sexById.get(id) ?? null })));
}

/** Deelt dit lid zijn steen met andere leden? */
export async function loadSharing(admin: Admin, profileId: string): Promise<boolean> {
  const { data } = await admin.from("zwbriljant_preferences").select("visible").eq("profile_id", profileId).maybeSingle();
  // Standaard gedeeld (0267); alleen verbergen zet het uit.
  return (data as { visible: boolean } | null)?.visible ?? true;
}

type UserClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>;

/**
 * Voor de galerij: van elk lid van wie je de steen mag zien de laatste steen, met naam.
 * Met de sessie van het lid, zodat RLS beslist.
 */
export async function loadHallStones(
  supabase: UserClient,
  viewerId: string,
): Promise<Array<{ id: string; name: string; region: string | null; snapshot: StoredSnapshot }>> {
  const { data, error } = await supabase
    .from("zwbriljant_snapshots")
    .select("profile_id, week, score, facets, consistency")
    .neq("profile_id", viewerId)
    .eq("provenance->>scale", SCALE_VERSION)
    .not("score", "is", null)
    .order("week", { ascending: false })
    .limit(5000);
  if (error) return [];
  const latest = new Map<string, SnapshotRecord>();
  for (const row of (data ?? []) as SnapshotRecord[]) if (!latest.has(row.profile_id)) latest.set(row.profile_id, row);
  if (latest.size === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, region, profile_visibility")
    .in("id", [...latest.keys()]);
  type Row = { id: string; display_name: string | null; region: string | null; profile_visibility: Record<string, boolean> | null };
  const byId = new Map(((profiles ?? []) as Row[]).map((row) => [row.id, row]));
  return [...latest.entries()]
    .map(([id, row]) => {
      const profile = byId.get(id);
      // De regio alleen als het lid die op zijn profiel laat zien (zoals op /leden).
      const region = profile?.profile_visibility?.region === false ? null : profile?.region?.trim() || null;
      return { id, name: profile?.display_name?.trim() || "Lid", region, snapshot: toStored(row) };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

