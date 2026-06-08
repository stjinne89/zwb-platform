import { createAdminClient } from "@/lib/supabase/admin";
import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import {
  recomputeCompletedSegmentsForUser,
  resolveCuratedSegments,
  seedBeneluxPopularSegments,
  syncZwbSegmentsForUser,
} from "@/lib/segments/sync";

type BackfillResult = {
  profileId: string;
  fetched: number;
  storedEfforts: number;
  completed: number;
  rateLimited: boolean;
  error?: string;
};

function nonNegativeInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function boolParam(value: string | null, fallback: boolean) {
  if (value == null) return fallback;
  return /^(1|true|yes)$/i.test(value);
}

export async function POST(request: Request) {
  const expected = process.env.STRAVA_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = positiveInt(url.searchParams.get("limit"), 3, 20);
  const maxFetches = nonNegativeInt(url.searchParams.get("maxFetches"), 20, 80);
  const seedBenelux = boolParam(url.searchParams.get("seedBenelux"), true);
  const resolveCandidates = boolParam(
    url.searchParams.get("resolveCandidates") ??
      url.searchParams.get("resolveEurope"),
    true,
  );

  try {
    const admin = createAdminClient();
    const { data: connections, error } = await admin
      .from("strava_connections")
      .select(
        "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, updated_at",
      )
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);

    const results: BackfillResult[] = [];
    let rateLimited = false;
    let firstAccessToken: string | null = null;

    for (const connection of (connections ?? []) as StravaConnection[]) {
      const profileId = String(connection.profile_id);
      try {
        const accessToken = await accessTokenFor(admin, connection);
        firstAccessToken ??= accessToken;
        const result = await syncZwbSegmentsForUser(admin, accessToken, profileId, {
          maxFetches,
        });
        results.push({ profileId, ...result });
        if (result.rateLimited) {
          rateLimited = true;
          break;
        }
      } catch (err) {
        results.push({
          profileId,
          fetched: 0,
          storedEfforts: 0,
          completed: 0,
          rateLimited: false,
          error:
            err instanceof Error
              ? err.message
              : "ZWB Segments backfill faalde.",
        });
      }
    }

    const benelux = seedBenelux
      ? await seedBeneluxPopularSegments(admin, 30)
      : { seeded: 0 };
    if (benelux.seeded > 0) {
      for (const result of results) {
        if (!result.error) {
          await recomputeCompletedSegmentsForUser(admin, result.profileId);
        }
      }
    }
    const candidates =
      resolveCandidates && firstAccessToken && !rateLimited
        ? await resolveCuratedSegments(admin, firstAccessToken, {
            maxCandidates: 20,
          })
        : { checked: 0, resolved: 0, rateLimited: false };
    if (candidates.resolved > 0) {
      for (const result of results) {
        if (!result.error) {
          await recomputeCompletedSegmentsForUser(admin, result.profileId);
        }
      }
    }

    return Response.json(
      {
        ok: !results.some((r) => r.error),
        processedProfiles: results.length,
        fetched: results.reduce((sum, r) => sum + r.fetched, 0),
        storedEfforts: results.reduce((sum, r) => sum + r.storedEfforts, 0),
        completed: results.reduce((sum, r) => sum + r.completed, 0),
        beneluxSeeded: benelux.seeded,
        beneluxVariantsRemoved: "removed" in benelux ? benelux.removed : 0,
        candidates,
        rateLimited: rateLimited || candidates.rateLimited,
        results,
      },
      { status: results.some((r) => r.error) ? 207 : 200 },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "ZWB Segments backfill faalde.",
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
