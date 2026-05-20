import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GpxMap } from "./_components/gpx-map";
import { RsvpButtons } from "./_components/rsvp-buttons";

const TYPE_LABELS: Record<string, string> = {
  outdoor: "Outdoor rit",
  zrl: "ZRL race",
  ladder: "Ladder race",
  flamme_rouge: "Flamme Rouge",
  social: "Social",
  training: "Training",
};

type RsvpStatus = "yes" | "maybe" | "no";

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
      "id, type, title, description, start_at, end_at, location, distance_km, elevation_m, gpx_path, created_by",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("status, profile_id, profiles(display_name)")
    .eq("event_id", id);

  const myRsvp = rsvps?.find((r) => r.profile_id === user?.id)?.status as
    | RsvpStatus
    | undefined;

  const grouped: Record<RsvpStatus, string[]> = { yes: [], maybe: [], no: [] };
  for (const r of rsvps ?? []) {
    const name =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r as any).profiles?.display_name ?? "Onbekend";
    grouped[r.status as RsvpStatus]?.push(name);
  }

  let gpxUrl: string | null = null;
  if (event.gpx_path) {
    const { data } = await supabase.storage
      .from("event-gpx")
      .createSignedUrl(event.gpx_path, 3600);
    gpxUrl = data?.signedUrl ?? null;
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
        <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
          {TYPE_LABELS[event.type] ?? event.type}
        </span>
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
      </header>

      {event.description && (
        <section className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm">
          {event.description}
        </section>
      )}

      {gpxUrl && <GpxMap gpxUrl={gpxUrl} />}

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
                {grouped[s].map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
