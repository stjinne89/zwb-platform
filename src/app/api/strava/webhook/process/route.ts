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
// Is de wachtrij leeg, dan gebruikt dezelfde run de resterende tijd voor de
// segment-inhaalslag (runScheduledSegmentBackfill). Uitzetten zonder deploy: voeg
// `?segmentBackfill=0` toe aan de URL van de cron-job.
//
// Daarvoor rekent een korte stap de ZWB KOM's na van segmenten waarvan de stand kan
// zijn veranderd (refreshSegmentKoms) en verstuurt de pushmeldingen voor gewonnen en
// verloren titels (notifySegmentKomEvents). Uitzetten: `?segmentKoms=0`.

import { createAdminClient } from "@/lib/supabase/admin";
import { processStravaWebhookEvents } from "@/lib/strava/webhook-processor";
import { runScheduledSegmentBackfill } from "@/lib/segments/scheduled-backfill";
import { refreshSegmentKoms } from "@/lib/segments/koms";
import { notifySegmentKomEvents } from "@/lib/segments/kom-notifications";
import { checkCronSecret } from "@/lib/cron/auth";

/** Netlify kapt rond 10 s af; webhook-events en inhaalslag delen dit budget. */
const RUN_BUDGET_MS = 8000;

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
    // Vóór de inhaalslag: die vult het budget tot de rand, deze stap is kort en puur database.
    const segmentKoms = url.searchParams.get("segmentKoms") === "0"
      ? null
      : {
          refresh: await refreshSegmentKoms(admin, { deadline: startedAt + RUN_BUDGET_MS }),
          notify: await notifySegmentKomEvents(admin, { deadline: startedAt + RUN_BUDGET_MS }),
        };
    let segmentBackfill: unknown = null;
    if (url.searchParams.get("segmentBackfill") !== "0" && !result.remaining && !result.rateLimited) {
      try {
        segmentBackfill = await runScheduledSegmentBackfill(admin, { deadline: startedAt + RUN_BUDGET_MS });
      } catch (err) {
        // De webhookverwerking is gelukt; een mislukte inhaalslag probeert de volgende run.
        segmentBackfill = { error: err instanceof Error ? err.message : "Segment-inhaalslag faalde." };
      }
    }
    return Response.json({ ok: true, ...result, segmentKoms, segmentBackfill });
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
