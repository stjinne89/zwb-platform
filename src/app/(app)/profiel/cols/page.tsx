import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Mountain, Trophy, Repeat, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// Cols-collectie: alle cols in de database vs. wat de huidige gebruiker
// (en ZWB-leden) ervan beklommen hebben.
//
// Privacy: deze pagina is voor JOUW eigen overzicht — andermans cols-stats
// staan in de leaderboards per col (vanuit profile_climbed_cols, dat
// members-leesbaar is via RLS).

type ColRow = {
  slug: string;
  name: string;
  country: string;
  region: string | null;
  summit_elevation_m: number | null;
  ascent_m: number | null;
  category: string | null;
  strava_segment_id: number | null;
};

/** VeloViewer-deeplink: direct naar de segment-pagina als we de Strava-
 *  segment-ID kennen, anders een VeloViewer-zoekopdracht op naam. */
function veloviewerUrl(col: ColRow): string {
  if (col.strava_segment_id) {
    return `https://veloviewer.com/segments/${col.strava_segment_id}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(
    `veloviewer ${col.name}`,
  )}`;
}

type MyClimb = {
  col_slug: string;
  times_climbed: number;
  first_climbed_at: string;
  last_climbed_at: string | null;
};

type ClubClimb = {
  col_slug: string;
  profile_id: string;
  times_climbed: number;
  first_climbed_at: string;
  display_name: string | null;
};

const COUNTRY_FLAGS: Record<string, string> = {
  FR: "🇫🇷",
  IT: "🇮🇹",
  BE: "🇧🇪",
  NL: "🇳🇱",
  ES: "🇪🇸",
  CH: "🇨🇭",
  AT: "🇦🇹",
  DE: "🇩🇪",
};

function categoryBadge(cat: string | null): { label: string; cls: string } {
  switch (cat) {
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
      return { label: "—", cls: "bg-muted text-muted-foreground" };
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MijnColsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Drie queries parallel: cols-database, mijn climbed-rows, hele club's
  // climbed-rows joined met profielen voor leaderboard.
  const [{ data: colsRows }, { data: myClimbs }, { data: clubClimbs }] =
    await Promise.all([
      supabase
        .from("cols")
        .select(
          "slug, name, country, region, summit_elevation_m, ascent_m, category, strava_segment_id",
        )
        .order("country")
        .order("name"),
      supabase
        .from("profile_climbed_cols")
        .select("col_slug, times_climbed, first_climbed_at, last_climbed_at")
        .eq("profile_id", user.id),
      supabase
        .from("profile_climbed_cols")
        .select(
          "col_slug, profile_id, times_climbed, first_climbed_at, profiles(display_name)",
        ),
    ]);

  const cols = (colsRows ?? []) as ColRow[];
  const my = (myClimbs ?? []) as MyClimb[];
  const myMap = new Map(my.map((r) => [r.col_slug, r]));

  // Leaderboard per col: alle ZWBers op times_climbed desc.
  const leaderboardByCol = new Map<string, ClubClimb[]>();
  for (const row of (clubClimbs ?? []) as Array<{
    col_slug: string;
    profile_id: string;
    times_climbed: number;
    first_climbed_at: string;
    profiles:
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
  }>) {
    const name = (() => {
      const rel = row.profiles;
      if (!rel) return null;
      return Array.isArray(rel) ? rel[0]?.display_name ?? null : rel.display_name;
    })();
    const list = leaderboardByCol.get(row.col_slug) ?? [];
    list.push({
      col_slug: row.col_slug,
      profile_id: row.profile_id,
      times_climbed: row.times_climbed,
      first_climbed_at: row.first_climbed_at,
      display_name: name,
    });
    leaderboardByCol.set(row.col_slug, list);
  }
  for (const list of leaderboardByCol.values()) {
    list.sort((a, b) => b.times_climbed - a.times_climbed);
  }

  const climbedCols = cols.filter((c) => myMap.has(c.slug));
  const todoCols = cols.filter((c) => !myMap.has(c.slug));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/profiel"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Terug naar profiel
      </Link>

      <header>
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Mountain className="size-7 text-primary" />
          Cols-collectie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welke iconische cols heb jij geklommen? Automatisch gedetecteerd
          uit je Strava-rituren via polyline-matching op een curated
          database van {cols.length} cols. Klik <strong>Badges
          herberekenen</strong> op{" "}
          <Link href="/achievements" className="underline">
            /achievements
          </Link>{" "}
          om opnieuw te scannen.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          icon={<Trophy className="size-4" />}
          label="Geklommen"
          value={`${climbedCols.length} / ${cols.length}`}
        />
        <Stat
          icon={<Repeat className="size-4" />}
          label="Totaal beklimmingen"
          value={my
            .reduce((sum, r) => sum + r.times_climbed, 0)
            .toLocaleString("nl-NL")}
        />
        <Stat
          icon={<Mountain className="size-4" />}
          label="Hoogste"
          value={
            climbedCols
              .map((c) => c.summit_elevation_m ?? 0)
              .sort((a, b) => b - a)[0]
              ?.toLocaleString("nl-NL") ?? "—"
          }
          sub="m boven zeeniveau"
        />
      </section>

      {climbedCols.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Geklommen ({climbedCols.length})
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {climbedCols
              .sort(
                (a, b) =>
                  (myMap.get(b.slug)?.times_climbed ?? 0) -
                  (myMap.get(a.slug)?.times_climbed ?? 0),
              )
              .map((col) => (
                <ClimbedCard
                  key={col.slug}
                  col={col}
                  myClimb={myMap.get(col.slug)!}
                  leaderboard={leaderboardByCol.get(col.slug) ?? []}
                  myProfileId={user.id}
                />
              ))}
          </ul>
        </section>
      )}

      {todoCols.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nog te doen ({todoCols.length})
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {todoCols.map((col) => (
              <TodoCard key={col.slug} col={col} />
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
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ClimbedCard({
  col,
  myClimb,
  leaderboard,
  myProfileId,
}: {
  col: ColRow;
  myClimb: MyClimb;
  leaderboard: ClubClimb[];
  myProfileId: string;
}) {
  const cat = categoryBadge(col.category);
  const flag = COUNTRY_FLAGS[col.country] ?? "";
  // Top 3 ZWBers — als jij top 1 bent, je naam tonen we sowieso
  const top = leaderboard.slice(0, 3);

  return (
    <li className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            {flag && <span className="mr-1">{flag}</span>}
            <a
              href={veloviewerUrl(col)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
              title="Bekijk op VeloViewer"
            >
              {col.name}
            </a>
          </h3>
          <p className="text-xs text-muted-foreground">
            {col.region && `${col.region} · `}
            {col.summit_elevation_m && `${col.summit_elevation_m}m`}
            {col.ascent_m && ` · ${col.ascent_m}m klim`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cat.cls}`}
        >
          {cat.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="font-semibold tabular-nums">
            {myClimb.times_climbed}×
          </div>
          <div className="text-muted-foreground">geklommen</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="font-semibold">
            {formatDate(myClimb.first_climbed_at)}
          </div>
          <div className="text-muted-foreground">eerste keer</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2 text-center">
          <div className="font-semibold">
            {formatDate(myClimb.last_climbed_at)}
          </div>
          <div className="text-muted-foreground">laatste keer</div>
        </div>
      </div>

      {top.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            ZWB-stand op deze col ({leaderboard.length}{" "}
            {leaderboard.length === 1 ? "rider" : "riders"})
          </summary>
          <ol className="mt-2 space-y-1">
            {leaderboard.map((entry, i) => (
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
                <span className="tabular-nums">{entry.times_climbed}×</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function TodoCard({ col }: { col: ColRow }) {
  const flag = COUNTRY_FLAGS[col.country] ?? "";
  const cat = categoryBadge(col.category);
  return (
    <li className="rounded-md border border-dashed bg-muted/20 p-2.5 text-sm opacity-70">
      <div className="flex items-start justify-between gap-1">
        <a
          href={veloviewerUrl(col)}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate hover:text-primary hover:underline"
          title="Bekijk op VeloViewer"
        >
          {flag && <span className="mr-1">{flag}</span>}
          {col.name}
        </a>
        <span
          className={`shrink-0 rounded-full px-1.5 text-[10px] ${cat.cls}`}
        >
          {cat.label}
        </span>
      </div>
      {col.summit_elevation_m && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {col.summit_elevation_m}m
        </div>
      )}
    </li>
  );
}
