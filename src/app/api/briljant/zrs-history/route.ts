import { NextResponse, type NextRequest } from "next/server";
import { checkCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TERUGBLIK_SPAN } from "@/lib/briljant/server";
import { runZrsHistory } from "@/lib/briljant/zrs-history";
import { runRiderRaces } from "@/lib/racen/zwift-races";

// ZWBriljant: de ZRS van vroeger in de terugblik (migratie 0271), met een eigen
// budget. De wekelijkse job doet dit ook, maar alleen met de tijd die na het
// verversen en de terugblikken over is; na een nieuwe schaal of terugblik is dat
// uren lang bijna niets. Elke run gaat verder waar de vorige stopte.
//
// Sinds 0317 (2026-11-09) eerst de races per lid voor ZWBeter racen
// (src/lib/racen/zwift-races.ts). Die lezen dezelfde activiteitenlijst met
// dezelfde cursor, dus ze draaien hier na elkaar en niet in een eigen cron, die
// tegelijk de cursor zou kunnen terugzetten.
//
// Bearer-token via BRILJANT_WEEKLY_SECRET. Draait elk uur op cron-job.org, op het
// halve uur (zie docs/runbook.md).

export const maxDuration = 30;

/** Na deze tijd begint de run aan niets nieuws meer; ruim binnen `maxDuration`. */
const BUDGET_MS = 22_000;
/** Tot zover in de run de races per lid; de rest is voor de ZRS van vroeger. */
const RACES_UNTIL_MS = 12_000;

export async function POST(request: NextRequest) {
  const auth = checkCronSecret(request, "BRILJANT_WEEKLY_SECRET");
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

  const started = Date.now();
  try {
    const races = await runRiderRaces(admin, started + RACES_UNTIL_MS);
    // Gaf Zwift bij de races een 429, dan ook geen ZRS-verzoeken meer deze run.
    const result = races.stopped
      ? { riders: 0, months: 0, stopped: true }
      : await runZrsHistory(admin, TERUGBLIK_SPAN, started + BUDGET_MS);
    // `stopped`: Zwift gaf 429/5xx of de tabel ontbreekt; de volgende run gaat verder.
    // Geen profiel-id's in het antwoord.
    return NextResponse.json({ ok: true, ...result, races, ms: Date.now() - started });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "onbekende fout" },
      { status: 500 },
    );
  }
}
