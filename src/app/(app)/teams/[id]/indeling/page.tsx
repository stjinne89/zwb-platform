import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BackLink } from "@/components/app-ui";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { loadWtrlSummaries } from "@/lib/teams/wtrl-summary";
import type { PowerWkg } from "@/lib/club-ladder/team-power";
import {
  categoryFromTeamName,
  isWomenTeamName,
  rankRider,
  type RankingLineup,
} from "@/lib/teams/zrl-ranking";
import { racefitScores, weekCourses, type BorrowRace, type TeamRace } from "@/lib/teams/zrl-racefit";
import { zrlCategoryFromTeamName } from "@/lib/events/zwift-route";
import {
  ZrlRankingTable,
  type RankingAvailabilityEntry,
  type RankingRacefit,
} from "../_components/zrl-ranking-table";

// Teamindeling van een ZRL-hoofdteam met subteams (eigen pagina sinds
// 2026-11-16): de ranglijst op geschatte zFTP en zMAP, en per raceweek de echte
// opstelling (team_event_lineups) die de captain hier met de hand verdeelt.

// Buiten de component zodat de purity-lint Date.now() niet als impure-in-render markeert.
function upcomingEventsCutoffIso() {
  return new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
}

type Status = RankingAvailabilityEntry["status"];

export default async function TeamIndelingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const admin = createAdminClient();
  const [user, access] = await Promise.all([getRequestUser(), getRequestAccess()]);

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, type, parent_team_id")
    .eq("id", id)
    .maybeSingle<{ id: string; name: string; type: string; parent_team_id: string | null }>();
  if (!team) notFound();
  if (team.parent_team_id) redirect(`/teams/${team.parent_team_id}/indeling`);

  const { data: childRows } = await supabase
    .from("teams")
    .select("id, name")
    .eq("parent_team_id", team.id)
    .order("name");
  const childTeams = (childRows ?? []) as Array<{ id: string; name: string }>;
  if (team.type !== "zrl" || childTeams.length === 0) redirect(`/teams/${team.id}`);
  const scopeIds = [team.id, ...childTeams.map((row) => row.id)];

  const [{ data: memberRows }, { data: rosterRows }, { data: weekRows }] = await Promise.all([
    admin
      .from("team_members")
      .select("team_id, profile_id, role, profiles(display_name)")
      .in("team_id", scopeIds),
    supabase
      .from("roster_entries")
      .select("id, name, zwift_id")
      .in("team_id", scopeIds)
      .is("claimed_by", null)
      .order("name"),
    supabase
      .from("events")
      .select("id, title, start_at")
      .eq("type", "zrl")
      .is("team_id", null)
      .is("parent_event_id", null)
      .gte("start_at", upcomingEventsCutoffIso())
      .order("start_at")
      .limit(12),
  ]);
  const members = (memberRows ?? []) as unknown as Array<{
    team_id: string;
    profile_id: string;
    role: string;
    profiles: { display_name: string | null } | null;
  }>;

  const captainOf = new Set(
    members
      .filter((member) => member.profile_id === user?.id && (member.role === "captain" || member.role === "co-captain"))
      .map((member) => member.team_id),
  );
  const canManageRoster = access.has("teams.manage_roster");
  if (!canManageRoster && !access.has("teams.manage_results") && captainOf.size === 0) {
    redirect(`/teams/${team.id}`);
  }

  const weeks = (weekRows ?? []) as Array<{ id: string; title: string; start_at: string }>;
  const weekIds = weeks.map((week) => week.id);
  const [{ data: availabilityRows }, { data: lineupRows }, { data: raceRows }] = await Promise.all([
    weekIds.length > 0
      ? supabase
          .from("team_event_availability")
          .select("event_id, profile_id, roster_entry_id, set_by, status")
          .eq("team_id", team.id)
          .in("event_id", weekIds)
      : Promise.resolve({ data: [] }),
    weekIds.length > 0
      ? supabase
          .from("team_event_lineups")
          .select("id, event_id, team_id, profile_id, roster_entry_id")
          .eq("parent_team_id", team.id)
          .in("event_id", weekIds)
      : Promise.resolve({ data: [] }),
    weekIds.length > 0
      ? supabase
          .from("events")
          .select("id, parent_event_id, team_id, title, zwift_route_id, laps")
          .in("parent_event_id", weekIds)
      : Promise.resolve({ data: [] }),
  ]);
  const availability = (availabilityRows ?? []) as Array<{
    event_id: string;
    profile_id: string | null;
    roster_entry_id: string | null;
    set_by: string | null;
    status: Status;
  }>;
  const lineups = (lineupRows ?? []) as Array<{
    id: string;
    event_id: string;
    team_id: string;
    profile_id: string | null;
    roster_entry_id: string | null;
  }>;

  // Renners: leden van het hoofdteam en de subteams, wie zich beschikbaar of
  // misschien meldde, rosternamen zonder account, en wie al in een opstelling staat.
  const nameOf = new Map<string, string>();
  for (const member of members) nameOf.set(member.profile_id, member.profiles?.display_name ?? "Onbekend");
  const extraProfiles = [
    ...availability.filter((row) => row.status !== "unavailable").map((row) => row.profile_id),
    ...lineups.map((row) => row.profile_id),
  ].filter((value): value is string => value != null && !nameOf.has(value));
  const roster = new Map(
    ((rosterRows ?? []) as Array<{ id: string; name: string; zwift_id: string | null }>).map((row) => [row.id, row]),
  );
  const extraRoster = lineups
    .map((row) => row.roster_entry_id)
    .filter((value): value is string => value != null && !roster.has(value));
  const [{ data: extraProfileRows }, { data: extraRosterRows }] = await Promise.all([
    extraProfiles.length > 0
      ? admin.from("profiles").select("id, display_name").in("id", [...new Set(extraProfiles)])
      : Promise.resolve({ data: [] }),
    extraRoster.length > 0
      ? supabase.from("roster_entries").select("id, name, zwift_id").in("id", [...new Set(extraRoster)])
      : Promise.resolve({ data: [] }),
  ]);
  for (const row of (extraProfileRows ?? []) as Array<{ id: string; display_name: string | null }>) {
    nameOf.set(row.id, row.display_name ?? "Onbekend");
  }
  for (const row of (extraRosterRows ?? []) as Array<{ id: string; name: string; zwift_id: string | null }>) {
    roster.set(row.id, row);
  }

  // Vermogen (ZwiftRacing) en de laatste WTRL-plak, beide per Zwift-ID.
  const profileIds = [...nameOf.keys()];
  const [{ data: zwiftRows }, wtrlByZwiftId] = await Promise.all([
    profileIds.length > 0
      ? admin.from("profiles").select("id, zwift_id, weight_kg").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    loadWtrlSummaries(supabase, scopeIds),
  ]);
  const zwiftIdOf = new Map<string, string>();
  const weightOf = new Map<string, number>();
  for (const row of (zwiftRows ?? []) as Array<{
    id: string;
    zwift_id: string | number | null;
    weight_kg: number | string | null;
  }>) {
    if (row.zwift_id != null && String(row.zwift_id).trim()) zwiftIdOf.set(row.id, String(row.zwift_id).trim());
    if (row.weight_kg != null && Number.isFinite(Number(row.weight_kg))) weightOf.set(row.id, Number(row.weight_kg));
  }
  for (const entry of roster.values()) {
    if (entry.zwift_id?.trim()) zwiftIdOf.set(entry.id, entry.zwift_id.trim());
  }
  const zwiftIds = [...new Set(zwiftIdOf.values())].filter((value) => /^\d+$/.test(value));
  const { data: metricRows } =
    zwiftIds.length > 0
      ? await admin.from("zwift_rider_metrics").select("zwift_id, power_wkg").in("zwift_id", zwiftIds.map(Number))
      : { data: [] };
  const powerOf = new Map(
    ((metricRows ?? []) as Array<{ zwift_id: number | string; power_wkg: PowerWkg | null }>).map((row) => [
      String(row.zwift_id),
      row.power_wkg,
    ]),
  );

  const category = categoryFromTeamName(team.name);
  const women = isWomenTeamName(team.name);
  const riderBase = [
    ...profileIds.map((profileId) => ({ key: profileId, name: nameOf.get(profileId) ?? "Onbekend", profileId })),
    ...[...roster.values()].map((entry) => ({ key: entry.id, name: entry.name, profileId: null })),
  ];
  const riders = riderBase.map((rider) => {
    const zwiftId = zwiftIdOf.get(rider.key);
    const power = zwiftId ? powerOf.get(zwiftId) : null;
    const wtrl = zwiftId ? wtrlByZwiftId.get(zwiftId) : null;
    return rankRider(
      {
        ...rider,
        power: power
          ? { s15: power.s15 ?? null, m1: power.m1 ?? null, m5: power.m5 ?? null, m20: power.m20 ?? null }
          : null,
        wtrl: wtrl ? { zftpWkg: wtrl.zftpWkg, zmapWkg: wtrl.zmapWkg } : null,
      },
      category,
      women,
    );
  });

  // Beschikbaarheid op de raceweek; een ja op de race van een subteam telt als
  // beschikbaar voor die week (zoals op de teampagina).
  const availabilityMap: Record<string, RankingAvailabilityEntry> = {};
  for (const row of availability) {
    const key = `${row.event_id}:${row.profile_id ?? row.roster_entry_id}`;
    availabilityMap[key] = { status: row.status, byCaptain: row.set_by != null };
  }
  const races = (raceRows ?? []) as Array<{
    id: string;
    parent_event_id: string;
    team_id: string | null;
    title: string;
    zwift_route_id: number | string | null;
    laps: number | null;
  }>;
  const raceToWeek = new Map(races.map((row) => [row.id, row.parent_event_id]));
  if (raceToWeek.size > 0) {
    const { data: raceYes } = await supabase
      .from("event_rsvps")
      .select("event_id, profile_id")
      .in("event_id", [...raceToWeek.keys()])
      .eq("status", "yes");
    for (const row of (raceYes ?? []) as Array<{ event_id: string; profile_id: string }>) {
      const weekId = raceToWeek.get(row.event_id);
      if (!weekId) continue;
      const key = `${weekId}:${row.profile_id}`;
      availabilityMap[key] = { status: "available", byCaptain: availabilityMap[key]?.byCaptain ?? false };
    }
  }

  // Racefit per raceweek: per parcours van de subteams de score van elke renner.
  // Zonder eigen route leent een subteam die van een race van een ander team in
  // dezelfde week en categorie (nog niet aan Zwift gekoppeld, 2026-11-16).
  const childIds = new Set(childTeams.map((row) => row.id));
  const childName = new Map(childTeams.map((row) => [row.id, row.name]));
  const otherTeamIds = [
    ...new Set(races.filter((race) => race.team_id && !childIds.has(race.team_id) && race.zwift_route_id != null).map((race) => race.team_id as string)),
  ];
  const { data: otherTeamRows } =
    otherTeamIds.length > 0
      ? await supabase.from("teams").select("id, name").in("id", otherTeamIds)
      : { data: [] };
  const otherTeamName = new Map(
    ((otherTeamRows ?? []) as Array<{ id: string; name: string }>).map((row) => [row.id, row.name]),
  );
  const racefitRiders = riders.map((rider) => ({
    key: rider.key,
    wkg: rider.power
      ? { s15: rider.power.s15 ?? null, m1: rider.power.m1, m5: rider.power.m5, m20: rider.power.m20 }
      : null,
    weightKg: weightOf.get(rider.key) ?? null,
  }));
  const racefit: Record<string, RankingRacefit> = {};
  for (const week of weeks) {
    const teamRaces: TeamRace[] = races
      .filter((race) => race.parent_event_id === week.id && race.team_id && childIds.has(race.team_id))
      .map((race) => ({
        teamId: race.team_id as string,
        // De titel telt alleen voor de tijdrit; ook die van de raceweek, want
        // een met de hand aangemaakte race (B3 in R2 W1) mist "Team Time Trial".
        title: `${race.title} ${week.title}`,
        zwiftRouteId: race.zwift_route_id == null ? null : Number(race.zwift_route_id),
        laps: race.laps,
        category: zrlCategoryFromTeamName(childName.get(race.team_id as string)),
      }));
    const borrow: BorrowRace[] = races
      .filter((race) => race.parent_event_id === week.id && race.team_id && otherTeamName.has(race.team_id))
      .map((race) => {
        const source = otherTeamName.get(race.team_id as string) as string;
        return {
          source,
          category: zrlCategoryFromTeamName(source),
          zwiftRouteId: race.zwift_route_id == null ? null : Number(race.zwift_route_id),
          laps: race.laps,
        };
      });
    const { courses, teamCourse, defaultCourse } = weekCourses(teamRaces, borrow);
    if (Object.keys(courses).length === 0) continue;
    racefit[week.id] = {
      courses: Object.fromEntries(
        Object.values(courses).map((course) => [
          course.key,
          {
            name: course.name,
            laps: course.laps,
            borrowedFrom: course.borrowedFrom,
            scores: racefitScores(racefitRiders, course),
          },
        ]),
      ),
      teamCourse,
      defaultCourse,
    };
  }

  const rankingLineups: RankingLineup[] = lineups.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    riderKey: (row.profile_id ?? row.roster_entry_id) as string,
  }));

  return (
    <div className="space-y-6">
      <BackLink href={`/teams/${team.id}`} label={team.name} />
      <ZrlRankingTable
        teams={childTeams}
        riders={riders}
        events={weeks.map((week) => ({ id: week.id, title: week.title, startAt: week.start_at }))}
        availability={availabilityMap}
        lineups={rankingLineups}
        racefit={racefit}
        teamId={team.id}
        canEditAvailability={canManageRoster || captainOf.size > 0}
        canAssign={canManageRoster || captainOf.size > 0}
        canAssignWeek={canManageRoster || captainOf.has(team.id)}
      />
    </div>
  );
}
