import { notFound } from "next/navigation";
import Link from "next/link";
import { EventLiveTicker } from "@/app/(app)/events/[id]/_components/event-live-ticker";
import { fetchEventLiveSnapshot } from "@/lib/live/event-snapshot";
import { ZwbMark } from "@/components/zwb-logo";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

export default async function PublicLiveTickerPage({ params }: PageProps) {
  const { eventId } = await params;

  const snapshot = await fetchEventLiveSnapshot(eventId);
  if (!snapshot.event) notFound();

  const { event, sessions, positions } = snapshot;

  const startDate = new Date(event.start_at);
  const startLabel = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(startDate);

  return (
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <ZwbMark className="h-10 w-10" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              ZWB Cycling · Live volgen
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
          </div>
        </div>
        <Link
          href="/login"
          className="hidden rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent sm:inline-block"
        >
          Inloggen
        </Link>
      </header>

      <section className="rounded-lg border bg-card p-4 text-sm">
        <p>
          <span className="text-muted-foreground">Start:</span>{" "}
          <strong>{startLabel}</strong>
        </p>
        {event.location && (
          <p className="mt-1">
            <span className="text-muted-foreground">Locatie:</span>{" "}
            {event.location}
          </p>
        )}
      </section>

      {!event.gpxUrl ? (
        <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Voor deze rit is geen route (GPX) geüpload, dus we kunnen geen
          live-route tonen.
        </section>
      ) : !event.isToday ? (
        <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          De liveticker is alleen actief op de dag van de rit zelf.
          Kom terug op{" "}
          <strong>
            {new Intl.DateTimeFormat("nl-NL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "Europe/Amsterdam",
            }).format(startDate)}
          </strong>{" "}
          om mee te kijken.
        </section>
      ) : (
        <EventLiveTicker
          gpxUrl={event.gpxUrl}
          sessions={sessions}
          initialPositions={positions}
          pollUrl={`/api/live/event/${event.id}`}
        />
      )}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        Live posities worden door ZWB-leden zelf gedeeld via de ZWB-app.
        Updates komen binnen via een poll-loop van ~10 seconden.
        <br />
        <Link href="/login" className="underline">
          Log in op het ZWB-platform
        </Link>{" "}
        voor het volledige event.
      </footer>
    </div>
  );
}
