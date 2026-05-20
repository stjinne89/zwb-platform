import Link from "next/link";
import {
  ArrowUpRight,
  Bike,
  Crown,
  HeartHandshake,
  type LucideIcon,
  Medal,
  Mountain,
  RefreshCw,
  Route,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AchievementBadge } from "@/components/achievement-badge";
import { formatBadgeValue } from "@/lib/achievements/awards";
import { currentAchievementWeek } from "@/lib/strava/client";
import { FinalizeAwardsButton } from "./_components/finalize-awards-button";
import { StravaSyncButton } from "./_components/strava-sync-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRef = {
  display_name: string | null;
};

type ActivityRow = {
  id: number;
  profile_id: string;
  name: string;
  sport_type: string | null;
  start_date: string;
  distance_m: number | string;
  total_elevation_gain_m: number | string;
  kudos_count: number;
  moving_time_seconds: number;
  trainer: boolean;
  profiles: ProfileRef | ProfileRef[] | null;
};

type AthleteScore = {
  profileId: string;
  name: string;
  activities: number;
  distanceM: number;
  elevationM: number;
  kudos: number;
  movingSeconds: number;
};

type AwardRow = {
  id: string;
  period_start: string;
  period_end: string;
  value: number | string;
  metadata: { unit?: string } | null;
  profiles: ProfileRef | ProfileRef[] | null;
  achievement_badges:
    | {
        title: string;
        icon: string | null;
        color: string | null;
      }
    | {
        title: string;
        icon: string | null;
        color: string | null;
      }[]
    | null;
};

const metricLabel = {
  distance: "Kilometervreter",
  elevation: "Klimmer van de week",
  kudos: "Kudo-magneet",
  consistency: "Meest actief",
};

function profileName(row: ActivityRow) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return profile?.display_name ?? "ZWB'er";
}

function toNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function aggregate(rows: ActivityRow[]) {
  const scores = new Map<string, AthleteScore>();

  for (const row of rows) {
    const current =
      scores.get(row.profile_id) ??
      {
        profileId: row.profile_id,
        name: profileName(row),
        activities: 0,
        distanceM: 0,
        elevationM: 0,
        kudos: 0,
        movingSeconds: 0,
      };

    current.activities += 1;
    current.distanceM += toNumber(row.distance_m);
    current.elevationM += toNumber(row.total_elevation_gain_m);
    current.kudos += row.kudos_count ?? 0;
    current.movingSeconds += row.moving_time_seconds ?? 0;
    scores.set(row.profile_id, current);
  }

  return Array.from(scores.values());
}

function ranking(scores: AthleteScore[], key: keyof AthleteScore) {
  return [...scores]
    .filter((score) => Number(score[key]) > 0)
    .sort((a, b) => Number(b[key]) - Number(a[key]))
    .slice(0, 5);
}

function formatKm(meters: number) {
  return `${(meters / 1000).toLocaleString("nl-NL", {
    maximumFractionDigits: 1,
  })} km`;
}

function formatMeters(meters: number) {
  return `${Math.round(meters).toLocaleString("nl-NL")} m`;
}

function formatHours(seconds: number) {
  const hours = seconds / 3600;
  return `${hours.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
}

function awardBadge(row: AwardRow) {
  return Array.isArray(row.achievement_badges)
    ? row.achievement_badges[0]
    : row.achievement_badges;
}

function awardProfile(row: AwardRow) {
  return Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <Icon className="size-5 text-primary" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Leaderboard({
  title,
  description,
  rows,
  value,
  icon: Icon,
}: {
  title: string;
  description: string;
  rows: AthleteScore[];
  value: (score: AthleteScore) => string;
  icon: LucideIcon;
}) {
  return (
    <section className="rounded-md border bg-card">
      <div className="flex items-start justify-between gap-3 border-b p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Icon className="size-4 text-primary" />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          Nog geen meetbare activiteiten deze week.
        </p>
      ) : (
        <ol className="divide-y">
          {rows.map((row, index) => (
            <li key={row.profileId} className="grid grid-cols-[auto_1fr_auto] gap-3 p-4">
              <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-sm font-semibold text-secondary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.activities} ritten · {formatHours(row.movingSeconds)}
                </p>
              </div>
              <span className="font-semibold tabular-nums">{value(row)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function AchievementsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const week = currentAchievementWeek();

  const [{ data: connection }, { data: activityRows }, { data: awardRows }, { data: me }] =
    await Promise.all([
      supabase
        .from("strava_connections")
        .select("athlete_name, scope, updated_at")
        .eq("profile_id", user?.id)
        .maybeSingle(),
      supabase
        .from("strava_activities")
        .select(
          "id, profile_id, name, sport_type, start_date, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds, trainer, profiles(display_name)",
        )
        .eq("achievement_week", week)
        .order("distance_m", { ascending: false }),
      supabase
        .from("achievement_awards")
        .select(
          "id, period_start, period_end, value, metadata, profiles(display_name), achievement_badges(title, icon, color)",
        )
        .order("period_start", { ascending: false })
        .limit(12),
      supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user?.id)
        .maybeSingle(),
    ]);

  const rows = (activityRows ?? []) as unknown as ActivityRow[];
  const scores = aggregate(rows);
  const distanceRows = ranking(scores, "distanceM");
  const elevationRows = ranking(scores, "elevationM");
  const kudosRows = ranking(scores, "kudos");
  const consistencyRows = ranking(scores, "activities");
  const totalDistance = scores.reduce((sum, score) => sum + score.distanceM, 0);
  const totalElevation = scores.reduce((sum, score) => sum + score.elevationM, 0);
  const totalActivities = rows.length;
  const activeAthletes = scores.length;
  const stravaError = params.strava_error;
  const connected = params.strava_connected;
  const awards = (awardRows ?? []) as unknown as AwardRow[];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Achievements</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Wekelijkse ZWB-badges op basis van gesyncte Strava-ritten.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {connection ? (
            <StravaSyncButton />
          ) : (
            <Link
              href="/api/strava/connect"
              className={cn(buttonVariants({ variant: "default" }))}
            >
              <ArrowUpRight data-icon="inline-start" />
              Strava koppelen
            </Link>
          )}
          {connection && (
            <p className="text-xs text-muted-foreground">
              Gekoppeld als {connection.athlete_name ?? "Strava-atleet"}.
            </p>
          )}
          {me?.is_admin && <FinalizeAwardsButton />}
        </div>
      </header>

      {stravaError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {Array.isArray(stravaError) ? stravaError[0] : stravaError}
        </p>
      )}
      {connected && (
        <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
          Strava is gekoppeld. Sync je activiteiten om mee te doen in de badges.
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="ZWB kilometers"
          value={formatKm(totalDistance)}
          detail={`${activeAthletes} actieve Strava-atleten deze week`}
          icon={Route}
        />
        <MetricCard
          title="Hoogtemeters"
          value={formatMeters(totalElevation)}
          detail={`Week vanaf ${new Date(week).toLocaleDateString("nl-NL", {
            dateStyle: "medium",
          })}`}
          icon={Mountain}
        />
        <MetricCard
          title="Activiteiten"
          value={String(totalActivities)}
          detail="Alle gesyncte fietsritten deze week"
          icon={Bike}
        />
        <MetricCard
          title="Badges"
          value="4"
          detail="3 meetbaar, 1 wacht op kudo-brondata"
          icon={Medal}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Leaderboard
          title={metricLabel.elevation}
          description="Meeste hoogtemeters in de huidige week."
          rows={elevationRows}
          value={(score) => formatMeters(score.elevationM)}
          icon={Mountain}
        />
        <Leaderboard
          title={metricLabel.distance}
          description="Meeste kilometers in de huidige week."
          rows={distanceRows}
          value={(score) => formatKm(score.distanceM)}
          icon={Route}
        />
        <Leaderboard
          title={metricLabel.kudos}
          description="Meeste ontvangen kudos op gesyncte ritten."
          rows={kudosRows}
          value={(score) => `${score.kudos} kudos`}
          icon={HeartHandshake}
        />
        <Leaderboard
          title={metricLabel.consistency}
          description="Meeste gesyncte fietsritten deze week."
          rows={consistencyRows}
          value={(score) => `${score.activities} ritten`}
          icon={RefreshCw}
        />
      </section>

      <section className="rounded-md border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Hall of fame</h2>
          <p className="text-sm text-muted-foreground">
            Vastgelegde weekbadges blijven zichtbaar in ledenlijst en profiel.
          </p>
        </div>
        {awards.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Nog geen afgeronde weekbadges vastgelegd.
          </p>
        ) : (
          <ul className="divide-y">
            {awards.map((award) => {
              const badge = awardBadge(award);
              return (
                <li
                  key={award.id}
                  className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    {badge && (
                      <AchievementBadge
                        title={badge.title}
                        icon={badge.icon}
                        color={badge.color}
                      />
                    )}
                    <p className="mt-2 truncate text-sm">
                      {awardProfile(award)?.display_name ?? "ZWB'er"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Week van{" "}
                      {new Date(award.period_start).toLocaleDateString("nl-NL", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatBadgeValue(award.value, award.metadata?.unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-md border bg-card p-4">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Kudomaster</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Strava geeft wel kudoers per activiteit terug, maar geen complete lijst
              van kudos die een atleet zelf aan anderen heeft gegeven. Deze badge staat
              klaar als we daar later een betrouwbare bron of club-feed workflow voor
              toevoegen.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
