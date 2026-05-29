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

export default async function RitverslagenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Voorbije events (dag vóór vandaag) verhuizen hierheen. Vandaag + toekomst
  // staan op de kalender.
  const todayKey = amsterdamDateKey(new Date());
  const { data: eventRows } = await supabase
    .from("events")
    .select("id, title, type, start_at, location, distance_km, elevation_m")
    .order("start_at", { ascending: false })
    .limit(150);

  const pastEvents = ((eventRows ?? []) as EventRow[]).filter(
    (e) => amsterdamDateKey(new Date(e.start_at)) < todayKey,
  );

  if (pastEvents.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="ZWB"
          title="Ritverslagen"
          description="Voorbije events met hun foto's — voeg foto's toe op de event-pagina."
        />
        <EmptyState>Nog geen voorbije events.</EmptyState>
      </div>
    );
  }

  // Foto's voor de voorbije events ophalen en per event groeperen.
  const eventIds = pastEvents.map((e) => e.id);
  const { data: photoRows } = await supabase
    .from("event_photos")
    .select("event_id, profile_id, storage_path, created_at")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  const photos = (photoRows ?? []) as PhotoRow[];

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

  // Reports voor álle voorbije events (ook zonder foto's), nieuwste rit eerst.
  const reports: Report[] = pastEvents.map((event) => {
    const agg = byEvent.get(event.id);
    return {
      event,
      photoCount: agg?.count ?? 0,
      contributors: agg?.contributors.size ?? 0,
      thumbs: (agg?.paths ?? []).map(
        (path) =>
          supabase.storage.from("event-photos").getPublicUrl(path).data
            .publicUrl,
      ),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB"
        title="Ritverslagen"
        description="Voorbije events met hun foto's — voeg foto's toe op de event-pagina zodat het verslag compleet wordt."
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
                    <div className="col-span-3 flex aspect-[12/3] items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Camera className="size-5" />
                      Nog geen foto&apos;s
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
