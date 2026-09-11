// Verwerkt de wachtrij die de webhook-callback vult.
//
// De callback mag niets doen (200 binnen 2 seconden, anders raken we de
// subscription kwijt), dus het werk gebeurt hier: elke minuut aangeschopt door de
// Netlify scheduled function `strava-webhook-process`.
//
// Twee soorten events:
//   activity  -> één rit ophalen/bijwerken/verwijderen. Eén call per échte rit,
//                in plaats van een paginascan per lid per kwartier.
//   athlete   -> de deauthorisatie. Dit is de melding waar Strava's afwijzing om
//                draaide: hierop moet de koppeling direct dood.

import { accessTokenFor, type StravaConnection } from "@/lib/strava/client";
import { ingestStravaActivity, removeStravaActivity } from "@/lib/strava/ingest-activity";
import { isDeauthorizationEvent, type StravaWebhookEvent } from "@/lib/strava/webhook-events";
import {
  revocationPatch,
  StravaConnectionRevokedError,
} from "@/lib/strava/lifecycle";
import { runPostSyncForProfile, webhookPostSyncSteps } from "@/lib/strava/post-sync";
import { hasActivityWriteScope } from "@/lib/strava/scope";

/** Na zoveel mislukte pogingen laten we een event liggen in plaats van eeuwig te herhalen. */
const MAX_ATTEMPTS = 5;

type EventRow = {
  id: number;
  object_type: string;
  object_id: number;
  aspect_type: string;
  owner_id: number;
  event_time: string;
  updates: Record<string, unknown> | null;
  attempts: number;
};

type ConnectionRow = StravaConnection & {
  scope: string | null;
  revoked_at: string | null;
};

export type ProcessResult = {
  processed: number;
  stored: number;
  removed: number;
  deauthorized: number;
  skipped: number;
  failed: number;
  rateLimited: boolean;
  remaining: boolean;
};

function toEvent(row: EventRow): StravaWebhookEvent {
  return {
    objectType: row.object_type as StravaWebhookEvent["objectType"],
    objectId: Number(row.object_id),
    aspectType: row.aspect_type as StravaWebhookEvent["aspectType"],
    ownerId: Number(row.owner_id),
    subscriptionId: null,
    eventTime: row.event_time,
    updates: row.updates ?? {},
  };
}

export async function processStravaWebhookEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  options: { maxEvents?: number; deadlineMs?: number } = {},
): Promise<ProcessResult> {
  const maxEvents = Math.max(1, options.maxEvents ?? 25);
  // Netlify kapt een function rond de 10 seconden af; ruim daaronder stoppen zodat
  // we de events die we al hebben verwerkt ook echt kunnen afvinken.
  const deadline = Date.now() + Math.max(1000, options.deadlineMs ?? 8000);

  const result: ProcessResult = {
    processed: 0,
    stored: 0,
    removed: 0,
    deauthorized: 0,
    skipped: 0,
    failed: 0,
    rateLimited: false,
    remaining: false,
  };

  const { data: rows, error } = await admin
    .from("strava_webhook_events")
    .select(
      "id, object_type, object_id, aspect_type, owner_id, event_time, updates, attempts",
    )
    .is("processed_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .order("received_at", { ascending: true })
    .limit(maxEvents + 1);

  if (error) throw new Error(error.message);

  const events = (rows ?? []) as EventRow[];
  result.remaining = events.length > maxEvents;
  const batch = events.slice(0, maxEvents);

  // Profielen waarvan ritten zijn veranderd: badges, cols en ZWBlokken draaien we
  // één keer per profiel na afloop, niet per event.
  // accessToken kan null zijn: een batch met alleen delete-events heeft er geen
  // nodig, en de nasync-stappen die dan overblijven zijn puur database-werk.
  const touchedProfiles = new Map<
    string,
    { accessToken: string | null; scope: string | null; removedActivityIds: number[] }
  >();

  for (const row of batch) {
    if (Date.now() > deadline) {
      result.remaining = true;
      break;
    }

    const event = toEvent(row);

    try {
      const connection = await connectionForAthlete(admin, event.ownerId);

      if (!connection) {
        // Onbekende of al opgeruimde atleet: geen fout, gewoon niets te doen.
        await markProcessed(admin, row.id, "Geen actieve koppeling voor deze atleet.");
        result.skipped += 1;
        result.processed += 1;
        continue;
      }

      if (event.objectType === "athlete") {
        if (isDeauthorizationEvent(event)) {
          // Het lid heeft de app op strava.com ingetrokken. Er valt niets meer te
          // deauthoriseren, dus deauthorized_at gaat direct mee; de sweeper ruimt
          // de data en de rij daarna op.
          await admin
            .from("strava_connections")
            .update({
              ...revocationPatch("strava", { deauthorized: true }),
              last_event_at: event.eventTime,
            })
            .eq("profile_id", connection.profile_id);
          result.deauthorized += 1;
        } else {
          result.skipped += 1;
        }
        await markProcessed(admin, row.id, null);
        result.processed += 1;
        continue;
      }

      // Vanaf hier: object_type === "activity".
      if (event.aspectType === "delete") {
        const removed = await removeStravaActivity(
          admin,
          connection.profile_id,
          event.objectId,
        );
        if (removed) {
          result.removed += 1;
          const touched = touchedProfiles.get(connection.profile_id) ?? {
            accessToken: null,
            scope: connection.scope,
            removedActivityIds: [] as number[],
          };
          touched.removedActivityIds.push(event.objectId);
          touchedProfiles.set(connection.profile_id, touched);
        }
        await touchConnection(admin, connection.profile_id, event.eventTime);
        await markProcessed(admin, row.id, null);
        result.processed += 1;
        continue;
      }

      const accessToken = await accessTokenFor(admin, connection);
      const outcome = await ingestStravaActivity(
        admin,
        {
          profileId: connection.profile_id,
          stravaAthleteId: Number(connection.strava_athlete_id),
        },
        event.objectId,
        accessToken,
      );

      if (outcome.status === "rate_limited") {
        // Niet afvinken: dit event komt de volgende run terug.
        result.rateLimited = true;
        result.remaining = true;
        break;
      }

      if (outcome.status === "auth_failed") {
        await admin
          .from("strava_connections")
          .update(
            revocationPatch("invalid_grant", {
              deauthorized: true,
              error: "Strava wees de token af bij het ophalen van een rit.",
            }),
          )
          .eq("profile_id", connection.profile_id);
        await markProcessed(admin, row.id, "Token afgewezen; koppeling opgeheven.");
        result.processed += 1;
        continue;
      }

      if (outcome.status === "failed") {
        await markFailed(admin, row.id, row.attempts, outcome.error);
        result.failed += 1;
        continue;
      }

      const entry = touchedProfiles.get(connection.profile_id) ?? {
        accessToken,
        scope: connection.scope,
        removedActivityIds: [] as number[],
      };
      entry.accessToken = accessToken;
      if (outcome.status === "removed") {
        entry.removedActivityIds.push(outcome.activityId);
        result.removed += 1;
      } else if (outcome.status === "stored") {
        result.stored += 1;
      } else {
        result.skipped += 1;
      }
      touchedProfiles.set(connection.profile_id, entry);

      await touchConnection(admin, connection.profile_id, event.eventTime);
      await markProcessed(admin, row.id, null);
      result.processed += 1;
    } catch (err) {
      if (err instanceof StravaConnectionRevokedError) {
        await markProcessed(admin, row.id, "Koppeling was niet meer geldig.");
        result.skipped += 1;
        result.processed += 1;
        continue;
      }
      await markFailed(
        admin,
        row.id,
        row.attempts,
        err instanceof Error ? err.message : "Webhook-event verwerken faalde.",
      );
      result.failed += 1;
    }
  }

  // Badges, cols en ZWBlokken één keer per geraakt profiel.
  for (const [profileId, entry] of touchedProfiles) {
    if (Date.now() > deadline) {
      result.remaining = true;
      break;
    }
    const steps = webhookPostSyncSteps(hasActivityWriteScope(entry.scope));
    await runPostSyncForProfile(admin, profileId, entry.accessToken ?? "", {
      ...steps,
      // Zonder token valt er niets naar Strava te schrijven; de rest van de
      // stappen raakt alleen de database.
      summaries: entry.accessToken ? steps.summaries : 0,
      removedActivityIds: entry.removedActivityIds,
    });
  }

  return result;
}

async function connectionForAthlete(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  stravaAthleteId: number,
): Promise<ConnectionRow | null> {
  const { data } = await admin
    .from("strava_connections")
    .select(
      "profile_id, strava_athlete_id, access_token, refresh_token, expires_at, scope, revoked_at",
    )
    .eq("strava_athlete_id", stravaAthleteId)
    .maybeSingle();

  if (!data) return null;
  const row = data as ConnectionRow;
  return row.revoked_at ? null : row;
}

async function touchConnection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
  eventTime: string,
) {
  await admin
    .from("strava_connections")
    .update({ last_event_at: eventTime })
    .eq("profile_id", profileId);
}

async function markProcessed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  eventId: number,
  note: string | null,
) {
  await admin
    .from("strava_webhook_events")
    .update({ processed_at: new Date().toISOString(), last_error: note })
    .eq("id", eventId);
}

async function markFailed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  eventId: number,
  attempts: number,
  message: string,
) {
  await admin
    .from("strava_webhook_events")
    .update({ attempts: attempts + 1, last_error: message.slice(0, 500) })
    .eq("id", eventId);
}
