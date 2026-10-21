import "server-only";

// ZWBriljant op de server: per lid de waarden verzamelen, de snapshot van
// deze week vastleggen en bij het eerste gebruik een terugblik maken.
//
// Altijd met de admin-client: snapshots schrijft alleen de server (0265). Lezen
// voor de pagina gaat met de sessie van het lid, zodat RLS bepaalt welke stenen
// van anderen zichtbaar zijn.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchIntervalsPowerCurveRanges,
  fetchIntervalsWellness,
  type IntervalsWellness,
} from "@/lib/intervals/client";
import { loadRiderMetrics, refreshRiderMetrics } from "@/lib/race-briefing/metrics";
import { isCyclingSportType } from "@/lib/strava/sports";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { syncOnePowerProfile, type IntervalsConnectionRow } from "@/lib/teams/power-sync";
import { CONSISTENCY_WEEKS, type BriljantInput, type ConsistencyInput, type HistoryPoint } from "./score";
import type { Sex } from "./norms";
import {
  complianceFrom,
  consistencyWeeks,
  curveRange,
  fatigueInputs,
  mondayKey,
  monthEnds,
  powerFromCurve,
  shiftDay,
  snapshotFrom,
  type CurvePoint,
  type PlannedWorkout,
  type RideDay,
  type SnapshotRow,
} from "./snapshot";

type Admin = ReturnType<typeof createAdminClient>;

/** Ouder dan dit wordt het powerprofiel in de wekelijkse job ververst. */
const POWER_STALE_MS = 6 * 24 * 60 * 60 * 1000;
const TERUGBLIK_MONTHS = 12;
/** Zoveel weken terug voor de norm (mediaan) en de reeks. */
const HISTORY_WEEKS = 52;

export type Weather = { tsb: number; atl: number } | null;

export type Collected = {
  input: BriljantInput;
  consistency: ConsistencyInput;
  weather: Weather;
};

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
  const { data } = await admin
    .from("strava_activities")
    .select("start_date, moving_time_seconds, sport_type")
    .eq("profile_id", profileId)
    .gte("start_date", `${from}T00:00:00Z`)
    .order("start_date", { ascending: true })
    .limit(3000);
  return ((data ?? []) as Array<{ start_date: string; moving_time_seconds: number | null; sport_type: string | null }>)
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
    }));
}

/** De invoer voor de consistentie tot de week van `day`. */
async function loadConsistency(admin: Admin, profileId: string, day: string, rides?: RideDay[]): Promise<ConsistencyInput> {
  const from = shiftDay(mondayKey(day), -HISTORY_WEEKS * 7 - 7);
  // De norm per week is wat het schema plande (zie consistencyFrom), niet de
  // beschikbaarheid: die is een plafond voor het plannen.
  const [allRides, planned] = await Promise.all([
    rides ? Promise.resolve(rides) : loadRides(admin, profileId, from),
    loadPlanned(admin, profileId, from, mondayKey(day)),
  ]);
  return {
    weeks: consistencyWeeks(allRides, planned, day, HISTORY_WEEKS),
    compliance: complianceFrom(planned, shiftDay(mondayKey(day), -CONSISTENCY_WEEKS * 7), day),
  };
}

function latestWellness(rows: IntervalsWellness[]): IntervalsWellness | null {
  const filled = rows.filter((row) => Number.isFinite(Number(row.ctl)));
  return filled.reduce<IntervalsWellness | null>((best, row) => (!best || row.id > best.id ? row : best), null);
}

/** Alles wat de steen van dit lid nu nodig heeft. Ontbrekende bronnen blijven leeg. */
export async function collectBriljant(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<Collected> {
  const [{ data: profile }, { data: power }, connection, consistency] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg, zwift_id").eq("id", profileId).maybeSingle(),
    admin
      .from("rider_power_profiles")
      .select("wkg_15s, wkg_1m, wkg_5m, wkg_20m, weight_kg, curve_points, curve_points_fatigue")
      .eq("profile_id", profileId)
      .maybeSingle(),
    loadConnection(admin, profileId),
    loadConsistency(admin, profileId, today),
  ]);
  const p = profile as ProfileRow | null;
  const pw = power as PowerRow | null;
  const weightKg = num(pw?.weight_kg) ?? num(p?.weight_kg);

  let ctl: number | null = null;
  let weather: Weather = null;
  if (connection?.athlete_id) {
    const wellness = await fetchIntervalsWellness(connection.api_key, connection.athlete_id, 14).catch(() => []);
    const latest = latestWellness(wellness);
    if (latest) {
      ctl = Number(latest.ctl);
      const atl = Number(latest.atl);
      if (Number.isFinite(atl)) weather = { tsb: Math.round(ctl - atl), atl: Math.round(atl) };
    }
  }

  const zwiftId = zwiftIdOf(p?.zwift_id ?? null);
  const zrs = zwiftId ? ((await loadRiderMetrics([zwiftId])).get(zwiftId)?.racingScore ?? null) : null;

  return {
    input: {
      sex: sexOf(p?.sex ?? null),
      weightKg,
      power: pw ? { s15: num(pw.wkg_15s), m1: num(pw.wkg_1m), m5: num(pw.wkg_5m), m20: num(pw.wkg_20m) } : null,
      fatigue: fatigueInputs(pw?.curve_points ?? [], pw?.curve_points_fatigue ?? []),
      ctl,
      zrs,
    },
    consistency,
    weather,
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

/** De snapshot van deze week vastleggen (overschrijft die van deze week). */
export async function storeWeek(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<SnapshotRow> {
  const collected = await collectBriljant(admin, profileId, today);
  const row = snapshotFrom({
    profileId,
    day: today,
    source: "week",
    input: collected.input,
    consistency: collected.consistency,
  });
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
  const row = snapshotFrom({ profileId, day: today, source: "week", input: collected.input, consistency: collected.consistency });
  await Promise.all([
    admin.from("zwbriljant_preferences").upsert({ profile_id: profileId }, { onConflict: "profile_id", ignoreDuplicates: true }),
    admin.from("zwbriljant_snapshots").upsert(row, { onConflict: "profile_id,week" }),
  ]).catch(() => null);
}

/** De eigen scores van de afgelopen weken, oud naar nieuw, zonder de huidige week; leeg zonder migratie. */
export async function loadHistory(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<HistoryPoint[]> {
  const current = mondayKey(today);
  const { data, error } = await admin
    .from("zwbriljant_snapshots")
    .select("week, score")
    .eq("profile_id", profileId)
    .lt("week", current)
    .gte("week", shiftDay(current, -7 * 12))
    .order("week", { ascending: true });
  if (error) return [];
  const byWeek = new Map(((data ?? []) as Array<{ week: string; score: number | string | null }>).map((row) => [row.week, row.score]));
  // Elke week een plek, ook zonder snapshot, zodat "vier weken geleden" klopt.
  return Array.from({ length: 12 }, (_, index) => {
    const week = shiftDay(current, -7 * (12 - index));
    const score = byWeek.get(week);
    return { week, score: score == null ? null : Number(score) };
  });
}

/**
 * Eenmalig bij het eerste gebruik: per maand van het afgelopen jaar een snapshot
 * uit intervals.icu (de beste 90 dagen tot het eind van die maand en de CTL van
 * die dag) en de consistentie tot die maand. Durability en ZRS hebben geen
 * historie en blijven leeg. Bestaande weken worden niet overschreven.
 */
export async function storeTerugblik(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<number> {
  const connection = await loadConnection(admin, profileId);
  const ends = monthEnds(today, TERUGBLIK_MONTHS);
  const [{ data: profile }, rides] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg").eq("id", profileId).maybeSingle(),
    loadRides(admin, profileId, shiftDay(ends[0], -HISTORY_WEEKS * 7 - 7)),
  ]);
  const p = profile as Pick<ProfileRow, "sex" | "weight_kg"> | null;

  let curves = new Map<string, CurvePoint[]>();
  let wellness: IntervalsWellness[] = [];
  if (connection?.athlete_id) {
    [curves, wellness] = await Promise.all([
      fetchIntervalsPowerCurveRanges(connection.api_key, connection.athlete_id, ends.map(curveRange)).catch(
        () => new Map<string, CurvePoint[]>(),
      ),
      fetchIntervalsWellness(connection.api_key, connection.athlete_id, TERUGBLIK_MONTHS * 31 + 7).catch(() => []),
    ]);
  }
  const byDay = new Map(wellness.map((row) => [row.id, row]));

  const rows: SnapshotRow[] = [];
  for (const end of ends) {
    const day = byDay.get(end);
    const weightKg = num(day?.weight) ?? num(p?.weight_kg);
    const ctl = day && Number.isFinite(Number(day.ctl)) ? Number(day.ctl) : null;
    const input: BriljantInput = {
      sex: sexOf(p?.sex ?? null),
      weightKg,
      power: powerFromCurve(curves.get(curveRange(end)) ?? [], weightKg),
      fatigue: [],
      ctl,
      zrs: null,
    };
    // De week na het maandeinde: de consistentie telt dan tot en met die maand.
    const consistency = await loadConsistency(admin, profileId, shiftDay(end, 1), rides);
    rows.push(snapshotFrom({ profileId, day: end, source: "terugblik", input, consistency }));
  }

  const useful = rows.filter((row) => row.score != null || row.consistency != null);
  if (useful.length === 0) return 0;
  const { error } = await admin
    .from("zwbriljant_snapshots")
    .upsert(useful, { onConflict: "profile_id,week", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return useful.length;
}
