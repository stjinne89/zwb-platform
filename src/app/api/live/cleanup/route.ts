import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Cron-cleanup voor live-sessies + AVG-retention op posities.
// Bearer-token check via LIVE_CLEANUP_SECRET env var.
export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.LIVE_CLEANUP_SECRET ?? ""}`;
  if (!process.env.LIVE_CLEANUP_SECRET || auth !== expected) {
    return new NextResponse("forbidden", { status: 403 });
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

  // 1. Markeer stale sessies als beeindigd.
  const { count: closedCount } = await admin
    .from("live_sessions")
    .update({ ended_at: new Date().toISOString() }, { count: "exact" })
    .is("ended_at", null)
    .lt("last_seen_at", fifteenMinAgo);

  // 2. AVG: verwijder posities >30 dagen oud
  const { count: deletedPositions } = await admin
    .from("live_positions")
    .delete({ count: "exact" })
    .lt("recorded_at", thirtyDaysAgo);

  // 3. AVG-retentie: vluchtige live-chatberichten >1 jaar oud opruimen.
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

  // 4. Oude rate-limit-vensters opruimen.
  try {
    await admin.rpc("rate_limit_cleanup");
  } catch {
    // functie kan ontbreken vóór migratie 0062
  }

  return NextResponse.json({
    ok: true,
    closedStaleSessions: closedCount ?? 0,
    deletedOldPositions: deletedPositions ?? 0,
    deletedOldChat: deletedChat,
  });
}
