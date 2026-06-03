import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DEFAULT_TTT_SETTINGS, type TttPlanInput } from "@/lib/ttt/types";
import {
  TttPlanner,
  type InitialTttPlan,
  type PlannerEvent,
  type PlannerRider,
  type PlannerTeam,
  type SavedTttPlan,
} from "./_components/ttt-planner";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  parent_team_id: string | null;
};

type MemberRow = {
  team_id: string;
  profile_id: string;
  role: string;
  profiles?: {
    display_name?: string | null;
    zwift_id?: string | null;
    zrl_category?: string | null;
    ftp_watts?: number | null;
    weight_kg?: number | string | null;
  } | null;
};

type PowerRow = {
  profile_id: string;
  watts_5m: number | null;
  watts_20m: number | null;
  ftp_watts: number | null;
  ftp_wkg: number | string | null;
  rider_type: string | null;
};

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  team_id: string | null;
};

type LineupRow = {
  event_id: string;
  team_id: string;
  profile_id: string;
};

type PlanRow = {
  id: string;
  event_id: string | null;
  parent_team_id: string;
  team_id: string | null;
  name: string;
  route: string;
  target_speed: number | string | null;
  intensity: number | null;
  efficiency: number | null;
  allow_zero_pulls: boolean | null;
  min_pull_duration: number | null;
  max_pull_duration: number | null;
  duration_interval: number | null;
  optimization_strategy: string | null;
  status: string;
  api_response: unknown;
  updated_at: string;
};

type PlanRiderRow = {
  id: string;
  profile_id: string | null;
  is_manual: boolean | null;
  zwift_id: string | null;
  name: string;
  ftp_watts: number | null;
  weight_kg: number | string | null;
  height_cm: number | null;
  power_300_watts: number | null;
  pull_watts: number | null;
  pull_duration_seconds: number | null;
  display_order: number | null;
  role: string | null;
  notes: string | null;
};

function num(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function routePreset(value: string): TttPlanInput["settings"]["route"] {
  if (value === "next_wtrl") return "next_zrl";
  return value === "next" || value === "next_zrl" ? value : DEFAULT_TTT_SETTINGS.route;
}

function strategy(value: string | null): TttPlanInput["settings"]["optimizationStrategy"] {
  return value === "fixed" ? "fixed" : "variable";
}

function durationInterval(value: number | null): TttPlanInput["settings"]["durationInterval"] {
  return value === 10 ? 10 : 15;
}

function mapInitialPlan(plan: PlanRow, riders: PlanRiderRow[]): InitialTttPlan {
  return {
    id: plan.id,
    name: plan.name,
    eventId: plan.event_id,
    parentTeamId: plan.parent_team_id,
    teamId: plan.team_id,
    settings: {
      route: routePreset(plan.route),
      targetSpeed: num(plan.target_speed),
      intensity: plan.intensity ?? DEFAULT_TTT_SETTINGS.intensity,
      efficiency: plan.efficiency ?? DEFAULT_TTT_SETTINGS.efficiency,
      allowZeroPulls: Boolean(plan.allow_zero_pulls),
      minPullDuration: plan.min_pull_duration ?? DEFAULT_TTT_SETTINGS.minPullDuration,
      maxPullDuration: plan.max_pull_duration ?? DEFAULT_TTT_SETTINGS.maxPullDuration,
      durationInterval: durationInterval(plan.duration_interval),
      optimizationStrategy: strategy(plan.optimization_strategy),
    },
    riders: riders
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map((rider, index) => ({
        id: rider.id,
        profileId: rider.profile_id,
        isManual: Boolean(rider.is_manual),
        zwiftId: rider.zwift_id ?? "",
        name: rider.name,
        ftpWatts: rider.ftp_watts,
        weightKg: num(rider.weight_kg),
        heightCm: rider.height_cm,
        power300Watts: rider.power_300_watts,
        pullWatts: rider.pull_watts,
        pullDurationSeconds: rider.pull_duration_seconds,
        displayOrder: rider.display_order ?? index,
        role: rider.role,
        notes: rider.notes,
      })),
    status: plan.status,
    apiResponse: plan.api_response,
  };
}

export default async function TttPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    access,
    { data: teams },
    { data: members },
    { data: powerRows },
    { data: events },
    { data: lineups },
    { data: savedPlanRows },
  ] = await Promise.all([
    getCurrentUserAccess(supabase),
    supabase
      .from("teams")
      .select("id, name, type, division, parent_team_id")
      .order("type")
      .order("name"),
    admin
      .from("team_members")
      .select("team_id, profile_id, role, profiles(display_name, zwift_id, zrl_category, ftp_watts, weight_kg)"),
    supabase
      .from("rider_power_profiles")
      .select("profile_id, watts_5m, watts_20m, ftp_watts, ftp_wkg, rider_type"),
    supabase
      .from("events")
      .select("id, title, start_at, team_id")
      .order("start_at", { ascending: false })
      .limit(100),
    supabase
      .from("team_event_lineups")
      .select("event_id, team_id, profile_id")
      .limit(1000),
    supabase
      .from("ttt_plans")
      .select("id, event_id, parent_team_id, team_id, name, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  const teamRows = (teams ?? []) as TeamRow[];
  const teamById = new Map(teamRows.map((team) => [team.id, team]));
  const plannerTeams: PlannerTeam[] = teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    type: team.type,
    division: team.division,
    parentTeamId: team.parent_team_id,
  }));

  const eventRows = (events ?? []) as EventRow[];
  const eventById = new Map(eventRows.map((event) => [event.id, event]));
  const plannerEvents: PlannerEvent[] = eventRows
    .slice()
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    .map((event) => ({
      id: event.id,
      title: event.title,
      startAt: event.start_at,
      teamId: event.team_id,
    }));

  const lineupsByProfile = new Map<string, Set<string>>();
  for (const lineup of ((lineups ?? []) as LineupRow[])) {
    const current = lineupsByProfile.get(lineup.profile_id) ?? new Set<string>();
    current.add(lineup.event_id);
    lineupsByProfile.set(lineup.profile_id, current);
  }

  const powerByProfile = new Map(
    ((powerRows ?? []) as PowerRow[]).map((row) => [row.profile_id, row]),
  );
  const profileMap = new Map<
    string,
    {
      name: string;
      zwiftId: string | null;
      zrlCategory: string | null;
      ftpWatts: number | null;
      weightKg: number | null;
      teamIds: Set<string>;
    }
  >();

  for (const member of ((members ?? []) as unknown as MemberRow[])) {
    const existing = profileMap.get(member.profile_id);
    const profile = member.profiles;
    const next = existing ?? {
      name: profile?.display_name ?? "Onbekend",
      zwiftId: profile?.zwift_id ?? null,
      zrlCategory: profile?.zrl_category ?? null,
      ftpWatts: profile?.ftp_watts ?? null,
      weightKg: num(profile?.weight_kg),
      teamIds: new Set<string>(),
    };
    next.teamIds.add(member.team_id);
    profileMap.set(member.profile_id, next);
  }

  const riders: PlannerRider[] = Array.from(profileMap.entries())
    .map(([id, profile]) => {
      const power = powerByProfile.get(id);
      return {
        id,
        name: profile.name,
        zwiftId: profile.zwiftId,
        zrlCategory: profile.zrlCategory,
        ftpWatts: power?.ftp_watts ?? profile.ftpWatts,
        weightKg: profile.weightKg,
        teamIds: Array.from(profile.teamIds),
        lineupEventIds: Array.from(lineupsByProfile.get(id) ?? []),
        watts5m: power?.watts_5m ?? null,
        watts20m: power?.watts_20m ?? null,
        ftpWkg: num(power?.ftp_wkg),
        riderType: power?.rider_type ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  let manageableTeamIds: string[] = [];
  if (access.has("teams.manage_roster")) {
    manageableTeamIds = teamRows.map((team) => team.id);
  } else if (access.user) {
    manageableTeamIds = ((members ?? []) as unknown as MemberRow[])
      .filter(
        (member) =>
          member.profile_id === access.user?.id &&
          (member.role === "captain" || member.role === "co-captain"),
      )
      .flatMap((member) => {
        const team = teamById.get(member.team_id);
        return [member.team_id, team?.parent_team_id].filter(Boolean) as string[];
      });
    manageableTeamIds = Array.from(new Set(manageableTeamIds));
  }

  const savedPlans: SavedTttPlan[] = ((savedPlanRows ?? []) as Pick<
    PlanRow,
    "id" | "event_id" | "parent_team_id" | "team_id" | "name" | "status" | "updated_at"
  >[]).map((plan) => ({
    id: plan.id,
    name: plan.name,
    status: plan.status,
    updatedAt: plan.updated_at,
    eventTitle: plan.event_id ? eventById.get(plan.event_id)?.title ?? null : null,
    teamName:
      (plan.team_id ? teamById.get(plan.team_id)?.name : null) ??
      teamById.get(plan.parent_team_id)?.name ??
      null,
  }));

  let initialPlan: InitialTttPlan | null = null;
  if (planId) {
    const [{ data: plan }, { data: planRiders }] = await Promise.all([
      supabase
        .from("ttt_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle<PlanRow>(),
      supabase
        .from("ttt_plan_riders")
        .select("*")
        .eq("plan_id", planId)
        .order("display_order"),
    ]);
    if (plan) {
      initialPlan = mapInitialPlan(plan, (planRiders ?? []) as PlanRiderRow[]);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Club"
        title="TTT Planner"
        actions={
          <Link
            href="/teams"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Terug naar club
          </Link>
        }
      />

      {plannerTeams.length === 0 ? (
        <EmptyState>Er zijn nog geen teams om een TTT-plan voor te maken.</EmptyState>
      ) : (
        <TttPlanner
          key={initialPlan?.id ?? "new"}
          teams={plannerTeams}
          events={plannerEvents}
          riders={riders}
          savedPlans={savedPlans}
          manageableTeamIds={manageableTeamIds}
          initialPlan={initialPlan}
        />
      )}
    </div>
  );
}
