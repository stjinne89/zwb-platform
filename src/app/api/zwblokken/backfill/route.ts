// Eenmalige inhaalslag voor ZWBlokken: berekent de blokken van de bestaande
// ritgeschiedenis. Daarna houdt de Strava-sync het vanzelf bij.
//
// Roept geen enkele externe API aan — puur database — dus er is geen
// rate-limit-budget nodig, alleen een grens op het aantal ritten per aanroep
// zodat we binnen de Netlify-functietimeout blijven. Idempotent: ritten die al
// verwerkt zijn worden overgeslagen, dus gewoon opnieuw aanroepen tot
// `remaining` false is.

import { createAdminClient } from "@/lib/supabase/admin";
import { OUTDOOR_CYCLING_SPORTS } from "@/lib/strava/sports";
import { syncBlocksForUser } from "@/lib/zwblokken/sync";

type ProfileResult = {
  profileId: string;
  scanned: number;
  newBlocks: number;
  remaining: boolean;
  error?: string;
};

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/**
 * De profielen die nog onverwerkte ritten hebben, elk één keer.
 *
 * PostgREST kent geen DISTINCT, en gewoon een pagina onverwerkte activiteiten
 * opvragen levert ze in fysieke tabelvolgorde: die klonteren per lid, dus dan
 * krijg je steeds hetzelfde profiel terug. Daarom per stap één rij ophalen met
 * `profile_id >` de vorige — dat enumereert de profielen echt.
 *
 * De sport-filters moeten gelijk zijn aan die in syncBlocksForUser: Zwift- en
 * indoorritten krijgen nooit een blocks_processed_at, dus zonder dezelfde
 * filter zou een lid met alleen virtuele ritten eeuwig blijven opduiken.
 */
async function profilesWithPendingWork(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  max: number,
): Promise<string[]> {
  const found: string[] = [];
  let after = "";
  while (found.length < max) {
    let query = admin
      .from("strava_activities")
      .select("profile_id")
      .is("blocks_processed_at", null)
      .in("sport_type", OUTDOOR_CYCLING_SPORTS)
      .not("trainer", "is", true)
      .order("profile_id", { ascending: true })
      .limit(1);
    if (after) query = query.gt("profile_id", after);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const row = (data ?? [])[0] as { profile_id: string } | undefined;
    if (!row?.profile_id) break;
    found.push(row.profile_id);
    after = row.profile_id;
  }
  return found;
}

export async function POST(request: Request) {
  const expected = process.env.STRAVA_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = positiveInt(url.searchParams.get("limit"), 5, 50);
  const maxActivities = positiveInt(
    url.searchParams.get("maxActivities"),
    500,
    5000,
  );
  const only = url.searchParams.get("profile");

  try {
    const admin = createAdminClient();

    const candidates = only
      ? [only]
      : await profilesWithPendingWork(admin, limit + 1);

    const results: ProfileResult[] = [];
    let worked = 0;
    let reachedEnd = true;

    for (const profileId of candidates) {
      // `limit` telt profielen die daadwerkelijk werk hadden; leden die al
      // klaar zijn kosten maar één goedkope query en tellen niet mee.
      if (worked >= limit) {
        reachedEnd = false;
        break;
      }
      try {
        const result = await syncBlocksForUser(admin, profileId, {
          maxActivities,
        });
        if (result.scanned > 0) {
          worked++;
          results.push({ profileId, ...result });
        }
      } catch (err) {
        worked++;
        results.push({
          profileId,
          scanned: 0,
          newBlocks: 0,
          remaining: true,
          error:
            err instanceof Error ? err.message : "ZWBlokken-backfill faalde.",
        });
      }
    }

    const failed = results.some((r) => r.error);
    return Response.json(
      {
        ok: !failed,
        processedProfiles: results.length,
        scanned: results.reduce((sum, r) => sum + r.scanned, 0),
        newBlocks: results.reduce((sum, r) => sum + r.newBlocks, 0),
        // Waar over de hele club, niet alleen over wat deze aanroep oppakte:
        // óf een opgepakt lid heeft nog ritten, óf we zijn niet bij iedereen
        // langs geweest. Loop hierop tot hij false is.
        remaining: !reachedEnd || results.some((r) => r.remaining),
        results,
      },
      { status: failed ? 207 : 200 },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error:
          err instanceof Error ? err.message : "ZWBlokken-backfill faalde.",
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
