import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { amsterdamDateKey } from "@/lib/birthdays";
import { eventColorStyle } from "@/lib/event-types";
import { calendarHref } from "@/lib/events/type-filter";
import { EventBadge } from "../../kalender/_components/event-badge";

type ProgramEvent = {
  id: string;
  title: string;
  type: string;
  kind: string | null;
  start_at: string;
  location: string | null;
  distance_km: number | string | null;
  elevation_m: number | null;
};

function EventRows({ events }: { events: ProgramEvent[] }) {
  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const color = eventColorStyle(event.type, event.kind);
        return (
          <li
            key={event.id}
            className={`relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-card p-4 pl-5 transition before:absolute before:inset-y-0 before:left-0 before:bg-[var(--event-bar)] before:content-[''] hover:border-foreground/30 sm:flex-row sm:items-center sm:justify-between ${
              color.wideBar ? "before:w-2" : "before:w-1"
            }`}
            style={{ "--event-bar": color.bar } as CSSProperties}
          >
            <Link href={`/events/${event.id}`} className="min-w-0 flex-1">
              <p className="font-medium">{event.title}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(event.start_at).toLocaleString("nl-NL", {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                })}
                {event.location ? ` · ${event.location}` : ""}
                {event.distance_km ? ` · ${event.distance_km} km` : ""}
                {event.elevation_m ? ` · ${event.elevation_m} hm` : ""}
              </p>
            </Link>
            <div className="shrink-0">
              <EventBadge type={event.type} kind={event.kind} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("event_programs")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!program) notFound();

  const { data: links } = await supabase
    .from("event_program_links")
    .select(
      "events(id, title, type, kind, start_at, location, distance_km, elevation_m)",
    )
    .eq("program_id", program.id);

  const events = (links ?? [])
    .flatMap((link) => link.events as unknown as ProgramEvent | ProgramEvent[] | null)
    .filter((event): event is ProgramEvent => Boolean(event))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const todayKey = amsterdamDateKey(new Date());
  const upcoming = events.filter(
    (event) => amsterdamDateKey(new Date(event.start_at)) >= todayKey,
  );
  const past = events.filter((event) => !upcoming.includes(event)).reverse();

  return (
    <div className="space-y-6">
      <BackLink href="/kalender" label="Kalender" />
      <PageHeader
        title={program.name}
        actions={
          <Link
            href={calendarHref({ onlyForMe: false, types: [], programs: [program.slug] })}
            className="text-sm font-medium text-primary hover:underline"
          >
            Toon op kalender
          </Link>
        }
      />
      {program.description && (
        <p className="whitespace-pre-line text-sm text-muted-foreground">
          {program.description}
        </p>
      )}

      {events.length === 0 ? (
        <EmptyState>Nog geen events in dit programma.</EmptyState>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Aankomend ({upcoming.length})
              </h2>
              <EventRows events={upcoming} />
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Geweest ({past.length})
              </h2>
              <EventRows events={past} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
