import { createAdminClient } from "@/lib/supabase/admin";
import { overlayMode } from "@/lib/youtube-live/overlay-theme";
import { streamRoute, streamThumbnail, type ThumbnailEvent } from "@/lib/youtube-live/thumbnail";

// De thumbnail van een stream als PNG, om te bekijken (dezelfde die naar
// YouTube gaat). Openbaar, net als de overlay: alleen titel, tijd en route.

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_streams")
    // "*" zodat dit ook werkt zolang 0345 nog niet is toegepast.
    .select("*, events(title, type, start_at, zwift_route_id, laps, parent_event_id, zwift_event_id, distance_km, elevation_m)")
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as { overlay_theme?: string | null; events: ThumbnailEvent | null } | null;
  const event = stream?.events;
  if (!event) return new Response("Niet gevonden", { status: 404 });
  // ?theme= om de andere stand te bekijken zonder hem te kiezen.
  const asked = new URL(request.url).searchParams.get("theme");
  return streamThumbnail({
    eventTitle: event.title,
    eventType: event.type,
    startAt: event.start_at,
    route: await streamRoute(admin, event),
    theme: overlayMode(asked ?? stream?.overlay_theme),
    origin: new URL(request.url).origin,
  });
}
