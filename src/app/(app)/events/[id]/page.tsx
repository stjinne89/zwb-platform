import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { ExternalEventLink } from "@/components/external-event-link";
import { WhatsAppGroupBlock } from "@/components/whatsapp-link";
import { firstTwoTrkptFromGpx, gpxBearing } from "@/lib/gpx";
import { fetchWindForecast } from "@/lib/weather";
import { GpxMap } from "./_components/gpx-map";
import { ElevationProfile } from "./_components/elevation-profile";
import { WindSummary } from "./_components/wind-summary";
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
      "id, type, title, description, start_at, end_at, location, distance_km, elevation_m, start_lat, start_lon, gpx_path, external_url, created_by",
    )
    .eq("id", id)
    .single();

  if (!event) notFound();

  const [{ data: rsvps }, access, { data: waGroups }] = await Promise.all([
    supabase
      .from("event_rsvps")
      .select("status, profile_id, profiles(display_name)")
      .eq("event_id", id),
    getCurrentUserAccess(supabase),
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description")
      .eq("event_id", id)
      .order("display_order")
      .order("name"),
  ]);

  const isCreator = user?.id === event.created_by;
  const canManage = access.has("events.manage_all") || isCreator;

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

  // Wind-forecast wordt server-side opgehaald — alleen als we lat/lon
  // én een toekomstig start-tijdstip hebben binnen 16 dagen.
  const windForecast =
    event.start_lat && event.start_lon
      ? await fetchWindForecast(
          Number(event.start_lat),
          Number(event.start_lon),
          new Date(event.start_at),
        )
      : null;

  // Initial bearing voor headwind-classificatie: fetch GPX server-side
  // (cached via next.revalidate=3600) en pak de eerste twee trkpt-punten.
  let rideBearing: number | null = null;
  if (gpxUrl) {
    try {
      const gpxRes = await fetch(gpxUrl, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8000),
      });
      if (gpxRes.ok) {
        const xml = await gpxRes.text();
        const pair = firstTwoTrkptFromGpx(xml);
        if (pair) rideBearing = gpxBearing(pair[0], pair[1]);
      }
    } catch {
      // negeer — wind wordt dan zonder richting-classificatie getoond
    }
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
        <div className="flex items-start justify-between gap-3">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
          {canManage && (
            <Link href={`/events/${event.id}/bewerk`}>
              <Button type="button" size="sm" variant="outline">
                <Pencil className="size-3.5" />
                Bewerk
              </Button>
            </Link>
          )}
        </div>
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
        {event.external_url && (
          <div className="pt-1">
            <ExternalEventLink url={event.external_url} />
          </div>
        )}
      </header>

      <WhatsAppGroupBlock
        scope="event"
        groups={waGroups ?? []}
        canManage={canManage}
      />

      {event.description && (
        <section className="whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm">
          {event.description}
        </section>
      )}

      {gpxUrl && (
        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <GpxMap gpxUrl={gpxUrl} />
          <ElevationProfile gpxUrl={gpxUrl} />
        </div>
      )}

      {windForecast && (
        <WindSummary forecast={windForecast} rideBearing={rideBearing} />
      )}

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
