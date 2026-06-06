import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge, Mountain, Repeat, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type SegmentCollection =
  | "cols"
  | "zwift_flat"
  | "benelux_popular"
  | "europe_flat"
  | "europe_iconic";

type SegmentRow = {
  slug: string;
  name: string;
  collection: SegmentCollection;
  country: string | null;
  region: string | null;
  virtual: boolean;
  distance_m: number | null;
  elevation_gain_m: number | null;
  category: string | null;
  strava_segment_id: number | null;
  active: boolean;
};

type MySegment = {
  segment_slug: string;
  times_completed: number;
  first_completed_at: string;
  last_completed_at: string | null;
  best_time_seconds: number | null;
};

type ClubSegment = {
  segment_slug: string;
  profile_id: string;
  times_completed: number;
  first_completed_at: string;
  display_name: string | null;
  best_time_seconds: number | null;
};

type LegacyColRow = {
  slug: string;
  name: string;
  country: string;
  region: string | null;
  ascent_m: number | null;
  category: string | null;
  strava_segment_id: number | null;
};

type LegacyMyCol = {
  col_slug: string;
  times_climbed: number;
  first_climbed_at: string;
  last_climbed_at: string | null;
  best_time_seconds: number | null;
};

type LegacyClubCol = LegacyMyCol & {
  profile_id: string;
  profiles:
    | { display_name: string | null }
    | { display_name: string | null }[]
    | null;
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type SegmentFilter = "all" | "cols" | "zwift" | "benelux" | "europe";

const FILTERS: Array<{ key: SegmentFilter; label: string }> = [
  { key: "all", label: "Alles" },
  { key: "cols", label: "Cols" },
  { key: "zwift", label: "Zwift" },
  { key: "benelux", label: "Benelux" },
  { key: "europe", label: "Europa" },
];

const BENELUX_COUNTRIES = new Set(["NL", "BE", "LU"]);
const EUROPE_COUNTRIES = new Set([
  "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CY", "CZ", "DK",
  "EE", "FI", "FR", "DE", "GR", "HU", "IS", "IE", "IT", "LV", "LI",
  "LT", "LU", "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT",
  "RO", "SM", "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
]);

const ZWIFT_FLAT_FALLBACK: SegmentRow[] = [
  { slug: "zwift-fuego-flats", name: "Fuego Flats", collection: "zwift_flat", country: "ZW", region: "Watopia", virtual: true, distance_m: 496, elevation_gain_m: 0, category: "sprint", strava_segment_id: 20350107, active: true },
  { slug: "zwift-watopia-sprint", name: "Watopia Sprint", collection: "zwift_flat", country: "ZW", region: "Watopia", virtual: true, distance_m: 360, elevation_gain_m: 0, category: "sprint", strava_segment_id: 12109305, active: true },
  { slug: "zwift-volcano-circuit", name: "Volcano Circuit", collection: "zwift_flat", country: "ZW", region: "Watopia", virtual: true, distance_m: 4200, elevation_gain_m: 0, category: "segment", strava_segment_id: 14032406, active: true },
  { slug: "zwift-crit-city", name: "Crit City", collection: "zwift_flat", country: "ZW", region: "Crit City", virtual: true, distance_m: 1950, elevation_gain_m: 0, category: "segment", strava_segment_id: 22445564, active: true },
  { slug: "zwift-richmond-sprint", name: "Richmond Sprint", collection: "zwift_flat", country: "ZW", region: "Richmond", virtual: true, distance_m: 221, elevation_gain_m: 0, category: "sprint", strava_segment_id: 12128762, active: true },
  { slug: "zwift-broad-st", name: "Broad St.", collection: "zwift_flat", country: "ZW", region: "Richmond", virtual: true, distance_m: 283, elevation_gain_m: 0, category: "sprint", strava_segment_id: 12128880, active: true },
  { slug: "zwift-london-sprint", name: "London Sprint", collection: "zwift_flat", country: "ZW", region: "London", virtual: true, distance_m: 200, elevation_gain_m: 0, category: "sprint", strava_segment_id: 12749402, active: true },
  { slug: "zwift-champs-elysees", name: "Champs Elysees", collection: "zwift_flat", country: "ZW", region: "Paris", virtual: true, distance_m: 6620, elevation_gain_m: 0, category: "segment", strava_segment_id: 24674235, active: true },
  { slug: "zwift-railway-sprint", name: "Railway Sprint", collection: "zwift_flat", country: "ZW", region: "Makuri Islands", virtual: true, distance_m: 490, elevation_gain_m: 0, category: "sprint", strava_segment_id: 30412927, active: true },
  { slug: "zwift-alley-sprint", name: "Alley Sprint", collection: "zwift_flat", country: "ZW", region: "Makuri Islands", virtual: true, distance_m: 480, elevation_gain_m: 0, category: "sprint", strava_segment_id: 30412916, active: true },
];

const BENELUX_FLAT_FALLBACK: SegmentRow[] = [
  { slug: "benelux-burgemeester-bloemersweg", name: "Burgemeester Bloemersweg", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 2768, elevation_gain_m: 43, category: "segment", strava_segment_id: 1972717, active: true },
  { slug: "benelux-groenendaalseweg-loenen", name: "Groenendaalseweg naar Loenen compleet", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 4361, elevation_gain_m: 17, category: "segment", strava_segment_id: 7997126, active: true },
  { slug: "benelux-koningsweg-a50-delenseweg", name: "TC8Bar Koningsweg (A50-Delenseweg)", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 1662, elevation_gain_m: 10, category: "segment", strava_segment_id: 18738318, active: true },
  { slug: "benelux-dwars-door-loenen", name: "Dwars door Loenen", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 1320, elevation_gain_m: 0, category: "segment", strava_segment_id: 4853335, active: true },
  { slug: "benelux-langs-de-heide", name: "langs de heide", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 2061, elevation_gain_m: 14, category: "segment", strava_segment_id: 21493839, active: true },
  { slug: "benelux-ijsselbrug-doesburg", name: "HF Brug Doesburg ri. Doesburg", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 650, elevation_gain_m: 5, category: "segment", strava_segment_id: 2132192, active: true },
  { slug: "benelux-deelenseweg-woeste-hoeve", name: "Deelenseweg - Woeste Hoeve (via krimweg)", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 15618, elevation_gain_m: 68, category: "segment", strava_segment_id: 31734550, active: true },
  { slug: "benelux-hoenderloo-loenen", name: "Hoenderloo > Loenen", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 10423, elevation_gain_m: 38, category: "segment", strava_segment_id: 7006983, active: true },
  { slug: "benelux-koningsweg-hoenderloo", name: "Koningsweg - Hoenderloo", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 9265, elevation_gain_m: 36, category: "segment", strava_segment_id: 4700472, active: true },
  { slug: "benelux-woeste-hoefweg", name: "Woeste hoefweg W-O", collection: "benelux_popular", country: "NL", region: "Gelderland", virtual: false, distance_m: 5890, elevation_gain_m: 45, category: "segment", strava_segment_id: 4282170, active: true },
];

const EUROPE_FLAT_FALLBACK: SegmentRow[] = [
  { slug: "europe-champs-elysees", name: "Champs-Elysees", collection: "europe_flat", country: "FR", region: "Paris", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-roubaix-velodrome", name: "Roubaix Velodrome", collection: "europe_flat", country: "FR", region: "Roubaix", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-trouee-d-arenberg", name: "Trouee d Arenberg", collection: "europe_flat", country: "FR", region: "Nord", virtual: false, distance_m: null, elevation_gain_m: 0, category: "cobbles", strava_segment_id: null, active: true },
  { slug: "europe-carrefour-de-l-arbre", name: "Carrefour de l Arbre", collection: "europe_flat", country: "FR", region: "Nord", virtual: false, distance_m: null, elevation_gain_m: 0, category: "cobbles", strava_segment_id: null, active: true },
  { slug: "europe-via-roma-sprint", name: "Via Roma Sprint", collection: "europe_flat", country: "IT", region: "Sanremo", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-promenade-des-anglais", name: "Promenade des Anglais", collection: "europe_flat", country: "FR", region: "Nice", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-playa-de-palma", name: "Playa de Palma", collection: "europe_flat", country: "ES", region: "Mallorca", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-tempelhofer-feld", name: "Tempelhofer Feld", collection: "europe_flat", country: "DE", region: "Berlin", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-amager-strandpark", name: "Amager Strandpark", collection: "europe_flat", country: "DK", region: "Copenhagen", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
  { slug: "europe-the-mall-sprint", name: "The Mall Sprint", collection: "europe_flat", country: "GB", region: "London", virtual: false, distance_m: null, elevation_gain_m: 0, category: "flat", strava_segment_id: null, active: true },
];

function isZwiftSegment(segment: SegmentRow) {
  return segment.collection === "zwift_flat" || segment.virtual || segment.country === "ZW";
}

function isBeneluxSegment(segment: SegmentRow) {
  return (
    segment.collection === "benelux_popular" ||
    BENELUX_COUNTRIES.has(segment.country ?? "")
  );
}

function isEuropeSegment(segment: SegmentRow) {
  return (
    segment.collection === "europe_flat" ||
    segment.collection === "europe_iconic" ||
    (!isZwiftSegment(segment) && EUROPE_COUNTRIES.has(segment.country ?? ""))
  );
}

function matchesFilter(segment: SegmentRow, filter: SegmentFilter) {
  if (filter === "all") return true;
  if (filter === "zwift") return isZwiftSegment(segment);
  if (filter === "cols") return segment.collection === "cols" && !isZwiftSegment(segment);
  if (filter === "benelux") return isBeneluxSegment(segment);
  return isEuropeSegment(segment);
}

function segmentUrl(segment: SegmentRow): string {
  if (segment.strava_segment_id) {
    return `https://veloviewer.com/segments/${segment.strava_segment_id}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(
    `strava segment ${segment.name}`,
  )}`;
}

function formatTime(seconds: number | null | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDistance(meters: number | null | undefined): string | null {
  if (meters == null || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toLocaleString("nl-NL", {
    maximumFractionDigits: 1,
  })} km`;
}

function collectionLabel(collection: SegmentCollection) {
  switch (collection) {
    case "cols":
      return "Col";
    case "zwift_flat":
      return "Zwift";
    case "benelux_popular":
      return "Benelux";
    case "europe_flat":
    case "europe_iconic":
      return "Europa";
  }
}

function categoryBadge(segment: SegmentRow): { label: string; cls: string } {
  if (segment.collection === "zwift_flat") {
    return { label: segment.category ?? "Zwift", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
  }
  if (segment.collection === "benelux_popular") {
    return { label: "Segment", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
  }
  if (
    segment.collection === "europe_flat" ||
    segment.collection === "europe_iconic"
  ) {
    return {
      label: segment.category === "cobbles" ? "Kasseien" : "Segment",
      cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    };
  }
  switch (segment.category) {
    case "HC":
      return { label: "HC", cls: "bg-destructive/15 text-destructive" };
    case "C1":
      return { label: "Cat 1", cls: "bg-primary/15 text-primary" };
    case "C2":
      return { label: "Cat 2", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
    case "C3":
      return { label: "Cat 3", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" };
    case "C4":
      return { label: "Cat 4", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400" };
    case "local":
      return { label: "Lokaal", cls: "bg-muted text-muted-foreground" };
    default:
      return { label: "Segment", cls: "bg-muted text-muted-foreground" };
  }
}

export default async function ZwbSegmentsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const rawFilter = Array.isArray(params.filter) ? params.filter[0] : params.filter;
  const activeFilter = FILTERS.some((filter) => filter.key === rawFilter)
    ? (rawFilter as SegmentFilter)
    : "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: segmentRows },
    { data: myRows },
    { data: clubRows },
    { data: legacyCols },
    { data: legacyMyCols },
    { data: legacyClubCols },
  ] =
    await Promise.all([
      supabase
        .from("zwb_segments")
        .select(
          "slug, name, collection, country, region, virtual, distance_m, elevation_gain_m, category, strava_segment_id, active",
        )
        .order("collection")
        .order("name"),
      supabase
        .from("profile_completed_segments")
        .select(
          "segment_slug, times_completed, first_completed_at, last_completed_at, best_time_seconds",
        )
        .eq("profile_id", user.id),
      supabase
        .from("profile_completed_segments")
        .select(
          "segment_slug, profile_id, times_completed, first_completed_at, best_time_seconds, profiles(display_name)",
        ),
      supabase
        .from("cols")
        .select("slug, name, country, region, ascent_m, category, strava_segment_id")
        .order("country")
        .order("name"),
      supabase
        .from("profile_climbed_cols")
        .select(
          "col_slug, times_climbed, first_climbed_at, last_climbed_at, best_time_seconds",
        )
        .eq("profile_id", user.id),
      supabase
        .from("profile_climbed_cols")
        .select(
          "col_slug, profile_id, times_climbed, first_climbed_at, best_time_seconds, profiles(display_name)",
        ),
    ]);

  const hasGenericSegments = (segmentRows?.length ?? 0) > 0;
  const fallbackSegments: SegmentRow[] = [
    ...((legacyCols ?? []) as LegacyColRow[]).map((col) => ({
      slug: col.slug,
      name: col.name,
      collection: "cols" as const,
      country: col.country,
      region: col.region,
      virtual: col.country === "ZW",
      distance_m: null,
      elevation_gain_m: col.ascent_m,
      category: col.category,
      strava_segment_id: col.strava_segment_id,
      active: true,
    })),
    ...ZWIFT_FLAT_FALLBACK,
    ...BENELUX_FLAT_FALLBACK,
    ...EUROPE_FLAT_FALLBACK,
  ];
  const segmentsBySlug = new Map<string, SegmentRow>();
  for (const segment of fallbackSegments) {
    segmentsBySlug.set(segment.slug, segment);
  }
  for (const segment of (segmentRows ?? []) as SegmentRow[]) {
    if (!segment.active) continue;
    segmentsBySlug.set(segment.slug, segment);
  }
  const segments = [...segmentsBySlug.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "nl"),
  );
  const mySegments = hasGenericSegments
    ? ((myRows ?? []) as MySegment[])
    : ((legacyMyCols ?? []) as LegacyMyCol[]).map((row) => ({
        segment_slug: row.col_slug,
        times_completed: row.times_climbed,
        first_completed_at: row.first_climbed_at,
        last_completed_at: row.last_climbed_at,
        best_time_seconds: row.best_time_seconds,
      }));
  const myMap = new Map(mySegments.map((row) => [row.segment_slug, row]));
  const visibleSegments =
    activeFilter === "all" ? segments : segments.filter((segment) => matchesFilter(segment, activeFilter));

  const leaderboardBySegment = new Map<string, ClubSegment[]>();
  const clubSource = hasGenericSegments
    ? ((clubRows ?? []) as Array<{
        segment_slug: string;
        profile_id: string;
        times_completed: number;
        first_completed_at: string;
        best_time_seconds: number | null;
        profiles:
          | { display_name: string | null }
          | { display_name: string | null }[]
          | null;
      }>)
    : ((legacyClubCols ?? []) as LegacyClubCol[]).map((row) => ({
        segment_slug: row.col_slug,
        profile_id: row.profile_id,
        times_completed: row.times_climbed,
        first_completed_at: row.first_climbed_at,
        best_time_seconds: row.best_time_seconds,
        profiles: row.profiles,
      }));

  for (const row of clubSource) {
    const rel = row.profiles;
    const name = Array.isArray(rel) ? rel[0]?.display_name ?? null : rel?.display_name ?? null;
    const list = leaderboardBySegment.get(row.segment_slug) ?? [];
    list.push({
      segment_slug: row.segment_slug,
      profile_id: row.profile_id,
      times_completed: row.times_completed,
      first_completed_at: row.first_completed_at,
      best_time_seconds: row.best_time_seconds,
      display_name: name,
    });
    leaderboardBySegment.set(row.segment_slug, list);
  }

  for (const list of leaderboardBySegment.values()) {
    list.sort((a, b) => {
      const ta = a.best_time_seconds;
      const tb = b.best_time_seconds;
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      return b.times_completed - a.times_completed;
    });
  }

  const completed = visibleSegments.filter((segment) => myMap.has(segment.slug));
  const todo = visibleSegments.filter((segment) => !myMap.has(segment.slug));
  const completedAll = segments.filter((segment) => myMap.has(segment.slug));
  const prCount = mySegments.filter((row) => row.best_time_seconds != null).length;
  const counts = new Map<string, number>();
  for (const segment of segments) {
    counts.set(segment.collection, (counts.get(segment.collection) ?? 0) + 1);
  }
  const countForFilter = (filter: SegmentFilter) =>
    filter === "all"
      ? segments.length
      : segments.filter((segment) => matchesFilter(segment, filter)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/profiel"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Terug naar profiel
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Gauge className="size-7 text-primary" />
          ZWB Segments
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={<Trophy className="size-4" />}
          label="Voltooid"
          value={`${completedAll.length} / ${segments.length}`}
        />
        <Stat
          icon={<Repeat className="size-4" />}
          label="Totaal pogingen"
          value={mySegments
            .reduce((sum, row) => sum + row.times_completed, 0)
            .toLocaleString("nl-NL")}
        />
        <Stat
          icon={<Gauge className="size-4" />}
          label="Met PR-tijd"
          value={prCount.toLocaleString("nl-NL")}
        />
        <Stat
          icon={<Mountain className="size-4" />}
          label="Cols"
          value={`${counts.get("cols") ?? 0}`}
        />
      </section>

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => {
          const href =
            filter.key === "all"
              ? "/profiel/segments"
              : `/profiel/segments?filter=${filter.key}`;
          const isActive = filter.key === activeFilter;
          const count = countForFilter(filter.key);
          return (
            <Link
              key={filter.key}
              href={href}
              className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:border-primary/40"
              }`}
            >
              {filter.label} ({count})
            </Link>
          );
        })}
      </nav>

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Voltooid ({completed.length})
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {completed
              .sort(
                (a, b) =>
                  (myMap.get(b.slug)?.times_completed ?? 0) -
                  (myMap.get(a.slug)?.times_completed ?? 0),
              )
              .map((segment) => (
                <SegmentCard
                  key={segment.slug}
                  segment={segment}
                  mySegment={myMap.get(segment.slug)!}
                  leaderboard={leaderboardBySegment.get(segment.slug) ?? []}
                  myProfileId={user.id}
                />
              ))}
          </ul>
        </section>
      )}

      {todo.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nog te doen ({todo.length})
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {todo.map((segment) => (
              <TodoCard key={segment.slug} segment={segment} />
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SegmentCard({
  segment,
  mySegment,
  leaderboard,
  myProfileId,
}: {
  segment: SegmentRow;
  mySegment: MySegment;
  leaderboard: ClubSegment[];
  myProfileId: string;
}) {
  const badge = categoryBadge(segment);
  const top = leaderboard.slice(0, 3);
  const myPr = formatTime(mySegment.best_time_seconds);
  const hasAnyTime = leaderboard.some((entry) => entry.best_time_seconds != null);
  const myRank =
    leaderboard.findIndex((entry) => entry.profile_id === myProfileId) + 1;
  const leaderboardSummary =
    myRank > 0
      ? `jij: ${myRank} van ${leaderboard.length} ZWB'ers`
      : `${leaderboard.length} ZWB'ers`;
  const distance = formatDistance(segment.distance_m);

  return (
    <li className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">
            <a
              href={segmentUrl(segment)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
              title="Bekijk segment"
            >
              {segment.name}
            </a>
          </h3>
          <p className="text-xs text-muted-foreground">
            {collectionLabel(segment.collection)}
            {segment.country && ` - ${segment.country}`}
            {segment.region && ` - ${segment.region}`}
            {distance && ` - ${distance}`}
            {segment.elevation_gain_m && ` - ${Math.round(segment.elevation_gain_m)} hm`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="font-semibold tabular-nums">
            {mySegment.times_completed}x
          </div>
          <div className="text-muted-foreground">voltooid</div>
        </div>
        {myPr ? (
          <div className="rounded-md bg-primary/10 p-2 text-center">
            <div className="font-semibold tabular-nums text-primary">
              {myPr}
            </div>
            <div className="text-muted-foreground">jouw PR</div>
          </div>
        ) : (
          <div className="rounded-md bg-muted/50 p-2 text-center">
            <div className="font-semibold">
              {formatDate(mySegment.first_completed_at)}
            </div>
            <div className="text-muted-foreground">eerste keer</div>
          </div>
        )}
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="font-semibold">
            {formatDate(mySegment.last_completed_at)}
          </div>
          <div className="text-muted-foreground">laatste keer</div>
        </div>
      </div>

      {top.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {hasAnyTime ? "Snelste ZWB'ers" : "ZWB-stand"} ({leaderboardSummary})
          </summary>
          <ol className="mt-2 space-y-1">
            {leaderboard.map((entry, i) => {
              const time = formatTime(entry.best_time_seconds);
              return (
                <li
                  key={entry.profile_id}
                  className={`flex items-center justify-between gap-2 ${
                    entry.profile_id === myProfileId ? "font-semibold" : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 text-right tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    <Link
                      href={`/leden/${entry.profile_id}`}
                      className="hover:underline"
                    >
                      {entry.display_name ?? "Onbekend"}
                    </Link>
                  </span>
                  <span className="tabular-nums">
                    {time ? (
                      <>
                        <span className="font-semibold">{time}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          - {entry.times_completed}x
                        </span>
                      </>
                    ) : (
                      <span>{entry.times_completed}x</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </li>
  );
}

function TodoCard({ segment }: { segment: SegmentRow }) {
  const badge = categoryBadge(segment);
  const distance = formatDistance(segment.distance_m);
  return (
    <li className="rounded-md border border-dashed bg-muted/20 p-2.5 text-sm opacity-80">
      <div className="flex items-start justify-between gap-1">
        <a
          href={segmentUrl(segment)}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-primary hover:underline"
          title="Bekijk segment"
        >
          {segment.name}
        </a>
        <span
          className={`shrink-0 rounded-full px-1.5 text-[10px] ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {collectionLabel(segment.collection)}
        {segment.country && ` - ${segment.country}`}
        {distance && ` - ${distance}`}
      </div>
    </li>
  );
}
