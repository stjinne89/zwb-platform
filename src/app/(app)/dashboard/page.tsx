import Link from "next/link";
import { ArrowRight, Medal, Pin, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/markdown";

type TeamRef = {
  id: string;
  name: string;
  type: string;
  division: string | null;
};

type TeamStanding = {
  id: string;
  team_id: string;
  competition: string;
  round_label: string | null;
  round_at: string | null;
  position: number | null;
  points: number | null;
  total_teams: number | null;
  created_at: string;
  source_url: string | null;
  teams: TeamRef | TeamRef[] | null;
};

type TeamStandingWithTeam = TeamStanding & { team: TeamRef };

function relatedTeam(result: TeamStanding) {
  return Array.isArray(result.teams) ? result.teams[0] : result.teams;
}

function latestStandings(results: TeamStanding[]): TeamStandingWithTeam[] {
  const byTeam = new Map<string, TeamStandingWithTeam>();

  for (const result of results) {
    const team = relatedTeam(result);
    if (!result.position || !team) continue;
    if (!byTeam.has(result.team_id)) byTeam.set(result.team_id, { ...result, team });
  }

  return Array.from(byTeam.values()).sort((a, b) => {
    const competition = a.competition.localeCompare(b.competition, "nl");
    if (competition !== 0) return competition;
    return (a.position ?? 9999) - (b.position ?? 9999);
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: upcoming }, { data: announcements }, { data: standingRows }] =
    await Promise.all([
      user
        ? supabase.from("profiles").select("display_name").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase
        .from("events")
        .select("id, title, type, start_at, location")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(5),
      supabase
        .from("media_items")
        .select("id, title, body_md, pinned, published_at, kind, profiles(display_name)")
        .in("kind", ["mededeling", "nieuwsbrief"])
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(3),
      supabase
        .from("team_results")
        .select("id, team_id, competition, round_label, round_at, position, points, total_teams, created_at, source_url, teams(id, name, type, division)")
        .not("position", "is", null)
        .order("round_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
    ]);

  const standings = latestStandings((standingRows ?? []) as unknown as TeamStanding[]);
  const firstName = (profile?.display_name ?? user?.email?.split("@")[0] ?? "")
    .trim()
    .split(/\s+/)[0];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">
          {firstName ? `Hoi ${firstName},` : "Welkom"} welkom op het platform van de ZWB Cycling Community.
        </h1>
      </section>

      {standings.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Trophy className="size-5 text-primary" />
                Scorebord
              </h2>
              <p className="text-sm text-muted-foreground">
                Actuele plek in de competitie per team.
              </p>
            </div>
            <Link
              href="/teams"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Alle teams
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="divide-y rounded-lg border bg-card">
            {standings.map((standing) => (
              <li key={standing.id}>
                <Link
                  href={`/teams/${standing.team_id}`}
                  className="grid gap-3 p-4 transition hover:bg-muted/50 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{standing.team.name}</p>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {standing.team.type}
                      {standing.team.division ? ` · ${standing.team.division}` : ""}
                    </p>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="truncate">{standing.competition}</p>
                    {standing.round_label && (
                      <p className="truncate text-xs text-muted-foreground">
                        {standing.round_label}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:justify-end">
                    <span className="inline-flex min-w-16 items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-sm font-semibold tabular-nums text-primary-foreground">
                      <Medal className="size-4" />
                      #{standing.position}
                      {standing.total_teams ? `/${standing.total_teams}` : ""}
                    </span>
                    {standing.points !== null && standing.points !== undefined && (
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {standing.points} pt
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {announcements && announcements.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Mededelingen</h2>
            <Link
              href="/media"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Alles
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="space-y-3">
            {announcements.map((a) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const author = (a.profiles as any)?.display_name ?? "Bestuur";
              return (
                <li
                  key={a.id}
                  className={`rounded-lg border bg-card p-4 ${
                    a.pinned ? "border-foreground/40" : ""
                  }`}
                >
                  <p className="font-medium">
                    {a.pinned && (
                      <Pin className="mr-2 inline size-4 text-foreground/60" />
                    )}
                    {a.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {author} ·{" "}
                    {new Date(a.published_at).toLocaleString("nl-NL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <div className="mt-2">
                    <Markdown source={a.body_md ?? ""} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aankomende events</h2>
          <Link
            href="/kalender"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Hele kalender
            <ArrowRight className="size-4" />
          </Link>
        </div>
        {!upcoming || upcoming.length === 0 ? (
          <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
            Nog geen events ingepland.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {upcoming.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="flex items-center justify-between gap-3 p-4 transition hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(e.start_at).toLocaleString("nl-NL", {
                        dateStyle: "full",
                        timeStyle: "short",
                      })}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
                    {e.type}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
