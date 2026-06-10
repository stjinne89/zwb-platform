import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Plus, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
import { WhatsAppGroupBlock } from "@/components/whatsapp-link";
import { Button } from "@/components/ui/button";
import {
  TeamRosterTable,
  type TeamRosterRow,
} from "../_components/team-roster-table";
import { AdminPanel, DeleteResultButton } from "./_components/admin-panel";
import { GraveyardToggle } from "./_components/graveyard-toggle";
import { TeamAvailabilityButtons } from "./_components/team-availability-buttons";
import {
  TeamLineupPlanner,
  type PlannerLineup,
  type PlannerRider,
  type PlannerTeam,
} from "./_components/team-lineup-planner";

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  social: "Social",
  outdoor: "Outdoor",
};

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  description: string | null;
  captain_id: string | null;
  is_graveyard: boolean | null;
  parent_team_id: string | null;
};

type MemberRow = {
  profile_id: string;
  role: string;
  team_id: string;
  profiles?: {
    display_name?: string | null;
    region?: string | null;
    zrl_category?: string | null;
    ftp_watts?: number | null;
    weight_kg?: number | string | null;
  } | null;
};

type PowerRow = {
  profile_id: string;
  rider_type: string | null;
  sync_status: string | null;
  synced_at: string | null;
  ftp_watts: number | null;
  ftp_wkg: number | string | null;
  watts_15s: number | null;
  watts_30s: number | null;
  watts_1m: number | null;
  watts_2m: number | null;
  watts_5m: number | null;
  watts_10m: number | null;
  watts_20m: number | null;
  wkg_15s: number | string | null;
  wkg_30s: number | string | null;
  wkg_1m: number | string | null;
  wkg_2m: number | string | null;
  wkg_5m: number | string | null;
  wkg_10m: number | string | null;
  wkg_20m: number | string | null;
};

type EventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  location: string | null;
  team_id: string | null;
};

type AvailabilityRow = {
  event_id: string;
  profile_id: string;
  status: "available" | "maybe" | "unavailable";
};

type LineupRow = {
  id: string;
  event_id: string;
  team_id: string;
  profile_id: string;
};

type ZrlResultRow = {
  profile_id: string | null;
  position: number | null;
  points: number | string | null;
};

function num(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function metricAvg(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, type, division, description, captain_id, is_graveyard, parent_team_id")
    .eq("id", id)
    .single<TeamRow>();

  if (!team) notFound();

  const rootTeamId = team.parent_team_id ?? team.id;
  const { data: childTeams } = await supabase
    .from("teams")
    .select("id, name, type, division, description, captain_id, is_graveyard, parent_team_id")
    .eq("parent_team_id", rootTeamId)
    .order("name");
  const scopeTeams: TeamRow[] =
    team.parent_team_id == null
      ? [team, ...((childTeams ?? []) as TeamRow[])]
      : [team];
  const lineupTeams: PlannerTeam[] =
    team.parent_team_id == null
      ? scopeTeams.map((row) => ({ id: row.id, name: row.name }))
      : [
          { id: team.id, name: team.name },
          ...(((childTeams ?? []) as TeamRow[])
            .filter((row) => row.id !== team.id)
            .map((row) => ({ id: row.id, name: row.name }))),
        ];
  const scopeIds = scopeTeams.map((row) => row.id);
  const calendarTeamIds = Array.from(new Set([rootTeamId, ...scopeIds]));

  const [
    { data: members },
    { data: results },
    access,
    { data: allProfiles },
    { data: rosterPending },
    { data: waGroups },
    { data: powerRows },
    { data: zrlRows },
    { data: events },
  ] = await Promise.all([
    admin
      .from("team_members")
      .select("team_id, profile_id, role, profiles(display_name, region, zrl_category, ftp_watts, weight_kg)")
      .in("team_id", scopeIds),
    supabase
      .from("team_results")
      .select("*")
      .in("team_id", scopeIds)
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getCurrentUserAccess(supabase),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("roster_entries")
      .select("id, name, pace_category, zwift_id")
      .in("team_id", scopeIds)
      .is("claimed_by", null)
      .order("name"),
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description")
      .eq("team_id", id)
      .order("display_order")
      .order("name"),
    supabase.from("rider_power_profiles").select("*"),
    supabase
      .from("zrl_rider_results")
      .select("profile_id, position, points")
      .in("team_id", scopeIds)
      .not("profile_id", "is", null)
      .limit(1000),
    supabase
      .from("events")
      .select("id, title, type, start_at, location, team_id")
      .in("team_id", calendarTeamIds)
      .gte("start_at", new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order("start_at")
      .limit(12),
  ]);

  const memberRows = (members ?? []) as unknown as MemberRow[];
  let profileIds = Array.from(new Set(memberRows.map((member) => member.profile_id)));
  const eventIds = ((events ?? []) as EventRow[]).map((event) => event.id);

  const [{ data: availabilityRows }, { data: lineupRows }] = await Promise.all([
    eventIds.length > 0
      ? supabase
          .from("team_event_availability")
          .select("event_id, profile_id, status")
          .eq("team_id", rootTeamId)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? supabase
          .from("team_event_lineups")
          .select("id, event_id, team_id, profile_id")
          .eq("parent_team_id", rootTeamId)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  const availabilityProfileIds = Array.from(
    new Set(((availabilityRows ?? []) as AvailabilityRow[]).map((row) => row.profile_id)),
  );
  const missingAvailabilityProfileIds = availabilityProfileIds.filter(
    (profileId) => !profileIds.includes(profileId),
  );
  const { data: availabilityProfiles } =
    missingAvailabilityProfileIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name, region, zrl_category, ftp_watts, weight_kg")
          .in("id", missingAvailabilityProfileIds)
      : { data: [] };
  profileIds = Array.from(new Set([...profileIds, ...availabilityProfileIds]));

  const canManageRoster = access.has("teams.manage_roster");
  const canManageResults = access.has("teams.manage_results");
  const isCaptain = memberRows.some(
    (member) =>
      member.profile_id === user?.id &&
      (member.role === "captain" || member.role === "co-captain"),
  );
  const canManage = canManageRoster || canManageResults || isCaptain;

  const powerByProfile = new Map(
    ((powerRows ?? []) as PowerRow[]).map((row) => [row.profile_id, row]),
  );
  const membershipsByProfile = new Map<string, TeamRosterRow["teams"]>();
  const profileById = new Map<string, MemberRow["profiles"]>();
  const teamById = new Map(scopeTeams.map((row) => [row.id, row]));
  for (const member of memberRows) {
    const memberTeam = teamById.get(member.team_id);
    if (memberTeam) {
      membershipsByProfile.set(member.profile_id, [
        ...(membershipsByProfile.get(member.profile_id) ?? []),
        {
          id: memberTeam.id,
          name: memberTeam.name,
          role: member.role,
          parentTeamId: memberTeam.parent_team_id,
        },
      ]);
    }
    if (member.profiles) profileById.set(member.profile_id, member.profiles);
  }
  for (const profile of availabilityProfiles ?? []) {
    profileById.set(profile.id, {
      display_name: profile.display_name,
      region: profile.region,
      zrl_category: profile.zrl_category,
      ftp_watts: profile.ftp_watts,
      weight_kg: profile.weight_kg,
    });
  }

  const zrlByProfile = new Map<
    string,
    { starts: number; bestPosition: number | null; points: number[] }
  >();
  for (const result of ((zrlRows ?? []) as ZrlResultRow[])) {
    if (!result.profile_id) continue;
    const current = zrlByProfile.get(result.profile_id) ?? {
      starts: 0,
      bestPosition: null,
      points: [],
    };
    current.starts += 1;
    if (result.position != null) {
      current.bestPosition =
        current.bestPosition == null
          ? result.position
          : Math.min(current.bestPosition, result.position);
    }
    const points = num(result.points);
    if (points != null) current.points.push(points);
    zrlByProfile.set(result.profile_id, current);
  }

  const rows: TeamRosterRow[] = profileIds.map((profileId) => {
    const profile = profileById.get(profileId);
    const power = powerByProfile.get(profileId);
    const zrl = zrlByProfile.get(profileId);
    return {
      id: profileId,
      name: profile?.display_name ?? "Onbekend",
      region: profile?.region ?? null,
      zrlCategory: profile?.zrl_category ?? null,
      ftpWatts: profile?.ftp_watts ?? null,
      weightKg: num(profile?.weight_kg),
      teams: membershipsByProfile.get(profileId) ?? [],
      power: power
        ? {
            riderType: power.rider_type,
            syncStatus: power.sync_status,
            syncedAt: power.synced_at,
            ftpWatts: power.ftp_watts,
            ftpWkg: num(power.ftp_wkg),
            watts15s: power.watts_15s,
            watts30s: power.watts_30s,
            watts1m: power.watts_1m,
            watts2m: power.watts_2m,
            watts5m: power.watts_5m,
            watts10m: power.watts_10m,
            watts20m: power.watts_20m,
            wkg15s: num(power.wkg_15s),
            wkg30s: num(power.wkg_30s),
            wkg1m: num(power.wkg_1m),
            wkg2m: num(power.wkg_2m),
            wkg5m: num(power.wkg_5m),
            wkg10m: num(power.wkg_10m),
            wkg20m: num(power.wkg_20m),
          }
        : null,
      zrlStarts: zrl?.starts ?? 0,
      zrlBestPosition: zrl?.bestPosition ?? null,
      zrlAvgPoints: zrl ? metricAvg(zrl.points) : null,
    };
  });

  const candidates = (allProfiles ?? []).filter((profile) => !profileIds.includes(profile.id));
  const availabilityByEventProfile = new Map(
    ((availabilityRows ?? []) as AvailabilityRow[]).map((row) => [
      `${row.event_id}:${row.profile_id}`,
      row.status,
    ]),
  );
  const lineups = (lineupRows ?? []) as LineupRow[];

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Terug naar teams
      </Link>

      <header className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {TYPE_LABELS[team.type] ?? team.type}
            {team.division ? ` · ${team.division}` : ""}
          </span>
          {team.is_graveyard && (
            <span className="inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              Archief
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{team.name}</h1>
            {team.description && (
              <p className="mt-1 text-muted-foreground">{team.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <HelpLink href="/hulp#teambeheer" />
            {canManageRoster && (
              <GraveyardToggle teamId={team.id} isGraveyard={team.is_graveyard ?? false} />
            )}
          </div>
        </div>
        {scopeTeams.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {scopeTeams.map((row) => (
              <Link
                key={row.id}
                href={`/teams/${row.id}`}
                className="rounded-full border px-2 py-1 text-xs hover:bg-muted"
              >
                {row.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {team.parent_team_id == null && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Subteams</h2>
            {canManageRoster && (
              <Link href={`/teams/nieuw?parent_team_id=${team.id}`}>
                <Button size="sm" variant="outline">
                  <Plus data-icon="inline-start" />
                  Nieuw subteam
                </Button>
              </Link>
            )}
          </div>
          {(childTeams ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nog geen subteams aangemaakt.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {((childTeams ?? []) as TeamRow[]).map((child) => (
                <Link
                  key={child.id}
                  href={`/teams/${child.id}`}
                  className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  {child.name}
                  {child.division && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {child.division}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon={<Users className="size-4" />} label="Renners" value={rows.length} />
        <Metric icon={<CalendarDays className="size-4" />} label="Teamraces" value={(events ?? []).length} />
        <Metric icon={<Trophy className="size-4" />} label="ZRL-starts" value={rows.reduce((sum, row) => sum + row.zrlStarts, 0)} />
      </section>

      <WhatsAppGroupBlock
        scope="team"
        groups={waGroups ?? []}
        canManage={canManage}
      />

      <TeamRosterTable
        rows={rows}
        teams={scopeTeams.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          parentTeamId: row.parent_team_id,
        }))}
      />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Teamkalender en selectie</h2>
        {(events ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen aankomende kalenderitems gekoppeld aan dit team.
          </p>
        ) : (
          <div className="space-y-4">
            {((events ?? []) as EventRow[]).map((event) => {
              const eventLineups = lineups.filter((lineup) => lineup.event_id === event.id);
              const plannerLineups: PlannerLineup[] = eventLineups.map((lineup) => ({
                id: lineup.id,
                eventId: lineup.event_id,
                teamId: lineup.team_id,
                profileId: lineup.profile_id,
                riderName: profileById.get(lineup.profile_id)?.display_name ?? "Onbekend",
                teamName: teamById.get(lineup.team_id)?.name ?? "Team",
              }));
              const plannerRiders: PlannerRider[] = rows.map((row) => ({
                id: row.id,
                name: row.name,
                category: row.zrlCategory,
                availability:
                  availabilityByEventProfile.get(`${event.id}:${row.id}`) ?? null,
                riderType: row.power?.riderType ?? null,
                ftpWkg: row.power?.ftpWkg ?? null,
                watts5m: row.power?.watts5m ?? null,
                watts20m: row.power?.watts20m ?? null,
                zrlStarts: row.zrlStarts,
                bestPosition: row.zrlBestPosition,
              }));
              const myAvailability = user
                ? availabilityByEventProfile.get(`${event.id}:${user.id}`) ?? null
                : null;

              return (
                <article key={event.id} className="space-y-3 rounded-md border bg-background/60 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                        {event.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.start_at).toLocaleString("nl-NL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Europe/Amsterdam",
                        })}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    </div>
                    <TeamAvailabilityButtons
                      teamId={rootTeamId}
                      eventId={event.id}
                      current={myAvailability}
                    />
                  </div>
                  {canManage && (
                    <TeamLineupPlanner
                      parentTeamId={rootTeamId}
                      eventId={event.id}
                      teams={lineupTeams}
                      riders={plannerRiders}
                      lineups={plannerLineups}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {rosterPending && rosterPending.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nog niet geregistreerd ({rosterPending.length})
          </h2>
          <ul className="divide-y">
            {rosterPending.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {r.name}
                  {r.pace_category && (
                    <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      {r.pace_category}
                    </span>
                  )}
                </span>
                {r.zwift_id && (
                  <span className="text-xs text-muted-foreground">Zwift {r.zwift_id}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Teamresultaten
        </h2>
        {!results || results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen resultaten ingevoerd.</p>
        ) : (
          <ul className="divide-y">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">
                    {r.competition}
                    {r.round_label ? ` - ${r.round_label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.round_at
                      ? new Date(r.round_at).toLocaleDateString("nl-NL", {
                          dateStyle: "medium",
                        })
                      : "-"}
                    {r.position
                      ? ` · #${r.position}${r.total_teams ? `/${r.total_teams}` : ""}`
                      : ""}
                    {r.points !== null && r.points !== undefined ? ` · ${r.points} pt` : ""}
                  </p>
                </div>
                {(canManageResults || isCaptain) && (
                  <DeleteResultButton teamId={team.id} resultId={r.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && (
        <AdminPanel
          teamId={team.id}
          candidates={candidates}
          members={rows.map((row) => ({
            profile_id: row.id,
            role: row.teams.find((membership) => membership.id === team.id)?.role ?? "member",
            display_name: row.name,
          }))}
        />
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
