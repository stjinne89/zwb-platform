import { currentAchievementWeek, previousAchievementWeek } from "@/lib/strava/client";
import { sendNotificationToMembers } from "@/lib/push/send";
import { getClub } from "@/lib/club";
import { loadTestProfileIds, onlyVisibleProfiles, withoutTestProfiles } from "@/lib/profiles/test-accounts";
import { briljantGrowth, type GrowthRow } from "@/lib/briljant/compare";
import { SCALE_VERSION } from "@/lib/briljant/norms";
import {
  clubmens,
  formatDuration,
  groeibriljant,
  metronoom,
  weekRankings,
  type ClubEventRsvp,
  type LiveRide,
  type Ranking,
} from "@/lib/rankings/rankings";
import { weekOf, type ActivityRow } from "./week-scores";

export { weeklyScores, type ActivityRow, type WeekScore } from "./week-scores";

export type BadgeUnit = "m" | "km" | "uren" | "ritten" | "duur" | "dagen" | "keer" | "punten";

/**
 * Een weekbadge hoort bij één ranglijst op ZWB Rankings: wie daar na afloop
 * van de week op plek 1 staat, krijgt hem. Bij gelijke stand iedereen op plek 1.
 */
export type BadgeDefinition = {
  id: string;
  /** Het `id` van de ranglijst in `lib/rankings/rankings.ts`. */
  ranking: string;
  title: string;
  /** Waar de ranglijst op rekent; lukt die bron niet, dan blijft de badge onaangeroerd. */
  source: "rides" | "club" | "briljant";
  unit: BadgeUnit;
  icon: string;
  color: "gold" | "petrol" | "sage" | "steel" | "bronze" | "silver" | "platinum";
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

function addWeeks(week: string, weeks: number): string {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

// De rijen in achievement_badges: 0011, 0277 en 0356. Kudo-magneet
// (`kudos_received_week`) is sinds 2026-10-26 geen weekbadge meer: kudos bestaan
// alleen bij Strava. Eerder gewonnen badges blijven staan.
export const BADGES: BadgeDefinition[] = [
  { id: "hours_week", ranking: "zitvlees", title: "Zitvleeskampioen", source: "rides", unit: "uren", icon: "clock", color: "sage" },
  { id: "distance_week", ranking: "kilometers", title: "Kilometervreter", source: "rides", unit: "km", icon: "route", color: "petrol" },
  { id: "climber_week", ranking: "klimmer", title: "Klimmer van de week", source: "rides", unit: "m", icon: "mountain", color: "gold" },
  { id: "consistency_week", ranking: "actief", title: "Meest actief", source: "rides", unit: "ritten", icon: "refresh", color: "steel" },
  { id: "longest_ride_week", ranking: "lange-adem", title: "Lange adem", source: "rides", unit: "duur", icon: "timer", color: "bronze" },
  // Buitenbeentje en Binnenvetter tellen in de weergave waarmee hun kaart opent.
  { id: "outdoor_week", ranking: "buitenbeentje", title: "Buitenbeentje", source: "rides", unit: "km", icon: "sun", color: "silver" },
  { id: "indoor_week", ranking: "binnenvetter", title: "Binnenvetter", source: "rides", unit: "uren", icon: "home", color: "steel" },
  { id: "days_week", ranking: "metronoom", title: "Metronoom", source: "rides", unit: "dagen", icon: "calendar-check", color: "petrol" },
  { id: "clubmens_week", ranking: "clubmens", title: "Clubmens", source: "club", unit: "keer", icon: "users", color: "sage" },
  // Alleen voor wie zijn steen deelt; zet je het delen uit, dan gaan ze weg (profiel/actions.ts).
  { id: "growth_week", ranking: "groeibriljant", title: "Groeibriljant", source: "briljant", unit: "punten", icon: "gem", color: "platinum" },
];

export const GROWTH_BADGE_ID = "growth_week";

function toNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function weekEnd(week: string) {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
}

/** Wat de ranglijsten van een week nodig hebben. `null`: die bron kon niet gelezen worden. */
export type WeekSources = {
  rides: ActivityRow[];
  rsvps: ClubEventRsvp[] | null;
  live: LiveRide[] | null;
  /** Alleen stenen van leden die delen. */
  snapshots: GrowthRow[] | null;
};

type WeekAward = {
  badge_id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  value: number;
  rank: number;
  metadata: { unit: BadgeUnit };
};

function inWeek<T>(rows: T[], week: string, start: (row: T) => string) {
  return rows.filter((row) => weekOf(start(row)) === week);
}

/** Dezelfde ranglijsten als op /stats/rankings voor die week. */
function rankingsForWeek(sources: WeekSources, week: string): Ranking[] {
  const rides = inWeek(sources.rides, week, (row) => row.start_date);
  return [
    ...weekRankings(rides, week),
    metronoom(rides),
    ...(sources.rsvps && sources.live
      ? [
          clubmens(
            inWeek(sources.rsvps, week, (row) => row.start_at),
            inWeek(sources.live, week, (row) => row.started_at),
          ),
        ]
      : []),
    ...(sources.snapshots ? [groeibriljant(briljantGrowth(sources.snapshots, week))] : []),
  ];
}

/** Per badge iedereen op plek 1 van zijn ranglijst. */
export function winnersForWeek(sources: WeekSources, week: string): WeekAward[] {
  const rankings = new Map(rankingsForWeek(sources, week).map((ranking) => [ranking.id, ranking]));
  return BADGES.flatMap((badge) =>
    (rankings.get(badge.ranking)?.entries ?? [])
      .filter((entry) => entry.rank === 1)
      .map((entry) => ({
        badge_id: badge.id,
        profile_id: entry.profileId,
        period_start: week,
        period_end: weekEnd(week),
        value: entry.value,
        rank: 1,
        metadata: { unit: badge.unit },
      })),
  );
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
  if (unit === "duur") return formatDuration(n);
  // Alleen nog voor eerder gewonnen Kudo-magneten.
  if (unit === "kudos") return `${Math.round(n).toLocaleString("nl-NL")} kudos`;
  if (unit === "ritten") return `${Math.round(n).toLocaleString("nl-NL")} ritten`;
  if (unit === "dagen") return `${Math.round(n)} ${Math.round(n) === 1 ? "dag" : "dagen"}`;
  if (unit === "keer") return `${Math.round(n)} keer`;
  if (unit === "punten") return `+${Math.round(n).toLocaleString("nl-NL")} punten`;
  return n.toLocaleString("nl-NL");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/**
 * Alle ritten tussen twee weken, gepagineerd: PostgREST geeft per keer hooguit 1000 rijen.
 * Zonder testaccounts (0333), met de service-rol en met de sessie van een lid.
 */
export async function loadRides(supabase: Db, fromWeek: string | null, toWeek: string) {
  const [rows, testIds] = await Promise.all([loadAllRides(supabase, fromWeek, toWeek), loadTestProfileIds(supabase)]);
  return withoutTestProfiles(await onlyVisibleProfiles(supabase, rows), testIds);
}

async function loadAllRides(supabase: Db, fromWeek: string | null, toWeek: string) {
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

/** Alle rijen van een query, per 1000. `build` maakt per pagina een nieuwe query. */
async function loadPages<T>(build: () => Db): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

const since = (query: Db, column: string, fromWeek: string | null) =>
  fromWeek ? query.gte(column, `${fromWeek}T00:00:00.000Z`) : query;

/** Clubmens: de ja's op events die in het venster begonnen, en de live-ritten. */
async function loadClubSources(supabase: Db, fromWeek: string | null, toWeek: string, testIds: Set<string>) {
  const events = await loadPages<{ id: string; start_at: string }>(() =>
    since(supabase.from("events").select("id, start_at").lt("start_at", `${toWeek}T00:00:00.000Z`), "start_at", fromWeek)
      .order("id"),
  );
  const startById = new Map(events.map((event) => [event.id, event.start_at]));
  const ids = [...startById.keys()];
  const rsvps: ClubEventRsvp[] = [];
  // In stukjes: honderden event-ID's in één `in` maken de URL te lang.
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const rows = await loadPages<{ event_id: string; profile_id: string }>(() =>
      supabase
        .from("event_rsvps")
        .select("event_id, profile_id")
        .eq("status", "yes")
        .in("event_id", chunk)
        .order("event_id")
        .order("profile_id"),
    );
    for (const row of rows) {
      const start = startById.get(row.event_id);
      if (start) rsvps.push({ ...row, start_at: start });
    }
  }
  const live = await loadPages<LiveRide>(() =>
    since(
      supabase
        .from("live_sessions")
        .select("profile_id, started_at, last_seen_at, ended_at")
        .lt("started_at", `${toWeek}T00:00:00.000Z`),
      "started_at",
      fromWeek,
    ).order("id"),
  );
  return {
    rsvps: withoutTestProfiles(rsvps, testIds),
    live: withoutTestProfiles(live, testIds),
  };
}

/**
 * Groeibriljant: de stenen van leden die delen (zoals `zwbriljant_shares`:
 * voorkeur zichtbaar en goedgekeurd), vanaf de week vóór het venster.
 */
async function loadSharedSnapshots(supabase: Db, fromWeek: string | null, toWeek: string, testIds: Set<string>) {
  const sharing = await loadPages<{ profile_id: string }>(() =>
    supabase.from("zwbriljant_preferences").select("profile_id").eq("visible", true).order("profile_id"),
  );
  const sharers = [...new Set(sharing.map((row) => row.profile_id))];
  const approved = new Set<string>();
  for (let index = 0; index < sharers.length; index += 200) {
    const rows = await loadPages<{ id: string }>(() =>
      supabase.from("profiles").select("id").eq("is_approved", true).in("id", sharers.slice(index, index + 200)).order("id"),
    );
    for (const row of rows) approved.add(row.id);
  }
  const start = fromWeek ? addWeeks(fromWeek, -1) : null;
  const snapshots = await loadPages<GrowthRow>(() => {
    let query = supabase
      .from("zwbriljant_snapshots")
      .select("profile_id, week, facets, consistency")
      .eq("provenance->>scale", SCALE_VERSION)
      .lt("week", toWeek);
    if (start) query = query.gte("week", start);
    return query.order("profile_id").order("week");
  });
  return withoutTestProfiles(
    snapshots.filter((row) => approved.has(row.profile_id)),
    testIds,
  );
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
 * Legt de weekbadges vast voor de afgesloten weken: per badge en week wie op
 * plek 1 van zijn ranglijst staat. Herrekent de laatste AWARD_WEEKS weken, of
 * alles met `weeks: "all"`. Een eerdere winnaar van een herrekende week die het
 * niet meer is, verliest de badge.
 *
 * Met de service-rol: Clubmens en Groeibriljant moeten alle aanmeldingen,
 * live-ritten en gedeelde stenen zien, niet wat de sessie van één lid mag lezen.
 * Lukt een van die bronnen niet, dan blijven de badges van die bron zoals ze
 * waren; de ritbadges gaan gewoon door.
 *
 * Tot 2026-10-18 las dit alle ritten in één select. PostgREST gaf daarvan 1000
 * willekeurige rijen terug, zodat elke run andere winnaars koos en de eerdere
 * bleven staan.
 */
export async function awardCompletedAchievementWeeks(
  supabase: Db,
  options: { weeks?: number | "all" } = {},
) {
  const clubTexts = (await getClub()).texts;
  const currentWeek = currentAchievementWeek();
  const weeks = options.weeks ?? AWARD_WEEKS;
  const fromWeek = weeks === "all" ? null : addWeeks(currentWeek, -Math.max(1, weeks));

  const testIds = await loadTestProfileIds(supabase);
  const [rides, club, snapshots] = await Promise.all([
    loadRides(supabase, fromWeek, currentWeek),
    loadClubSources(supabase, fromWeek, currentWeek, testIds).catch(() => null),
    loadSharedSnapshots(supabase, fromWeek, currentWeek, testIds).catch(() => null),
  ]);
  const sources: WeekSources = {
    rides,
    rsvps: club?.rsvps ?? null,
    live: club?.live ?? null,
    snapshots,
  };
  const loaded = new Set<BadgeDefinition["source"]>(["rides"]);
  if (club) loaded.add("club");
  if (snapshots) loaded.add("briljant");
  const counted = new Set(BADGES.filter((badge) => loaded.has(badge.source)).map((badge) => badge.id));

  const scoredWeeks = [
    ...new Set(
      [
        ...rides.map((row) => row.start_date),
        ...(sources.rsvps ?? []).map((row) => row.start_at),
        ...(sources.live ?? []).map((row) => row.started_at),
        ...(sources.snapshots ?? []).map((row) => `${row.week}T12:00:00.000Z`),
      ]
        .map(weekOf)
        .filter((week): week is string => week !== null && week < currentWeek && (!fromWeek || week >= fromWeek)),
    ),
  ].sort();
  const awards = scoredWeeks.flatMap((week) => winnersForWeek(sources, week));

  const existing = await loadAwards(supabase, fromWeek, currentWeek);
  const key = (award: { badge_id: string; profile_id: string; period_start: string }) =>
    `${award.badge_id}:${award.profile_id}:${award.period_start}`;
  const winners = new Set(awards.map(key));
  const existingKeys = new Set(existing.map(key));
  const stale = existing.filter((award) => counted.has(award.badge_id) && !winners.has(key(award)));
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
          title: `Nieuwe ${clubTexts.shortName}-badge behaald`,
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
