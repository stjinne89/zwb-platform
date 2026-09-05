// Strava's webhook-callback. Vervangt het pollen van /athlete/activities.
//
// Strava eist op beide methodes een 200 binnen 2 seconden en verwijdert de
// subscription na herhaald falen. Deze route doet daarom niets meer dan het event
// valideren en in de wachtrij zetten; het echte werk gebeurt in
// /api/strava/webhook/process, aangestuurd door een Netlify scheduled function.
//
// GET  = de verificatie-handshake bij het aanmaken van de subscription.
// POST = de events zelf (activity create/update/delete, athlete deauthorisatie).

import { createAdminClient } from "@/lib/supabase/admin";
import {
  evaluateSubscriptionChallenge,
  parseWebhookEvent,
} from "@/lib/strava/webhook-events";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = evaluateSubscriptionChallenge(
    params,
    process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim(),
  );

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  // Strava verwacht deze sleutel letterlijk, punt en al.
  return Response.json({ "hub.challenge": result.challenge });
}

export async function POST(request: Request) {
  // Bewust altijd 200, ook bij een fout aan onze kant: een 5xx-antwoord kost ons
  // de subscription. Wat we hier missen wordt opgepikt door de dagelijkse
  // reconcile (/api/strava/sync), die het venster van 30 dagen nakijkt.
  try {
    const payload = await request.json();
    const event = parseWebhookEvent(payload);
    if (!event) return Response.json({ ok: true, ignored: "unparsable" });

    const admin = createAdminClient();

    // Één insert, één round-trip: alles wat hier bij komt gaat ten koste van de
    // twee seconden die we hebben.
    // Strava levert opnieuw af als wij te traag zijn; de unieke index op
    // (object_type, object_id, aspect_type, event_time) vangt de dubbele af.
    const { error } = await admin.from("strava_webhook_events").insert({
      subscription_id: event.subscriptionId,
      object_type: event.objectType,
      object_id: event.objectId,
      aspect_type: event.aspectType,
      owner_id: event.ownerId,
      event_time: event.eventTime,
      updates: event.updates,
    });

    // 23505 = unieke index geraakt, dus dit event hadden we al.
    if (error && error.code !== "23505") {
      console.error("[strava-webhook] wegschrijven faalde:", error.message);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error(
      "[strava-webhook] onverwerkbaar event:",
      err instanceof Error ? err.message : err,
    );
    return Response.json({ ok: true, ignored: "error" });
  }
}
