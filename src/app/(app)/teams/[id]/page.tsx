import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CalendarDays, Plus, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import {
  WTRL_ZRL_RESULTS_URL,
  fetchZrlPlacement,
  formatZrlPlacement,
  pickZrlEventPerTeam,
  type ZrlTeamEvent,
} from "@/lib/teams/wtrl-results";
import { HelpLink } from "@/components/app-ui";
import { TeamChatLinks } from "@/components/team-chat-links";
import { Button } from "@/components/ui/button";
import {
  TeamRosterTable,
  type TeamRosterRow,
} from "../_components/team-roster-table";
import { AdminPanel, DeleteResultButton } from "./_components/admin-panel";
import { GraveyardToggle } from "./_components/graveyard-toggle";
import { TeamAvailabilityButtons } from "./_components/team-availability-buttons";
import { loadWtrlSummaries } from "@/lib/teams/wtrl-summary";
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

// Buiten de component zodat de purity-lint Date.now() niet als impure-in-render
// markeert (zelfde patroon als de event-/verjaardag-detailpagina's).
function upcomingEventsCutoffIso() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  description: string | null;
  captain_id: string | null;
  is_graveyard: boolean | null;
  parent_team_id: string | null;
  discord_url: string | null;
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
  parent_event_id?: string | null;
  /** Bij een raceweek: de races van de subteams eronder. */
  races?: Array<{ id: string; teamName: string; startAt: string }>;
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
  profile_id: string | null;
  roster_entry_id: string | null;
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
    .select("id, name, type, division, description, captain_id, is_graveyard, parent_team_id, discord_url")
    .eq("id", id)
    .single<TeamRow>();

  if (!team) notFound();

  const rootTeamId = team.parent_team_id ?? team.id;
  const { data: childTeams } = await supabase
    .from("teams")
    .select("id, name, type, division, description, captain_id, is_graveyard, parent_team_id, discord_url")
    .eq("parent_team_id", rootTeamId)
    .order("name");
  const scopeTeams: TeamRow[] =
    team.parent_team_id == null
      ? [team, ...((childTeams ?? []) as TeamRow[])]
      : [team];
  // Een hoofdteam met subteams start zelf niet in een wedstrijd; het verdeelt
  // zijn leden over de subteams (migr. 0179).
  const rootHasSubteams =
    team.parent_team_id != null || (childTeams ?? []).length > 0;
  const lineupTeams: PlannerTeam[] =
    team.parent_team_id == null
      ? scopeTeams
          .filter((row) => !rootHasSubteams || row.id !== team.id)
          .map((row) => ({ id: row.id, name: row.name }))
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
      .select("id, name, pace_category, zwift_id, team_id")
      .in("team_id", scopeIds)
      .is("claimed_by", null)
      .order("name"),
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description, kind")
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
      .select("id, title, type, start_at, location, team_id, parent_event_id")
      .in("team_id", calendarTeamIds)
      .gte("start_at", upcomingEventsCutoffIso())
      .order("start_at")
      .limit(12),
  ]);

  const { data: zrlEvents } = await supabase
    .from("events")
    .select("team_id, start_at, zwift_event_id")
    .eq("type", "zrl")
    .in("team_id", scopeIds)
    .not("zwift_event_id", "is", null)
    .order("start_at", { ascending: false })
    .limit(50);
  const zrlEventPerTeam = pickZrlEventPerTeam((zrlEvents ?? []) as ZrlTeamEvent[]);
  const zrlPlacements = (
    await Promise.all(
      scopeTeams.map(async (row) => {
        const eventId = zrlEventPerTeam.get(row.id)?.zwift_event_id;
        const placement = eventId ? await fetchZrlPlacement(eventId) : null;
        return placement ? { teamId: row.id, teamName: row.name, placement } : null;
      }),
    )
  ).filter((row): row is NonNullable<typeof row> => row != null);

  // Bij een hoofdteam met subteams is de raceweek (het hoofdevent, migr. 0178)
  // de eenheid: daar meld je je beschikbaar en daar verdeelt de captain over de
  // subteams. De races van de subteams staan eronder.
  let calendarEvents = (events ?? []) as EventRow[];
  if (rootHasSubteams) {
    // Alle komende raceweken, ook zonder race van een subteam eronder: je meldt
    // je bij de paraplu aan voordat de races van de subteams in de kalender staan.
    const parentIds = Array.from(
      new Set(
        calendarEvents
          .filter((event) => event.type === "zrl" && event.parent_event_id)
          .map((event) => event.parent_event_id as string),
      ),
    );
    const [{ data: upcomingWeeks }, { data: linkedWeeks }] = await Promise.all([
      supabase
        .from("events")
        .select("id, title, type, start_at, location, team_id")
        .eq("type", "zrl")
        .is("team_id", null)
        .is("parent_event_id", null)
        .gte("start_at", upcomingEventsCutoffIso())
        .order("start_at")
        .limit(6),
      parentIds.length > 0
        ? supabase
            .from("events")
            .select("id, title, type, start_at, location, team_id")
            .in("id", parentIds)
        : Promise.resolve({ data: [] }),
    ]);
    const weekById = new Map<string, EventRow & { races: NonNullable<EventRow["races"]> }>();
    for (const week of [...(upcomingWeeks ?? []), ...(linkedWeeks ?? [])] as EventRow[]) {
      weekById.set(week.id, { ...week, races: [] });
    }
    const teamNames = new Map(
      [team, ...((childTeams ?? []) as TeamRow[])].map((row) => [row.id, row.name]),
    );
    const loose: EventRow[] = [];
    for (const event of calendarEvents) {
      const week = event.parent_event_id ? weekById.get(event.parent_event_id) : null;
      if (!week || event.type !== "zrl") {
        loose.push(event);
        continue;
      }
      week.races.push({
        id: event.id,
        teamName: (event.team_id && teamNames.get(event.team_id)) || event.title,
        startAt: event.start_at,
      });
    }
    calendarEvents = [...loose, ...weekById.values()]
      .sort((x, y) => x.start_at.localeCompare(y.start_at))
      .slice(0, 12);
  }

  // WTRL-waarden (migr. 0180) van de teams op deze pagina, per Zwift-ID.
  const wtrlByZwiftId = await loadWtrlSummaries(supabase, scopeIds);
  const { data: wtrlProfiles } =
    wtrlByZwiftId.size > 0
      ? await supabase
          .from("profiles")
          .select("id, zwift_id")
          .in("zwift_id", [...wtrlByZwiftId.keys()])
      : { data: [] };
  const zwiftIdByProfile = new Map(
    ((wtrlProfiles ?? []) as Array<{ id: string; zwift_id: string }>).map((row) => [
      row.id,
      row.zwift_id,
    ]),
  );

  const memberRows = (members ?? []) as unknown as MemberRow[];
  let profileIds = Array.from(new Set(memberRows.map((member) => member.profile_id)));
  const eventIds = calendarEvents.map((event) => event.id);

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
          .select("id, event_id, team_id, profile_id, roster_entry_id")
          .eq("parent_team_id", rootTeamId)
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Niet-leden die zich beschikbaar (of misschien) meldden, staan erbij zodat de
  // captain ze kan indelen. "Niet beschikbaar" maakt je geen renner van dit team;
  // dat zette tot 2026-09-22 ook wie afzegde in de lijst.
  const availabilityProfileIds = Array.from(
    new Set(
      ((availabilityRows ?? []) as AvailabilityRow[])
        .filter((row) => row.status !== "unavailable")
        .map((row) => row.profile_id),
    ),
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
      wtrl: wtrlByZwiftId.get(zwiftIdByProfile.get(profileId) ?? "") ?? null,
    };
  });

  // Rosternamen zonder account (o.a. uit de WTRL-import) staan in dezelfde tabel,
  // gemarkeerd als niet geregistreerd. Niet in de opstellingsplanner: een
  // opstelling hoort bij een profiel.
  const unregisteredRows: TeamRosterRow[] = (
    (rosterPending ?? []) as Array<{
      id: string;
      name: string;
      pace_category: string | null;
      zwift_id: string | null;
      team_id: string | null;
    }>
  ).map((entry) => {
    const entryTeam = entry.team_id ? teamById.get(entry.team_id) : null;
    return {
      id: entry.id,
      name: entry.name,
      region: null,
      zrlCategory: entry.pace_category,
      ftpWatts: null,
      weightKg: null,
      teams: entryTeam
        ? [
            {
              id: entryTeam.id,
              name: entryTeam.name,
              role: "member",
              parentTeamId: entryTeam.parent_team_id,
            },
          ]
        : [],
      power: null,
      zrlStarts: 0,
      zrlBestPosition: null,
      zrlAvgPoints: null,
      wtrl: entry.zwift_id ? wtrlByZwiftId.get(entry.zwift_id.trim()) ?? null : null,
      unregistered: true,
    };
  });
  const rosterRows = [...rows, ...unregisteredRows];

  const candidates = (allProfiles ?? []).filter((profile) => !profileIds.includes(profile.id));
  const availabilityByEventProfile = new Map(
    ((availabilityRows ?? []) as AvailabilityRow[]).map((row) => [
      `${row.event_id}:${row.profile_id}`,
      row.status,
    ]),
  );
  const lineups = (lineupRows ?? []) as LineupRow[];
  // Namen van rosterregels in de opstelling, ook als de naam intussen niet meer
  // bij een team op deze pagina hoort.
  const rosterNameById = new Map(
    ((rosterPending ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
  );
  const missingRosterIds = lineups
    .map((lineup) => lineup.roster_entry_id)
    .filter((rosterId): rosterId is string => Boolean(rosterId) && !rosterNameById.has(rosterId!));
  if (missingRosterIds.length > 0) {
    const { data: extraRoster } = await supabase
      .from("roster_entries")
      .select("id, name")
      .in("id", missingRosterIds);
    for (const row of (extraRoster ?? []) as Array<{ id: string; name: string }>) {
      rosterNameById.set(row.id, row.name);
    }
  }

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
            <TeamChatLinks
              whatsappGroups={waGroups ?? []}
              discordUrl={team.discord_url}
            />
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
        <Metric icon={<CalendarDays className="size-4" />} label="Teamraces" value={calendarEvents.length} />
        <Metric icon={<Trophy className="size-4" />} label="ZRL-starts" value={rows.reduce((sum, row) => sum + row.zrlStarts, 0)} />
      </section>

      <TeamRosterTable
        rows={rosterRows}
        teams={scopeTeams.map((row) => ({
          id: row.id,
          name: row.name,
          type: row.type,
          parentTeamId: row.parent_team_id,
        }))}
      />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Teamkalender en selectie</h2>
        {calendarEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Geen aankomende kalenderitems gekoppeld aan dit team.
          </p>
        ) : (
          <div className="space-y-4">
            {calendarEvents.map((event) => {
              const eventLineups = lineups.filter((lineup) => lineup.event_id === event.id);
              const plannerLineups: PlannerLineup[] = eventLineups.map((lineup) => ({
                id: lineup.id,
                eventId: lineup.event_id,
                teamId: lineup.team_id,
                riderId: (lineup.profile_id ?? lineup.roster_entry_id) as string,
                riderName:
                  (lineup.profile_id
                    ? profileById.get(lineup.profile_id)?.display_name
                    : rosterNameById.get(lineup.roster_entry_id ?? "")) ?? "Onbekend",
                teamName: teamById.get(lineup.team_id)?.name ?? "Team",
              }));
              const plannerRiders: PlannerRider[] = rosterRows.map((row) => ({
                id: row.id,
                unregistered: row.unregistered,
                name: row.name,
                category: row.zrlCategory,
                availability:
                  availabilityByEventProfile.get(`${event.id}:${row.id}`) ?? null,
                riderType: row.power?.riderType ?? null,
                ftpWatts: row.power?.ftpWatts ?? row.ftpWatts ?? null,
                ftpWkg: row.power?.ftpWkg ?? null,
                watts5m: row.power?.watts5m ?? null,
                watts20m: row.power?.watts20m ?? null,
                wkg5m: row.power?.wkg5m ?? null,
                wkg20m: row.power?.wkg20m ?? null,
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
                      {event.races && event.races.length > 0 && (
                        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                          {event.races.map((race) => (
                            <Link
                              key={race.id}
                              href={`/events/${race.id}`}
                              className="text-primary hover:underline"
                            >
                              {race.teamName}{" "}
                              <span className="tabular-nums text-muted-foreground">
                                {new Date(race.startAt).toLocaleTimeString("nl-NL", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "Europe/Amsterdam",
                                })}
                              </span>
                            </Link>
                          ))}
                        </p>
                      )}
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

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Teamresultaten
        </h2>
        {zrlPlacements.length > 0 && (
          <div className="space-y-1 text-sm">
            <a
              href={WTRL_ZRL_RESULTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Uitslag op WTRL
              <ArrowUpRight className="size-3.5" />
            </a>
            <ul className="text-muted-foreground">
              {zrlPlacements.map((row) => (
                <li key={row.teamId}>
                  {zrlPlacements.length > 1 && (
                    <span className="font-medium text-foreground">{row.teamName}: </span>
                  )}
                  {formatZrlPlacement(row.placement)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!results || results.length === 0 ? (
          zrlPlacements.length > 0 ? null : (
          <p className="text-sm text-muted-foreground">Nog geen resultaten ingevoerd.</p>
          )
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
          whatsappUrl={(waGroups ?? [])[0]?.invite_url ?? null}
          discordUrl={team.discord_url}
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
