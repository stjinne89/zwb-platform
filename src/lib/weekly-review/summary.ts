// Het weekoverzicht als data: wat een lid in één week deed, per onderdeel van
// ZWBeter, plus wat er de week erna klaarstaat.
//
// Elk onderdeel is null als het lid het die week niet gebruikte; de pop-up laat
// dat scherm dan weg. Zo krijgt een lid dat alleen fietst geen leeg
// voedingsscherm, en een lid zonder vermogensmeter geen vermogensgrafiek.
//
// Puur: de rijen komen uit load.ts, hier wordt alleen gerekend. De uitkomst gaat
// als JSON in weekly_reviews.summary, dus alles hier is serialiseerbaar.

import type { PersonalRide } from "@/lib/stats/personal";
import type { CompactPoint } from "@/lib/stats/curves";
import type { Sex } from "@/lib/briljant/norms";
import { points as briljantPoints, positionFor, type Facet } from "@/lib/briljant/score";
import { winsFromLevels } from "@/lib/briljant/view";
import { addDays, weekDays } from "@/lib/weekly-review/period";
import type { RaceContribution } from "@/lib/zrl-analysis/history";

/**
 * 2: vermogen kreeg `focus`, teams alleen het team waarin het lid reed.
 * 3: de ZWBriljant-steen (`briljant`).
 * 4: per teamuitslag de eigen race en bijdrage (`race`).
 */
export const SUMMARY_VERSION = 4;

export type DayKm = { day: string; km: number; minutes: number };

export type RidesSection = {
  count: number;
  km: number;
  movingMinutes: number;
  elevationM: number;
  longest: { day: string; km: number; name: string | null } | null;
  perDay: DayKm[];
};

export type PlanDayStatus = "gedaan" | "gemist" | "overgeslagen" | "gepland";

export type PlanSection = {
  planned: number;
  done: number;
  perDay: Array<{ day: string; plannedMinutes: number; doneMinutes: number; status: PlanDayStatus | null; title: string | null }>;
};

export type FormSection = {
  source: "intervals" | "zwb";
  ctlStart: number | null;
  ctlEnd: number;
  atlEnd: number | null;
  tsbEnd: number | null;
  /** Fitness en vermoeidheid aan het eind van elk van de laatste zes weken. */
  weeks: Array<{ weekEnd: string; ctl: number; atl: number | null }>;
};

export type PowerPoint = { seconds: number; label: string; week: number | null; best: number | null };

export type PowerSection = {
  points: PowerPoint[];
  /** De langste duur waarop deze week het beste van het afgelopen jaar werd verbeterd. */
  record: { seconds: number; label: string; watts: number; wattsPerKg: number | null } | null;
  /**
   * Zonder record: de duur die het dichtst bij het jaarbeste kwam, met dat
   * aandeel in procenten. Eerst stond hier altijd de 5 minuten, zonder reden.
   */
  focus: { seconds: number; label: string; watts: number; percentOfBest: number | null } | null;
};

export type TeamResult = {
  team: string;
  event: string;
  day: string;
  rank: number;
  teams: number;
  /** Plaats van het lid zelf, als die bekend is. */
  riderPosition: number | null;
  riderCategory: string | null;
  /** De eigen race uit ZWBeter racen: plek en punten tegenover de verwachting, en de bijdrage aan de ploeg. */
  race?: RaceContribution | null;
};

export type TeamsSection = {
  results: TeamResult[];
  src: Array<{ event: string; day: string; rank: number; category: number | null }>;
};

export type FuelSection = {
  /** Per dag van de week: iets gelogd of niet. Leeg als het lid niet logt. */
  loggedDays: boolean[] | null;
  mobilitySessions: number;
  mobilityMinutes: number;
};

export type ClubSection = {
  clubRides: Array<{ title: string; day: string; riders: number }>;
  newBlocks: number;
  badges: string[];
};

export type BriljantSection = {
  /** Punten zoals op de steen (427). */
  points: number;
  /** Klasse 0 (Koper) tot en met 9 (Diamant). */
  level: number;
  levelName: string;
  /** Null in Diamant. */
  nextName: string | null;
  /** Punten tot de volgende klasse; 0 in Diamant. */
  toNext: number;
  /** Punten en klasse een week eerder; null zonder snapshot van die week. */
  previousPoints: number | null;
  previousLevel: number | null;
  /**
   * Het onderdeel waar 5% beter de meeste punten oplevert (zoals "Waar win je het
   * meest" op de steen); null als nergens iets te winnen is.
   */
  growFacet: string | null;
};

export type WeekSummary = {
  version: number;
  weekStart: string;
  weekEnd: string;
  firstName: string;
  rides: RidesSection | null;
  plan: PlanSection | null;
  form: FormSection | null;
  power: PowerSection | null;
  teams: TeamsSection | null;
  fuel: FuelSection | null;
  club: ClubSection | null;
  briljant: BriljantSection | null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

export function firstNameOf(displayName: string | null | undefined): string {
  return (displayName ?? "").trim().split(/\s+/)[0] ?? "";
}

// ── Ritten ────────────────────────────────────────────────────────────────

export function buildRides(rides: PersonalRide[], weekStart: string): RidesSection | null {
  const days = weekDays(weekStart);
  const inWeek = rides.filter((ride) => ride.day >= days[0] && ride.day <= days[6]);
  if (inWeek.length === 0) return null;
  const perDay = days.map((day) => {
    const own = inWeek.filter((ride) => ride.day === day);
    return {
      day,
      km: round1(own.reduce((sum, ride) => sum + ride.distanceKm, 0)),
      minutes: Math.round(own.reduce((sum, ride) => sum + ride.movingSeconds, 0) / 60),
    };
  });
  const longest = inWeek.reduce((best, ride) => (ride.distanceKm > best.distanceKm ? ride : best), inWeek[0]);
  return {
    count: inWeek.length,
    km: round1(inWeek.reduce((sum, ride) => sum + ride.distanceKm, 0)),
    movingMinutes: Math.round(inWeek.reduce((sum, ride) => sum + ride.movingSeconds, 0) / 60),
    elevationM: Math.round(inWeek.reduce((sum, ride) => sum + ride.elevationM, 0)),
    longest: longest.distanceKm > 0 ? { day: longest.day, km: round1(longest.distanceKm), name: longest.name } : null,
    perDay,
  };
}

// ── Schema ────────────────────────────────────────────────────────────────

export type WorkoutRow = {
  /** Kalenderdag van de geplande training. */
  day: string;
  title: string;
  durationMinutes: number;
  status: "planned" | "completed" | "skipped";
  intensity?: string | null;
};

/**
 * Gepland naast gedaan. Een training die op een voorbije dag nog op 'planned'
 * staat is gemist; een die het lid zelf heeft geschrapt telt als overgeslagen
 * en niet als gemist. Rustdagen tellen niet mee.
 */
export function buildPlan(workouts: WorkoutRow[], weekStart: string, today: string): PlanSection | null {
  const days = weekDays(weekStart);
  const own = workouts.filter((row) => row.day >= days[0] && row.day <= days[6] && row.intensity !== "rest");
  if (own.length === 0) return null;
  const statusOf = (row: WorkoutRow): PlanDayStatus =>
    row.status === "completed" ? "gedaan" : row.status === "skipped" ? "overgeslagen" : row.day < today ? "gemist" : "gepland";
  const perDay = days.map((day) => {
    const rows = own.filter((row) => row.day === day);
    if (rows.length === 0) return { day, plannedMinutes: 0, doneMinutes: 0, status: null, title: null };
    const statuses = rows.map(statusOf);
    const status: PlanDayStatus = statuses.includes("gemist")
      ? "gemist"
      : statuses.every((value) => value === "gedaan")
        ? "gedaan"
        : statuses.includes("gepland")
          ? "gepland"
          : statuses.includes("gedaan")
            ? "gedaan"
            : "overgeslagen";
    return {
      day,
      plannedMinutes: rows.reduce((sum, row) => sum + row.durationMinutes, 0),
      doneMinutes: rows.filter((row) => row.status === "completed").reduce((sum, row) => sum + row.durationMinutes, 0),
      status,
      title: rows.map((row) => row.title).join(" + "),
    };
  });
  return {
    planned: own.filter((row) => row.status !== "skipped").length,
    done: own.filter((row) => row.status === "completed").length,
    perDay,
  };
}

// ── Belasting ─────────────────────────────────────────────────────────────

export type LoadPoint = { date: string; ctl: number | null; atl: number | null };

/**
 * Fitness (CTL) en vermoeidheid (ATL) aan het eind van de week en van de vijf
 * weken ervoor. `points` mag dagelijks zijn; per week telt de laatste dag met
 * een waarde.
 */
export function buildForm(points: LoadPoint[], weekEnd: string, source: FormSection["source"]): FormSection | null {
  const sorted = points.filter((point) => point.ctl != null && point.date <= weekEnd).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;
  const lastOn = (day: string) => [...sorted].reverse().find((point) => point.date <= day) ?? null;
  const end = lastOn(weekEnd);
  // Een vorm van weken geleden is geen vorm van deze week.
  if (!end || end.date < addDays(weekEnd, -6)) return null;
  const start = lastOn(addDays(weekEnd, -7));
  const weeks: FormSection["weeks"] = [];
  for (let back = 5; back >= 0; back -= 1) {
    const day = addDays(weekEnd, -7 * back);
    const point = lastOn(day);
    if (point?.ctl != null) weeks.push({ weekEnd: day, ctl: round1(point.ctl), atl: point.atl == null ? null : round1(point.atl) });
  }
  const ctlEnd = round1(end.ctl as number);
  const atlEnd = end.atl == null ? null : round1(end.atl);
  return {
    source,
    ctlStart: start?.ctl == null ? null : round1(start.ctl),
    ctlEnd,
    atlEnd,
    tsbEnd: atlEnd == null ? null : round1(ctlEnd - atlEnd),
    weeks,
  };
}

// ── Vermogen ──────────────────────────────────────────────────────────────

export const POWER_DURATIONS = [
  { seconds: 5, label: "5s" },
  { seconds: 60, label: "1m" },
  { seconds: 300, label: "5m" },
  { seconds: 1200, label: "20m" },
  { seconds: 3600, label: "60m" },
];

/** "5 minuten", "1 minuut", "5 seconden": voor in een zin, waar "5m" als meters leest. */
export function durationWords(seconds: number): string {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "seconde" : "seconden"}`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minuut" : "minuten"}`;
}

function wattsAt(curve: CompactPoint[], seconds: number): number | null {
  const exact = curve.find((point) => point.seconds === seconds);
  if (exact) return Math.round(exact.watts);
  // Geen exact punt: het dichtstbijzijnde punt dat minstens zo lang is.
  const longer = curve.filter((point) => point.seconds >= seconds).sort((a, b) => a.seconds - b.seconds)[0];
  return longer && longer.seconds <= seconds * 1.1 ? Math.round(longer.watts) : null;
}

/**
 * De piekwaarden van de week naast het beste van het jaar ervoor. Een record
 * telt alleen als het vorige beste bekend is: zonder geschiedenis is elke week
 * een record, en dat zegt niets.
 */
export function buildPower(week: CompactPoint[], best: CompactPoint[], weightKg: number | null): PowerSection | null {
  if (week.length === 0) return null;
  const points = POWER_DURATIONS.map(({ seconds, label }) => ({ seconds, label, week: wattsAt(week, seconds), best: wattsAt(best, seconds) }));
  if (points.every((point) => point.week == null)) return null;
  const records = points.filter((point) => point.week != null && point.best != null && point.week > point.best);
  const top = records[records.length - 1] ?? null;
  return {
    points,
    record: top
      ? {
          seconds: top.seconds,
          label: top.label,
          watts: top.week as number,
          wattsPerKg: weightKg ? Math.round(((top.week as number) / weightKg) * 10) / 10 : null,
        }
      : null,
    focus: top ? null : powerFocus(points),
  };
}

/**
 * De duur waarop de week het dichtst bij het jaarbeste kwam. Bij gelijke stand
 * de langere duur. Zonder jaarcurve de 20 minuten, anders de langste die er is.
 */
function powerFocus(points: PowerPoint[]): PowerSection["focus"] {
  const compared = points.filter((point) => point.week != null && point.best != null && point.best > 0);
  if (compared.length) {
    const share = (point: PowerPoint) => (point.week as number) / (point.best as number);
    const best = compared.reduce((pick, point) => (share(point) >= share(pick) ? point : pick));
    return { seconds: best.seconds, label: best.label, watts: best.week as number, percentOfBest: Math.round(share(best) * 100) };
  }
  const known = points.filter((point) => point.week != null);
  const pick = known.find((point) => point.seconds === 1200) ?? known[known.length - 1];
  return pick ? { seconds: pick.seconds, label: pick.label, watts: pick.week as number, percentOfBest: null } : null;
}

// ── Teams ─────────────────────────────────────────────────────────────────

/**
 * Wie in twee teams zit, reed per wedstrijddag maar voor één ervan. Weten we
 * voor welk team (eigen uitslag of opstelling), dan alleen die uitslag; weten
 * we het niet, dan blijven alle teams van die dag staan.
 */
export function keepRiddenTeams<T extends { teamId: string; day: string }>(
  results: T[],
  rode: Array<{ teamId: string; day: string }>,
): T[] {
  return results.filter((result) => {
    const sameDay = rode.filter((entry) => entry.day === result.day);
    return sameDay.length === 0 || sameDay.some((entry) => entry.teamId === result.teamId);
  });
}

export function buildTeams(results: TeamResult[], src: TeamsSection["src"]): TeamsSection | null {
  if (results.length === 0 && src.length === 0) return null;
  return {
    results: [...results].sort((a, b) => a.day.localeCompare(b.day)),
    src: [...src].sort((a, b) => a.day.localeCompare(b.day)),
  };
}

// ── Voeding en kracht ─────────────────────────────────────────────────────

export function buildFuel(
  mealDays: string[] | null,
  sessions: Array<{ day: string; minutes: number | null }>,
  weekStart: string,
): FuelSection | null {
  const days = weekDays(weekStart);
  const logged = mealDays ? new Set(mealDays) : null;
  const ownSessions = sessions.filter((row) => row.day >= days[0] && row.day <= days[6]);
  const loggedDays = logged ? days.map((day) => logged.has(day)) : null;
  const anyLogged = loggedDays?.some(Boolean) ?? false;
  if (!anyLogged && ownSessions.length === 0) return null;
  return {
    loggedDays: anyLogged ? loggedDays : null,
    mobilitySessions: ownSessions.length,
    mobilityMinutes: ownSessions.reduce((sum, row) => sum + (row.minutes ?? 0), 0),
  };
}

// ── Club ──────────────────────────────────────────────────────────────────

export function buildClub(
  clubRides: ClubSection["clubRides"],
  newBlocks: number,
  badges: string[],
): ClubSection | null {
  if (clubRides.length === 0 && newBlocks === 0 && badges.length === 0) return null;
  return { clubRides: [...clubRides].sort((a, b) => a.day.localeCompare(b.day)), newBlocks, badges };
}

// ── ZWBriljant ────────────────────────────────────────────────────────────

/** Een bewaarde weeksnapshot met de score al herrekend (storedScore). */
export type BriljantSnapshot = {
  week: string;
  score: number | null;
  facets: Partial<Record<Facet, number | null>>;
  consistency?: number | null;
  /** Waar durability vandaan kwam (`provenance.durability`). */
  durability?: "test" | "ritten";
};

/** Ouder dan dit is de steen niet meer die van deze week (zoals in het Strava-blok). */
const BRILJANT_MAX_AGE_DAYS = 35;

/**
 * De steen van de week uit de bewaarde snapshots: de laatste met score tot en met
 * deze week, naast die van de week ervoor. De job maakt de snapshot op maandag;
 * een bezoek aan de steen ververst hem. Op zondagavond loopt de steen dus tot een
 * week achter, maar live rekenen kost calls naar intervals.icu en Zwift.
 */
export function buildBriljant(snapshots: BriljantSnapshot[], weekStart: string, sex: Sex | null = null): BriljantSection | null {
  const scored = snapshots
    .filter((snapshot) => snapshot.score != null && snapshot.week <= weekStart)
    .sort((a, b) => a.week.localeCompare(b.week));
  const latest = scored.at(-1);
  if (!latest || latest.score == null || latest.week < addDays(weekStart, -BRILJANT_MAX_AGE_DAYS)) return null;
  const position = positionFor(latest.score);
  const before = scored.find((snapshot) => snapshot.week === addDays(latest.week, -7));
  const grow = winsFromLevels(latest.facets, latest.consistency ?? null, sex, latest.durability)[0] ?? null;
  return {
    points: briljantPoints(latest.score),
    level: position.reached.n,
    levelName: position.reached.name,
    nextName: position.next?.name ?? null,
    toNext: position.toNext,
    previousPoints: before?.score == null ? null : briljantPoints(before.score),
    previousLevel: before?.score == null ? null : positionFor(before.score).reached.n,
    growFacet: grow?.label ?? null,
  };
}

/** Heeft het lid deze week iets gedaan dat een overzicht waard is? De steen alleen telt niet. */
export function hasContent(summary: WeekSummary): boolean {
  return Boolean(summary.rides || summary.plan || summary.teams || summary.fuel || summary.club);
}

// ── Vooruitblik ───────────────────────────────────────────────────────────

export type NextEventStatus = "opgesteld" | "aangemeld" | "beschikbaar" | "misschien";

export type NextEvent = {
  id: string;
  day: string;
  time: string;
  title: string;
  status: NextEventStatus;
  durationMinutes: number;
};

export type NextDay = {
  day: string;
  minutes: number;
  /** Titels van de geplande trainingen, zonder rustdagen. */
  plan: string | null;
  events: NextEvent[];
};

export type NextWeek = {
  weekStart: string;
  days: NextDay[];
  /** Waar de minuten vandaan komen: een eigen weekrij, de standaard of het oude doel. */
  source: "week" | "default" | "goal";
};

const STATUS_RANK: Record<NextEventStatus, number> = { opgesteld: 0, aangemeld: 1, beschikbaar: 2, misschien: 3 };

/** Eén regel per event: opgesteld gaat voor aangemeld, dat voor beschikbaar. */
export function mergeEvents(events: NextEvent[]): NextEvent[] {
  const byId = new Map<string, NextEvent>();
  for (const event of events) {
    const known = byId.get(event.id);
    if (!known || STATUS_RANK[event.status] < STATUS_RANK[known.status]) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
}

export function buildNextWeek(
  weekStart: string,
  minutesFor: (day: string) => number,
  workouts: WorkoutRow[],
  events: NextEvent[],
  source: NextWeek["source"],
): NextWeek {
  const merged = mergeEvents(events);
  return {
    weekStart,
    source,
    days: weekDays(weekStart).map((day) => {
      const titles = workouts.filter((row) => row.day === day && row.intensity !== "rest" && row.status !== "skipped").map((row) => row.title);
      return {
        day,
        minutes: minutesFor(day),
        plan: titles.length ? titles.join(" + ") : null,
        events: merged.filter((event) => event.day === day),
      };
    }),
  };
}

/**
 * Hoe lang een event duurt, voor de balk op de laatste pagina. Een eindtijd gaat
 * voor; anders een rit op afstand (28 km/u), en anders een uur.
 */
export function eventMinutes(startAt: string, endAt: string | null, distanceKm: number | null): number {
  const start = Date.parse(startAt);
  const end = endAt ? Date.parse(endAt) : NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) return Math.round((end - start) / 60_000);
  if (distanceKm && distanceKm > 0) return Math.round(((distanceKm / 28) * 60) / 15) * 15;
  return 60;
}
