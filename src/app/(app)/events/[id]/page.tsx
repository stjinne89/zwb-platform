import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { ExternalEventLink } from "@/components/external-event-link";
import { WhatsAppGroupBlock } from "@/components/whatsapp-link";
import { firstTwoTrkptFromGpx, gpxBearing } from "@/lib/gpx";
import { fetchWindForecast } from "@/lib/weather";
import { GpxMap } from "./_components/gpx-map";
import { ElevationProfile } from "./_components/elevation-profile";
import {
  EventLiveTicker,
  type EventLivePosition,
  type EventLiveSession,
} from "./_components/event-live-ticker";
import { WindSummary } from "./_components/wind-summary";
import { RsvpButtons } from "./_components/rsvp-buttons";
import { ShareLiveButton } from "./_components/share-live-button";
import { RefreshResultsButton } from "./_components/refresh-results-button";
import { EventPhotoUploader } from "./_components/photo-uploader";
import {
  EventPhotoGallery,
  type EventPhotoData,
} from "./_components/photo-gallery";

const TYPE_LABELS: Record<string, string> = {
  outdoor: "Outdoor rit",
  zrl: "ZRL race",
  ladder: "Ladder race",
  flamme_rouge: "Flamme Rouge",
  social: "Social",
  training: "Training",
};

type RsvpStatus = "yes" | "maybe" | "no";
const STALE_AFTER_MIN = 15;

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

function isAmsterdamToday(value: string) {
  return amsterdamDateKey(new Date(value)) === amsterdamDateKey(new Date());
}

async function getActiveCutoffIso() {
  return new Date(Date.now() - STALE_AFTER_MIN * 60 * 1000).toISOString();
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, type, title, description, start_at, end_at, location, distance_km, elevation_m, start_lat, start_lon, gpx_path, external_url, results_url, last_results_scrape_at, results_scrape_error, created_by",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [
    { data: rsvps },
    access,
    { data: waGroups },
    { data: photoRows },
    { data: resultRows },
  ] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select(
        "status, profile_id, profiles(display_name, zrl_category, strava_id)",
      )
      .eq("event_id", id),
    getCurrentUserAccess(supabase),
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description")
      .eq("event_id", id)
      .order("display_order")
      .order("name"),
    supabase
      .from("event_photos")
      .select(
        "id, storage_path, width, height, caption, taken_at, profile_id, profiles(display_name)",
      )
      .eq("event_id", id)
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("event_results")
      .select(
        "id, profile_id, scraped_name, position, time_text, time_seconds, matched_via",
      )
      .eq("event_id", id),
  ]);

  const isCreator = user?.id === event.created_by;
  const canManage = access.has("events.manage_all") || isCreator;

  // Map photo rows → public URLs voor de gallery.
  const photoData: EventPhotoData[] = (photoRows ?? []).map((row) => {
    const {
      data: { publicUrl },
    } = supabase.storage.from("event-photos").getPublicUrl(row.storage_path);
    return {
      id: row.id,
      url: publicUrl,
      storagePath: row.storage_path,
      width: row.width ?? null,
      height: row.height ?? null,
      caption: row.caption ?? null,
      takenAt: row.taken_at ?? null,
      uploaderId: row.profile_id,
      uploaderName:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((row.profiles as any)?.display_name as string) ?? "Onbekend",
    };
  });

  // ZWB-uitslagen: sorteer op positie (nulls onderaan), dan tijd, dan naam.
  type EventResult = {
    id: string;
    profileId: string | null;
    scrapedName: string;
    position: number | null;
    timeText: string | null;
    timeSeconds: number | null;
    matchedVia: string;
  };
  const results: EventResult[] = (resultRows ?? [])
    .map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      scrapedName: r.scraped_name,
      position: r.position,
      timeText: r.time_text,
      timeSeconds: r.time_seconds,
      matchedVia: r.matched_via,
    }))
    .sort((a, b) => {
      if (a.position != null && b.position != null)
        return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      if (a.timeSeconds != null && b.timeSeconds != null)
        return a.timeSeconds - b.timeSeconds;
      return a.scrapedName.localeCompare(b.scrapedName);
    });
  const lastScrapeAt = event.last_results_scrape_at as string | null;

  const myRsvp = rsvps?.find((r) => r.profile_id === user?.id)?.status as
    | RsvpStatus
    | undefined;

  type RsvpEntry = {
    name: string;
    zrl: string | null;
    strava: string | null;
  };
  const grouped: Record<RsvpStatus, RsvpEntry[]> = {
    yes: [],
    maybe: [],
    no: [],
  };
  for (const r of rsvps ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = (r as any).profiles ?? null;
    grouped[r.status as RsvpStatus]?.push({
      name: profile?.display_name ?? "Onbekend",
      zrl: profile?.zrl_category ?? null,
      strava: profile?.strava_id ?? null,
    });
  }
  const eventIsToday = isAmsterdamToday(event.start_at);
  const liveParticipantIds = Array.from(
    new Set(
      (rsvps ?? [])
        .filter((r) => r.status === "yes" || r.status === "maybe")
        .map((r) => r.profile_id),
    ),
  );

  let gpxUrl: string | null = null;
  if (event.gpx_path) {
    const { data } = await supabase.storage
      .from("event-gpx")
      .createSignedUrl(event.gpx_path, 3600);
    gpxUrl = data?.signedUrl ?? null;
  }

  let eventLiveSessions: EventLiveSession[] = [];
  let eventLivePositions: EventLivePosition[] = [];
  if (eventIsToday && liveParticipantIds.length > 0) {
    const cutoff = await getActiveCutoffIso();
    const { data: sessionRows } = await supabase
      .from("live_sessions")
      .select(
        "id, profile_id, source, started_at, last_seen_at, profiles(display_name)",
      )
      .in("profile_id", liveParticipantIds)
      .eq("mode", "outdoor")
      .is("ended_at", null)
      .gte("last_seen_at", cutoff)
      .order("started_at", { ascending: false });

    eventLiveSessions = (sessionRows ?? []).map((s) => ({
      id: s.id,
      profileId: s.profile_id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profileName: ((s.profiles as any)?.display_name as string) ?? "ZWB'er",
      source: (s.source ?? "manual") as EventLiveSession["source"],
      startedAt: s.started_at,
      lastSeenAt: s.last_seen_at,
    }));

    const sessionIds = eventLiveSessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: positionRows } = await supabase
        .from("live_positions")
        .select("session_id, profile_id, lat, lng, altitude, speed_kmh, recorded_at")
        .in("session_id", sessionIds)
        .order("recorded_at", { ascending: false })
        .limit(Math.max(500, sessionIds.length * 80));
      eventLivePositions = (positionRows ?? []) as unknown as EventLivePosition[];
    }
  }

  // Wind-forecast wordt server-side opgehaald — alleen als we lat/lon
  // én een toekomstig start-tijdstip hebben binnen 16 dagen.
  const windForecast =
    event.start_lat && event.start_lon
      ? await fetchWindForecast(
          Number(event.start_lat),
          Number(event.start_lon),
          new Date(event.start_at),
        )
      : null;

  // Initial bearing voor headwind-classificatie: fetch GPX server-side
  // (cached via next.revalidate=3600) en pak de eerste twee trkpt-punten.
  let rideBearing: number | null = null;
  if (gpxUrl) {
    try {
      const gpxRes = await fetch(gpxUrl, {
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

  return (
    <div className="space-y-6">
      <Link
        href="/kalender"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Kalender
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
          <div className="flex items-center gap-2">
            {eventIsToday && event.gpx_path && (
              <ShareLiveButton eventId={event.id} />
            )}
            {canManage && (
              <Link href={`/events/${event.id}/bewerk`}>
                <Button type="button" size="sm" variant="outline">
                  <Pencil className="size-3.5" />
                  Bewerk
                </Button>
              </Link>
            )}
          </div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
        <p className="text-muted-foreground">
          {new Date(event.start_at).toLocaleString("nl-NL", {
            dateStyle: "full",
            timeStyle: "short",
          })}
          {event.location ? ` · ${event.location}` : ""}
          {event.distance_km ? ` · ${event.distance_km} km` : ""}
          {event.elevation_m ? ` · ${event.elevation_m} hm` : ""}
        </p>
        {event.external_url && (
          <div className="pt-1">
            <ExternalEventLink url={event.external_url} />
          </div>
        )}
      </header>

      <WhatsAppGroupBlock
        scope="event"
        groups={waGroups ?? []}
        canManage={canManage}
      />

      {event.description && (
        <section className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm">
          {event.description}
        </section>
      )}

      {gpxUrl &&
        (eventIsToday ? (
          <EventLiveTicker
            gpxUrl={gpxUrl}
            sessions={eventLiveSessions}
            initialPositions={eventLivePositions}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <GpxMap gpxUrl={gpxUrl} />
            <ElevationProfile gpxUrl={gpxUrl} />
          </div>
        ))}

      {windForecast && (
        <WindSummary forecast={windForecast} rideBearing={rideBearing} />
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ben jij erbij?
        </h2>
        <RsvpButtons eventId={event.id} current={myRsvp ?? null} />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["yes", "maybe", "no"] as RsvpStatus[]).map((s) => (
          <div key={s} className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">
              {s === "yes" ? "Ja" : s === "maybe" ? "Misschien" : "Nee"}{" "}
              <span className="text-muted-foreground">({grouped[s].length})</span>
            </h3>
            {grouped[s].length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {grouped[s].map((entry, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    <span>{entry.name}</span>
                    {entry.zrl && (
                      <span
                        className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
                        title={`ZRL-categorie ${entry.zrl}`}
                      >
                        {entry.zrl}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {(event.results_url || results.length > 0 || canManage) && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Uitslag — ZWB&apos;ers{" "}
              {results.length > 0 && (
                <span className="text-muted-foreground">({results.length})</span>
              )}
            </h2>
            {canManage && event.results_url && (
              <RefreshResultsButton eventId={event.id} />
            )}
          </header>

          {event.results_scrape_error && canManage && (
            <p className="text-xs text-destructive">
              {event.results_scrape_error}
            </p>
          )}

          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {event.results_url
                ? "Nog geen uitslag opgehaald."
                : canManage
                  ? "Voeg een uitslag-URL toe via Bewerk om ZWB-uitslagen op te halen."
                  : "Nog geen uitslag beschikbaar."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">#</th>
                    <th className="py-1.5 pr-3 font-medium">Naam</th>
                    <th className="py-1.5 font-medium">Tijd</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">
                        {r.position ?? "—"}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          {r.profileId ? (
                            <Link
                              href={`/leden/${r.profileId}`}
                              className="font-medium hover:underline"
                            >
                              {r.scrapedName}
                            </Link>
                          ) : (
                            <span>{r.scrapedName}</span>
                          )}
                          {r.matchedVia === "zwb_mention" && (
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                              ZWB
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {r.timeText ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {lastScrapeAt && results.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Laatst opgehaald:{" "}
              {new Date(lastScrapeAt).toLocaleString("nl-NL", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Foto&apos;s ({photoData.length})
          </h2>
          {user && <EventPhotoUploader eventId={event.id} />}
        </header>
        <EventPhotoGallery
          eventId={event.id}
          photos={photoData}
          currentUserId={user?.id ?? null}
          isAdmin={access.isAdmin}
        />
      </section>
    </div>
  );
}
