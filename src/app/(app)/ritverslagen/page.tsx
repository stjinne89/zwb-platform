import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader } from "@/components/app-ui";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  outdoor: "Outdoor rit",
  zrl: "ZRL race",
  ladder: "Ladder race",
  flamme_rouge: "Flamme Rouge",
  social: "Social",
  training: "Training",
};

type PhotoRow = {
  event_id: string;
  profile_id: string;
  storage_path: string;
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  location: string | null;
  distance_km: number | string | null;
  elevation_m: number | string | null;
};

type Report = {
  event: EventRow;
  photoCount: number;
  contributors: number;
  thumbs: string[]; // public URLs
};

export default async function RitverslagenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Recente foto's ophalen en per event groeperen.
  const { data: photoRows } = await supabase
    .from("event_photos")
    .select("event_id, profile_id, storage_path, created_at")
    .order("created_at", { ascending: false })
    .limit(600);

  const photos = (photoRows ?? []) as PhotoRow[];
  if (photos.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ZWB"
          title="Ritverslagen"
          description="Foto-verslagen van gereden events — automatisch gebundeld zodra leden foto's toevoegen."
        />
        <EmptyState>
          Nog geen ritverslagen. Voeg foto&apos;s toe op een event-pagina en ze
          verschijnen hier als verslag.
        </EmptyState>
      </div>
    );
  }

  type Agg = {
    count: number;
    contributors: Set<string>;
    paths: string[];
  };
  const byEvent = new Map<string, Agg>();
  for (const p of photos) {
    const agg = byEvent.get(p.event_id) ?? {
      count: 0,
      contributors: new Set<string>(),
      paths: [],
    };
    agg.count += 1;
    agg.contributors.add(p.profile_id);
    if (agg.paths.length < 6) agg.paths.push(p.storage_path);
    byEvent.set(p.event_id, agg);
  }

  const eventIds = Array.from(byEvent.keys());
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, type, start_at, location, distance_km, elevation_m")
    .in("id", eventIds);

  const eventById = new Map(
    ((eventRows ?? []) as EventRow[]).map((e) => [e.id, e]),
  );

  const reports: Report[] = eventIds
    .map((id) => {
      const event = eventById.get(id);
      const agg = byEvent.get(id)!;
      if (!event) return null;
      return {
        event,
        photoCount: agg.count,
        contributors: agg.contributors.size,
        thumbs: agg.paths.map(
          (path) =>
            supabase.storage.from("event-photos").getPublicUrl(path).data
              .publicUrl,
        ),
      };
    })
    .filter((r): r is Report => r !== null)
    .sort((a, b) => b.event.start_at.localeCompare(a.event.start_at));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB"
        title="Ritverslagen"
        description="Foto-verslagen van gereden events — automatisch gebundeld zodra leden foto's toevoegen."
      />

      <ul className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const { event } = report;
          const km = event.distance_km
            ? `${Number(event.distance_km).toLocaleString("nl-NL", {
                maximumFractionDigits: 1,
              })} km`
            : null;
          const hm = event.elevation_m ? `${event.elevation_m} hm` : null;
          return (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="group block overflow-hidden rounded-lg border bg-card transition hover:border-primary/40"
              >
                {/* Foto-strip */}
                <div className="grid grid-cols-3 gap-0.5 bg-muted">
                  {report.thumbs.slice(0, 3).map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] h-full w-full object-cover"
                    />
                  ))}
                  {report.thumbs.length === 0 && (
                    <div className="col-span-3 flex aspect-[12/3] items-center justify-center text-muted-foreground">
                      <Camera className="size-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                      {TYPE_LABELS[event.type] ?? event.type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="size-3.5" />
                      {report.photoCount}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3.5" />
                      {report.contributors}
                    </span>
                  </div>
                  <h2 className="font-semibold group-hover:text-primary">
                    {event.title}
                  </h2>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {new Date(event.start_at).toLocaleDateString("nl-NL", {
                        dateStyle: "long",
                      })}
                    </span>
                    {event.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {event.location}
                      </span>
                    )}
                    {km && <span>{km}</span>}
                    {hm && <span>{hm}</span>}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
