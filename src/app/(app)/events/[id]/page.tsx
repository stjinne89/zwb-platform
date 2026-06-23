import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { WhatsAppGroupBlock } from "@/components/whatsapp-link";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";
import { firstTwoTrkptFromGpx, gpxBearing } from "@/lib/gpx";
import { fetchWindForecast } from "@/lib/weather";
import { RouteSection } from "./_components/route-section";
import { isPoiType, type EventPoi } from "./_components/poi";
import type { ColLite, ClimbRange } from "@/lib/gpx-climbs";
import {
  EventLiveTicker,
  type EventLivePosition,
  type EventLiveSession,
} from "./_components/event-live-ticker";
import { WindSummary } from "./_components/wind-summary";
import { RsvpPicker } from "./_components/rsvp-buttons";
import { ShareLiveButton } from "./_components/share-live-button";
import { RefreshResultsButton } from "./_components/refresh-results-button";
import { ManualResultForm } from "./_components/manual-result-form";
import { RemoveResultButton } from "./_components/remove-result-button";
import {
  EventReports,
  type EventReport,
} from "./_components/event-reports";
import { EventChat, type ChatMessage } from "./_components/event-chat";
import { EventPhotoUploader } from "./_components/photo-uploader";
import {
  EventPhotoGallery,
  type EventPhotoData,
} from "./_components/photo-gallery";
import { LiveTimingPanel } from "../../live/_components/live-timing-panel";
import {
  isChronoLiveTimingUrl,
  type LiveTimingOutcome,
} from "@/lib/event-results/scrape";
import { fetchExternalLiveTiming } from "@/lib/live/external-timing";

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
      "id, type, title, description, start_at, end_at, location, distance_km, elevation_m, start_lat, start_lon, gpx_path, external_url, live_timing_url, results_url, cover_image_path, last_results_scrape_at, results_scrape_error, created_by",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  // Strip het interne "ZWB-deelnemers:"-label uit de omschrijving (gekoppelde
  // leden tonen we als RSVP-deelnemer). De namen zelf blijven leesbaar staan,
  // zodat ook nog niet-gekoppelde deelnemers zichtbaar blijven.
  const eventDescription = String(event.description ?? "")
    .split("\n")
    .map((line) =>
      line.startsWith("ZWB-deelnemers:")
        ? line.replace(/^ZWB-deelnemers:\s*/, "").trim()
        : line,
    )
    .join("\n")
    .trim();

  // ZwiftPower-uitslagen zijn niet als tabel te scrapen; we tonen ze als directe
  // link in plaats van de gebruikelijke uitslag-tabel.
  const zwiftPowerUrl = (() => {
    try {
      const url = new URL(event.results_url ?? "");
      return url.hostname === "zwiftpower.com" ||
        url.hostname.endsWith(".zwiftpower.com")
        ? url.toString()
        : null;
    } catch {
      return null;
    }
  })();

  const [
    { data: rsvps },
    access,
    { data: waGroups },
    { data: photoRows },
    { data: resultRows },
    { data: reportRows },
    { data: colRows },
    { data: colClimbRows },
    { data: poiRows },
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
        "id, profile_id, scraped_name, position, time_text, time_seconds, category, category_rank, matched_via, is_manual",
      )
      .eq("event_id", id),
    supabase
      .from("event_reports")
      .select(
        "id, profile_id, body_md, created_at, profiles(display_name), event_report_comments(id, profile_id, body, created_at, profiles(display_name))",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cols")
      .select("slug, name, summit_lat, summit_lon, detection_radius_m")
      .not("summit_lat", "is", null)
      .not("summit_lon", "is", null),
    supabase
      .from("event_climbs")
      .select("name, category, start_km, end_km")
      .eq("event_id", id)
      .order("position"),
    supabase
      .from("event_pois")
      .select("id, type, label, lat, lng, created_by")
      .eq("event_id", id),
  ]);

  const eventPois: EventPoi[] = ((poiRows ?? []) as Array<{
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

  // Klim-overrides (admin/creator) → ClimbRange[] voor RouteSection/liveticker.
  const climbOverrides: ClimbRange[] = ((colClimbRows ?? []) as Array<{
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

  // Cols → ColLite (numerics als number) voor de klim-naam-matching.
  const cols: ColLite[] = ((colRows ?? []) as Array<{
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
    category: string | null;
    categoryRank: number | null;
    matchedVia: string;
    isManual: boolean;
  };
  const results: EventResult[] = (resultRows ?? [])
    .map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      scrapedName: r.scraped_name,
      position: r.position,
      timeText: r.time_text,
      timeSeconds: r.time_seconds,
      category: r.category ?? null,
      categoryRank: r.category_rank ?? null,
      matchedVia: r.matched_via,
      isManual: r.is_manual ?? false,
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

  // Ritverslagen + reacties → genest profielnaam uitpakken.
  const nameOf = (rel: unknown): string => {
    if (!rel) return "ZWB'er";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const single = Array.isArray(rel) ? (rel as any[])[0] : (rel as any);
    return (single?.display_name as string) ?? "ZWB'er";
  };
  const eventReports: EventReport[] = (
    (reportRows ?? []) as Array<{
      id: string;
      profile_id: string;
      body_md: string;
      created_at: string;
      profiles: unknown;
      event_report_comments:
        | Array<{
            id: string;
            profile_id: string;
            body: string;
            created_at: string;
            profiles: unknown;
          }>
        | null;
    }>
  ).map((r) => ({
    id: r.id,
    profileId: r.profile_id,
    authorName: nameOf(r.profiles),
    bodyMd: r.body_md,
    createdAt: r.created_at,
    comments: (r.event_report_comments ?? [])
      .map((c) => ({
        id: c.id,
        profileId: c.profile_id,
        authorName: nameOf(c.profiles),
        body: c.body,
        createdAt: c.created_at,
      }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  }));

  const coverUrl = event.cover_image_path
    ? supabase.storage.from("event-photos").getPublicUrl(event.cover_image_path)
        .data.publicUrl
    : null;

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
  let liveTimingOutcome: LiveTimingOutcome | null = null;
  if (eventIsToday && isChronoLiveTimingUrl(event.live_timing_url)) {
    liveTimingOutcome = await fetchExternalLiveTiming(
      event.live_timing_url,
    ).catch(() => ({
      ok: false,
      results: [],
      error: "Live timing ophalen is mislukt.",
    }));
  }
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

  // Live-chat: initiële berichten (leden zien ook interne via RLS). Ook na de
  // rit ophalen, zodat de chat als archief deel wordt van het ritverslag.
  let initialChat: ChatMessage[] = [];
  {
    const { data: chatRows } = await supabase
      .from("event_chat_messages")
      .select(
        "id, profile_id, guest_name, body, internal_only, created_at, profiles(display_name)",
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(eventIsToday ? 50 : 200);
    initialChat = ((chatRows ?? []) as Array<{
      id: string;
      profile_id: string | null;
      guest_name: string | null;
      body: string;
      internal_only: boolean | null;
      created_at: string;
      profiles: unknown;
    }>)
      .map((r) => ({
        id: r.id,
        profileId: r.profile_id,
        name: r.profile_id ? nameOf(r.profiles) : r.guest_name || "Gast",
        isGuest: !r.profile_id,
        body: r.body,
        createdAt: r.created_at,
        internal: Boolean(r.internal_only),
      }))
      .reverse();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/kalender"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Kalender
      </Link>

      {coverUrl && (
        <div className="overflow-hidden rounded-2xl border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            className="aspect-[16/7] w-full object-contain sm:aspect-[16/6]"
          />
        </div>
      )}

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
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
        <h1 className="text-3xl font-semibold tracking-tight">
          {event.external_url ? (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-baseline gap-1.5 transition hover:text-primary hover:underline"
              title="Open de event-website"
            >
              {event.title}
              <ArrowUpRight className="size-5 shrink-0 self-center text-muted-foreground" />
            </a>
          ) : (
            event.title
          )}
        </h1>
        <p className="text-muted-foreground">
          {new Date(event.start_at).toLocaleString("nl-NL", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Europe/Amsterdam",
          })}
          {event.location ? ` · ${event.location}` : ""}
          {event.distance_km ? ` · ${event.distance_km} km` : ""}
          {event.elevation_m ? ` · ${event.elevation_m} hm` : ""}
        </p>
      </header>

      <WhatsAppGroupBlock
        scope="event"
        groups={waGroups ?? []}
        canManage={canManage}
      />

      {eventDescription && (
        <section className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm">
          {eventDescription}
        </section>
      )}

      {gpxUrl &&
        (eventIsToday ? (
          <EventLiveTicker
            gpxUrl={gpxUrl}
            eventStartAt={event.start_at}
            sessions={eventLiveSessions}
            initialPositions={eventLivePositions}
            cols={cols}
            climbOverrides={climbOverrides}
          />
        ) : (
          <RouteSection
            gpxUrl={gpxUrl}
            cols={cols}
            eventId={event.id}
            canManage={canManage}
            initialClimbs={climbOverrides}
            initialPois={eventPois}
            currentUserId={user?.id ?? null}
          />
        ))}

      {eventIsToday && (
        <EventChat
          eventId={event.id}
          mode="realtime"
          currentUserId={user?.id ?? null}
          isMember={Boolean(user)}
          isAdmin={access.isAdmin}
          initialMessages={initialChat}
        />
      )}

      {windForecast && (
        <WindSummary forecast={windForecast} rideBearing={rideBearing} />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ben jij erbij?
        </h2>
        <RsvpPicker eventId={event.id} current={myRsvp ?? null} groups={grouped} />
      </section>

      {liveTimingOutcome && (
        <LiveTimingPanel
          eventId={event.id}
          eventTitle={event.title}
          initialOutcome={liveTimingOutcome}
        />
      )}

      {zwiftPowerUrl ? (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Uitslag
          </h2>
          <a
            href={zwiftPowerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Bekijk de uitslag op ZwiftPower →
          </a>
        </section>
      ) : (
        (event.results_url || results.length > 0 || canManage) && (
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
                  ? "Voeg een uitslag-URL toe via Bewerk, of voeg hieronder handmatig deelnemers toe."
                  : "Nog geen uitslag beschikbaar."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-3 font-medium">#</th>
                    <th className="py-1.5 pr-3 font-medium">Naam</th>
                    <th className="py-1.5 pr-3 font-medium">Tijd</th>
                    <th className="py-1.5 font-medium">Cat.</th>
                    {canManage && <th className="py-1.5" />}
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
                          {r.isManual && (
                            <span
                              className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                              title="Handmatig toegevoegd"
                            >
                              handmatig
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {r.timeText ?? "—"}
                      </td>
                      <td className="py-1.5 text-xs text-muted-foreground">
                        {r.category
                          ? `${r.category}${r.categoryRank != null ? ` · ${r.categoryRank}e` : ""}`
                          : "—"}
                      </td>
                      {canManage && (
                        <td className="py-1.5 pl-2 text-right">
                          <RemoveResultButton resultId={r.id} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canManage && (
            <div className="pt-1">
              <ManualResultForm eventId={event.id} />
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
        )
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

      <EventReports
        eventId={event.id}
        currentUserId={user?.id ?? null}
        isAdmin={access.isAdmin}
        reports={eventReports}
      />

      {!eventIsToday && initialChat.length > 0 && (
        <EventChat
          eventId={event.id}
          mode="poll"
          currentUserId={user?.id ?? null}
          isMember={Boolean(user)}
          isAdmin={access.isAdmin}
          initialMessages={initialChat}
          readOnly
        />
      )}
    </div>
  );
}
