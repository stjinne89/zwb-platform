import "server-only";

// De ZWBeter-berg op de server: per lid de waarden verzamelen, de snapshot van
// deze week vastleggen en bij het eerste gebruik een terugblik maken.
//
// Altijd met de admin-client: snapshots schrijft alleen de server (0265). Lezen
// voor de pagina gaat met de sessie van het lid, zodat RLS bepaalt welke bergen
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
import type { BergInput, RideDay } from "./score";
import type { Sex } from "./norms";
import {
  curveRange,
  fatigueInputs,
  monthEnds,
  powerFromCurve,
  shiftDay,
  snapshotFrom,
  type CurvePoint,
  type SnapshotRow,
} from "./snapshot";
import { CONSISTENCY_WEEKS } from "./score";

type Admin = ReturnType<typeof createAdminClient>;

/** Ouder dan dit wordt het powerprofiel in de wekelijkse job ververst. */
const POWER_STALE_MS = 6 * 24 * 60 * 60 * 1000;
const TERUGBLIK_MONTHS = 12;

export type Weather = { tsb: number; atl: number } | null;

export type Collected = {
  input: BergInput;
  rides: RideDay[];
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
  synced_at: string | null;
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
    .limit(2000);
  return ((data ?? []) as Array<{ start_date: string; moving_time_seconds: number | null; sport_type: string | null }>)
    .filter((row) => isCyclingSportType(row.sport_type))
    .map((row) => ({ day: amsterdamDayKey(new Date(row.start_date)), minutes: Math.round((row.moving_time_seconds ?? 0) / 60) }));
}

function latestWellness(rows: IntervalsWellness[]): IntervalsWellness | null {
  const filled = rows.filter((row) => Number.isFinite(Number(row.ctl)));
  return filled.reduce<IntervalsWellness | null>((best, row) => (!best || row.id > best.id ? row : best), null);
}

/** Alles wat de berg van dit lid nu nodig heeft. Ontbrekende bronnen blijven leeg. */
export async function collectBerg(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<Collected> {
  const [{ data: profile }, { data: power }, connection, rides] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg, zwift_id").eq("id", profileId).maybeSingle(),
    admin
      .from("rider_power_profiles")
      .select("wkg_15s, wkg_1m, wkg_5m, wkg_20m, weight_kg, curve_points, curve_points_fatigue, synced_at")
      .eq("profile_id", profileId)
      .maybeSingle(),
    loadConnection(admin, profileId),
    loadRides(admin, profileId, shiftDay(today, -CONSISTENCY_WEEKS * 7)),
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
      power: pw
        ? { s15: num(pw.wkg_15s), m1: num(pw.wkg_1m), m5: num(pw.wkg_5m), m20: num(pw.wkg_20m) }
        : null,
      fatigue: fatigueInputs(pw?.curve_points ?? [], pw?.curve_points_fatigue ?? []),
      ctl,
      zrs,
    },
    rides,
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
  const collected = await collectBerg(admin, profileId, today);
  const row = snapshotFrom({ profileId, day: today, source: "week", input: collected.input, rides: collected.rides });
  const { error } = await admin.from("zwbeter_berg_snapshots").upsert(row, { onConflict: "profile_id,week" });
  if (error) throw new Error(error.message);
  return row;
}

/**
 * Eenmalig bij het eerste gebruik: per maand van het afgelopen jaar een snapshot
 * uit intervals.icu (de beste 90 dagen tot het eind van die maand en de CTL van
 * die dag) en de ritten. Durability en ZRS hebben geen historie en blijven leeg.
 * Bestaande weken worden niet overschreven.
 */
export async function storeTerugblik(admin: Admin, profileId: string, today = amsterdamDayKey()): Promise<number> {
  const connection = await loadConnection(admin, profileId);
  const ends = monthEnds(today, TERUGBLIK_MONTHS);
  const [{ data: profile }, rides] = await Promise.all([
    admin.from("profiles").select("sex, weight_kg").eq("id", profileId).maybeSingle(),
    loadRides(admin, profileId, shiftDay(ends[0], -CONSISTENCY_WEEKS * 7)),
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

  const rows = ends.map((end) => {
    const day = byDay.get(end);
    const weightKg = num(day?.weight) ?? num(p?.weight_kg);
    const ctl = day && Number.isFinite(Number(day.ctl)) ? Number(day.ctl) : null;
    const input: BergInput = {
      sex: sexOf(p?.sex ?? null),
      weightKg,
      power: powerFromCurve(curves.get(curveRange(end)) ?? [], weightKg),
      fatigue: [],
      ctl,
      zrs: null,
    };
    const windowStart = shiftDay(end, -CONSISTENCY_WEEKS * 7);
    const window = rides.filter((ride) => ride.day > windowStart && ride.day <= end);
    return snapshotFrom({ profileId, day: end, source: "terugblik", input, rides: window });
  });

  const useful = rows.filter((row) => row.height != null || row.consistency != null);
  if (useful.length === 0) return 0;
  const { error } = await admin
    .from("zwbeter_berg_snapshots")
    .upsert(useful, { onConflict: "profile_id,week", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return useful.length;
}
