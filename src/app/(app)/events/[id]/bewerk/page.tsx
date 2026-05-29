import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EventForm, type EventInitial } from "../../../kalender/nieuw/_form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: event }, access] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, type, start_at, end_at, location, description, external_url, results_url, cover_image_path, gpx_path, distance_km, elevation_m, created_by",
      )
      .eq("id", id)
      .single(),
    getCurrentUserAccess(supabase),
  ]);

  if (!event) notFound();

  const isCreator = event.created_by === user.id;
  if (!isCreator && !access.has("events.manage_all")) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Alleen de aanmaker of iemand met eventbeheerrecht kan dit event bewerken.
      </div>
    );
  }

  const initial: EventInitial = {
    id: event.id,
    title: event.title,
    type: event.type,
    start_at: event.start_at,
    end_at: event.end_at,
    location: event.location,
    description: event.description,
    external_url: event.external_url,
    results_url: event.results_url,
    cover_image_path: event.cover_image_path,
    gpx_path: event.gpx_path,
    distance_km: event.distance_km,
    elevation_m: event.elevation_m,
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/events/${event.id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Terug naar event
      </Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Event bewerken</h1>
        <p className="mt-1 text-muted-foreground">
          Pas titel, datum, locatie, beschrijving of route aan. Wijzigingen
          zijn direct zichtbaar voor alle leden.
        </p>
      </header>
      <EventForm initial={initial} />
    </div>
  );
}
