import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<string, string> = {
  outdoor: "Outdoor rit",
  zrl: "ZRL race",
  ladder: "Ladder race",
  flamme_rouge: "Flamme Rouge",
  social: "Social",
  training: "Training",
};

const STALE_AFTER_MIN = 15;
type RsvpStatus = "yes" | "maybe" | "no";

function amsterdamDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

async function getActiveCutoffIso() {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

export default async function KalenderPage() {
  const supabase = await createClient();
  const { data: allEvents } = await supabase
    .from("events")
    .select("id, title, type, start_at, location, distance_km, elevation_m")
    .order("start_at", { ascending: true });

  const todayKey = amsterdamDateKey(new Date());
  // Alleen vandaag + toekomstige events op de kalender — voorbije events
  // verhuizen naar /ritverslagen. Zo staat het event van vandaag (of het
  // eerstvolgende) bovenaan.
  const events = (allEvents ?? []).filter(
    (event) => amsterdamDateKey(new Date(event.start_at)) >= todayKey,
  );
  const pastCount = (allEvents?.length ?? 0) - events.length;
  const todayEventIds = events
    .filter((event) => amsterdamDateKey(new Date(event.start_at)) === todayKey)
    .map((event) => event.id);
  const liveCountsByEvent = new Map<string, number>();

  if (todayEventIds.length > 0) {
    const cutoff = await getActiveCutoffIso();
    const [{ data: rsvps }, { data: sessions }] = await Promise.all([
      supabase
        .from("event_rsvps")
        .select("event_id, profile_id, status")
        .in("event_id", todayEventIds)
        .in("status", ["yes", "maybe"] satisfies RsvpStatus[]),
      supabase
        .from("live_sessions")
        .select("profile_id")
        .eq("mode", "outdoor")
        .is("ended_at", null)
        .gte("last_seen_at", cutoff),
    ]);

    const liveProfileIds = new Set((sessions ?? []).map((s) => s.profile_id));
    const liveProfilesByEvent = new Map<string, Set<string>>();
    for (const rsvp of rsvps ?? []) {
      if (!liveProfileIds.has(rsvp.profile_id)) continue;
      const current = liveProfilesByEvent.get(rsvp.event_id) ?? new Set<string>();
      current.add(rsvp.profile_id);
      liveProfilesByEvent.set(rsvp.event_id, current);
    }
    for (const [eventId, profileIds] of liveProfilesByEvent) {
      liveCountsByEvent.set(eventId, profileIds.size);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender"
        actions={
          <Link href="/kalender/nieuw">
            <Button>Nieuw event</Button>
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState>
          Geen aankomende events.
          {pastCount > 0 && (
            <>
              {" "}
              <Link href="/ritverslagen" className="underline">
                Bekijk voorbije ritten
              </Link>
              .
            </>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => {
            const liveCount = liveCountsByEvent.get(event.id) ?? 0;
            return (
              <li
                key={event.id}
                className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link href={`/events/${event.id}`} className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{event.title}</p>
                    {liveCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
                        <span className="size-1.5 animate-pulse rounded-full bg-current" />
                        Live nu ({liveCount})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.start_at).toLocaleString("nl-NL", {
                      dateStyle: "full",
                      timeStyle: "short",
                    })}
                    {event.location ? ` · ${event.location}` : ""}
                    {event.distance_km ? ` · ${event.distance_km} km` : ""}
                    {event.elevation_m ? ` · ${event.elevation_m} hm` : ""}
                  </p>
                </Link>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                    {TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  {liveCount > 0 && (
                    <Link
                      href={`/live/${event.id}`}
                      className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      Live volgen
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > 0 && pastCount > 0 && (
        <p className="text-sm text-muted-foreground">
          <Link href="/ritverslagen" className="font-medium text-primary hover:underline">
            Voorbije ritten ({pastCount}) →
          </Link>
        </p>
      )}
    </div>
  );
}
