import { MATERIAAL_ARTICLES } from "@/lib/materiaal/library";
import { loadPacingRoute, type PacingEventRow } from "@/lib/pacing/route-loader";
import type { RekenRoute } from "@/lib/materiaal/rekenaar";
import { requireViewer } from "../../_data";
import { Rekenaar, type ArtikelLink } from "./rekenaar";

export const dynamic = "force-dynamic";

/** Buitenevents met een GPX, van twee maanden terug tot vier maanden vooruit. */
const TERUG_DAGEN = 60;
const VOORUIT_DAGEN = 120;

function eventVenster(): { van: string; tot: string } {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return {
    van: new Date(now - TERUG_DAGEN * day).toISOString(),
    tot: new Date(now + VOORUIT_DAGEN * day).toISOString(),
  };
}

const ARTIKELEN = [
  "houding",
  "helm",
  "kleding",
  "wielen-en-frame",
  "banden-en-bandenspanning",
  "gewicht",
  "ketting-en-smering",
] as const;

export default async function RekenaarPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  const viewer = await requireViewer();
  const venster = eventVenster();

  const [{ data: profile }, { data: eventRows }] = await Promise.all([
    viewer.supabase.from("profiles").select("weight_kg, ftp_watts").eq("id", viewer.user.id).maybeSingle(),
    viewer.supabase
      .from("events")
      .select("id, title, start_at")
      .not("gpx_path", "is", null)
      .is("zwift_route_id", null)
      .gte("start_at", venster.van)
      .lte("start_at", venster.tot)
      .order("start_at")
      .limit(30),
  ]);

  const events = ((eventRows ?? []) as { id: string; title: string; start_at: string }[]).map((row) => ({
    id: row.id,
    label: `${row.title} (${new Date(row.start_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "Europe/Amsterdam" })})`,
  }));

  let eventRoute: RekenRoute | null = null;
  let eventFout: string | null = null;
  if (event && events.some((e) => e.id === event)) {
    const { data: row } = await viewer.supabase
      .from("events")
      .select("id, title, type, start_at, gpx_path, distance_km, elevation_m, zwift_event_id, zwift_route_id, laps")
      .eq("id", event)
      .maybeSingle();
    if (row) {
      const result = await loadPacingRoute(viewer.supabase, row as PacingEventRow);
      if (result.ok) {
        eventRoute = {
          id: `event:${event}`,
          label: events.find((e) => e.id === event)!.label,
          segments: result.loaded.route.segments.map((s) => ({ distanceM: s.distanceM, gradient: s.gradient })),
        };
      } else {
        eventFout = result.message;
      }
    }
  }

  const artikelen: Record<string, ArtikelLink> = {};
  for (const slug of ARTIKELEN) {
    const article = MATERIAAL_ARTICLES.find((a) => a.slug === slug);
    if (article) {
      artikelen[slug] = {
        href: `/zwbeter-worden/materiaal/kennis/${slug}`,
        title: article.title,
        evidence: article.evidence,
      };
    }
  }

  const gewicht = profile?.weight_kg == null ? 75 : Number(profile.weight_kg);
  const ftp = profile?.ftp_watts == null ? null : Number(profile.ftp_watts);

  return (
    <Rekenaar
      events={events}
      eventId={eventRoute ? event! : null}
      eventRoute={eventRoute}
      eventFout={eventFout}
      standaardWatts={ftp ? Math.round(ftp * 0.75) : 200}
      standaardGewicht={Math.round(gewicht)}
      artikelen={artikelen}
    />
  );
}
