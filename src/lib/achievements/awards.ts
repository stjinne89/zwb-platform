import { currentAchievementWeek } from "@/lib/strava/client";
import { sendNotificationToMembers } from "@/lib/push/send";

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  metric: "distanceM" | "elevationM" | "kudos" | "activities";
  unit: "m" | "km" | "kudos" | "ritten";
  icon: "mountain" | "route" | "heart" | "refresh";
  color: "gold" | "petrol" | "sage" | "steel";
};

type ActivityRow = {
  profile_id: string;
  achievement_week: string;
  distance_m: number | string;
  total_elevation_gain_m: number | string;
  kudos_count: number;
  moving_time_seconds: number;
};

type Score = {
  profileId: string;
  week: string;
  activities: number;
  distanceM: number;
  elevationM: number;
  kudos: number;
  movingSeconds: number;
};

export const BADGES: BadgeDefinition[] = [
  {
    id: "climber_week",
    title: "Klimmer van de week",
    description: "Meeste hoogtemeters in een ZWB-week.",
    metric: "elevationM",
    unit: "m",
    icon: "mountain",
    color: "gold",
  },
  {
    id: "distance_week",
    title: "Kilometervreter",
    description: "Meeste kilometers in een ZWB-week.",
    metric: "distanceM",
    unit: "km",
    icon: "route",
    color: "petrol",
  },
  {
    id: "kudos_received_week",
    title: "Kudo-magneet",
    description: "Meeste ontvangen kudos op gesyncte Strava-ritten.",
    metric: "kudos",
    unit: "kudos",
    icon: "heart",
    color: "sage",
  },
  {
    id: "consistency_week",
    title: "Meest actief",
    description: "Meeste gesyncte fietsritten in een week.",
    metric: "activities",
    unit: "ritten",
    icon: "refresh",
    color: "steel",
  },
];

function toNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function weekEnd(week: string) {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

function aggregate(rows: ActivityRow[]) {
  const scores = new Map<string, Score>();

  for (const row of rows) {
    const key = `${row.achievement_week}:${row.profile_id}`;
    const score =
      scores.get(key) ??
      {
        profileId: row.profile_id,
        week: row.achievement_week,
        activities: 0,
        distanceM: 0,
        elevationM: 0,
        kudos: 0,
        movingSeconds: 0,
      };

    score.activities += 1;
    score.distanceM += toNumber(row.distance_m);
    score.elevationM += toNumber(row.total_elevation_gain_m);
    score.kudos += row.kudos_count ?? 0;
    score.movingSeconds += row.moving_time_seconds ?? 0;
    scores.set(key, score);
  }

  return Array.from(scores.values());
}

function winnersForWeek(scores: Score[], week: string) {
  const weekScores = scores.filter((score) => score.week === week);

  return BADGES.flatMap((badge) => {
    const sorted = [...weekScores]
      .filter((score) => Number(score[badge.metric]) > 0)
      .sort((a, b) => Number(b[badge.metric]) - Number(a[badge.metric]));
    const winner = sorted[0];
    if (!winner) return [];

    return [
      {
        badge_id: badge.id,
        profile_id: winner.profileId,
        period_start: week,
        period_end: weekEnd(week),
        value: Number(winner[badge.metric]),
        rank: 1,
        metadata: {
          unit: badge.unit,
          activities: winner.activities,
          distance_m: winner.distanceM,
          elevation_m: winner.elevationM,
          kudos: winner.kudos,
          moving_time_seconds: winner.movingSeconds,
        },
      },
    ];
  });
}

export function formatBadgeValue(value: number | string, unit?: string | null) {
  const n = toNumber(value);
  if (unit === "km") {
    return `${(n / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km`;
  }
  if (unit === "m") return `${Math.round(n).toLocaleString("nl-NL")} m`;
  if (unit === "kudos") return `${Math.round(n).toLocaleString("nl-NL")} kudos`;
  if (unit === "ritten") return `${Math.round(n).toLocaleString("nl-NL")} ritten`;
  return n.toLocaleString("nl-NL");
}

export async function awardCompletedAchievementWeeks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
) {
  const currentWeek = currentAchievementWeek();
  const { data, error } = await supabase
    .from("strava_activities")
    .select(
      "profile_id, achievement_week, distance_m, total_elevation_gain_m, kudos_count, moving_time_seconds",
    )
    .lt("achievement_week", currentWeek);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ActivityRow[];
  const scores = aggregate(rows);
  const weeks = Array.from(new Set(scores.map((score) => score.week))).sort();
  const awards = weeks.flatMap((week) => winnersForWeek(scores, week));

  if (awards.length === 0) return { awarded: 0 };

  const { data: existingRows } = await supabase
    .from("achievement_awards")
    .select("badge_id, profile_id, period_start")
    .in("badge_id", BADGES.map((badge) => badge.id));
  const existing = new Set(
    ((existingRows ?? []) as Array<{
      badge_id: string;
      profile_id: string;
      period_start: string;
    }>).map((award) => `${award.badge_id}:${award.profile_id}:${award.period_start}`),
  );
  const newAwards = awards.filter(
    (award) =>
      !existing.has(`${award.badge_id}:${award.profile_id}:${award.period_start}`),
  );

  const { error: upsertError } = await supabase
    .from("achievement_awards")
    .upsert(awards, { onConflict: "badge_id,profile_id,period_start" });

  if (upsertError) throw new Error(upsertError.message);

  const newAwardsByProfile = new Map<string, typeof newAwards>();
  for (const award of newAwards) {
    const list = newAwardsByProfile.get(award.profile_id) ?? [];
    list.push(award);
    newAwardsByProfile.set(award.profile_id, list);
  }

  await Promise.all(
    Array.from(newAwardsByProfile.entries()).map(async ([profileId, profileAwards]) => {
      const firstAward = profileAwards[0];
      const badge = firstAward ? BADGES.find((b) => b.id === firstAward.badge_id) : null;
      const body =
        profileAwards.length === 1 && badge && firstAward
          ? `${badge.title}: ${formatBadgeValue(firstAward.value, badge.unit)}`
          : `Je hebt ${profileAwards.length} nieuwe weekbadges behaald.`;

      await sendNotificationToMembers(
        "on_new_badge",
        {
          title: "Nieuwe ZWB-badge behaald",
          body,
          url: "/profiel",
          tag: `weekbadges-${profileId}-${currentWeek}`,
        },
        { profileIds: [profileId] },
      ).catch(() => null);
    }),
  );
  return { awarded: awards.length };
}
