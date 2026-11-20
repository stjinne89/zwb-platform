import { createAdminClient } from "@/lib/supabase/admin";
import { overlayStyle } from "@/lib/youtube-live/overlay-styles";
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
    // "*" zodat dit ook werkt zolang 0345 en 0346 nog niet zijn toegepast.
    .select("*, events(title, type, start_at, zwift_route_id, laps, parent_event_id, zwift_event_id, distance_km, elevation_m)")
    .eq("id", streamId)
    .maybeSingle();
  const stream = data as { overlay_theme?: string | null; overlay_style?: string | null; events: ThumbnailEvent | null } | null;
  const event = stream?.events;
  if (!event) return new Response("Niet gevonden", { status: 404 });
  // ?theme= en ?style= om een andere keuze te bekijken zonder hem te kiezen.
  const query = new URL(request.url).searchParams;
  return streamThumbnail({
    eventTitle: event.title,
    eventType: event.type,
    startAt: event.start_at,
    route: await streamRoute(admin, event),
    theme: overlayMode(query.get("theme") ?? stream?.overlay_theme),
    look: overlayStyle(query.get("style") ?? stream?.overlay_style),
    origin: new URL(request.url).origin,
  });
}
