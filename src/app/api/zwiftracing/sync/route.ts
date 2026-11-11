import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runZwiftRacingSync } from "@/lib/zwiftracing/rider-sync";

// Vermogen over 90 dagen en legacy vELO van zwiftracing.app voor de Club
// Ladder (src/lib/zwiftracing/rider-sync.ts). Elke run gaat verder met wie nog
// aan de beurt is; `remaining` zegt hoeveel er nog wachten.
//
// Bearer-token via BRILJANT_WEEKLY_SECRET, gedeeld met de ZWBriljant-jobs: dat
// stond al op Netlify, `TEAM_RESULTS_SYNC_SECRET` niet (keuze eigenaar 2026-11-11).
// Draait op cron-job.org (zie docs/runbook.md).

export const maxDuration = 30;

/** Na deze tijd begint de run aan geen nieuwe renner meer; ruim binnen `maxDuration`. */
const BUDGET_MS = 20_000;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "BRILJANT_WEEKLY_SECRET");
  if (!auth.ok) return new NextResponse(auth.message, { status: 403 });

  const started = Date.now();
  try {
    const admin = createAdminClient();
    const result = await runZwiftRacingSync(admin, started + BUDGET_MS);
    // Geen namen in het antwoord, alleen aantallen.
    return NextResponse.json({ ok: result.stopped == null, ...result, ms: Date.now() - started }, { status: result.stopped ? 207 : 200 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "onbekende fout" }, { status: 500 });
  }
}

export const GET = POST;
