// De rijen voor het weekoverzicht ophalen en er een samenvatting van maken.
//
// Licht gehouden voor de database op het gratis plan: alleen de week zelf,
// plus 120 dagen ritten voor wie geen intervals.icu heeft (de fitness wordt dan
// uit de eigen TSS gerekend). Dit draait één keer per lid per week; de uitkomst
// gaat in weekly_reviews. Alleen de vooruitblik wordt bij elke opening opnieuw
// gelezen, omdat het lid die op de laatste pagina juist aanpast.

import { storedScore, type StoredSnapshot } from "@/lib/briljant/compare";
import { SCALE_VERSION } from "@/lib/briljant/norms";
import { fetchIntervalsPowerCurveRanges, fetchIntervalsWellness } from "@/lib/intervals/client";
import { compactCurve } from "@/lib/stats/curves";
import {
  dedupeRideRows,
  fitnessFromTss,
  PERSONAL_RIDE_COLUMNS,
  personalRidesFromRows,
  type PersonalRideRow,
} from "@/lib/stats/personal";
import { CYCLING_SPORTS } from "@/lib/strava/sports";
import type { createAdminClient } from "@/lib/supabase/admin";
import { loadAvailability, weekdayOf } from "@/lib/training/availability";
import { loadFtpAt } from "@/lib/training/ftp-history";
import { withBudget } from "@/lib/training/training-data";
import { loadRaceContribution } from "@/lib/zrl-analysis/load";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { addDays } from "@/lib/weekly-review/period";
import {
  buildBriljant,
  buildClub,
  buildForm,
  buildFuel,
  buildNextWeek,
  buildPlan,
  buildPower,
  buildRides,
  buildTeams,
  eventMinutes,
  firstNameOf,
  keepRiddenTeams,
  SUMMARY_VERSION,
  type BriljantSnapshot,
  type NextEvent,
  type NextWeek,
  type TeamResult,
  type WeekSummary,
  type WorkoutRow,
} from "@/lib/weekly-review/summary";

type Admin = ReturnType<typeof createAdminClient>;

/** Hoe lang intervals.icu mag doen over vorm en vermogen. */
const INTERVALS_BUDGET_MS = 4_000;
/** Zo lang mag de eigen race per ZRL-uitslag kosten (een oude snapshot wordt nog aangevuld). */
const RACE_BUDGET_MS = 6_000;
const FITNESS_DAYS = 120;
/** Buitenritten die als clubrit tellen. */
const CLUB_RIDE_TYPES = ["outdoor", "toertocht", "gran_fondo", "gravel_race"];

type One<T> = T | T[] | null;
const one = <T>(value: One<T>): T | null => (Array.isArray(value) ? (value[0] ?? null) : value);

type EventRef = { id?: string; title: string; start_at: string; end_at?: string | null; distance_km?: number | string | null };

const dayOf = (iso: string) => amsterdamDayKey(new Date(iso));
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });

/** Een UTC-venster dat de hele Nederlandse week zeker omvat; daarna filteren we op de kalenderdag. */
function isoWindow(from: string, to: string) {
  return { from: `${addDays(from, -1)}T00:00:00Z`, to: `${addDays(to, 1)}T23:59:59Z` };
}

async function loadWorkouts(admin: Admin, profileId: string, from: string, to: string): Promise<WorkoutRow[]> {
  const window = isoWindow(from, to);
  const { data } = await admin
    .from("training_workouts")
    .select("scheduled_at, title, duration_minutes, status, intensity, training_plans!inner(status)")
    .eq("profile_id", profileId)
    .in("training_plans.status", ["published", "approved"])
    .gte("scheduled_at", window.from)
    .lte("scheduled_at", window.to)
    .order("scheduled_at");
  return ((data ?? []) as Array<{ scheduled_at: string; title: string; duration_minutes: number; status: WorkoutRow["status"]; intensity: string | null }>)
    .map((row) => ({
      day: dayOf(row.scheduled_at),
      title: row.title,
      durationMinutes: row.duration_minutes,
      status: row.status,
      intensity: row.intensity,
    }))
    .filter((row) => row.day >= from && row.day <= to);
}

/** Gebruikt dit lid ZWBeter voor zijn training? Dan mag de coachtekst van de AI komen. */
export async function usesTraining(admin: Admin, profileId: string): Promise<boolean> {
  const [{ count: goals }, { count: plans }] = await Promise.all([
    admin.from("training_goals").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
    admin.from("training_plans").select("id", { count: "exact", head: true }).eq("profile_id", profileId),
  ]);
  return (goals ?? 0) > 0 || (plans ?? 0) > 0;
}

export async function buildWeekSummary(admin: Admin, profileId: string, weekStart: string): Promise<WeekSummary> {
  const weekEnd = addDays(weekStart, 6);
  const window = isoWindow(weekStart, weekEnd);
  const today = amsterdamDayKey();
  const inWeek = (iso: string | null | undefined) => {
    if (!iso) return false;
    const day = dayOf(iso);
    return day >= weekStart && day <= weekEnd;
  };

  const [{ data: profile }, { data: connection }, { data: memberships }] = await Promise.all([
    admin.from("profiles").select("display_name, ftp_watts, weight_kg, sex, zwift_id").eq("id", profileId).maybeSingle(),
    admin.from("intervals_connections").select("athlete_id, api_key").eq("profile_id", profileId).maybeSingle(),
    admin.from("team_members").select("team_id, teams(name)").eq("profile_id", profileId),
  ]);
  const ftp = Number(profile?.ftp_watts) > 0 ? Number(profile?.ftp_watts) : null;
  const weightKg = Number(profile?.weight_kg) > 0 ? Number(profile?.weight_kg) : null;
  const teamNames = new Map(
    ((memberships ?? []) as Array<{ team_id: string; teams: One<{ name: string }> }>).map((row) => [row.team_id, one(row.teams)?.name ?? "Je team"]),
  );
  const teamIds = [...teamNames.keys()];
  const intervals = connection?.api_key && connection.athlete_id ? { key: connection.api_key as string, id: connection.athlete_id as string } : null;

  const [
    rideRows,
    ftpAt,
    workouts,
    wellness,
    curves,
    teamResults,
    riderResults,
    lineupRows,
    srcRows,
    mealRows,
    mobilityRows,
    awardRows,
    blockCount,
    clubRsvps,
    briljantRows,
  ] = await Promise.all([
    admin
      .from("strava_activities")
      .select(PERSONAL_RIDE_COLUMNS)
      .eq("profile_id", profileId)
      .in("sport_type", CYCLING_SPORTS)
      .gte("start_date", `${addDays(weekEnd, -FITNESS_DAYS)}T00:00:00Z`)
      .lte("start_date", window.to)
      .order("start_date")
      .limit(600)
      .then(({ data }) => (data ?? []) as unknown as PersonalRideRow[]),
    loadFtpAt(admin, profileId, ftp),
    loadWorkouts(admin, profileId, weekStart, weekEnd),
    intervals ? withBudget(fetchIntervalsWellness(intervals.key, intervals.id, 50), INTERVALS_BUDGET_MS) : Promise.resolve(null),
    intervals
      ? withBudget(
          fetchIntervalsPowerCurveRanges(intervals.key, intervals.id, [
            `r.${weekStart}.${weekEnd}`,
            `r.${addDays(weekStart, -365)}.${addDays(weekStart, -1)}`,
          ]),
          INTERVALS_BUDGET_MS,
        )
      : Promise.resolve(null),
    teamIds.length
      ? admin
          .from("zrl_team_results")
          .select("event_id, team_id, rank, teams, events!inner(title, start_at)")
          .in("team_id", teamIds)
          .gte("events.start_at", window.from)
          .lte("events.start_at", window.to)
          .then(({ data }) => (data ?? []) as Array<{ event_id: string; team_id: string | null; rank: number; teams: number; events: One<EventRef> }>)
      : Promise.resolve([]),
    admin
      .from("zrl_rider_results")
      .select("team_id, position, category, round_at")
      .eq("profile_id", profileId)
      .gte("round_at", window.from)
      .lte("round_at", window.to)
      .then(({ data }) => (data ?? []) as Array<{ team_id: string | null; position: number | null; category: string | null; round_at: string | null }>),
    admin
      .from("team_event_lineups")
      .select("team_id, events!inner(start_at)")
      .eq("profile_id", profileId)
      .gte("events.start_at", window.from)
      .lte("events.start_at", window.to)
      .then(({ data }) => (data ?? []) as Array<{ team_id: string | null; events: One<{ start_at: string }> }>),
    admin
      .from("src_results")
      .select("category_rank, category, events!inner(title, start_at)")
      .eq("profile_id", profileId)
      .gte("events.start_at", window.from)
      .lte("events.start_at", window.to)
      .then(({ data }) => (data ?? []) as Array<{ category_rank: number | null; category: number | null; events: One<EventRef> }>),
    admin
      .from("nutrition_log_meals")
      .select("eaten_on")
      .eq("profile_id", profileId)
      .gte("eaten_on", weekStart)
      .lte("eaten_on", weekEnd)
      .then(({ data, error }) => (error ? null : ((data ?? []) as Array<{ eaten_on: string }>))),
    admin
      .from("mobility_sessions")
      .select("completed_on, minutes")
      .eq("profile_id", profileId)
      .gte("completed_on", weekStart)
      .lte("completed_on", weekEnd)
      .then(({ data }) => (data ?? []) as Array<{ completed_on: string; minutes: number | null }>),
    admin
      .from("achievement_awards")
      .select("achievement_badges(title)")
      .eq("profile_id", profileId)
      .eq("award_scope", "weekly")
      .eq("period_start", weekStart)
      .then(({ data }) => (data ?? []) as Array<{ achievement_badges: One<{ title: string }> }>),
    admin
      .from("profile_blocks")
      .select("x", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .gte("first_seen_at", window.from)
      .lte("first_seen_at", window.to)
      .then(({ count }) => count ?? 0),
    admin
      .from("event_rsvps")
      .select("event_id, events!inner(title, start_at, type)")
      .eq("profile_id", profileId)
      .eq("status", "yes")
      .in("events.type", CLUB_RIDE_TYPES)
      .gte("events.start_at", window.from)
      .lte("events.start_at", window.to)
      .then(({ data }) => (data ?? []) as Array<{ event_id: string; events: One<EventRef> }>),
    // Alleen de eigen steen, op de huidige schaal. Zonder migratie 0265 geen steen.
    admin
      .from("zwbriljant_snapshots")
      .select("week, facets, consistency, provenance")
      .eq("profile_id", profileId)
      .eq("provenance->>scale", SCALE_VERSION)
      .lte("week", weekStart)
      .order("week", { ascending: false })
      .limit(6)
      .then(({ data, error }) => (error ? [] : ((data ?? []) as Array<{ week: string; facets: unknown; consistency: number | string | null; provenance: { durability?: "test" | "ritten" } | null }>))),
  ]);

  // Ritten en fitness
  const rides = personalRidesFromRows(dedupeRideRows(rideRows), ftpAt);
  const loadPoints = wellness?.length
    ? wellness.map((row) => ({ date: row.id, ctl: row.ctl ?? null, atl: row.atl ?? null }))
    : fitnessFromTss(rides, addDays(weekEnd, -42), weekEnd).map((point) => ({ date: point.date, ctl: point.ctl, atl: point.atl }));
  const form = buildForm(loadPoints, weekEnd, wellness?.length ? "intervals" : "zwb");

  // Vermogen
  const [weekRange, yearRange] = [`r.${weekStart}.${weekEnd}`, `r.${addDays(weekStart, -365)}.${addDays(weekStart, -1)}`];
  const power = curves
    ? buildPower(compactCurve(curves.get(weekRange) ?? []), compactCurve(curves.get(yearRange) ?? []), weightKg)
    : null;

  // Teams: de teamuitslag met de eigen plaats erbij, als het lid meereed. Bij
  // twee teams alleen het team waarin het lid die dag reed of opgesteld stond.
  const rode = [
    ...riderResults.flatMap((rider) => (rider.team_id && rider.round_at ? [{ teamId: rider.team_id, day: dayOf(rider.round_at) }] : [])),
    ...lineupRows.flatMap((row) => {
      const event = one(row.events);
      return row.team_id && event ? [{ teamId: row.team_id, day: dayOf(event.start_at) }] : [];
    }),
  ];
  const teamRows = teamResults.flatMap((row) => {
    const event = one(row.events);
    if (!event || !inWeek(event.start_at) || !row.team_id) return [];
    return [{ ...row, teamId: row.team_id, event, day: dayOf(event.start_at) }];
  });
  // De eigen race uit ZWBeter racen (plek en punten tegenover de verwachting,
  // bijdrage aan de ploeg), binnen een tijdsbudget: zonder komt de slide zoals
  // voorheen.
  const zwiftId = Number(profile?.zwift_id) || null;
  const ridden = keepRiddenTeams(teamRows, rode);
  const contributions = zwiftId
    ? await Promise.all(ridden.map((row) => withBudget(loadRaceContribution(row.event_id, zwiftId), RACE_BUDGET_MS)))
    : ridden.map(() => null);
  const results: TeamResult[] = ridden.map((row, index) => {
    const { day, event } = row;
    const own = riderResults.find((rider) => rider.team_id === row.teamId && rider.round_at && dayOf(rider.round_at) === day);
    return {
      team: teamNames.get(row.teamId) ?? "Je team",
      event: event.title,
      day,
      rank: row.rank,
      teams: row.teams,
      riderPosition: own?.position ?? null,
      riderCategory: own?.category ?? null,
      race: contributions[index],
    };
  });
  const src = srcRows.flatMap((row) => {
    const event = one(row.events);
    if (!event || !inWeek(event.start_at) || row.category_rank == null) return [];
    return [{ event: event.title, day: dayOf(event.start_at), rank: row.category_rank, category: row.category }];
  });

  // Clubritten met het aantal toezeggingen
  const clubEvents = clubRsvps.flatMap((row) => {
    const event = one(row.events);
    return event && inWeek(event.start_at) ? [{ id: row.event_id, title: event.title, day: dayOf(event.start_at) }] : [];
  });
  const riderCounts = new Map<string, number>();
  if (clubEvents.length) {
    const { data } = await admin
      .from("event_rsvps")
      .select("event_id")
      .in("event_id", clubEvents.map((event) => event.id))
      .eq("status", "yes");
    for (const row of (data ?? []) as Array<{ event_id: string }>) riderCounts.set(row.event_id, (riderCounts.get(row.event_id) ?? 0) + 1);
  }

  return {
    version: SUMMARY_VERSION,
    weekStart,
    weekEnd,
    firstName: firstNameOf(profile?.display_name as string | null),
    rides: buildRides(rides, weekStart),
    plan: buildPlan(workouts, weekStart, today),
    form,
    power,
    teams: buildTeams(results, src),
    fuel: buildFuel(mealRows ? mealRows.map((row) => row.eaten_on) : null, mobilityRows.map((row) => ({ day: row.completed_on, minutes: row.minutes })), weekStart),
    club: buildClub(
      clubEvents.map((event) => ({ title: event.title, day: event.day, riders: riderCounts.get(event.id) ?? 1 })),
      blockCount,
      awardRows.map((row) => one(row.achievement_badges)?.title).filter((title): title is string => Boolean(title)),
    ),
    briljant: buildBriljant(
      briljantRows.map((row): BriljantSnapshot => {
        const facets = (row.facets ?? {}) as StoredSnapshot["facets"];
        const consistency = row.consistency == null ? null : Number(row.consistency);
        return { week: row.week, facets, consistency, score: storedScore(facets, consistency), durability: row.provenance?.durability };
      }),
      weekStart,
      profile?.sex === "man" || profile?.sex === "vrouw" ? profile.sex : null,
    ),
  };
}

/** De vooruitblik: beschikbaarheid, schema en events waar het lid al op staat. */
export async function buildNextWeekFor(admin: Admin, profileId: string, weekStart: string): Promise<NextWeek> {
  const weekEnd = addDays(weekStart, 6);
  const window = isoWindow(weekStart, weekEnd);
  const select = "events!inner(id, title, start_at, end_at, distance_km)";
  const [availability, workouts, lineups, teamAvailability, rsvps] = await Promise.all([
    loadAvailability(admin, profileId, weekStart),
    loadWorkouts(admin, profileId, weekStart, weekEnd),
    admin.from("team_event_lineups").select(select).eq("profile_id", profileId).gte("events.start_at", window.from).lte("events.start_at", window.to),
    admin
      .from("team_event_availability")
      .select(`status, ${select}`)
      .eq("profile_id", profileId)
      .in("status", ["available", "maybe"])
      .gte("events.start_at", window.from)
      .lte("events.start_at", window.to),
    admin
      .from("event_rsvps")
      .select(`status, ${select}`)
      .eq("profile_id", profileId)
      .in("status", ["yes", "maybe"])
      .gte("events.start_at", window.from)
      .lte("events.start_at", window.to),
  ]);

  const toEvent = (ref: EventRef | null, status: NextEvent["status"]): NextEvent[] => {
    if (!ref?.id) return [];
    const day = dayOf(ref.start_at);
    if (day < weekStart || day > weekEnd) return [];
    return [
      {
        id: ref.id,
        day,
        time: timeOf(ref.start_at),
        title: ref.title,
        status,
        durationMinutes: eventMinutes(ref.start_at, ref.end_at ?? null, ref.distance_km == null ? null : Number(ref.distance_km)),
      },
    ];
  };
  type Row = { status?: string; events: One<EventRef> };
  const events = [
    ...((lineups.data ?? []) as Row[]).flatMap((row) => toEvent(one(row.events), "opgesteld")),
    ...((teamAvailability.data ?? []) as Row[]).flatMap((row) => toEvent(one(row.events), row.status === "available" ? "beschikbaar" : "misschien")),
    ...((rsvps.data ?? []) as Row[]).flatMap((row) => toEvent(one(row.events), row.status === "yes" ? "aangemeld" : "misschien")),
  ];

  const byDay = availability.minutesByDay;
  return buildNextWeek(weekStart, (day) => byDay[weekdayOf(day)] ?? 0, workouts, events, availability.source);
}
