"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  adminCreateStravaSubscription,
  adminDeleteStravaSubscription,
  adminProcessStravaWebhookEvents,
  adminRunStravaSweep,
  adminViewStravaSubscription,
  type SubscriptionState,
} from "../_actions";

export type WebhookEventRow = {
  id: number;
  objectType: string;
  objectId: number;
  aspectType: string;
  ownerId: number;
  receivedAt: string;
  processedAt: string | null;
  attempts: number;
  lastError: string | null;
};

export function StravaWebhookPanel({
  storedSubscriptionId,
  callbackUrl,
  events,
  pendingCount,
}: {
  storedSubscriptionId: number | null;
  callbackUrl: string | null;
  events: WebhookEventRow[];
  pendingCount: number;
}) {
  const [state, setState] = useState<SubscriptionState | null>(null);
  const [sweep, setSweep] = useState<string | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const liveId = state?.subscription?.id ?? null;

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Webhooks</h2>
          <p className="truncate text-xs text-muted-foreground">
            {callbackUrl ?? "Geen publieke site-URL ingesteld"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => setState(await adminViewStravaSubscription()))
            }
          >
            Status
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => setState(await adminCreateStravaSubscription()))
            }
          >
            Aanmaken
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || !(liveId ?? storedSubscriptionId)}
            onClick={() => {
              const id = liveId ?? storedSubscriptionId;
              if (!id) return;
              if (!confirm("Subscription verwijderen? Er komen dan geen ritten meer binnen via webhooks.")) return;
              startTransition(async () => setState(await adminDeleteStravaSubscription(id)));
            }}
          >
            Verwijderen
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Subscription" value={String(liveId ?? storedSubscriptionId ?? "—")} />
        <Stat label="Nog te verwerken" value={String(pendingCount)} highlight={pendingCount > 25} />
        <Stat
          label="Laatste event"
          value={
            events[0]
              ? new Date(events[0].receivedAt).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "—"
          }
        />
      </div>

      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && !state.subscription && (
        <p className="text-sm text-muted-foreground">Geen actieve subscription bij Strava.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await adminProcessStravaWebhookEvents();
              setProcessed(
                result.ok
                  ? `Verwerkt ${result.processed} · opgeslagen ${result.stored} · verwijderd ${result.removed} · overgeslagen ${result.skipped} · mislukt ${result.failed}${result.remaining ? " · nog meer in de rij" : ""}`
                  : result.error,
              );
            })
          }
        >
          {pending ? "Bezig…" : "Nu verwerken"}
        </Button>
        {processed && (
          <span className="text-xs text-muted-foreground">{processed}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await adminRunStravaSweep();
              setSweep(
                result.ok
                  ? `Gedeauthoriseerd ${result.deauthorized} · opgeruimd ${result.purged} · gewaarschuwd ${result.warned} · opgeheven ${result.revokedForInactivity}`
                  : result.error,
              );
            })
          }
        >
          {pending ? "Bezig…" : "Opruiming nu draaien"}
        </Button>
        {sweep && <span className="text-xs text-muted-foreground">{sweep}</span>}
      </div>

      {events.length > 0 && (
        <ul className="divide-y rounded-md border text-xs">
          {events.map((event) => (
            <li key={event.id} className="p-2">
              <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono">
                {event.objectType}/{event.aspectType}
              </span>
              <span className="text-muted-foreground">#{event.objectId}</span>
              <span className="ml-auto text-muted-foreground">
                {new Date(event.receivedAt).toLocaleString("nl-NL", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
              <span
                className={
                  event.processedAt
                    ? "text-muted-foreground"
                    : event.attempts > 0
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400"
                }
              >
                {event.processedAt
                  ? "verwerkt"
                  : event.attempts > 0
                    ? `${event.attempts}x mislukt`
                    : "wacht"}
              </span>
              </div>
              {event.lastError && (
                <p className="mt-1 break-words text-destructive">{event.lastError}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 truncate text-sm font-semibold ${
          highlight ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
