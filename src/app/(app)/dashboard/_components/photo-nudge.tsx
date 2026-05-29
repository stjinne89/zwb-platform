import Link from "next/link";
import { Camera, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Nudge na de ritdag: events (laatste 14 dagen) waar je voor RSVP'de met Ja of
// Misschien én waar je zelf nog geen foto van plaatste → "Deel je foto's".
// Zo ontstaan de ritverslagen vanzelf zodra een rit voorbij is.

type RsvpRow = {
  event_id: string;
  events:
    | { id: string; title: string; start_at: string; location: string | null }
    | { id: string; title: string; start_at: string; location: string | null }[]
    | null;
};

function eventOf(rel: RsvpRow["events"]) {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

export async function PhotoNudge({ userId }: { userId: string }) {
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - 14 * 86400_000).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: rsvpRows } = await supabase
    .from("event_rsvps")
    .select("event_id, events(id, title, start_at, location)")
    .eq("profile_id", userId)
    .in("status", ["yes", "maybe"]);

  // Events die voorbij zijn maar binnen de laatste 14 dagen vielen.
  const recent = ((rsvpRows ?? []) as RsvpRow[])
    .map((r) => eventOf(r.events))
    .filter(
      (e): e is NonNullable<ReturnType<typeof eventOf>> =>
        e !== null && e.start_at >= since && e.start_at <= nowIso,
    );
  if (recent.length === 0) return null;

  const eventIds = recent.map((e) => e.id);
  const { data: myPhotos } = await supabase
    .from("event_photos")
    .select("event_id")
    .eq("profile_id", userId)
    .in("event_id", eventIds);
  const havePhotos = new Set(
    ((myPhotos ?? []) as { event_id: string }[]).map((p) => p.event_id),
  );

  const todo = recent
    .filter((e) => !havePhotos.has(e.id))
    .sort((a, b) => b.start_at.localeCompare(a.start_at))
    .slice(0, 3);
  if (todo.length === 0) return null;

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Camera className="size-5 text-primary" />
          Deel je foto&apos;s
        </h2>
        <Link
          href="/ritverslagen"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Ritverslagen
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Je reed onlangs mee — voeg je foto&apos;s toe zodat er een ritverslag
        ontstaat.
      </p>
      <ul className="space-y-2">
        {todo.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="grid gap-2 rounded-md border bg-card p-3 transition hover:border-primary/40 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(event.start_at).toLocaleDateString("nl-NL", {
                    dateStyle: "medium",
                    timeZone: "Europe/Amsterdam",
                  })}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                <Camera className="size-3.5" />
                Foto&apos;s toevoegen
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
