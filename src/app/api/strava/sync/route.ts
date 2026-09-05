// Sinds de webhooks (zie /api/strava/webhook) is dit geen poll meer maar een
// reconcile: ritten komen realtime binnen via events, en deze run kijkt één keer
// per dag het venster van 30 dagen na op hernoemingen en op Strava verwijderde
// ritten die we via een gemist event niet hebben gezien. Zet de externe cron dus
// op dagelijks, niet meer op elk kwartier — zie docs/runbook.md.

import { createAdminClient } from "@/lib/supabase/admin";
import { syncStravaActivitiesForUser } from "@/lib/strava/client";
import { StravaConnectionRevokedError } from "@/lib/strava/lifecycle";

type ProfileSyncResult = {
  profileId: string;
  status: "completed" | "partial" | "rate_limited" | "failed" | "skipped";
  chunks: number;
  upserted: number;
  removed: number;
  totalSeen: number;
  nonCyclingSkipped: number;
  milestoneAwards: number;
  milestoneErrors: string[];
  colSegmentTimesFetched: number;
  colSegmentTimesUpdated: number;
  colSegmentTimesRateLimited: boolean;
  zwbSegmentsFetched: number;
  zwbSegmentEffortsStored: number;
  zwbSegmentsCompleted: number;
  zwbSegmentsRateLimited: boolean;
  zwbSummariesWritten: number;
  zwbSummariesSkipped: number;
  zwbSummariesRateLimited: boolean;
  nextPage?: number | null;
  error?: string;
};

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function envPositiveInt(name: string, fallback: number, max: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function nonNegativeInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function envNonNegativeInt(name: string, fallback: number, max: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function POST(request: Request) {
  const expected = process.env.STRAVA_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const profileLimit = positiveInt(
    url.searchParams.get("limit"),
    envPositiveInt("STRAVA_SYNC_MAX_PROFILES", 20, 100),
    100,
  );
  const chunkPages = positiveInt(url.searchParams.get("chunkPages"), 2, 5);
  const maxChunksPerProfile = positiveInt(
    url.searchParams.get("maxChunks"),
    2,
    10,
  );
  const colSegmentMaxFetches = nonNegativeInt(
    url.searchParams.get("colSegmentMaxFetches"),
    envNonNegativeInt("STRAVA_SYNC_COL_SEGMENT_MAX_FETCHES", 0, 40),
    40,
  );
  const zwbSegmentMaxFetches = nonNegativeInt(
    url.searchParams.get("zwbSegmentMaxFetches"),
    envNonNegativeInt("STRAVA_SYNC_ZWB_SEGMENT_MAX_FETCHES", 0, 40),
    40,
  );
  const zwbSummaryMaxWrites = nonNegativeInt(
    url.searchParams.get("zwbSummaryMaxWrites"),
    envNonNegativeInt("STRAVA_SYNC_ZWB_SUMMARY_MAX_WRITES", 1, 5),
    5,
  );
  const reconciliationDays = positiveInt(
    url.searchParams.get("reconciliationDays"),
    envPositiveInt("STRAVA_SYNC_RECONCILIATION_DAYS", 30, 365),
    365,
  );
  // Koppelingen die vandaag al aan de beurt zijn geweest slaan we over. Zonder
  // deze grens zou een tweede run op dezelfde dag alles opnieuw ophalen.
  const minAgeHours = positiveInt(
    url.searchParams.get("minAgeHours"),
    envPositiveInt("STRAVA_RECONCILE_MIN_AGE_HOURS", 20, 720),
    720,
  );

  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - minAgeHours * 3600_000).toISOString();
    const { data: connections, error } = await admin
      .from("strava_connections")
      .select("profile_id, last_synced_at")
      // Opgeheven koppelingen nooit meer aanraken; die wachten op de sweeper.
      .is("revoked_at", null)
      .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
      // Nooit gesynct eerst, daarna de oudste. Vroeger stond hier updated_at, dat
      // ook door een tokenrefresh werd aangeraakt — waardoor leden achteraan de
      // rij structureel konden verhongeren.
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .limit(profileLimit);

    if (error) throw new Error(error.message);

    const results: ProfileSyncResult[] = [];
    let rateLimited = false;

    for (const connection of connections ?? []) {
      const profileId = String(connection.profile_id);
      let startPage: number | undefined;
      let afterTs: number | undefined;
      const summary: ProfileSyncResult = {
        profileId,
        status: "skipped",
        chunks: 0,
        upserted: 0,
        removed: 0,
        totalSeen: 0,
        nonCyclingSkipped: 0,
        milestoneAwards: 0,
        milestoneErrors: [],
        colSegmentTimesFetched: 0,
        colSegmentTimesUpdated: 0,
        colSegmentTimesRateLimited: false,
        zwbSegmentsFetched: 0,
        zwbSegmentEffortsStored: 0,
        zwbSegmentsCompleted: 0,
        zwbSegmentsRateLimited: false,
        zwbSummariesWritten: 0,
        zwbSummariesSkipped: 0,
        zwbSummariesRateLimited: false,
      };

      try {
        for (let chunk = 0; chunk < maxChunksPerProfile; chunk++) {
          const result = await syncStravaActivitiesForUser(admin, profileId, {
            startPage,
            afterTs,
            chunkPages,
            colSegmentMaxFetches,
            zwbSegmentMaxFetches,
            zwbSummaryMaxWrites,
            reconciliationDays,
            refreshAthleteInfo: false,
          });

          if (!result.ok) {
            summary.status = "skipped";
            summary.error = result.error;
            break;
          }

          summary.chunks += 1;
          summary.upserted += result.upserted;
          summary.removed += result.removed;
          summary.totalSeen += result.totalSeen;
          summary.nonCyclingSkipped += result.nonCyclingSkipped;

          if (result.done) {
            summary.status = "completed";
            summary.milestoneAwards = result.milestoneAwards;
            summary.milestoneErrors = result.milestoneErrors ?? [];
            summary.colSegmentTimesFetched = result.colSegmentTimesFetched;
            summary.colSegmentTimesUpdated = result.colSegmentTimesUpdated;
            summary.colSegmentTimesRateLimited =
              result.colSegmentTimesRateLimited;
            summary.zwbSegmentsFetched = result.zwbSegmentsFetched;
            summary.zwbSegmentEffortsStored = result.zwbSegmentEffortsStored;
            summary.zwbSegmentsCompleted = result.zwbSegmentsCompleted;
            summary.zwbSegmentsRateLimited = result.zwbSegmentsRateLimited;
            summary.zwbSummariesWritten = result.zwbSummariesWritten;
            summary.zwbSummariesSkipped = result.zwbSummariesSkipped;
            summary.zwbSummariesRateLimited = result.zwbSummariesRateLimited;
            if (
              result.colSegmentTimesRateLimited ||
              result.zwbSegmentsRateLimited ||
              result.zwbSummariesRateLimited
            ) {
              rateLimited = true;
              summary.status = "rate_limited";
            }
            break;
          }

          summary.status = result.stravaRateLimited ? "rate_limited" : "partial";
          summary.colSegmentTimesFetched += result.colSegmentTimesFetched;
          summary.colSegmentTimesUpdated += result.colSegmentTimesUpdated;
          summary.colSegmentTimesRateLimited ||= result.colSegmentTimesRateLimited;
          summary.zwbSegmentsFetched += result.zwbSegmentsFetched;
          summary.zwbSegmentEffortsStored += result.zwbSegmentEffortsStored;
          summary.zwbSegmentsCompleted += result.zwbSegmentsCompleted;
          summary.zwbSegmentsRateLimited ||= result.zwbSegmentsRateLimited;
          summary.zwbSummariesWritten += result.zwbSummariesWritten;
          summary.zwbSummariesSkipped += result.zwbSummariesSkipped;
          summary.zwbSummariesRateLimited ||= result.zwbSummariesRateLimited;
          summary.nextPage = result.nextPage;
          startPage = result.nextPage ?? undefined;
          afterTs = result.afterTs;

          if (
            result.stravaRateLimited ||
            result.colSegmentTimesRateLimited ||
            result.zwbSegmentsRateLimited ||
            result.zwbSummariesRateLimited ||
            !startPage
          ) {
            rateLimited =
              result.stravaRateLimited ||
              result.colSegmentTimesRateLimited ||
              result.zwbSegmentsRateLimited ||
              result.zwbSummariesRateLimited;
            break;
          }
        }
      } catch (err) {
        if (err instanceof StravaConnectionRevokedError) {
          // accessTokenFor heeft de koppeling zojuist opgeheven; geen fout, en de
          // sweeper ruimt 'm vannacht op.
          summary.status = "skipped";
          summary.error = "Koppeling is niet meer geldig en is opgeheven.";
        } else {
          summary.status = "failed";
          summary.error =
            err instanceof Error ? err.message : "Strava-profielsync faalde.";
          // Vastleggen op de koppeling zelf, zodat /beheer/strava laat zien welke
          // leden blijven falen in plaats van dat het in een cronlog verdwijnt.
          await admin
            .from("strava_connections")
            .update({
              last_error: summary.error.slice(0, 500),
              last_error_at: new Date().toISOString(),
            })
            .eq("profile_id", profileId);
        }
      }

      results.push(summary);
      if (rateLimited) break;
    }

    return Response.json(
      {
        ok: !results.some((r) => r.status === "failed"),
        scannedProfiles: connections?.length ?? 0,
        processedProfiles: results.length,
        upserted: results.reduce((sum, r) => sum + r.upserted, 0),
        removed: results.reduce((sum, r) => sum + r.removed, 0),
        totalSeen: results.reduce((sum, r) => sum + r.totalSeen, 0),
        milestoneAwards: results.reduce((sum, r) => sum + r.milestoneAwards, 0),
        colSegmentTimesFetched: results.reduce(
          (sum, r) => sum + r.colSegmentTimesFetched,
          0,
        ),
        colSegmentTimesUpdated: results.reduce(
          (sum, r) => sum + r.colSegmentTimesUpdated,
          0,
        ),
        zwbSegmentsFetched: results.reduce(
          (sum, r) => sum + r.zwbSegmentsFetched,
          0,
        ),
        zwbSegmentEffortsStored: results.reduce(
          (sum, r) => sum + r.zwbSegmentEffortsStored,
          0,
        ),
        zwbSegmentsCompleted: results.reduce(
          (sum, r) => sum + r.zwbSegmentsCompleted,
          0,
        ),
        zwbSummariesWritten: results.reduce(
          (sum, r) => sum + r.zwbSummariesWritten,
          0,
        ),
        rateLimited,
        results,
      },
      { status: results.some((r) => r.status === "failed") ? 207 : 200 },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Strava-cron faalde.",
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
