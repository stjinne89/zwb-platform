// Verwerkt de webhook-wachtrij. Aangeschopt door de Netlify scheduled function
// `strava-webhook-process` (elke minuut) met Authorization: Bearer
// ${STRAVA_SYNC_SECRET}.
//
// Waarom niet gewoon in de callback: Strava eist daar een 200 binnen 2 seconden en
// verwijdert de subscription bij herhaald falen. Achtergrondwerk ná het antwoord
// is op serverless niet betrouwbaar — de invocatie wordt bevroren. Deze route is
// idempotent en herstartbaar; blijven er events liggen, dan pakt de volgende run
// ze op.

import { createAdminClient } from "@/lib/supabase/admin";
import { processStravaWebhookEvents } from "@/lib/strava/webhook-processor";

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function POST(request: Request) {
  const expected = process.env.STRAVA_SYNC_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || actual !== expected) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const maxEvents = positiveInt(
    url.searchParams.get("maxEvents"),
    positiveInt(process.env.STRAVA_WEBHOOK_MAX_EVENTS_PER_RUN ?? null, 25, 200),
    200,
  );

  try {
    const admin = createAdminClient();
    const result = await processStravaWebhookEvents(admin, { maxEvents });
    return Response.json({ ok: true, ...result });
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
