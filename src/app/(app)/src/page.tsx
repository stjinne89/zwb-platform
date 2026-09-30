import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState } from "@/components/app-ui";
import { cn } from "@/lib/utils";
import { genderLabel, type SrcGender } from "@/lib/src/feed";
import {
  nextSrcMonth,
  srcMonthKey,
  srcSundayCoverage,
  type SrcAvailabilityStatus,
  type SrcPlanRider,
} from "@/lib/src/month";
import { TeamAvailabilityButtons } from "../teams/[id]/_components/team-availability-buttons";
import { setSrcAvailability } from "./_actions";
import { SrcAddMemberForm, SrcJoinForm, SrcRemoveEntryButton } from "./_components/month-forms";

export const dynamic = "force-dynamic";

type Team = { id: string; name: string; mywhoosh_team_name: string | null };
type Sunday = { id: string; title: string; src_sunday: string };
type EntryRow = {
  profile_id: string;
  team_id: string;
  race: SrcGender;
  category: number | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

const MONTH = new Intl.DateTimeFormat("nl-NL", { month: "long", timeZone: "UTC" });
const DAY = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });

function monthLabel(month: string) {
  return MONTH.format(new Date(`${month}T12:00:00Z`));
}

const STATUS_MARK: Record<SrcAvailabilityStatus, { mark: string; className: string; label: string }> = {
  available: {
    mark: "✓",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    label: "beschikbaar",
  },
  maybe: {
    mark: "?",
    className: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    label: "misschien",
  },
  unavailable: { mark: "–", className: "bg-muted text-muted-foreground", label: "niet" },
};

export default async function SrcPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string }>;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  const userId = access.user.id;

  const current = srcMonthKey(new Date());
  const next = nextSrcMonth(current);
  const { maand } = await searchParams;
  const month = maand === next ? next : current;

  const [{ data: teamRows }, { data: sundayRows }, { data: entryRows }, { data: me }, { data: captainRows }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, name, mywhoosh_team_name")
        .eq("type", "src")
        .eq("is_graveyard", false)
        .order("name"),
      supabase
        .from("events")
        .select("id, title, src_sunday")
        .gte("src_sunday", month)
        .lt("src_sunday", nextSrcMonth(month))
        .is("parent_event_id", null)
        .order("src_sunday"),
      supabase
        .from("src_month_entries")
        .select("profile_id, team_id, race, category, profiles(display_name)")
        .eq("month", month),
      supabase.from("profiles").select("sex").eq("id", userId).maybeSingle(),
      supabase
        .from("team_members")
        .select("team_id, teams!inner(type)")
        .eq("profile_id", userId)
        .eq("teams.type", "src")
        .in("role", ["captain", "co-captain"]),
    ]);
  const teams = (teamRows ?? []) as Team[];
  const sundays = (sundayRows ?? []) as Sunday[];
  const entries = (entryRows ?? []) as unknown as EntryRow[];
  const canManage =
    access.hasAny(["teams.manage_roster", "events.manage_all"]) || (captainRows ?? []).length > 0;

  const sundayIds = sundays.map((sunday) => sunday.id);
  const [{ data: availabilityRows }, { data: memberRows }] = await Promise.all([
    sundayIds.length > 0
      ? supabase
          .from("team_event_availability")
          .select("event_id, team_id, profile_id, status")
          .in("event_id", sundayIds)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase
          .from("profiles")
          .select("id, display_name")
          .eq("is_approved", true)
          .order("display_name")
          .limit(1000)
      : Promise.resolve({ data: [] }),
  ]);

  const entryOf = new Map(entries.map((entry) => [entry.profile_id, entry]));
  // Alleen beschikbaarheid voor het team van deze maand telt.
  const status = new Map<string, SrcAvailabilityStatus>();
  for (const row of (availabilityRows ?? []) as Array<{
    event_id: string;
    team_id: string;
    profile_id: string;
    status: SrcAvailabilityStatus;
  }>) {
    if (entryOf.get(row.profile_id)?.team_id !== row.team_id) continue;
    status.set(`${row.event_id}|${row.profile_id}`, row.status);
  }

  const mine = entryOf.get(userId) ?? null;
  const riders: SrcPlanRider[] = entries.map((entry) => ({
    profileId: entry.profile_id,
    teamId: entry.team_id,
    race: entry.race,
    category: entry.category,
  }));
  const nameOf = (entry: EntryRow) =>
    (Array.isArray(entry.profiles) ? entry.profiles[0] : entry.profiles)?.display_name ?? "Onbekend";
  const teamName = new Map(teams.map((team) => [team.id, team.name]));
  const joinTeams = teams.map((team) => ({ id: team.id, name: team.name }));

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Sunday Race Club</h1>
        <nav className="flex gap-2 text-sm">
          {[current, next].map((option) => (
            <Link
              key={option}
              href={option === current ? "/src" : `/src?maand=${option}`}
              className={cn(
                "rounded-full border px-3 py-1 capitalize",
                option === month ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {monthLabel(option)}
            </Link>
          ))}
        </nav>
      </header>

      {teams.length === 0 ? (
        <EmptyState>Nog geen SRC-team.</EmptyState>
      ) : (
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Jij in {monthLabel(month)}
          </h2>
          <SrcJoinForm
            month={month}
            monthLabel={monthLabel(month)}
            teams={joinTeams}
            initial={
              mine ? { teamId: mine.team_id, race: mine.race, category: mine.category } : null
            }
            defaultRace={(me?.sex as string | null) === "vrouw" ? "women" : "men"}
          />
          {mine && sundays.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {sundays.map((sunday) => (
                <li
                  key={sunday.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                >
                  <Link href={`/events/${sunday.id}`} className="font-medium hover:underline">
                    {sunday.title}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {DAY.format(new Date(`${sunday.src_sunday}T12:00:00Z`))}
                    </span>
                  </Link>
                  <TeamAvailabilityButtons
                    teamId={mine.team_id}
                    eventId={sunday.id}
                    current={status.get(`${sunday.id}|${userId}`) ?? null}
                    save={setSrcAvailability.bind(null, sunday.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {teams.map((team) => {
        const ofTeam = entries
          .filter((entry) => entry.team_id === team.id)
          .sort(
            (a, b) =>
              a.race.localeCompare(b.race) ||
              (a.category ?? 99) - (b.category ?? 99) ||
              nameOf(a).localeCompare(nameOf(b), "nl"),
          );
        return (
          <section key={team.id} className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">{team.name}</h2>
              {team.mywhoosh_team_name && (
                <span className="text-sm text-muted-foreground">{team.mywhoosh_team_name}</span>
              )}
            </div>
            {ofTeam.length === 0 ? (
              <EmptyState>Nog niemand in {monthLabel(month)}.</EmptyState>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="p-2 font-medium">Renner</th>
                      <th className="p-2 font-medium">Race</th>
                      {sundays.map((sunday) => (
                        <th key={sunday.id} className="p-2 text-center font-medium">
                          <Link href={`/events/${sunday.id}`} className="hover:underline">
                            {DAY.format(new Date(`${sunday.src_sunday}T12:00:00Z`))}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ofTeam.map((entry) => (
                      <tr key={entry.profile_id}>
                        <td className="p-2">
                          <span className="flex items-center gap-1">
                            {nameOf(entry)}
                            {canManage && (
                              <SrcRemoveEntryButton month={month} profileId={entry.profile_id} />
                            )}
                          </span>
                        </td>
                        <td className="whitespace-nowrap p-2 text-muted-foreground">
                          {genderLabel(entry.race)} · cat {entry.category ?? "?"}
                        </td>
                        {sundays.map((sunday) => {
                          const value = status.get(`${sunday.id}|${entry.profile_id}`);
                          const mark = value ? STATUS_MARK[value] : null;
                          return (
                            <td key={sunday.id} className="p-2 text-center">
                              <span
                                title={mark?.label ?? "nog niet opgegeven"}
                                className={cn(
                                  "inline-flex size-6 items-center justify-center rounded-full text-xs",
                                  mark?.className ?? "text-muted-foreground",
                                )}
                              >
                                {mark?.mark ?? "·"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t align-top text-xs">
                      <td className="p-2 text-muted-foreground" colSpan={2}>
                        Per categorie
                      </td>
                      {sundays.map((sunday) => {
                        const coverage = srcSundayCoverage(
                          riders.filter((rider) => rider.teamId === team.id),
                          (profileId) => status.get(`${sunday.id}|${profileId}`) ?? null,
                        );
                        return (
                          <td key={sunday.id} className="space-y-1 p-2 text-center">
                            {coverage.map((group) => (
                              <span
                                key={`${group.race}-${group.category}`}
                                className={cn(
                                  "block whitespace-nowrap rounded px-1 tabular-nums",
                                  group.enough
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : "text-muted-foreground",
                                )}
                              >
                                {genderLabel(group.race).charAt(0)}
                                {group.category ?? "?"}: {group.available}
                                {group.maybe > 0 ? `+${group.maybe}` : ""}
                              </span>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {canManage && teams.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Lid toevoegen aan {monthLabel(month)}
          </h2>
          <SrcAddMemberForm
            month={month}
            teams={joinTeams}
            members={((memberRows ?? []) as Array<{ id: string; display_name: string | null }>).map(
              (row) => ({
                id: row.id,
                name:
                  (row.display_name ?? "Onbekend") +
                  (entryOf.has(row.id)
                    ? ` (${teamName.get(entryOf.get(row.id)!.team_id) ?? "team"})`
                    : ""),
              }),
            )}
          />
        </section>
      )}
    </div>
  );
}
