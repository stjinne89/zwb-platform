import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink, HelpLink } from "@/components/app-ui";
import { EventForm, type EventInitial } from "../../../kalender/nieuw/_form";
import { DeleteEventButton } from "../_components/delete-event-button";
import { LinkEditor } from "../_components/link-editor";
import { isEventLinkKind, type EventLinkKind } from "@/lib/events/race-links";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const user = await getRequestUser();
  if (!user) redirect("/login");

  const [
    { data: event },
    access,
    { data: teams },
    { data: linkRows },
    { data: programRows },
    { data: programLinks },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, type, kind, start_at, end_at, location, description, external_url, live_timing_url, results_url, cover_image_path, team_id, gpx_path, distance_km, elevation_m, zwift_event_id, zwift_route_id, laps, created_by",
      )
      .eq("id", id)
      .single(),
    getRequestAccess(),
    supabase
      .from("teams")
      .select("id, name, type, parent_team_id")
      .order("type")
      .order("name"),
    supabase
      .from("event_links")
      .select("kind, label, url")
      .eq("event_id", id)
      .order("position"),
    supabase.from("event_programs").select("id, name, archived_at").order("name"),
    supabase.from("event_program_links").select("program_id").eq("event_id", id),
  ]);

  if (!event) notFound();

  const isCreator = event.created_by === user.id;
  if (!isCreator && !access.has("events.manage_all")) {
    return (
      <div className="mx-auto max-w-md rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        Alleen de aanmaker of een eventbeheerder kan dit event bewerken.
      </div>
    );
  }

  const programIds = (programLinks ?? []).map((row) => row.program_id as string);
  // Een gearchiveerd programma blijft kiesbaar zolang het event erin zit,
  // anders valt de koppeling bij opslaan stil weg.
  const programs = (programRows ?? []).filter(
    (program) => !program.archived_at || programIds.includes(program.id),
  );

  const initial: EventInitial = {
    id: event.id,
    title: event.title,
    type: event.type,
    kind: event.kind,
    start_at: event.start_at,
    end_at: event.end_at,
    location: event.location,
    description: event.description,
    external_url: event.external_url,
    live_timing_url: event.live_timing_url,
    results_url: event.results_url,
    cover_image_path: event.cover_image_path,
    team_id: event.team_id,
    gpx_path: event.gpx_path,
    distance_km: event.distance_km,
    elevation_m: event.elevation_m,
    zwift_event_id: event.zwift_event_id,
    zwift_route_id: event.zwift_route_id,
    laps: event.laps,
    program_ids: programIds,
  };
  const links = ((linkRows ?? []) as Array<{ kind: string; label: string | null; url: string }>)
    .filter((row) => isEventLinkKind(row.kind))
    .map((row) => ({
      kind: row.kind as EventLinkKind,
      label: row.label ?? "",
      url: row.url,
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href={`/events/${event.id}`} label="Event" />
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Event bewerken</h1>
        <HelpLink href="/hulp#eventbeheer" />
      </header>
      <EventForm
        initial={initial}
        teams={teams ?? []}
        programs={programs}
        deleteSlot={
          <DeleteEventButton eventId={event.id} eventTitle={event.title} />
        }
      />
      <LinkEditor eventId={event.id} initial={links} />
    </div>
  );
}
