import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import {
  loadIntervalsRideConnections,
  syncIntervalsRidesForProfile,
  type RideSyncResult,
} from "@/lib/intervals/ride-sync";
import { createAdminClient } from "@/lib/supabase/admin";

// Haalt ritten op bij intervals.icu voor leden zonder Strava-koppeling
// (migratie 0198, lib/intervals/ride-sync.ts). Per run hooguit `limit` leden, wie
// het langst niet aan de beurt was eerst. Idempotent.
//
// Bearer-token via INTERVALS_RIDES_SYNC_SECRET. Draait elk uur op cron-job.org,
// niet als Netlify scheduled function (zie docs/runbook.md sectie 8).

export const maxDuration = 30;

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
/** Na deze tijd begint de run aan geen nieuw lid meer. */
const BUDGET_MS = 8_000;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "INTERVALS_RIDES_SYNC_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(Math.floor(limitParam), MAX_LIMIT)
      : DEFAULT_LIMIT;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "admin client onbeschikbaar" },
      { status: 500 },
    );
  }

  let connections;
  try {
    connections = await loadIntervalsRideConnections(admin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "koppelingen lezen faalde";
    const noMigration = /rides_backfilled_at|last_ride_sync_error/.test(message);
    return NextResponse.json(
      { ok: false, error: noMigration ? "migratie 0198 ontbreekt" : message },
      { status: 500 },
    );
  }

  const started = Date.now();
  const results: RideSyncResult[] = [];
  for (const connection of connections.slice(0, limit)) {
    if (Date.now() - started > BUDGET_MS) break;
    results.push(await syncIntervalsRidesForProfile(admin, connection));
  }

  return NextResponse.json({
    ok: results.every((row) => !row.error),
    members: connections.length,
    processed: results.length,
    stored: results.reduce((sum, row) => sum + row.stored, 0),
    removed: results.reduce((sum, row) => sum + row.removed, 0),
    duplicates: results.reduce((sum, row) => sum + row.duplicates, 0),
    errors: results.filter((row) => row.error).length,
    // Geen profiel-id's in het antwoord: dat staat in de job-historie van de
    // cron-dienst.
    results: results.map((row) => ({
      fetched: row.fetched,
      stored: row.stored,
      duplicates: row.duplicates,
      removed: row.removed,
      tracks: row.tracks,
      error: row.error,
    })),
  });
}

export const GET = POST;
