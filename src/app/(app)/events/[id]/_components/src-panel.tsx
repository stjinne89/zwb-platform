import { ArrowUpRight } from "lucide-react";
import type { createClient } from "@/lib/supabase/server";
import { MemberLink } from "@/components/member-link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRaceTime } from "@/lib/src/results";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type RaceRow = {
  category_starts: Record<string, string> | null;
  registration_closes_at: string | null;
  pre_weight_categories: number[] | null;
  pre_weight_opens_at: string | null;
  pre_weight_closes_at: string | null;
  course_url: string | null;
  results_status: string | null;
};

type ResultRow = {
  mywhoosh_user_id: string;
  name: string;
  team_name: string | null;
  category: number | null;
  category_rank: number | null;
  finished_ms: number | null;
  profile_id: string | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

type TeamResultRow = {
  category: number;
  mywhoosh_team_id: string;
  team_name: string;
  time_ms: number;
  rank: number;
  finishers: number;
};

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function moment(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

/**
 * Een SRC-race (migr. 0200): inschrijven op MyWhoosh tot de deadline, de
 * starttijd per categorie en het weigh-in-venster.
 */
export async function SrcPanel({
  supabase,
  eventId,
  signupUrl,
}: {
  supabase: SupabaseServer;
  eventId: string;
  signupUrl: string | null;
}) {
  const { data } = await supabase
    .from("src_races")
    .select(
      "category_starts, registration_closes_at, pre_weight_categories, pre_weight_opens_at, pre_weight_closes_at, course_url, results_status",
    )
    .eq("event_id", eventId)
    .maybeSingle();
  const race = data as RaceRow | null;
  if (!race) return null;

  const closes = race.registration_closes_at;
  const open = !closes || new Date(closes) > new Date();
  const starts = Object.entries(race.category_starts ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  const weighIn = race.pre_weight_categories ?? [];

  // De uitslag (migr. 0202): ZWB'ers per categorie, en de plaats van onze teams.
  const [{ data: resultRows }, { data: teamRows }, { data: zwbTeamRows }] = race.results_status
    ? await Promise.all([
        supabase
          .from("src_results")
          .select(
            "mywhoosh_user_id, name, team_name, category, category_rank, finished_ms, profile_id, profiles!src_results_profile_id_fkey(display_name)",
          )
          .eq("race_event_id", eventId),
        supabase
          .from("src_team_results")
          .select("category, mywhoosh_team_id, team_name, time_ms, rank, finishers")
          .eq("race_event_id", eventId),
        supabase.from("teams").select("mywhoosh_team_name").eq("type", "src"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const zwbNames = new Set(
    ((zwbTeamRows ?? []) as Array<{ mywhoosh_team_name: string | null }>)
      .map((row) => row.mywhoosh_team_name?.toLowerCase())
      .filter(Boolean),
  );
  const riders = ((resultRows ?? []) as unknown as ResultRow[])
    .filter(
      (row) => row.profile_id || (row.team_name && zwbNames.has(row.team_name.toLowerCase())),
    )
    .sort(
      (a, b) =>
        (a.category ?? 99) - (b.category ?? 99) ||
        (a.category_rank ?? 9999) - (b.category_rank ?? 9999),
    );
  const teamResults = (teamRows ?? []) as TeamResultRow[];
  const leaderTime = new Map(
    teamResults.filter((team) => team.rank === 1).map((team) => [team.category, team.time_ms]),
  );
  const teamsPerCategory = new Map<number, number>();
  for (const team of teamResults) {
    teamsPerCategory.set(team.category, (teamsPerCategory.get(team.category) ?? 0) + 1);
  }
  const ourTeams = teamResults
    .filter((team) => zwbNames.has(team.team_name.toLowerCase()))
    .sort((a, b) => a.category - b.category);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Sunday Race Club
      </h2>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {open && signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Inschrijven op MyWhoosh
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
        {closes && (
          <span className={open ? "" : "text-muted-foreground"}>
            {open ? "Inschrijven tot" : "Inschrijving gesloten"} {moment(closes)}
          </span>
        )}
        {race.course_url && (
          <a
            href={race.course_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
          >
            Parcours
            <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
      {starts.length > 0 && (
        <dl className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm tabular-nums sm:grid-cols-6">
          {starts.map(([category, start]) => (
            <div key={category}>
              <dt className="text-xs text-muted-foreground">Cat {category}</dt>
              <dd>{clock(start)}</dd>
            </div>
          ))}
        </dl>
      )}
      {weighIn.length > 0 && race.pre_weight_opens_at && race.pre_weight_closes_at && (
        <p className="text-sm">
          Weigh-in cat {weighIn.join(" en ")}: {clock(race.pre_weight_opens_at)}–
          {clock(race.pre_weight_closes_at)}
        </p>
      )}
      {race.results_status && (riders.length > 0 || ourTeams.length > 0) && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-semibold">
            Uitslag{" "}
            <span className="font-normal text-muted-foreground">
              ({race.results_status === "official" ? "officieel" : "voorlopig"})
            </span>
          </h3>
          {ourTeams.length > 0 && (
            <ul className="space-y-1 text-sm">
              {ourTeams.map((team) => {
                const gap = team.time_ms - (leaderTime.get(team.category) ?? team.time_ms);
                return (
                  <li key={`${team.category}-${team.mywhoosh_team_id}`} className="tabular-nums">
                    <span className="font-medium">{team.team_name}</span> · cat {team.category} ·{" "}
                    {team.rank}e van {teamsPerCategory.get(team.category)} ·{" "}
                    {formatRaceTime(team.time_ms)}
                    {gap > 0 ? ` (+${formatRaceTime(gap)})` : ""}
                  </li>
                );
              })}
            </ul>
          )}
          {riders.length > 0 && (
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1 font-medium">Renner</th>
                  <th className="py-1 font-medium">Cat</th>
                  <th className="py-1 font-medium">Plaats</th>
                  <th className="py-1 text-right font-medium">Tijd</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((row) => {
                  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                  return (
                    <tr key={row.mywhoosh_user_id}>
                      <td className="py-1">
                        <MemberLink id={row.profile_id}>
                          {profile?.display_name ?? row.name}
                        </MemberLink>
                      </td>
                      <td className="py-1">{row.category ?? "—"}</td>
                      <td className="py-1">{row.category_rank ?? "DNF"}</td>
                      <td className="py-1 text-right">
                        {formatRaceTime(row.finished_ms === null ? null : Number(row.finished_ms))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
