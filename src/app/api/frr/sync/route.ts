import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkCronSecret } from "@/lib/cron/auth";
import { syncActiveFrrTours } from "@/lib/frr/sync";

// Houdt lopende FRR-tours bij (migr. 0195): tijdsloten, inschrijvingen per slot
// en het klassement van flammerougeracing.com. Doet alleen iets van twee dagen
// voor tot twee dagen na een tour. Idempotent.
//
// Bearer-token via FRR_SYNC_SECRET. Draait om de drie uur op cron-job.org, niet
// als Netlify scheduled function (zie docs/runbook.md sectie 8).

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "FRR_SYNC_SECRET");
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

  try {
    const tours = await syncActiveFrrTours(admin);
    return NextResponse.json({ ok: tours.every((tour) => !tour.error), tours });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "FRR-sync mislukt." },
      { status: 500 },
    );
  }
}

export const GET = POST;
