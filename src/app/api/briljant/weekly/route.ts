import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshSources, storeTerugblik, storeWeek } from "@/lib/briljant/server";
import { SCALE_VERSION } from "@/lib/briljant/norms";
import { mondayKey } from "@/lib/briljant/snapshot";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";

// ZWBriljant (migratie 0265): per lid dat ZWBriljant gebruikt de snapshot van
// deze week, na het verversen van powerprofiel en ZRS. Wie deze week al een
// snapshot heeft, slaat de run over; per run hooguit `limit` leden binnen het
// budget. Een lid zonder terugblik krijgt die eerst.
//
// Bearer-token via BRILJANT_WEEKLY_SECRET. Draait elk uur op cron-job.org (zie
// docs/runbook.md): zo komen alle deelnemers in de loop van maandag aan de beurt.

export const maxDuration = 30;

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;
/** Na deze tijd begint de run aan geen nieuw lid meer. */
const BUDGET_MS = 15_000;
/** Zoveel tijd per lid voor het verversen van de ZRS bij Zwift. */
const ZRS_BUDGET_MS = 3_000;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "BRILJANT_WEEKLY_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), MAX_LIMIT) : DEFAULT_LIMIT;

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "admin client onbeschikbaar" },
      { status: 500 },
    );
  }

  const today = amsterdamDayKey();
  const week = mondayKey(today);
  const [{ data: members, error }, { data: done }, { data: looked }] = await Promise.all([
    admin.from("zwbriljant_preferences").select("profile_id").order("created_at", { ascending: true }),
    // Alleen snapshots van de huidige schalen tellen; bij nieuwe schalen komt er
    // een nieuwe terugblik en weekopname.
    admin
      .from("zwbriljant_snapshots")
      .select("profile_id")
      .eq("week", week)
      .eq("source", "week")
      .eq("provenance->>scale", SCALE_VERSION),
    admin.from("zwbriljant_snapshots").select("profile_id").eq("source", "terugblik").eq("provenance->>scale", SCALE_VERSION),
  ]);
  if (error) {
    const noMigration = /zwbriljant/.test(error.message);
    return NextResponse.json(
      { ok: false, error: noMigration ? "migratie 0265 ontbreekt" : error.message },
      { status: 500 },
    );
  }

  const doneIds = new Set((done ?? []).map((row) => row.profile_id as string));
  const withTerugblik = new Set((looked ?? []).map((row) => row.profile_id as string));
  const due = (members ?? []).map((row) => row.profile_id as string).filter((id) => !doneIds.has(id));

  const started = Date.now();
  let processed = 0;
  let errors = 0;
  for (const profileId of due.slice(0, limit)) {
    if (Date.now() - started > BUDGET_MS) break;
    try {
      await refreshSources(admin, profileId, ZRS_BUDGET_MS);
      if (!withTerugblik.has(profileId)) await storeTerugblik(admin, profileId, today);
      await storeWeek(admin, profileId, today);
      processed += 1;
    } catch {
      errors += 1;
    }
  }

  // Geen profiel-id's in het antwoord: dat staat in de job-historie van de
  // cron-dienst.
  return NextResponse.json({
    ok: errors === 0,
    week,
    members: members?.length ?? 0,
    due: due.length,
    processed,
    errors,
  });
}
