// Automatische inhaalslag voor segmentpogingen van oude buitenritten en segmentlijnen.
//
// Draait mee in de 5-minutenjob van de webhookverwerking, zodat er geen aparte
// cron-job.org-job nodig is. Webhook-events gaan altijd voor: deze stap krijgt alleen
// de tijd en het Strava-budget die daarna over zijn. Op 2026-09-13 stonden er ~6000
// ritten zonder pogingen open; handmatig via /beheer/segments waren dat ~1200 klikken.
//
// Het budget is bewust krapper dan voor interactief werk (50% van het kwartier, 60%
// van de dag): leden die net een rit uploaden mogen hier nooit op wachten.
//
// Elke run begint met één segmentlijn uit de voorrangslijst (meeste ZWB-rijders
// eerst): zonder hoogteprofiel geen inschatting, en wachten tot alle ritten binnen
// zijn kostte dagen. Zijn de ritten op, dan krijgt de hele run segmentlijnen.

import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import { ingestStravaActivity, type IngestOutcome } from "@/lib/strava/ingest-activity";
import { loadRateLimitUsage, shouldPauseForRateLimit } from "@/lib/strava/rate-limit-budget";
import type { StravaRateLimitUsage } from "@/lib/strava/activity-api";
import { fetchSegmentGeometry, type GeometryOutcome } from "./geometry-sync";

export const BACKFILL_BUDGET = { shortTermRatio: 0.5, dailyRatio: 0.6 } as const;
/** Een ritdetail duurt meestal onder de seconde; zonder deze marge geen nieuwe call. */
const MIN_REMAINING_MS = 2500;
// Bovengrens op de wachtrij die we per run ophalen, niet op wat we halen: de klok
// en het budget bepalen hoe ver we komen. Stond op 20 toen een run 8 s kreeg.
const MAX_ACTIVITIES_PER_RUN = 60;
const MAX_FAILURES_PER_RUN = 3;
/** Segmentlijnen per run zolang er nog ritten openstaan, en daarna. */
const GEOMETRY_WHILE_ACTIVITIES = 1;
const GEOMETRY_WHEN_DONE = 6;
const PRIORITY_TIMEOUT_MS = 2000;

export type ScheduledBackfillResult = {
  fetched: number;
  removed: number;
  /** Onvolledig antwoord van Strava: afgevinkt zonder pogingen, anders blokkeert hij de rij. */
  abandoned: number;
  failed: number;
  remaining: number;
  geometry: number;
  stopped: "done" | "deadline" | "budget" | "rate_limited" | "failures" | null;
};

type Connection = StravaConnection & { strava_athlete_id: number };

export type BackfillDeps = {
  now: () => number;
  loadUsage: () => Promise<StravaRateLimitUsage | null>;
  tokenFor: (connection: Connection) => Promise<string>;
  ingest: (connection: Connection, activityId: number, token: string) => Promise<IngestOutcome>;
  geometryCandidates: (limit: number) => Promise<Array<{ id: string; profile_id: string }>>;
  fetchGeometry: (token: string, segmentId: string) => Promise<GeometryOutcome>;
};

function defaultDeps(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): BackfillDeps {
  return {
    now: Date.now,
    loadUsage: () => loadRateLimitUsage(admin),
    tokenFor: (connection) => accessTokenFor(admin, connection),
    ingest: (connection, activityId, token) =>
      ingestStravaActivity(
        admin,
        { profileId: connection.profile_id, stravaAthleteId: Number(connection.strava_athlete_id) },
        activityId,
        token,
      ),
    geometryCandidates: async (limit) => {
      // Hard begrensd: 0155 liep op een koude cache tegen de statement timeout en at zo
      // het hele runbudget op. Zonder antwoord (of zonder migratie) alleen geen lijnen.
      try {
        const { data, error } = await admin.rpc("segment_geometry_priority", { p_limit: limit })
          .abortSignal(AbortSignal.timeout(PRIORITY_TIMEOUT_MS));
        return error ? [] : (data ?? []);
      } catch {
        return [];
      }
    },
    fetchGeometry: (token, segmentId) => fetchSegmentGeometry(admin, token, segmentId, BACKFILL_BUDGET),
  };
}

export async function runScheduledSegmentBackfill(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: { deadline: number; deps?: Partial<BackfillDeps> },
): Promise<ScheduledBackfillResult> {
  const deps = { ...defaultDeps(admin), ...options.deps };
  const result: ScheduledBackfillResult = { fetched: 0, removed: 0, abandoned: 0, failed: 0, remaining: 0, geometry: 0, stopped: null };
  const timeLeft = () => options.deadline - deps.now() >= MIN_REMAINING_MS;
  const budgetLeft = async () => !shouldPauseForRateLimit(await deps.loadUsage(), BACKFILL_BUDGET).pause;

  const connections = await eligibleConnections(admin);
  if (connections.size === 0) return { ...result, stopped: "done" };
  const profileIds = [...connections.keys()];

  const tokens = new Map<string, string | null>();
  const token = async (profileId: string) => {
    const connection = connections.get(profileId);
    if (!connection) return null;
    if (!tokens.has(profileId)) {
      try { tokens.set(profileId, await deps.tokenFor(connection)); }
      catch { tokens.set(profileId, null); }
    }
    return tokens.get(profileId) ?? null;
  };

  // true = doorgaan; false = run stoppen (result.stopped is dan gezet).
  const geometry = async (limit: number) => {
    let attempts = 0;
    // Ruimer ophalen: een kandidaat van een lid zonder bruikbare token mag de rij niet blokkeren.
    for (const candidate of await deps.geometryCandidates(Math.min(10, limit + 4))) {
      if (attempts >= limit) break;
      if (!timeLeft()) { result.stopped = "deadline"; return false; }
      if (!(await budgetLeft())) { result.stopped = "budget"; return false; }
      const accessToken = await token(candidate.profile_id);
      if (!accessToken) continue;
      attempts++;
      const outcome = await deps.fetchGeometry(accessToken, candidate.id);
      if (outcome === "rate_limited") { result.stopped = "rate_limited"; return false; }
      if (outcome === "ready" || outcome === "unavailable") result.geometry++;
    }
    return true;
  };

  const candidates = await admin.from("strava_activities").select("id,profile_id")
    .in("profile_id", profileIds).eq("sport_type", "Ride").eq("trainer", false).is("efforts_fetched_at", null)
    .order("start_date", { ascending: false }).order("id").limit(MAX_ACTIVITIES_PER_RUN);
  if (candidates.error) throw new Error(candidates.error.message);
  const queue = (candidates.data ?? []) as Array<{ id: number; profile_id: string }>;

  if (await geometry(queue.length ? GEOMETRY_WHILE_ACTIVITIES : GEOMETRY_WHEN_DONE)) {
    for (const activity of queue) {
      if (!timeLeft()) { result.stopped = "deadline"; break; }
      if (!(await budgetLeft())) { result.stopped = "budget"; break; }
      const accessToken = await token(activity.profile_id);
      // Koppelingsproblemen lost de webhook-/lifecycle-route op; hier niet intrekken.
      if (!accessToken) continue;
      const outcome = await deps.ingest(connections.get(activity.profile_id)!, activity.id, accessToken);
      if (outcome.status === "rate_limited") { result.stopped = "rate_limited"; break; }
      if (outcome.status === "auth_failed") { tokens.set(activity.profile_id, null); continue; }
      if (outcome.status === "stored") { result.fetched++; continue; }
      if (outcome.status === "removed") { result.removed++; continue; }
      // Een time-out of 5xx kan tijdelijk zijn: laten staan, en bij een storing stoppen.
      if (outcome.status === "failed") {
        result.failed++;
        if (result.failed >= MAX_FAILURES_PER_RUN) { result.stopped = "failures"; break; }
        continue;
      }
      await admin.from("strava_activities").update({ efforts_fetched_at: new Date(deps.now()).toISOString() }).eq("id", activity.id);
      result.abandoned++;
    }
  }

  const remaining = await admin.from("strava_activities").select("id", { count: "exact", head: true })
    .in("profile_id", profileIds).eq("sport_type", "Ride").eq("trainer", false).is("efforts_fetched_at", null);
  if (remaining.error) throw new Error(remaining.error.message);
  result.remaining = remaining.count ?? 0;
  if (queue.length === 0) result.stopped ??= "done";
  return result;
}

async function eligibleConnections(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
): Promise<Map<string, Connection>> {
  const { data, error } = await admin.from("strava_connections")
    .select("profile_id,strava_athlete_id,access_token,refresh_token,expires_at,profiles!inner(is_approved)")
    .is("revoked_at", null).eq("profiles.is_approved", true);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as Connection[]).map((row) => [row.profile_id, row]));
}
