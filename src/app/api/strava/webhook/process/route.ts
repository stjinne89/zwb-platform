// Verwerkt de webhook-wachtrij. Aangeschopt door de Netlify scheduled function
// `strava-webhook-process` (elke minuut) met Authorization: Bearer
// ${STRAVA_SYNC_SECRET}.
//
// Waarom niet gewoon in de callback: Strava eist daar een 200 binnen 2 seconden en
// verwijdert de subscription bij herhaald falen. Achtergrondwerk ná het antwoord
// is op serverless niet betrouwbaar — de invocatie wordt bevroren. Deze route is
// idempotent en herstartbaar; blijven er events liggen, dan pakt de volgende run
// ze op.
//
// Is de wachtrij leeg, dan haalt runStravaHistoryBackfill hooguit één pagina oude
// ritten op van vóór de vijfjaarsgrens van de koppeling. Uitzetten zonder deploy:
// `?historyBackfill=0` in de URL van de cron-job.
//
// Tot oktober 2026 draaiden hier ook de segment-inhaalslag en de ZWB KOM-stap
// (`?segmentBackfill=0`, `?segmentKoms=0`). Die zijn met de verkenner verwijderd;
// de parameters doen niets meer.

import { createAdminClient } from "@/lib/supabase/admin";
import { processStravaWebhookEvents } from "@/lib/strava/webhook-processor";
import { runStravaHistoryBackfill } from "@/lib/strava/history-backfill";
import { checkCronSecret } from "@/lib/cron/auth";

/**
 * Wandklokbudget per run; webhook-events en de historie-inhaalslag delen het.
 *
 * Stond op 8 s met de aanname dat Netlify rond 10 s afkapt. Een handmatige
 * aanroep op 2026-09-16 liep 29 s en gaf gewoon 200, dus die aanname klopte niet.
 *
 * Elke stap kijkt zelf naar de klok, dus een langer budget verlengt alleen het
 * nuttige werk; de budgetgrenzen op Strava (50% kwartier, 60% dag) blijven gelden.
 */
const RUN_BUDGET_MS = 20_000;

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function POST(request: Request) {
  const auth = checkCronSecret(request, "STRAVA_SYNC_SECRET");
  if (!auth.ok) {
    return Response.json({ ok: false, error: auth.message }, { status: 401 });
  }

  const url = new URL(request.url);
  const maxEvents = positiveInt(
    url.searchParams.get("maxEvents"),
    positiveInt(process.env.STRAVA_WEBHOOK_MAX_EVENTS_PER_RUN ?? null, 25, 200),
    200,
  );

  const startedAt = Date.now();
  try {
    const admin = createAdminClient();
    const result = await processStravaWebhookEvents(admin, { maxEvents, deadlineMs: RUN_BUDGET_MS });
    let historyBackfill: unknown = null;
    if (url.searchParams.get("historyBackfill") !== "0" && !result.remaining && !result.rateLimited) {
      try {
        historyBackfill = await runStravaHistoryBackfill(admin, { deadline: startedAt + RUN_BUDGET_MS });
      } catch (err) {
        historyBackfill = { error: err instanceof Error ? err.message : "Historie-inhaalslag faalde." };
      }
    }
    return Response.json({ ok: true, ...result, historyBackfill });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Webhook-verwerking faalde.",
      },
      { status: 500 },
    );
  }
}

export const GET = POST;
