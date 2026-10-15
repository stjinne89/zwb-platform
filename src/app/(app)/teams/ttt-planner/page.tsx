import { BackLink, PageHeader, EmptyState, HelpLink } from "@/components/app-ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import {
  TttImport,
  type ImportEvent,
  type ImportRider,
  type ImportStart,
  type ImportTeam,
  type SavedTttPlan,
} from "./_components/ttt-import";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamRow = {
  id: string;
  name: string;
  parent_team_id: string | null;
};

type MemberRow = {
  team_id: string;
  profile_id: string;
  role: string;
  profiles?: { display_name?: string | null; zwift_id?: string | null } | null;
};

type EventRow = {
  id: string;
  title: string;
  type: string;
  start_at: string;
  team_id: string | null;
  parent_event_id: string | null;
};

type LineupRow = {
  event_id: string;
  team_id: string;
  profile_id: string | null;
  roster_entry_id: string | null;
};

type RosterEntryRow = {
  id: string;
  name: string;
  zwift_id: string | null;
  team_id: string;
};

type PlanRow = {
  id: string;
  event_id: string | null;
  parent_team_id: string;
  team_id: string | null;
  name: string;
  published_at: string | null;
  updated_at: string;
};

/** Een renner zonder account heeft geen profiel; zijn rosterregel is dan de sleutel. */
function rosterRiderId(rosterEntryId: string) {
  return `roster:${rosterEntryId}`;
}

function lineupRiderId(row: Pick<LineupRow, "profile_id" | "roster_entry_id">) {
  if (row.profile_id) return row.profile_id;
  return row.roster_entry_id ? rosterRiderId(row.roster_entry_id) : null;
}

// Events van twee dagen geleden en later; een oudere komt alleen mee als het
// plan erbij hoort.
const PAST_EVENTS_MS = 2 * 24 * 60 * 60 * 1000;

function recentEvent(startAt: string) {
  return new Date(startAt).getTime() >= Date.now() - PAST_EVENTS_MS;
}

export default async function TttPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; event?: string; team?: string }>;
}) {
  const { plan: planParam, event: seedEventId, team: seedTeamId } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    access,
    { data: teams },
    { data: members },
    { data: events },
    { data: lineups },
    { data: savedPlanRows },
    { data: rosterEntries },
  ] = await Promise.all([
    getRequestAccess(),
    supabase.from("teams").select("id, name, parent_team_id").order("name"),
    admin.from("team_members").select("team_id, profile_id, role, profiles(display_name, zwift_id)"),
    supabase
      .from("events")
      .select("id, title, type, start_at, team_id, parent_event_id")
      .order("start_at", { ascending: false })
      .limit(100),
    supabase
      .from("team_event_lineups")
      .select("event_id, team_id, profile_id, roster_entry_id")
      .limit(1000),
    supabase
      .from("ttt_plans")
      .select("id, event_id, parent_team_id, team_id, name, published_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("roster_entries")
      .select("id, name, zwift_id, team_id")
      .is("claimed_by", null)
      .not("team_id", "is", null),
  ]);

  const teamRows = (teams ?? []) as TeamRow[];
  const teamById = new Map(teamRows.map((team) => [team.id, team]));
  const memberRows = (members ?? []) as unknown as MemberRow[];

  let manageable = new Set<string>();
  if (access.has("teams.manage_roster")) {
    manageable = new Set(teamRows.map((team) => team.id));
  } else if (access.user) {
    for (const member of memberRows) {
      if (member.profile_id !== access.user.id) continue;
      if (member.role !== "captain" && member.role !== "co-captain") continue;
      manageable.add(member.team_id);
      // Een captain van het hoofdteam beheert ook de raceteams eronder.
      for (const team of teamRows) {
        if (team.parent_team_id === member.team_id) manageable.add(team.id);
      }
    }
  }

  const importTeams: ImportTeam[] = teamRows
    .filter((team) => manageable.has(team.id))
    .map((team) => {
      const parent = team.parent_team_id ? teamById.get(team.parent_team_id) : undefined;
      return { id: team.id, label: parent ? `${parent.name} - ${team.name}` : team.name };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "nl"));

  // Het plan dat opnieuw wordt geïmporteerd, of het plan van een TTT-event.
  let start: ImportStart | null = null;
  const eventRows = (events ?? []) as EventRow[];
  const fetchEvent = async (id: string) => {
    const known = eventRows.find((event) => event.id === id);
    if (known) return known;
    const { data } = await supabase
      .from("events")
      .select("id, title, type, start_at, team_id, parent_event_id")
      .eq("id", id)
      .maybeSingle<EventRow>();
    if (data) eventRows.push(data);
    return data;
  };

  let planId = planParam ?? null;
  const seedTeam = seedTeamId ? teamById.get(seedTeamId) : undefined;
  if (!planId && seedEventId && seedTeam) {
    const seedEvent = await fetchEvent(seedEventId);
    if (seedEvent) {
      const eventIds = [seedEvent.id, seedEvent.parent_event_id].filter(Boolean) as string[];
      const { data: existing } = await supabase
        .from("ttt_plans")
        .select("id")
        .in("event_id", eventIds)
        .or(`team_id.eq.${seedTeam.id},parent_team_id.eq.${seedTeam.id}`)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string }>();
      if (existing) planId = existing.id;
      else start = { planId: null, name: seedEvent.title, eventId: seedEvent.id, teamId: seedTeam.id };
    }
  }
  if (planId) {
    const { data: plan } = await supabase
      .from("ttt_plans")
      .select("id, name, event_id, parent_team_id, team_id")
      .eq("id", planId)
      .maybeSingle<{ id: string; name: string; event_id: string | null; parent_team_id: string; team_id: string | null }>();
    if (plan) {
      if (plan.event_id) await fetchEvent(plan.event_id);
      start = {
        planId: plan.id,
        name: plan.name,
        eventId: plan.event_id,
        teamId: plan.team_id ?? plan.parent_team_id,
      };
    }
  }

  const eventById = new Map(eventRows.map((event) => [event.id, event]));
  const importEvents: ImportEvent[] = eventRows
    .filter((event) => recentEvent(event.start_at) || event.id === start?.eventId)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.start_at,
      teamId: event.team_id,
      parentEventId: event.parent_event_id,
    }));

  const lineupKeys = new Map<string, string[]>();
  for (const lineup of (lineups ?? []) as LineupRow[]) {
    const riderId = lineupRiderId(lineup);
    if (!riderId) continue;
    lineupKeys.set(riderId, [...(lineupKeys.get(riderId) ?? []), `${lineup.event_id}:${lineup.team_id}`]);
  }

  const memberRiders = new Map<string, ImportRider>();
  for (const member of memberRows) {
    const rider = memberRiders.get(member.profile_id) ?? {
      id: member.profile_id,
      name: member.profiles?.display_name ?? "Onbekend",
      zwiftId: member.profiles?.zwift_id?.trim() || null,
      teamIds: [],
      lineupKeys: lineupKeys.get(member.profile_id) ?? [],
    };
    rider.teamIds.push(member.team_id);
    memberRiders.set(member.profile_id, rider);
  }
  const memberZwiftIds = new Set(
    Array.from(memberRiders.values()).map((rider) => rider.zwiftId).filter(Boolean),
  );
  // Renners zonder account (migr. 0182), tenzij hun Zwift-ID al bij een lid staat.
  const rosterRiders: ImportRider[] = ((rosterEntries ?? []) as RosterEntryRow[])
    .filter((entry) => !entry.zwift_id || !memberZwiftIds.has(entry.zwift_id.trim()))
    .map((entry) => ({
      id: rosterRiderId(entry.id),
      name: entry.name,
      zwiftId: entry.zwift_id?.trim() || null,
      teamIds: [entry.team_id],
      lineupKeys: lineupKeys.get(rosterRiderId(entry.id)) ?? [],
    }));
  const riders = [...memberRiders.values(), ...rosterRiders]
    .filter((rider) => rider.teamIds.some((id) => manageable.has(id)))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  const savedPlans: SavedTttPlan[] = ((savedPlanRows ?? []) as PlanRow[]).map((plan) => ({
    id: plan.id,
    name: plan.name,
    published: Boolean(plan.published_at),
    eventTitle: plan.event_id ? eventById.get(plan.event_id)?.title ?? null : null,
    teamName:
      (plan.team_id ? teamById.get(plan.team_id)?.name : null) ??
      teamById.get(plan.parent_team_id)?.name ??
      null,
  }));

  return (
    <div className="space-y-6">
      <BackLink href="/teams" label="Teams" />
      <PageHeader eyebrow="Club" title="TTT Planner" actions={<HelpLink href="/hulp#ttt-beheer" />} />

      {teamRows.length === 0 ? (
        <EmptyState>Er zijn nog geen teams om een TTT-plan voor te maken.</EmptyState>
      ) : (
        <TttImport
          key={start?.planId ?? (start ? `seed-${start.eventId}-${start.teamId}` : "new")}
          teams={importTeams}
          events={importEvents}
          riders={riders}
          savedPlans={savedPlans}
          start={start}
        />
      )}
    </div>
  );
}
