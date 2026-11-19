import { createAdminClient } from "@/lib/supabase/admin";
import { streamThumbnail, thumbnailRoute, type ThumbnailEvent } from "@/lib/youtube-live/thumbnail";

// De thumbnail van een stream als PNG, om te bekijken (dezelfde die naar
// YouTube gaat). Openbaar, net als de overlay: alleen titel, tijd en route.

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("event_streams")
    .select("events(title, start_at, zwift_route_id, laps, parent_event_id)")
    .eq("id", streamId)
    .maybeSingle();
  const event = (data as { events: ThumbnailEvent | null } | null)?.events;
  if (!event) return new Response("Niet gevonden", { status: 404 });
  const route = await thumbnailRoute(admin, event);
  return streamThumbnail({
    eventTitle: event.title,
    startAt: event.start_at,
    ...route,
    origin: new URL(request.url).origin,
  });
}
