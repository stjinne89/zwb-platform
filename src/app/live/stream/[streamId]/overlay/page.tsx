import { notFound } from "next/navigation";
import { StreamOverlay, wantedTeams, zrlStatus } from "@/components/livestream/stream-overlay";
import { createAdminClient } from "@/lib/supabase/admin";
import { overlayInfo, overlayStatus, overlayTitle } from "@/lib/youtube-live/broadcast";
import { streamRoute } from "@/lib/youtube-live/event-route";
import { loadKopman } from "@/lib/youtube-live/kopman-store";
import { overlayStyle } from "@/lib/youtube-live/overlay-styles";
import { overlayHole, overlayLayout, overlayScale, overlaySize } from "@/lib/youtube-live/overlay-size";
import { overlayMode } from "@/lib/youtube-live/overlay-theme";
import { loadZrlLive } from "@/lib/zrl-live/snapshot";
import { loadLadderLive } from "@/lib/club-ladder/live-load";
import { ladderOverlayRows, ladderOverlayStatus } from "@/lib/club-ladder/live";

// De OBS-overlay van één stream (0341). Openbaar, want OBS logt niet in; de
// link bevat alleen de id van de stream. event_streams is niet voor iedereen
// leesbaar, dus via de service-rol, en alleen titel, soort, route en schakelaar.
// Kader, logo en sponsors staan er altijd; de stand alleen bij een ZRL-race of
// ladderrace met de schakelaar aan. Elke 15 seconden ververst, dus de schakelaar werkt mee,
// net als de stijl en donker of licht (?style= en ?theme= voor een voorbeeld).
// ?preview: het voorbeeld in de stijlkeuze op de racepagina, zonder verversen
// en altijd op 1920×1080. Anders op de resolutie van de stream (0348). Bij een
// ultrawide Zwift-beeld (0359) de indeling met een balk boven en onder, ook in
// het voorbeeld; ?size= toont een andere maat.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function generateMetadata() {
  return { title: "Live — overlay", robots: { index: false, follow: false } };
}

type PageProps = {
  params: Promise<{ streamId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type StreamEvent = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  end_at: string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
  laps: number | null;
  zwift_route_id: number | null;
  parent_event_id: string | null;
  team_id: string | null;
  zwift_event_id: string | null;
};

type StreamRow = {
  profile_id: string;
  overlay_stand?: boolean | null;
  overlay_theme?: string | null;
  overlay_style?: string | null;
  overlay_size?: string | null;
  events: StreamEvent | null;
};

export default async function StreamOverlayPage({ params, searchParams }: PageProps) {
  const { streamId } = await params;
  const query = (await searchParams) ?? {};
  const admin = createAdminClient();
  // "*" zodat de pagina ook werkt zolang 0341 nog niet is toegepast.
  const { data } = await admin
    .from("event_streams")
    .select(
      "*, events(id, title, type, start_at, end_at, distance_km, elevation_m, laps, zwift_route_id, parent_event_id, team_id, zwift_event_id)",
    )
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as StreamRow | null;
  const event = stream?.events;
  if (!stream || !event) notFound();

  const route = await streamRoute(admin, event).catch(() => null);
  const distanceKm = route?.distanceKm ?? null;
  const info = overlayInfo({
    routeName: route?.routeName,
    laps: route?.laps ?? event.laps,
    distanceKm,
    elevationM: route?.elevationM,
  });
  const theme = overlayMode(query.theme ?? stream.overlay_theme);
  const look = overlayStyle(query.style ?? stream.overlay_style);
  const preview = query.preview !== undefined;
  const refreshSeconds = preview ? null : 15;
  // De resolutie van de stream (0348); het voorbeeld in de app blijft 1920 breed.
  const size = overlaySize(query.size ?? stream.overlay_size);
  const scale = preview ? 1 : overlayScale(size);
  // Ultrawide (0359): het gat over de volle breedte, de stand in de balk onder.
  const wide = overlayLayout(size) === "wide";
  const hole = wide ? overlayHole(size) : null;
  // De eigen kopman van het lid (0347), alleen bij strip.
  const kopman = look === "strip" ? await loadKopman(admin, stream.profile_id) : null;
  const title = overlayTitle(event.title);
  const status = overlayStatus({ type: event.type, startAt: event.start_at, endAt: event.end_at, distanceKm, now: new Date() });
  const plain = <StreamOverlay title={title} status={status} info={info} theme={theme} look={look} route={route} stand={null} kopman={kopman} scale={scale} hole={hole} refreshSeconds={refreshSeconds} />;

  const hasStand = (event.type === "zrl" || event.type === "ladder") && Boolean(event.team_id && event.zwift_event_id);
  if (!hasStand) return plain;

  // Ladderrace: de score en de tien renners bij de laatste boog. Buiten het
  // venster van de live stand (een kwartier voor tot drie uur na de start) het kader zonder stand.
  if (event.type === "ladder") {
    if (stream.overlay_stand === false) return plain;
    const ladder = await loadLadderLive(event.id).catch(() => null);
    if (ladder?.status !== "ok") return plain;
    const { view } = ladder;
    return (
      <StreamOverlay
        title={title}
        status={ladderOverlayStatus(view.live, view.event.startAt, view.fetchedAt)}
        info={info}
        theme={theme}
        look={look}
        route={route}
        stand={{ kind: "ladder", rows: ladderOverlayRows(view, wide ? 10 : wantedTeams(query.teams)) }}
        kopman={kopman}
        scale={scale}
        hole={hole}
        refreshSeconds={refreshSeconds}
      />
    );
  }

  const outcome = await loadZrlLive(event.id);
  if (outcome.status !== "ok") return plain;
  const { view } = outcome;
  return (
    <StreamOverlay
      title={title}
      status={zrlStatus(view)}
      info={info}
      theme={theme}
      look={look}
      route={route}
      stand={stream.overlay_stand !== false ? { view, teams: wide ? Math.min(wantedTeams(query.teams), 10) : wantedTeams(query.teams) } : null}
      kopman={kopman}
      scale={scale}
      hole={hole}
      refreshSeconds={refreshSeconds}
    />
  );
}
