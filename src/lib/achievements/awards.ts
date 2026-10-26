import { currentAchievementWeek, previousAchievementWeek, weekStartDate } from "@/lib/strava/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import { uniqueRides } from "@/lib/rides/unique-rides";

export type BadgeDefinition = {
  id: string;
  title: string;
  description: string;
  metric: "distanceM" | "elevationM" | "movingSeconds" | "activities";
  unit: "m" | "km" | "uren" | "ritten";
  icon: "mountain" | "route" | "clock" | "refresh";
  color: "gold" | "petrol" | "sage" | "steel";
};

export type ActivityRow = {
  id: number;
  profile_id: string;
  start_date: string;
  distance_m: number | string | null;
  total_elevation_gain_m: number | string | null;
  moving_time_seconds: number | null;
  trainer?: boolean | null;
};

/**
 * Hoeveel afgesloten weken een gewone run herrekent. Een late sync of een
 * import van recente ritten valt daarbinnen; de hele historie herrekenen kan
 * met `weeks: "all"`.
 */
export const AWARD_WEEKS = 8;

const ACTIVITY_COLUMNS =
  "id, profile_id, start_date, distance_m, total_elevation_gain_m, moving_time_seconds, trainer";
const PAGE = 1000;

/** Maandag van de week van een rit, uit de starttijd (zoals de ingest hem zet). */
function weekOf(startDate: string): string | null {
  const start = new Date(startDate);
  if (!Number.isFinite(start.getTime())) return null;
  return weekStartDate(start).toISOString().slice(0, 10);
}

function addWeeks(week: string, weeks: number): string {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

export type WeekScore = {
  profileId: string;
  week: string;
  activities: number;
  distanceM: number;
  elevationM: number;
  movingSeconds: number;
  /** De langste rit van de week, in tijd. */
  longestSeconds: number;
  outdoorM: number;
  outdoorSeconds: number;
  indoorM: number;
  indoorSeconds: number;
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
  // Kudo-magneet (`kudos_received_week`) is sinds 2026-10-26 geen weekbadge
  // meer: kudos bestaan alleen bij Strava, dus wie via intervals.icu of een
  // import rijdt kon hem nooit winnen. Eerder gewonnen badges blijven staan.
  {
    id: "hours_week",
    title: "Zitvleeskampioen",
    description: "Meeste uren op de fiets in een ZWB-week.",
    metric: "movingSeconds",
    unit: "uren",
    icon: "clock",
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

/**
 * Totalen per lid per week. Een rit die het lid twee keer opnam, telt één keer.
 * De week komt uit de starttijd, niet uit de kolom achievement_week: daar staat
 * bij 2.405 ritten uit juni–augustus 2026 een zondag (PLAN.md, 2026-10-18).
 */
export function weeklyScores(rows: ActivityRow[]) {
  const scores = new Map<string, WeekScore>();

  for (const row of uniqueRides(rows)) {
    const week = weekOf(row.start_date);
    if (!week) continue;
    const key = `${week}:${row.profile_id}`;
    const score =
      scores.get(key) ??
      {
        profileId: row.profile_id,
        week,
        activities: 0,
        distanceM: 0,
        elevationM: 0,
        movingSeconds: 0,
        longestSeconds: 0,
        outdoorM: 0,
        outdoorSeconds: 0,
        indoorM: 0,
        indoorSeconds: 0,
      };

    const distance = toNumber(row.distance_m);
    const seconds = row.moving_time_seconds ?? 0;
    score.activities += 1;
    score.distanceM += distance;
    score.elevationM += toNumber(row.total_elevation_gain_m);
    score.movingSeconds += seconds;
    score.longestSeconds = Math.max(score.longestSeconds, seconds);
    if (row.trainer) {
      score.indoorM += distance;
      score.indoorSeconds += seconds;
    } else {
      score.outdoorM += distance;
      score.outdoorSeconds += seconds;
    }
    scores.set(key, score);
  }

  return Array.from(scores.values());
}

function winnersForWeek(scores: WeekScore[], week: string) {
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
  if (unit === "uren") {
    return `${(n / 3600).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} u`;
  }
  // Alleen nog voor eerder gewonnen Kudo-magneten.
  if (unit === "kudos") return `${Math.round(n).toLocaleString("nl-NL")} kudos`;
  if (unit === "ritten") return `${Math.round(n).toLocaleString("nl-NL")} ritten`;
  return n.toLocaleString("nl-NL");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** Alle ritten tussen twee weken, gepagineerd: PostgREST geeft per keer hooguit 1000 rijen. */
export async function loadRides(supabase: Db, fromWeek: string | null, toWeek: string) {
  const rows: ActivityRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("strava_activities")
      .select(ACTIVITY_COLUMNS)
      .lt("start_date", `${toWeek}T00:00:00.000Z`);
    if (fromWeek) query = query.gte("start_date", `${fromWeek}T00:00:00.000Z`);
    const { data, error } = await query
      .order("start_date")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as ActivityRow[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

type AwardRow = { id: string; badge_id: string; profile_id: string; period_start: string };

async function loadAwards(supabase: Db, fromWeek: string | null, toWeek: string) {
  const rows: AwardRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("achievement_awards")
      .select("id, badge_id, profile_id, period_start")
      .in("badge_id", BADGES.map((badge) => badge.id))
      .lt("period_start", toWeek);
    if (fromWeek) query = query.gte("period_start", fromWeek);
    const { data, error } = await query.order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as AwardRow[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/**
 * Legt de weekbadges vast voor de afgesloten weken: per badge en week één
 * winnaar. Herrekent de laatste AWARD_WEEKS weken, of alles met `weeks: "all"`.
 * Een eerdere winnaar van een herrekende week die het niet meer is, verliest de
 * badge; zo blijft er per week één over.
 *
 * Tot 2026-10-18 las dit alle ritten in één select. PostgREST gaf daarvan 1000
 * willekeurige rijen terug, zodat elke run andere winnaars koos en de eerdere
 * bleven staan.
 */
export async function awardCompletedAchievementWeeks(
  supabase: Db,
  options: { weeks?: number | "all" } = {},
) {
  const currentWeek = currentAchievementWeek();
  const weeks = options.weeks ?? AWARD_WEEKS;
  const fromWeek = weeks === "all" ? null : addWeeks(currentWeek, -Math.max(1, weeks));

  const scores = weeklyScores(await loadRides(supabase, fromWeek, currentWeek));
  const scoredWeeks = Array.from(new Set(scores.map((score) => score.week))).sort();
  const awards = scoredWeeks.flatMap((week) => winnersForWeek(scores, week));

  const existing = await loadAwards(supabase, fromWeek, currentWeek);
  const key = (award: { badge_id: string; profile_id: string; period_start: string }) =>
    `${award.badge_id}:${award.profile_id}:${award.period_start}`;
  const winners = new Set(awards.map(key));
  const existingKeys = new Set(existing.map(key));
  const stale = existing.filter((award) => !winners.has(key(award)));
  const newAwards = awards.filter((award) => !existingKeys.has(key(award)));

  // Per badge: een badge die nog niet in achievement_badges staat (de migratie
  // van een nieuwe badge loopt achter op de deploy) geeft een foreign-key-fout
  // en mag de andere badges niet tegenhouden.
  const missing = new Set<string>();
  for (const badge of BADGES) {
    const rows = awards.filter((award) => award.badge_id === badge.id);
    if (rows.length === 0) continue;
    const { error } = await supabase
      .from("achievement_awards")
      .upsert(rows, { onConflict: "badge_id,profile_id,period_start" });
    if (error?.code === "23503") {
      missing.add(badge.id);
      continue;
    }
    if (error) throw new Error(error.message);
  }

  for (let index = 0; index < stale.length; index += 200) {
    const ids = stale.slice(index, index + 200).map((award) => award.id);
    const { error } = await supabase.from("achievement_awards").delete().in("id", ids);
    if (error) throw new Error(error.message);
  }

  // Alleen een bericht voor de week die net af is; een herrekening van oudere
  // weken stuurt niemand een melding.
  const lastWeek = previousAchievementWeek();
  const newAwardsByProfile = new Map<string, typeof newAwards>();
  for (const award of newAwards) {
    if (award.period_start !== lastWeek || missing.has(award.badge_id)) continue;
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
          url: "/profiel?weergave=bewerken",
          tag: `weekbadges-${profileId}-${currentWeek}`,
        },
        { profileIds: [profileId] },
      ).catch(() => null);
    }),
  );
  return {
    awarded: awards.filter((award) => !missing.has(award.badge_id)).length,
    removed: stale.length,
  };
}
