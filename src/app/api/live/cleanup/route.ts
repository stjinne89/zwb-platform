import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCronSecret } from "@/lib/cron/auth";
import { refreshExternalLiveSessions } from "@/lib/live/external-refresh";

// Cron-cleanup voor live-sessies + AVG-retention op posities.
// Bearer-token check via LIVE_CLEANUP_SECRET env var.
export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "LIVE_CLEANUP_SECRET");
  if (!auth.ok) {
    return new NextResponse(auth.message, { status: 403 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "admin client onbeschikbaar" },
      { status: 500 },
    );
  }

  const now = Date.now();
  const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Garmin/Wahoo bijwerken: haalt posities op, sluit beëindigde ritten en
  //    houdt "live, met link" levend tot de maximale duur. Zoekt geen nieuwe
  //    Wahoo-ritten: dat gebeurt alleen bij kijken (keuze eigenaar).
  await refreshExternalLiveSessions({ admin, detect: false });

  // 2. Markeer stale sessies als beeindigd. Garmin en Wahoo niet na 15 min:
  //    een koffiestop is geen einde van de rit, en die sessies sluiten al in
  //    stap 1 zodra de bron het einde meldt. Wel na twee uur zonder teken van
  //    leven, of een dag na de start.
  const nowIso = new Date().toISOString();
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const { count: closedCount } = await admin
    .from("live_sessions")
    .update({ ended_at: nowIso }, { count: "exact" })
    .is("ended_at", null)
    .not("source", "in", "(garmin,wahoo)")
    .lt("last_seen_at", fifteenMinAgo);
  const { count: closedExternal } = await admin
    .from("live_sessions")
    .update({ ended_at: nowIso }, { count: "exact" })
    .is("ended_at", null)
    .in("source", ["garmin", "wahoo"])
    .or(`last_seen_at.lt.${twoHoursAgo},started_at.lt.${oneDayAgo}`);

  // 3. AVG: verwijder posities >30 dagen oud
  const { count: deletedPositions } = await admin
    .from("live_positions")
    .delete({ count: "exact" })
    .lt("recorded_at", thirtyDaysAgo);

  // 4. AVG-retentie: vluchtige live-chatberichten >1 jaar oud opruimen.
  //    Permanente content (ritverslagen e.d.) blijft bewust ongemoeid.
  let deletedChat = 0;
  try {
    const { count } = await admin
      .from("event_chat_messages")
      .delete({ count: "exact" })
      .lt("created_at", oneYearAgo);
    deletedChat = count ?? 0;
  } catch {
    // tabel kan ontbreken in oudere omgevingen
  }

  // 5. Oude rate-limit-vensters opruimen.
  try {
    await admin.rpc("rate_limit_cleanup");
  } catch {
    // functie kan ontbreken vóór migratie 0062
  }

  return NextResponse.json({
    ok: true,
    closedStaleSessions: (closedCount ?? 0) + (closedExternal ?? 0),
    deletedOldPositions: deletedPositions ?? 0,
    deletedOldChat: deletedChat,
  });
}
