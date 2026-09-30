import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCronSecret } from "@/lib/cron/auth";
import { syncSrcCalendar } from "@/lib/src/sync";

// Houdt de Sunday Race Club van MyWhoosh in de kalender bij (migr. 0200) en haalt
// de uitslagen van gereden races op (migr. 0202). De feed loopt maar een week
// vooruit, dus elke run vult de nieuwe zondag aan en werkt starttijden bij.
// Idempotent.
//
// Bearer-token via SRC_SYNC_SECRET. Draait elk uur op cron-job.org, niet als
// Netlify scheduled function (zie docs/runbook.md sectie 8).

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "SRC_SYNC_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "admin client onbeschikbaar" },
      { status: 500 },
    );
  }

  const result = await syncSrcCalendar(admin);
  return NextResponse.json({ ok: !result.error, ...result }, { status: result.error ? 500 : 200 });
}

export const GET = POST;
