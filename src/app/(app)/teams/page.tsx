import Link from "next/link";
import { Activity, ArrowRight, LinkIcon, Plus, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { SyncResultsButton } from "./_components/sync-results-button";
import { SyncGraveyardButton } from "./_components/sync-graveyard-button";
import { SyncPowerButton } from "./_components/sync-power-button";
import {
  TeamRosterTable,
  type TeamOption,
  type TeamRosterRow,
} from "./_components/team-roster-table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProfileRow = {
  id: string;
  display_name: string | null;
  region: string | null;
  zrl_category: string | null;
  ftp_watts: number | null;
  weight_kg: number | string | null;
};

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  parent_team_id: string | null;
};

type TeamMemberRow = {
  profile_id: string;
  role: string;
  teams: TeamRow | TeamRow[] | null;
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

type ZrlResultRow = {
  profile_id: string | null;
  position: number | null;
  points: number | string | null;
};

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL teams",
  ladder: "Ladder teams",
  social: "Social teams",
  outdoor: "Outdoor teams",
};

const TEAM_TYPE_ORDER = ["zrl", "ladder", "social", "outdoor"];

function num(value: number | string | null | undefined) {
  const n = Number(value ?? NaN);
  return Number.isFinite(n) ? n : null;
}

function firstTeam(value: TeamRow | TeamRow[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
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

function TeamToolLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-7 items-center gap-1 rounded-md border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
    >
      {label}
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

export default async function TeamsPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [
    access,
    { data: profiles },
    { data: teams },
    { data: teamMembers },
    { data: powerRows },
    { data: zrlResults },
  ] = await Promise.all([
    getCurrentUserAccess(supabase),
    supabase
      .from("profiles")
      .select("id, display_name, region, zrl_category, ftp_watts, weight_kg")
      .eq("is_approved", true)
      .order("display_name"),
    supabase
      .from("teams")
      .select("id, name, type, division, parent_team_id")
      .order("type")
      .order("name"),
    admin
      .from("team_members")
      .select("profile_id, role, teams(id, name, type, division, parent_team_id)"),
    supabase
      .from("rider_power_profiles")
      .select(
        "profile_id, rider_type, sync_status, synced_at, ftp_watts, ftp_wkg, watts_15s, watts_30s, watts_1m, watts_2m, watts_5m, watts_10m, watts_20m, wkg_15s, wkg_30s, wkg_1m, wkg_2m, wkg_5m, wkg_10m, wkg_20m",
      ),
    supabase
      .from("zrl_rider_results")
      .select("profile_id, position, points")
      .not("profile_id", "is", null)
      .order("round_at", { ascending: false, nullsFirst: false })
      .limit(1000),
  ]);

  const teamOptions: TeamOption[] = ((teams ?? []) as TeamRow[]).map((team) => ({
    id: team.id,
    name: team.name,
    type: team.type,
    parentTeamId: team.parent_team_id,
  }));
  const parentTeamOptions = teamOptions.filter((team) => !team.parentTeamId);
  const parentTeamsByType = new Map<string, TeamOption[]>();
  for (const team of parentTeamOptions) {
    parentTeamsByType.set(team.type, [
      ...(parentTeamsByType.get(team.type) ?? []),
      team,
    ]);
  }
  const orderedTeamTypes = [
    ...TEAM_TYPE_ORDER.filter((type) => parentTeamsByType.has(type)),
    ...Array.from(parentTeamsByType.keys()).filter(
      (type) => !TEAM_TYPE_ORDER.includes(type),
    ),
  ];

  const membershipsByProfile = new Map<string, TeamRosterRow["teams"]>();
  for (const member of ((teamMembers ?? []) as unknown as TeamMemberRow[])) {
    const team = firstTeam(member.teams);
    if (!team) continue;
    membershipsByProfile.set(member.profile_id, [
      ...(membershipsByProfile.get(member.profile_id) ?? []),
      {
        id: team.id,
        name: team.name,
        role: member.role,
        parentTeamId: team.parent_team_id,
      },
    ]);
  }

  const powerByProfile = new Map(
    ((powerRows ?? []) as PowerRow[]).map((row) => [row.profile_id, row]),
  );

  const zrlByProfile = new Map<
    string,
    { starts: number; bestPosition: number | null; points: number[] }
  >();
  for (const result of ((zrlResults ?? []) as ZrlResultRow[])) {
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

  let profileRows = (profiles ?? []) as ProfileRow[];
  if (access.user && !profileRows.some((profile) => profile.id === access.user?.id)) {
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, display_name, region, zrl_category, ftp_watts, weight_kg")
      .eq("id", access.user.id)
      .maybeSingle();
    if (myProfile) profileRows = [myProfile as ProfileRow, ...profileRows];
  }

  const rows: TeamRosterRow[] = profileRows.map((profile) => {
    const power = powerByProfile.get(profile.id);
    const zrl = zrlByProfile.get(profile.id);
    return {
      id: profile.id,
      name: profile.display_name ?? "Onbekend",
      region: profile.region,
      zrlCategory: profile.zrl_category,
      ftpWatts: profile.ftp_watts,
      weightKg: num(profile.weight_kg),
      teams: membershipsByProfile.get(profile.id) ?? [],
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
      zrlAvgPoints:
        zrl && zrl.points.length > 0
          ? zrl.points.reduce((sum, point) => sum + point, 0) / zrl.points.length
          : null,
    };
  });

  const canCreateTeams = access.has("teams.create");
  const canSyncTeams = access.has("teams.sync_sources");
  const powerSynced = rows.filter((row) =>
    ["ok", "partial"].includes(row.power?.syncStatus ?? ""),
  ).length;
  const riderTypes = new Set(
    rows
      .map((row) => row.power?.riderType)
      .filter((type): type is string => Boolean(type) && type !== "unknown"),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Een centraal race-rooster met teamlidmaatschappen, Intervals-waarden, W/kg, rennerprofielen en ZRL-historie."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <SyncPowerButton scope="self" />
            {canSyncTeams && (
              <>
                <SyncPowerButton scope="all" />
                <SyncResultsButton />
                <SyncGraveyardButton />
              </>
            )}
            {canCreateTeams && (
              <Link href="/teams/nieuw">
                <Button>
                  <Plus data-icon="inline-start" />
                  Nieuw team
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Users className="size-4" />} label="Renners" value={rows.length} />
        <MetricCard icon={<LinkIcon className="size-4" />} label="Hoofdteams" value={parentTeamOptions.length} />
        <MetricCard icon={<Activity className="size-4" />} label="Powerprofielen" value={powerSynced} />
        <MetricCard icon={<Trophy className="size-4" />} label="Profieltypes" value={riderTypes.size} />
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Teamoverzicht</h2>
            <p className="text-sm text-muted-foreground">
              Open een team om leden toe te voegen, captainrollen te zetten en lineups te beheren.
            </p>
          </div>
          {canCreateTeams && (
            <Link href="/teams/nieuw">
              <Button size="sm" variant="outline">
                <Plus data-icon="inline-start" />
                Nieuw team
              </Button>
            </Link>
          )}
        </header>
        <div className="space-y-5">
          {orderedTeamTypes.map((type) => {
            const typeTeams = parentTeamsByType.get(type) ?? [];
            return (
              <div key={type} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {TYPE_LABELS[type] ?? `${type.toUpperCase()} teams`}
                  </h3>
                  {type === "zrl" && (
                    <TeamToolLink href="/teams/ttt-planner" label="TTT Planner" />
                  )}
                  {type === "ladder" && (
                    <TeamToolLink href="/teams/club-ladder" label="Club Ladder" />
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {typeTeams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/teams/${team.id}`}
                      className="rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                      {team.name}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <TeamRosterTable rows={rows} teams={teamOptions} />
    </div>
  );
}
