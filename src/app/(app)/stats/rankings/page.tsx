import { Bike, Clock, type LucideIcon, Mountain, Route } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StravaAttribution } from "@/components/strava-brand";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { AchievementBadge } from "@/components/achievement-badge";
import { MemberLink } from "@/components/member-link";
import { BADGES, formatBadgeValue, loadRides, weeklyScores } from "@/lib/achievements/awards";
import { briljantGrowth } from "@/lib/briljant/compare";
import { loadGrowthSnapshots } from "@/lib/briljant/server";
import {
  clubmens,
  formatHours,
  formatKm,
  formatMeters,
  groeibriljant,
  LONG_WEEKS,
  metronoom,
  weekRankings,
  type ClubEventRsvp,
  type LiveRide,
  type Ranking,
} from "@/lib/rankings/rankings";
import {
  currentAchievementWeek,
  previousAchievementWeek,
} from "@/lib/strava/client";
import { FinalizeAwardsButton } from "./_components/finalize-awards-button";
import { RankingCard } from "./_components/ranking-card";
import { StravaSyncButton } from "@/components/strava-sync-button";
import { getRequestAccess, getRequestUser } from "@/lib/auth/request";
import { StatsTabs } from "../_components/stats-tabs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "ZWB Rankings" };

type ProfileRef = {
  display_name: string | null;
};

type AwardRow = {
  id: string;
  profile_id: string;
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

function addWeeks(week: string, weeks: number) {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
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

/** Aanmeldingen met "ja" voor de events die in het venster begonnen. */
async function loadClubEventRsvps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string,
): Promise<ClubEventRsvp[]> {
  const { data: events } = await supabase
    .from("events")
    .select("id, start_at")
    .gte("start_at", `${from}T00:00:00.000Z`)
    .lt("start_at", `${to}T00:00:00.000Z`);
  const startById = new Map(
    ((events ?? []) as Array<{ id: string; start_at: string }>).map((event) => [event.id, event.start_at]),
  );
  if (startById.size === 0) return [];
  const { data: rsvps } = await supabase
    .from("event_rsvps")
    .select("event_id, profile_id")
    .eq("status", "yes")
    .in("event_id", [...startById.keys()]);
  return ((rsvps ?? []) as Array<{ event_id: string; profile_id: string }>).flatMap((rsvp) => {
    const start = startById.get(rsvp.event_id);
    return start ? [{ ...rsvp, start_at: start }] : [];
  });
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string | string[] }>;
}) {
  const supabase = await createClient();

  const showPrevious = (await searchParams).week === "vorige";
  const week = showPrevious ? previousAchievementWeek() : currentAchievementWeek();
  const weekLabel = showPrevious ? "vorige week" : "deze week";
  const nextWeek = addWeeks(week, 1);
  const longFrom = addWeeks(week, 1 - LONG_WEEKS);

  const [user, access] = await Promise.all([getRequestUser(), getRequestAccess()]);
  const [rides, rsvps, { data: liveRows }, snapshots, { data: awardRows }] =
    await Promise.all([
      loadRides(supabase, longFrom, nextWeek),
      loadClubEventRsvps(supabase, longFrom, nextWeek),
      supabase
        .from("live_sessions")
        .select("profile_id, started_at, last_seen_at, ended_at")
        .gte("started_at", `${longFrom}T00:00:00.000Z`)
        .lt("started_at", `${nextWeek}T00:00:00.000Z`),
      user ? loadGrowthSnapshots(supabase, user.id, week) : Promise.resolve([]),
      supabase
        .from("achievement_awards")
        .select(
          "id, profile_id, period_start, period_end, value, metadata, profiles(display_name), achievement_badges(title, icon, color)",
        )
        .in("badge_id", BADGES.map((badge) => badge.id))
        .order("period_start", { ascending: false })
        .limit(12),
    ]);

  const rankings: Ranking[] = [
    ...weekRankings(rides, week),
    metronoom(rides),
    clubmens(rsvps, (liveRows ?? []) as LiveRide[]),
    groeibriljant(briljantGrowth(snapshots, week)),
  ];

  const ids = [...new Set(rankings.flatMap((ranking) => ranking.entries.map((entry) => entry.profileId)))];
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, display_name").in("id", ids)
    : { data: [] };
  const names = new Map(
    ((profiles ?? []) as Array<{ id: string; display_name: string | null }>).map((row) => [
      row.id,
      row.display_name?.trim() || "ZWB'er",
    ]),
  );

  const scores = weeklyScores(rides).filter((score) => score.week === week);
  const total = (key: "distanceM" | "elevationM" | "movingSeconds" | "activities") =>
    scores.reduce((sum, score) => sum + score[key], 0);
  const awards = (awardRows ?? []) as unknown as AwardRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        className="tg-repeats-nav"
        eyebrow="ZWB Stats"
        title="ZWB Rankings"
        actions={
        // Ritten binnenhalen (koppelen, syncen, importeren) staat op het
        // dashboard, bij de ritten zelf. Hier gaat het alleen nog over badges.
        <div className="flex flex-col gap-2 sm:items-end">
          <StravaSyncButton variant="badges" />
          {access.has("achievements.finalize") && <FinalizeAwardsButton />}
        </div>
        }
      />

      <StatsTabs active="/stats/rankings" />

      <nav className="flex flex-wrap gap-2">
        <Link
          href="/stats/rankings"
          aria-current={showPrevious ? undefined : "page"}
          className={`rounded-full border px-3 py-1 text-xs ${
            showPrevious ? "hover:bg-secondary" : "bg-foreground text-background"
          }`}
        >
          Deze week
        </Link>
        <Link
          href="/stats/rankings?week=vorige"
          aria-current={showPrevious ? "page" : undefined}
          className={`rounded-full border px-3 py-1 text-xs ${
            showPrevious ? "bg-foreground text-background" : "hover:bg-secondary"
          }`}
        >
          Vorige week
        </Link>
      </nav>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="ZWB kilometers"
          value={formatKm(total("distanceM"))}
          detail={`${scores.length} actieve renners ${weekLabel}`}
          icon={Route}
        />
        <MetricCard
          title="Hoogtemeters"
          value={formatMeters(total("elevationM"))}
          detail={`Week vanaf ${new Date(week).toLocaleDateString("nl-NL", {
            dateStyle: "medium",
            timeZone: "Europe/Amsterdam",
          })}`}
          icon={Mountain}
        />
        <MetricCard
          title="Uren"
          value={formatHours(total("movingSeconds"))}
          detail={`Op de fiets ${weekLabel}`}
          icon={Clock}
        />
        <MetricCard
          title="Ritten"
          value={String(total("activities"))}
          detail={`Alle fietsritten ${weekLabel}`}
          icon={Bike}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rankings.map((ranking) => (
          <RankingCard
            key={ranking.id}
            ranking={{ id: ranking.id, title: ranking.title, icon: ranking.icon, span: ranking.span }}
            entries={ranking.entries.map((entry) => ({
              ...entry,
              name: names.get(entry.profileId) ?? "ZWB'er",
            }))}
            viewerId={user?.id ?? null}
          />
        ))}
      </section>

      <section className="rounded-md border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Hall of fame</h2>
        </div>
        {awards.length === 0 ? (
          <EmptyState>Geen afgeronde weekbadges.</EmptyState>
        ) : (
          <ul className="divide-y">
            {awards.map((award) => {
              const badge = awardBadge(award);
              return (
                <li
                  key={award.id}
                  className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {badge && (
                      <AchievementBadge
                        title={badge.title}
                        icon={badge.icon}
                        color={badge.color}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {badge?.title ?? "Weekbadge"}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        <MemberLink id={award.profile_id}>
                          {awardProfile(award)?.display_name ?? "ZWB'er"}
                        </MemberLink>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Week van{" "}
                        {new Date(award.period_start).toLocaleDateString("nl-NL", {
                          dateStyle: "medium",
                          timeZone: "Europe/Amsterdam",
                        })}
                      </p>
                    </div>
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

      <StravaAttribution />
    </div>
  );
}
