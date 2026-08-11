"use client";

// Clubevents die binnen je schema vallen. Ze komen er pas in als je ja zegt —
// voorheen plande de AI ze ongevraagd in, ook als je er niet heen ging.

import { useCallback, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptClubEvent, declineClubEvent } from "../_actions";
import { useAiDraftPoll } from "./use-ai-draft-poll";

export type ScheduleEventItem = {
  id: string;
  title: string;
  type: string;
  startAt: string;
  dateLabel: string;
  durationMinutes: number;
  rsvp: string | null;
  inSchedule: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  flamme_rouge: "Flamme Rouge",
  outdoor: "Buitenrit",
  social: "Social",
  training: "Training",
};

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} uur`;
  return `${hours}u ${rest}`;
}

export function EventChoice({ events }: { events: ScheduleEventItem[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const onCompleted = useCallback(() => {
    setResult("Je schema is eromheen bijgewerkt.");
  }, []);
  const poll = useAiDraftPoll({
    onCompleted,
    failureMessage: "Bijwerken van je schema is mislukt.",
  });

  if (events.length === 0) return null;

  async function decide(eventId: string, meedoen: boolean) {
    poll.setError(null);
    setResult(null);
    setBusyId(eventId);
    try {
      const formData = new FormData();
      formData.set("event_id", eventId);
      const outcome = meedoen
        ? await acceptClubEvent(formData)
        : await declineClubEvent(formData);
      if (!outcome.ok) {
        poll.setError(outcome.error);
        return;
      }
      if (meedoen) {
        setResult(
          outcome.generationId
            ? "In je schema gezet. De week eromheen wordt bijgewerkt…"
            : "In je schema gezet.",
        );
        if (outcome.generationId) poll.watch(outcome.generationId);
      } else {
        setResult("Genoteerd; het event blijft uit je schema.");
      }
    } catch {
      poll.setError("Opslaan is mislukt.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <CalendarCheck className="size-5 text-primary" />
        <h2 className="font-semibold">Clubevents in je schemaperiode</h2>
      </div>

      <ul className="divide-y">
        {events.map((event) => {
          const busy = busyId === event.id || poll.pending;
          return (
            <li key={event.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="w-24 shrink-0 text-sm text-muted-foreground">
                {event.dateLabel}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/events/${event.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {event.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[event.type] ?? event.type} — {durationLabel(event.durationMinutes)}
                  {event.inSchedule ? " — staat in je schema" : ""}
                </p>
              </div>
              <Link
                href={`/events/${event.id}`}
                aria-label={`Open ${event.title}`}
                className="rounded-md border p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
              </Link>
              {event.rsvp === "yes" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => decide(event.id, false)}
                >
                  Toch niet
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() => decide(event.id, true)}
                  >
                    {busy ? "Bezig…" : "Ik doe mee"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => decide(event.id, false)}
                  >
                    Nee
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(poll.error || result) && (
        <p
          className={`border-t p-4 text-sm ${poll.error ? "text-destructive" : "text-primary"}`}
        >
          {poll.error ?? result}
        </p>
      )}
    </section>
  );
}
