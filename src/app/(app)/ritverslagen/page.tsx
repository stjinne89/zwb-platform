import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Camera,
  CalendarDays,
  MapPin,
  MessageCircle,
  PencilLine,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { DeleteRitverslagButton } from "./_components/delete-ritverslag-button";

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
  cover_image_path: string | null;
  created_by: string | null;
};

type Report = {
  event: EventRow;
  photoCount: number;
  contributors: number;
  thumbs: string[]; // public URLs
  coverUrl: string | null;
  reportCount: number;
  reportSnippet: string | null;
  chatCount: number;
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

  const access = await getCurrentUserAccess(supabase);
  const isModerator = access.has("events.manage_all");

  // Voorbije events (dag vóór vandaag) verhuizen hierheen. Vandaag + toekomst
  // staan op de kalender.
  const todayKey = amsterdamDateKey(new Date());
  const { data: eventRows } = await supabase
    .from("events")
    .select(
      "id, title, type, start_at, location, distance_km, elevation_m, cover_image_path, created_by",
    )
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

  // Live-chat per event meetellen (onderdeel van het ritverslag).
  const { data: chatRows } = await supabase
    .from("event_chat_messages")
    .select("event_id")
    .in("event_id", eventIds);
  const chatCountByEvent = new Map<string, number>();
  for (const c of (chatRows ?? []) as { event_id: string }[]) {
    chatCountByEvent.set(c.event_id, (chatCountByEvent.get(c.event_id) ?? 0) + 1);
  }

  // Geschreven verslagen per event (aantal + nieuwste snippet).
  const { data: reportTextRows } = await supabase
    .from("event_reports")
    .select("event_id, body_md, created_at")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });
  const reportAgg = new Map<string, { count: number; snippet: string }>();
  for (const r of (reportTextRows ?? []) as {
    event_id: string;
    body_md: string;
    created_at: string;
  }[]) {
    const cur = reportAgg.get(r.event_id);
    if (cur) {
      cur.count += 1;
    } else {
      const text = r.body_md.replace(/[#*_>`\-]/g, "").replace(/\s+/g, " ").trim();
      reportAgg.set(r.event_id, {
        count: 1,
        snippet: text.length > 160 ? `${text.slice(0, 160)}…` : text,
      });
    }
  }

  // Reports voor álle voorbije events (ook zonder foto's), nieuwste rit eerst.
  const reports: Report[] = pastEvents.map((event) => {
    const agg = byEvent.get(event.id);
    const rep = reportAgg.get(event.id);
    return {
      event,
      photoCount: agg?.count ?? 0,
      contributors: agg?.contributors.size ?? 0,
      thumbs: (agg?.paths ?? []).map(
        (path) =>
          supabase.storage.from("event-photos").getPublicUrl(path).data
            .publicUrl,
      ),
      coverUrl: event.cover_image_path
        ? supabase.storage
            .from("event-photos")
            .getPublicUrl(event.cover_image_path).data.publicUrl
        : null,
      reportCount: rep?.count ?? 0,
      reportSnippet: rep?.snippet ?? null,
      chatCount: chatCountByEvent.get(event.id) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ZWB"
        title="Ritverslagen"
        description="Voorbije ritten met foto's en verslagen."
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
          const canDelete = isModerator || event.created_by === user.id;
          return (
            <li key={event.id} className="relative">
              {canDelete && (
                <div className="absolute right-2 top-2 z-10">
                  <DeleteRitverslagButton eventId={event.id} />
                </div>
              )}
              <Link
                href={`/events/${event.id}`}
                className="group block overflow-hidden rounded-lg border bg-card transition hover:border-primary/40"
              >
                {/* Cover-afbeelding heeft voorrang; anders foto-strip. */}
                {report.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.coverUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-[16/6] w-full bg-muted object-cover"
                  />
                ) : (
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
                )}

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
                    {report.reportCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <PencilLine className="size-3.5" />
                        {report.reportCount}
                      </span>
                    )}
                    {report.chatCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" />
                        {report.chatCount}
                      </span>
                    )}
                  </div>
                  <h2 className="font-semibold group-hover:text-primary">
                    {event.title}
                  </h2>
                  {report.reportSnippet && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {report.reportSnippet}
                    </p>
                  )}
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5" />
                      {new Date(event.start_at).toLocaleDateString("nl-NL", {
                        dateStyle: "long",
                        timeZone: "Europe/Amsterdam",
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
