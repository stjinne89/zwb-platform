import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import { genderLabel, type SrcGender } from "@/lib/src/feed";
import { formatRaceTime } from "@/lib/src/results";

/** Zo lang na de start blijft de uitslag op het dashboard staan. */
const VISIBLE_MS = 48 * 3600_000;

type RaceRow = {
  event_id: string;
  sunday: string;
  gender: SrcGender;
  results_status: string | null;
  events: { start_at: string } | { start_at: string }[] | null;
};

type ResultRow = {
  race_event_id: string;
  mywhoosh_user_id: string;
  name: string;
  team_name: string | null;
  category: number | null;
  category_rank: number | null;
  finished_ms: number | string | null;
  profile_id: string | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

type TeamResultRow = {
  race_event_id: string;
  category: number;
  mywhoosh_team_id: string;
  team_name: string;
  time_ms: number | string;
  rank: number;
};

/** De ZWB'ers in de SRC-uitslag (migr. 0202), tot 48 uur na de start. */
export async function SrcResults({ userId }: { userId: string | null }) {
  const supabase = await createClient();
  const now = new Date().getTime();
  const since = new Date(now - VISIBLE_MS);
  const { data: raceRows } = await supabase
    .from("src_races")
    .select("event_id, sunday, gender, results_status, events(start_at)")
    .gte("sunday", since.toISOString().slice(0, 10))
    .not("results_status", "is", null);
  const races = ((raceRows ?? []) as unknown as RaceRow[]).filter((race) => {
    const event = Array.isArray(race.events) ? race.events[0] : race.events;
    const start = event ? new Date(event.start_at).getTime() : NaN;
    return start <= now && start >= since.getTime();
  });
  if (races.length === 0) return null;
  const raceIds = races.map((race) => race.event_id);
  const raceOf = new Map(races.map((race) => [race.event_id, race]));

  const [{ data: resultRows }, { data: teamRows }, { data: zwbTeamRows }, { data: sundayRow }] =
    await Promise.all([
      supabase
        .from("src_results")
        .select(
          "race_event_id, mywhoosh_user_id, name, team_name, category, category_rank, finished_ms, profile_id, profiles!src_results_profile_id_fkey(display_name)",
        )
        .in("race_event_id", raceIds),
      supabase
        .from("src_team_results")
        .select("race_event_id, category, mywhoosh_team_id, team_name, time_ms, rank")
        .in("race_event_id", raceIds),
      supabase.from("teams").select("mywhoosh_team_name").eq("type", "src"),
      supabase
        .from("events")
        .select("id, title")
        .eq("src_sunday", races[0].sunday)
        .is("parent_event_id", null)
        .maybeSingle(),
    ]);
  const zwbNames = new Set(
    ((zwbTeamRows ?? []) as Array<{ mywhoosh_team_name: string | null }>)
      .map((row) => row.mywhoosh_team_name?.toLowerCase())
      .filter(Boolean),
  );
  const order = (raceId: string) => (raceOf.get(raceId)?.gender === "women" ? 0 : 1);
  const riders = ((resultRows ?? []) as unknown as ResultRow[])
    .filter(
      (row) => row.profile_id || (row.team_name && zwbNames.has(row.team_name.toLowerCase())),
    )
    .sort(
      (a, b) =>
        order(a.race_event_id) - order(b.race_event_id) ||
        (a.category ?? 99) - (b.category ?? 99) ||
        (a.category_rank ?? 9999) - (b.category_rank ?? 9999),
    );
  const teamResults = (teamRows ?? []) as TeamResultRow[];
  const teamsPerCategory = new Map<string, number>();
  for (const team of teamResults) {
    const key = `${team.race_event_id}|${team.category}`;
    teamsPerCategory.set(key, (teamsPerCategory.get(key) ?? 0) + 1);
  }
  const ourTeams = teamResults
    .filter((team) => zwbNames.has(team.team_name.toLowerCase()))
    .sort(
      (a, b) => order(a.race_event_id) - order(b.race_event_id) || a.category - b.category,
    );
  if (riders.length === 0 && ourTeams.length === 0) return null;

  const sunday = sundayRow as { id: string; title: string } | null;
  const official = races.every((race) => race.results_status === "official");
  const raceLabel = (raceId: string, category: number | null) =>
    `${genderLabel(raceOf.get(raceId)!.gender)}${category ? ` ${category}` : ""}`;

  return (
    <section>
      <SectionHeader
        icon={Trophy}
        title={`${sunday?.title ?? "Sunday Race Club"}${official ? "" : " · voorlopig"}`}
        action={sunday ? <InlineMoreLink href={`/events/${sunday.id}`}>Race</InlineMoreLink> : null}
      />
      <ul className="divide-y rounded-lg border bg-card text-sm">
        {ourTeams.map((team) => (
          <li key={`${team.race_event_id}-${team.category}-${team.mywhoosh_team_id}`}>
            <Link
              href={`/events/${team.race_event_id}`}
              className="flex items-center gap-3 px-3 py-2 transition hover:bg-muted/50"
            >
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                {raceLabel(team.race_event_id, team.category)}
              </span>
              <span className="w-12 shrink-0 tabular-nums font-semibold">
                {team.rank}/{teamsPerCategory.get(`${team.race_event_id}|${team.category}`)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{team.team_name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatRaceTime(Number(team.time_ms))}
              </span>
            </Link>
          </li>
        ))}
        {riders.map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return (
            <li key={`${row.race_event_id}-${row.mywhoosh_user_id}`}>
              <Link
                href={`/events/${row.race_event_id}`}
                className={`flex items-center gap-3 px-3 py-2 transition hover:bg-muted/50 ${
                  row.profile_id && row.profile_id === userId ? "bg-primary/5" : ""
                }`}
              >
                <span className="w-16 shrink-0 text-xs text-muted-foreground">
                  {raceLabel(row.race_event_id, row.category)}
                </span>
                <span className="w-12 shrink-0 tabular-nums font-semibold">
                  {row.category_rank ?? "DNF"}
                </span>
                <span className="min-w-0 flex-1 truncate">{profile?.display_name ?? row.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatRaceTime(row.finished_ms === null ? null : Number(row.finished_ms))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
