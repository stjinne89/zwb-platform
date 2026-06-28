import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EventLiveTicker } from "@/app/(app)/events/[id]/_components/event-live-ticker";
import { EventChat, type ChatMessage } from "@/app/(app)/events/[id]/_components/event-chat";
import { WindSummary } from "@/app/(app)/events/[id]/_components/wind-summary";
import { fetchEventLiveSnapshot } from "@/lib/live/event-snapshot";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWindForecast } from "@/lib/weather";
import { firstTwoTrkptFromGpx, gpxBearing } from "@/lib/gpx";
import type { ColLite, ClimbRange } from "@/lib/gpx-climbs";
import { isPoiType, type EventPoi } from "@/app/(app)/events/[id]/_components/poi";
import type { EventZone } from "@/app/(app)/events/[id]/_components/zone";
import { ZwbMark } from "@/components/zwb-logo";

type PageProps = {
  params: Promise<{ eventId: string }>;
};

export const dynamic = "force-dynamic";

function formatStartLabel(start: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(start);
}

function formatDateOnly(start: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(start);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const snapshot = await fetchEventLiveSnapshot(eventId);
  if (!snapshot.event) {
    return {
      title: "ZWB Live",
      description: "Live volgen van ZWB Cycling-ritten.",
    };
  }
  const event = snapshot.event;
  const startLabel = formatStartLabel(new Date(event.start_at));
  const locationSuffix = event.location ? ` vanaf ${event.location}` : "";
  const description = `Volg ${event.title} live op ${startLabel}${locationSuffix}.`;
  const title = `ZWB live: ${event.title}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "ZWB Cycling",
      locale: "nl_NL",
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: "ZWB Cycling",
        },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/icon-512.png"],
    },
    robots: {
      // Niet indexeren — dit is een share-link, geen publieke landing.
      index: false,
      follow: false,
    },
  };
}

export default async function PublicLiveTickerPage({ params }: PageProps) {
  const { eventId } = await params;

  const snapshot = await fetchEventLiveSnapshot(eventId);
  if (!snapshot.event) notFound();

  const { event, sessions, positions } = snapshot;

  const startDate = new Date(event.start_at);
  const startLabel = formatStartLabel(startDate);

  // Publieke live-chat: initiële niet-interne berichten.
  let initialChat: ChatMessage[] = [];
  if (event.isToday) {
    const admin = createAdminClient();
    const { data: chatRows } = await admin
      .from("event_chat_messages")
      .select("id, profile_id, guest_name, body, created_at, profiles(display_name)")
      .eq("event_id", event.id)
      .eq("internal_only", false)
      .order("created_at", { ascending: false })
      .limit(50);
    initialChat = ((chatRows ?? []) as Array<{
      id: string;
      profile_id: string | null;
      guest_name: string | null;
      body: string;
      created_at: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profiles: any;
    }>)
      .map((r) => {
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          id: r.id,
          profileId: r.profile_id,
          name: r.profile_id ? prof?.display_name || "ZWB'er" : r.guest_name || "Gast",
          isGuest: !r.profile_id,
          body: r.body,
          createdAt: r.created_at,
          internal: false,
        };
      })
      .reverse();
  }

  // Weer + headwind: alleen als we lat/lon hebben én de rit binnen het
  // 16-daags forecast-venster valt (Open-Meteo).
  const windForecast =
    event.start_lat != null && event.start_lon != null
      ? await fetchWindForecast(
          event.start_lat,
          event.start_lon,
          startDate,
        ).catch(() => null)
      : null;

  // Initial bearing voor windrichting-classificatie: GPX server-fetchen.
  let rideBearing: number | null = null;
  if (event.gpxUrl) {
    try {
      const gpxRes = await fetch(event.gpxUrl, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      });
      if (gpxRes.ok) {
        const xml = await gpxRes.text();
        const pair = firstTwoTrkptFromGpx(xml);
        if (pair) rideBearing = gpxBearing(pair[0], pair[1]);
      }
    } catch {
      // negeer — wind wordt dan zonder richting-classificatie getoond
    }
  }

  // Cols voor klim-naam-matching + klim-overrides — via admin-client.
  let cols: ColLite[] = [];
  let climbOverrides: ClimbRange[] = [];
  let eventPois: EventPoi[] = [];
  let eventZones: EventZone[] = [];
  if (event.gpxUrl && event.isToday) {
    const admin = createAdminClient();
    const [{ data: colRows }, { data: climbRows }, { data: poiRows }, { data: zoneRows }] =
      await Promise.all([
        admin
          .from("cols")
          .select("slug, name, summit_lat, summit_lon, detection_radius_m")
          .not("summit_lat", "is", null)
          .not("summit_lon", "is", null),
        admin
          .from("event_climbs")
          .select("name, category, start_km, end_km")
          .eq("event_id", event.id)
          .order("position"),
        admin
          .from("event_pois")
          .select("id, type, label, lat, lng, created_by")
          .eq("event_id", event.id),
        admin
          .from("event_zones")
          .select("label, start_km, end_km")
          .eq("event_id", event.id)
          .order("position"),
      ]);
    cols = ((colRows ?? []) as Array<{
      slug: string;
      name: string;
      summit_lat: number | string;
      summit_lon: number | string;
      detection_radius_m: number | null;
    }>).map((c) => ({
      slug: c.slug,
      name: c.name,
      summit_lat: Number(c.summit_lat),
      summit_lon: Number(c.summit_lon),
      detection_radius_m: c.detection_radius_m,
    }));
    climbOverrides = ((climbRows ?? []) as Array<{
      name: string | null;
      category: string | null;
      start_km: number | string;
      end_km: number | string;
    }>).map((r) => ({
      name: r.name,
      category: (r.category as ClimbRange["category"]) ?? null,
      startKm: Number(r.start_km),
      endKm: Number(r.end_km),
    }));
    eventPois = ((poiRows ?? []) as Array<{
      id: string;
      type: string;
      label: string | null;
      lat: number | string;
      lng: number | string;
      created_by: string | null;
    }>)
      .filter((r) => isPoiType(r.type))
      .map((r) => ({
        id: r.id,
        type: r.type as EventPoi["type"],
        label: r.label,
        lat: Number(r.lat),
        lng: Number(r.lng),
        createdBy: r.created_by,
      }));
    eventZones = ((zoneRows ?? []) as Array<{
      label: string | null;
      start_km: number | string;
      end_km: number | string;
    }>).map((r) => ({
      label: r.label,
      startKm: Number(r.start_km),
      endKm: Number(r.end_km),
    }));
  }

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

      {windForecast && (
        <WindSummary forecast={windForecast} rideBearing={rideBearing} />
      )}

      {!event.gpxUrl ? (
        <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          Voor deze rit is geen route (GPX) geüpload, dus we kunnen geen
          live-route tonen.
        </section>
      ) : !event.isToday ? (
        <section className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          De liveticker is alleen actief op de dag van de rit zelf. Kom
          terug op <strong>{formatDateOnly(startDate)}</strong> om mee te
          kijken.
        </section>
      ) : (
        <EventLiveTicker
          gpxUrl={event.gpxUrl}
          eventStartAt={event.start_at}
          sessions={sessions}
          initialPositions={positions}
          cols={cols}
          climbOverrides={climbOverrides}
          pois={eventPois}
          zones={eventZones}
          pollUrl={`/api/live/event/${event.id}`}
        />
      )}

      {event.isToday && (
        <>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-center text-xs text-muted-foreground">
            Dit is een <strong>openbare pagina</strong> — iedereen met de link
            kan meelezen en meedoen in de chat.
          </p>
          <EventChat
            eventId={event.id}
            mode="poll"
            currentUserId={null}
            isMember={false}
            isAdmin={false}
            initialMessages={initialChat}
          />
        </>
      )}

      <footer className="border-t pt-4 text-center text-xs text-muted-foreground">
        <Link href="/login" className="underline">
          Log in op het ZWB-platform
        </Link>{" "}
        voor het volledige event.
      </footer>
    </div>
  );
}
