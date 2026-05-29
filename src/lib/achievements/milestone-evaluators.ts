// Auto-evaluators voor tiered milestone-badges.
//
// Per achievement_code een evaluator die uit Strava-activities bepaalt
// welke tiers behaald zijn. Idempotent: nieuwe awards worden alleen
// geinsert als de unieke index (badge_id, profile_id) bij award_scope=
// 'milestone' nog leeg is. We doen 1 SELECT voor alle bestaande awards
// + 1 batched INSERT, geen N+1.

import { sendNotificationToMembers } from "@/lib/push/send";

type Activity = {
  id: number;
  distance_m: number;
  total_elevation_gain_m: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  kudos_count: number;
  start_date: string;
  trainer: boolean;
  commute: boolean;
  sport_type: string | null;
  raw: {
    start_date_local?: string;
    achievement_count?: number;
    pr_count?: number;
    athlete_count?: number;
    name?: string;
    sport_type?: string;
    type?: string;
  } | null;
};

type BadgeRow = {
  id: string;
  title: string;
  achievement_code: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  trigger_config: {
    threshold?: { value?: number; unit?: string; raw?: string };
  } | null;
};

type TierResult = {
  value: number;
  displayUnit: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  note: string;
};

type EvaluatorContext = {
  /** Set van alle col-slugs die deze rider heeft beklommen (echt + virtueel). */
  climbedCols: Set<string>;
  /** Alleen echte (niet-virtuele) cols — voor A019 Col Collector. */
  realClimbedCols: Set<string>;
  /** Alleen virtuele (Watopia) cols — voor A082/A083. */
  virtualClimbedCols: Set<string>;
  /** col_slug → times_climbed (voor A083 platinum 25×). */
  colTimes: Map<string, number>;
  /** col_slug → snelste segment-effort-tijd in seconden (voor A083 sub-75/60). */
  colBestSeconds: Map<string, number>;
};

type Evaluator = {
  code: string;
  /** Returns null als deze tier niet behaald is. */
  check: (
    acts: Activity[],
    badge: BadgeRow,
    ctx: EvaluatorContext,
  ) => TierResult | null;
};

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function localDate(a: Activity): string {
  // start_date_local is een ISO-string zonder tz (bv "2024-06-15T05:30:00Z")
  // → parsen als UTC en getUTCHours geeft het lokale uur. Voor dagstart
  // gebruiken we de eerste 10 chars die ook gewoon "YYYY-MM-DD" zijn.
  const local = a.raw?.start_date_local ?? a.start_date;
  return local.slice(0, 10);
}

function localHour(a: Activity): number {
  const local = a.raw?.start_date_local ?? a.start_date;
  // Date-parser interpreteert string zonder offset/Z als UTC, dus
  // getUTCHours geeft het lokale uur als het in start_date_local stond.
  return new Date(local).getUTCHours();
}

function avgSpeedKmh(a: Activity): number {
  if (!a.moving_time_seconds || a.moving_time_seconds <= 0) return 0;
  return (a.distance_m / a.moving_time_seconds) * 3.6;
}

function thresholdKmToMeters(badge: BadgeRow): number | null {
  const t = badge.trigger_config?.threshold;
  if (!t?.value) return null;
  const unit = (t.unit ?? "km").toLowerCase();
  return unit === "mi" ? t.value * 1609.344 : t.value * 1000;
}

function endLocalDate(a: Activity): string {
  const local = a.raw?.start_date_local ?? a.start_date;
  return new Date(new Date(local).getTime() + (a.moving_time_seconds ?? 0) * 1000)
    .toISOString()
    .slice(0, 10);
}

function endLocalHour(a: Activity): number {
  const local = a.raw?.start_date_local ?? a.start_date;
  return new Date(new Date(local).getTime() + (a.moving_time_seconds ?? 0) * 1000)
    .getUTCHours();
}

function isOutdoor(a: Activity): boolean {
  return !a.trainer;
}

function isGravel(a: Activity): boolean {
  const t = (a.sport_type ?? "").toLowerCase();
  return t.includes("gravel");
}

function isOffroad(a: Activity): boolean {
  const t = `${a.sport_type ?? ""} ${a.raw?.sport_type ?? ""} ${a.raw?.type ?? ""}`
    .toLowerCase();
  return t.includes("gravel") || t.includes("mountain") || t.includes("mtb");
}

function rawName(a: Activity): string {
  return `${a.raw?.name ?? ""}`.toLowerCase();
}

function athleteCount(a: Activity): number {
  const count = Number(a.raw?.athlete_count ?? 1);
  return Number.isFinite(count) && count > 0 ? count : 1;
}

function activityAchievements(a: Activity): number {
  const count = Number(a.raw?.achievement_count ?? a.raw?.pr_count ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function parseLeadingNumber(raw: string): number | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

function monthEnd(month: string): string {
  const [year, monthNr] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNr, 0)).toISOString().slice(0, 10);
}

function isDarkHour(hour: number) {
  return hour < 6 || hour >= 20;
}

function isoWeek(dateStr: string): string {
  // Geeft "YYYY-Www" terug voor ISO-week-streak.
  const d = new Date(dateStr + "T12:00:00Z"); // middag UTC voorkomt DST-edges
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseSpeedRaw(raw: string): { speedKmh: number; minDistKm: number } | null {
  // "25 km/u over 50 km" / "30 km/u over 100 km" / "35 km/u over 100 km"
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*km\/u.*?(\d+(?:[.,]\d+)?)\s*km/i);
  if (!m) return null;
  return {
    speedKmh: parseFloat(m[1].replace(",", ".")),
    minDistKm: parseFloat(m[2].replace(",", ".")),
  };
}

function parseTimeCap(raw: string): number | null {
  // "< 4u" / "< 3u30" / "< 1u15" / "< 1u" → seconden
  const m = raw.match(/<\s*(\d+)\s*u\s*(\d{1,2})?/i);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  return h * 3600 + min * 60;
}

function parseCountTimes(raw: string): number | null {
  // Accept x, the multiplication sign, and older mojibake variants from seeds.
  const m = raw.match(/(\d+)\s*(?:x|\u00d7|\u00c3\u0097)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ──────────────────────────────────────────────────────────────────────
// Evaluators
// ──────────────────────────────────────────────────────────────────────

function bestSingleByDistance(
  acts: Activity[],
  minDistanceMeters: number,
  predicate: (a: Activity) => boolean = isOutdoor,
): Activity | null {
  let best: Activity | null = null;
  for (const a of acts) {
    if (!predicate(a)) continue;
    if ((a.distance_m ?? 0) < minDistanceMeters) continue;
    if (!best || a.distance_m > best.distance_m) best = a;
  }
  return best;
}

function bestSingleByElevation(
  acts: Activity[],
  minElevationMeters: number,
  predicate: (a: Activity) => boolean = isOutdoor,
): Activity | null {
  let best: Activity | null = null;
  for (const a of acts) {
    if (!predicate(a)) continue;
    const elevation = a.total_elevation_gain_m ?? 0;
    if (elevation < minElevationMeters) continue;
    if (!best || elevation > best.total_elevation_gain_m) best = a;
  }
  return best;
}

function singleDistanceResult(
  badge: BadgeRow,
  acts: Activity[],
  note: string,
  predicate: (a: Activity) => boolean = isOutdoor,
  unit = "km",
): TierResult | null {
  const thresholdM = thresholdKmToMeters(badge);
  if (!thresholdM) return null;
  const best = bestSingleByDistance(acts, thresholdM, predicate);
  if (!best) return null;
  const date = localDate(best);
  return {
    value: Math.round(best.distance_m / 100) / 10,
    displayUnit: unit,
    periodStart: date,
    periodEnd: date,
    note,
  };
}

function singleElevationResult(
  badge: BadgeRow,
  acts: Activity[],
  note: string,
  predicate: (a: Activity) => boolean = isOutdoor,
  unit = "hm",
): TierResult | null {
  const t = badge.trigger_config?.threshold;
  if (!t?.value) return null;
  const best = bestSingleByElevation(acts, t.value, predicate);
  if (!best) return null;
  const date = localDate(best);
  return {
    value: Math.round(best.total_elevation_gain_m),
    displayUnit: unit,
    periodStart: date,
    periodEnd: date,
    note,
  };
}

const EVALUATORS: Evaluator[] = [
  // ── A001 Distance Ride — max afstand in één outdoor rit ─────────────
  {
    code: "A001",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const unit = (t.unit ?? "km").toLowerCase();
      const thresholdM =
        unit === "mi" ? t.value * 1609.344 : t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM);
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km",
        periodStart: date,
        periodEnd: date,
        note: "Max afstand in één rit",
      };
    },
  },

  // ── A002 Climbing Ride — max hoogtemeters in één rit ────────────────
  {
    code: "A002",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      let best: Activity | null = null;
      for (const a of acts) {
        const e = a.total_elevation_gain_m ?? 0;
        if (e < t.value) continue;
        if (!best || e > best.total_elevation_gain_m) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.total_elevation_gain_m),
        displayUnit: "m",
        periodStart: date,
        periodEnd: date,
        note: "Max hoogtemeters in één rit",
      };
    },
  },

  // ── A003 Long Day Out — max moving_time in één rit ──────────────────
  {
    code: "A003",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const u = (t.unit ?? "uur").toLowerCase();
      const thresholdSec =
        u === "uur" || u === "u" ? t.value * 3600 : u === "min" ? t.value * 60 : t.value;
      let best: Activity | null = null;
      for (const a of acts) {
        const s = a.moving_time_seconds ?? 0;
        if (s < thresholdSec) continue;
        if (!best || s > best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round((best.moving_time_seconds / 3600) * 10) / 10,
        displayUnit: "uur",
        periodStart: date,
        periodEnd: date,
        note: "Langste rit",
      };
    },
  },

  // A004 First Group Ride - Strava athlete_count proxy.
  {
    code: "A004",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        if (athleteCount(a) < t.value) continue;
        if (!best || athleteCount(a) > athleteCount(best)) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: athleteCount(best),
        displayUnit: "renners",
        periodStart: date,
        periodEnd: date,
        note: "Grootste Strava-groepsrit",
      };
    },
  },

  // ── A005 Solo Warrior — max outdoor distance (proxy: trainer=false) ─
  // Strava heeft geen "solo" flag; we gebruiken outdoor-ritten als proxy.
  {
    code: "A005",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM, isOutdoor);
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km",
        periodStart: date,
        periodEnd: date,
        note: "Lange outdoor rit",
      };
    },
  },

  // ── A006 Speed Ride — gem. snelheid over min-distance ───────────────
  {
    code: "A006",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      const parsed = parseSpeedRaw(raw);
      if (!parsed) return null;
      const minDistM = parsed.minDistKm * 1000;
      let best: { a: Activity; speed: number } | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        if ((a.distance_m ?? 0) < minDistM) continue;
        const s = avgSpeedKmh(a);
        if (s < parsed.speedKmh) continue;
        if (!best || s > best.speed) best = { a, speed: s };
      }
      if (!best) return null;
      const date = localDate(best.a);
      return {
        value: Math.round(best.speed * 10) / 10,
        displayUnit: "km/u",
        periodStart: date,
        periodEnd: date,
        note: `Gem. snelheid over ${parsed.minDistKm}+ km`,
      };
    },
  },

  // ── A007 Century Club — aantal 100km+ ritten ────────────────────────
  {
    code: "A007",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      // Bronze "100 km" → 1, anders "N× 100 km" → N
      const required = parseCountTimes(raw) ?? 1;
      const hundreds = acts.filter(
        (a) => isOutdoor(a) && (a.distance_m ?? 0) >= 100_000,
      );
      if (hundreds.length < required) return null;
      hundreds.sort((a, b) => a.start_date.localeCompare(b.start_date));
      const earliest = hundreds[required - 1]; // de N-de
      const date = localDate(earliest);
      return {
        value: hundreds.length,
        displayUnit: "× 100 km",
        periodStart: localDate(hundreds[0]),
        periodEnd: date,
        note: `${hundreds.length} ritten van 100 km+`,
      };
    },
  },

  // ── A008 Double Century — single ride ≥ X km (outdoor) ──────────────
  {
    code: "A008",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM, isOutdoor);
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km",
        periodStart: date,
        periodEnd: date,
        note: "Mega-rit",
      };
    },
  },

  // A009 Weekend Warrior - best Saturday/Sunday distance total.
  {
    code: "A009",
    check: (acts, badge) => {
      const thresholdM = thresholdKmToMeters(badge);
      if (!thresholdM) return null;
      const weekends = new Map<string, { distance: number; first: string; last: string }>();
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const date = localDate(a);
        const d = new Date(`${date}T12:00:00Z`);
        const day = d.getUTCDay();
        if (day !== 6 && day !== 0) continue;
        if (day === 0) d.setUTCDate(d.getUTCDate() - 1);
        const key = d.toISOString().slice(0, 10);
        const current = weekends.get(key) ?? {
          distance: 0,
          first: key,
          last: new Date(d.getTime() + 86400_000).toISOString().slice(0, 10),
        };
        current.distance += a.distance_m ?? 0;
        weekends.set(key, current);
      }
      let best: { distance: number; first: string; last: string } | null = null;
      for (const weekend of weekends.values()) {
        if (weekend.distance < thresholdM) continue;
        if (!best || weekend.distance > best.distance) best = weekend;
      }
      if (!best) return null;
      return {
        value: Math.round(best.distance / 1000),
        displayUnit: "km weekend",
        periodStart: best.first,
        periodEnd: best.last,
        note: "Beste weekendtotaal",
      };
    },
  },

  // A012 Mountain Goat - max climbing in one outdoor ride.
  {
    code: "A012",
    check: (acts, badge) =>
      singleElevationResult(badge, acts, "Max hoogtemeters in een rit"),
  },

  // A017 Everesting Prep - max climbing in one outdoor ride.
  {
    code: "A017",
    check: (acts, badge) =>
      singleElevationResult(badge, acts, "Everesting-prep hoogte"),
  },

  // A018 Everesting - quarter/half/full/10K based on single-ride elevation.
  {
    code: "A018",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw?.toLowerCase() ?? "";
      const threshold = raw.includes("quarter")
        ? 2212
        : raw.includes("half")
          ? 4424
          : raw.includes("10k")
            ? 10000
            : raw.includes("full")
              ? 8848
              : null;
      if (!threshold) return null;
      return singleElevationResult(
        { ...badge, trigger_config: { threshold: { value: threshold } } },
        acts,
        "Everesting-hoogte in een rit",
      );
    },
  },

  // A020 Alpine Epic - long ride with enough climbing to feel mountainous.
  {
    code: "A020",
    check: (acts, badge) => {
      const thresholdM = thresholdKmToMeters(badge);
      if (!thresholdM) return null;
      const best = bestSingleByDistance(
        acts,
        thresholdM,
        (a) => isOutdoor(a) && (a.total_elevation_gain_m ?? 0) >= 1500,
      );
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km bergen",
        periodStart: date,
        periodEnd: date,
        note: "Lange bergachtige rit",
      };
    },
  },

  // A021 Flatlander - long ride with low elevation density.
  {
    code: "A021",
    check: (acts, badge) => {
      const thresholdM = thresholdKmToMeters(badge);
      if (!thresholdM) return null;
      const best = bestSingleByDistance(
        acts,
        thresholdM,
        (a) => {
          if (!isOutdoor(a)) return false;
          const km = (a.distance_m ?? 0) / 1000;
          return km > 0 && (a.total_elevation_gain_m ?? 0) / km <= 4;
        },
      );
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km vlak",
        periodStart: date,
        periodEnd: date,
        note: "Lange vlakke rit",
      };
    },
  },

  // A026 Night Ride - dark start/finish and long night ride proxies.
  {
    code: "A026",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw?.toLowerCase() ?? "";
      let best: Activity | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const startDark = isDarkHour(localHour(a));
        const finishDark = isDarkHour(endLocalHour(a));
        const longNight = (a.distance_m ?? 0) >= 100_000 && (startDark || finishDark);
        const allNight = startDark && (a.moving_time_seconds ?? 0) >= 6 * 3600;
        const matches = raw.includes("start")
          ? startDark
          : raw.includes("finish")
            ? finishDark
            : raw.includes("100")
              ? longNight
              : raw.includes("hele")
                ? allNight
                : false;
        if (!matches) continue;
        if (!best || (a.moving_time_seconds ?? 0) > (best.moving_time_seconds ?? 0)) {
          best = a;
        }
      }
      if (!best) return null;
      return {
        value: Math.round((best.moving_time_seconds / 3600) * 10) / 10,
        displayUnit: "uur donker",
        periodStart: localDate(best),
        periodEnd: endLocalDate(best),
        note: "Rit in het donker",
      };
    },
  },

  // ── A027 Sunrise Rider — start vóór 7:00 lokaal ─────────────────────
  {
    code: "A027",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      const required = parseCountTimes(raw) ?? 1;
      const matches = acts.filter(
        (a) => isOutdoor(a) && localHour(a) < 7,
      );
      if (matches.length < required) return null;
      matches.sort((a, b) => a.start_date.localeCompare(b.start_date));
      return {
        value: matches.length,
        displayUnit: "× zonsopgang",
        periodStart: localDate(matches[0]),
        periodEnd: localDate(matches[matches.length - 1]),
        note: `${matches.length} ritten vóór 7:00`,
      };
    },
  },

  // ── A028 Sunset Rider — start na 19:00 lokaal ───────────────────────
  {
    code: "A028",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      const required = parseCountTimes(raw) ?? 1;
      const matches = acts.filter(
        (a) => isOutdoor(a) && localHour(a) >= 19,
      );
      if (matches.length < required) return null;
      matches.sort((a, b) => a.start_date.localeCompare(b.start_date));
      return {
        value: matches.length,
        displayUnit: "× zonsondergang",
        periodStart: localDate(matches[0]),
        periodEnd: localDate(matches[matches.length - 1]),
        note: `${matches.length} ritten na 19:00`,
      };
    },
  },

  // ── A029 24 Hour Legs — single ride ≥ X uur ─────────────────────────
  {
    code: "A029",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const u = (t.unit ?? "uur").toLowerCase();
      const thresholdSec = u.startsWith("u") ? t.value * 3600 : t.value;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const s = a.moving_time_seconds ?? 0;
        if (s < thresholdSec) continue;
        if (!best || s > best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round((best.moving_time_seconds / 3600) * 10) / 10,
        displayUnit: "uur",
        periodStart: date,
        periodEnd: date,
        note: "Ultra-rit",
      };
    },
  },

  // ── A030 Ultra Starter — single ride ≥ X km ─────────────────────────
  {
    code: "A030",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM, isOutdoor);
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km",
        periodStart: date,
        periodEnd: date,
        note: "Ultra-distance",
      };
    },
  },

  // A031 Segment PR - sum Strava achievement_count/pr_count.
  {
    code: "A031",
    check: (acts, badge) => {
      const required = parseLeadingNumber(badge.trigger_config?.threshold?.raw ?? "");
      if (!required) return null;
      const total = acts.reduce((sum, a) => sum + activityAchievements(a), 0);
      if (total < required) return null;
      const dates = acts
        .filter((a) => activityAchievements(a) > 0)
        .map(localDate)
        .sort();
      return {
        value: total,
        displayUnit: "PRs",
        periodStart: dates[0] ?? localDate(acts[0]),
        periodEnd: dates[dates.length - 1] ?? localDate(acts[acts.length - 1]),
        note: "Strava activity achievements",
      };
    },
  },

  // ── A038 Fast Century — 100 km onder X tijd ─────────────────────────
  {
    code: "A038",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      const cap = parseTimeCap(raw);
      if (!cap) return null;
      const minDistM = 100_000;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        if ((a.distance_m ?? 0) < minDistM) continue;
        if ((a.moving_time_seconds ?? Infinity) > cap) continue;
        if (!best || a.moving_time_seconds < best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      const hrs = Math.floor(best.moving_time_seconds / 3600);
      const mins = Math.round((best.moving_time_seconds % 3600) / 60);
      return {
        value: parseFloat(`${hrs}.${String(mins).padStart(2, "0")}`),
        displayUnit: `u (${best.distance_m / 1000 | 0} km)`,
        periodStart: date,
        periodEnd: date,
        note: `Snelste 100 km+ in ${hrs}u${mins}m`,
      };
    },
  },

  // ── A039 Fast 40 — 40 km onder X tijd ───────────────────────────────
  {
    code: "A039",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw ?? "";
      const cap = parseTimeCap(raw);
      if (!cap) return null;
      const minDistM = 40_000;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        if ((a.distance_m ?? 0) < minDistM) continue;
        if ((a.distance_m ?? 0) > 80_000) continue; // 40 km, geen century
        if ((a.moving_time_seconds ?? Infinity) > cap) continue;
        if (!best || a.moving_time_seconds < best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      const hrs = Math.floor(best.moving_time_seconds / 3600);
      const mins = Math.round((best.moving_time_seconds % 3600) / 60);
      return {
        value: parseFloat(`${hrs}.${String(mins).padStart(2, "0")}`),
        displayUnit: `u (${best.distance_m / 1000 | 0} km)`,
        periodStart: date,
        periodEnd: date,
        note: `Snelste 40 km in ${hrs}u${mins}m`,
      };
    },
  },

  // ── A041 Ride Streak — opeenvolgende dagen ──────────────────────────
  {
    code: "A041",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const required = t.value;
      const uniqDates = Array.from(
        new Set(acts.filter(isOutdoor).map(localDate)),
      ).sort();
      if (uniqDates.length === 0) return null;
      let longest = 1;
      let current = 1;
      let bestEnd = uniqDates[0];
      for (let i = 1; i < uniqDates.length; i++) {
        const prev = new Date(uniqDates[i - 1] + "T12:00:00Z");
        const curr = new Date(uniqDates[i] + "T12:00:00Z");
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (diff === 1) {
          current++;
          if (current > longest) {
            longest = current;
            bestEnd = uniqDates[i];
          }
        } else {
          current = 1;
        }
      }
      if (longest < required) return null;
      const endIdx = uniqDates.indexOf(bestEnd);
      const startIdx = Math.max(0, endIdx - longest + 1);
      return {
        value: longest,
        displayUnit: "dagen",
        periodStart: uniqDates[startIdx],
        periodEnd: bestEnd,
        note: `Streak van ${longest} dagen`,
      };
    },
  },

  // ── A042 Weekly Rider — opeenvolgende weken ─────────────────────────
  {
    code: "A042",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const required = t.value;
      const weekSet = new Set<string>();
      const weekFirstDate = new Map<string, string>();
      for (const a of acts.filter(isOutdoor)) {
        const d = localDate(a);
        const w = isoWeek(d);
        weekSet.add(w);
        if (!weekFirstDate.has(w) || d < weekFirstDate.get(w)!) {
          weekFirstDate.set(w, d);
        }
      }
      const weeks = Array.from(weekSet).sort();
      if (weeks.length === 0) return null;
      let longest = 1;
      let current = 1;
      let bestEnd = weeks[0];
      for (let i = 1; i < weeks.length; i++) {
        // ISO weeks consecutive check via parsed date diff
        const prev = weekFirstDate.get(weeks[i - 1])!;
        const curr = weekFirstDate.get(weeks[i])!;
        const diff =
          (new Date(curr + "T12:00:00Z").getTime() -
            new Date(prev + "T12:00:00Z").getTime()) /
          86400000;
        if (diff >= 6 && diff <= 8) {
          current++;
          if (current > longest) {
            longest = current;
            bestEnd = weeks[i];
          }
        } else {
          current = 1;
        }
      }
      if (longest < required) return null;
      return {
        value: longest,
        displayUnit: "weken",
        periodStart: weekFirstDate.get(weeks[0])!,
        periodEnd: weekFirstDate.get(bestEnd)!,
        note: `${longest} weken op rij`,
      };
    },
  },

  // ── A043 Monthly Distance — beste maand in km ───────────────────────
  {
    code: "A043",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const perMonth = new Map<string, number>();
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const ym = localDate(a).slice(0, 7);
        perMonth.set(ym, (perMonth.get(ym) ?? 0) + (a.distance_m ?? 0));
      }
      let bestMonth: string | null = null;
      let bestVal = 0;
      for (const [m, v] of perMonth) {
        if (v > bestVal) {
          bestVal = v;
          bestMonth = m;
        }
      }
      if (!bestMonth || bestVal < thresholdM) return null;
      return {
        value: Math.round(bestVal / 1000),
        displayUnit: "km",
        periodStart: `${bestMonth}-01`,
        periodEnd: `${bestMonth}-28`,
        note: `Beste maand: ${bestMonth}`,
      };
    },
  },

  // ── A044 Year Distance — beste jaar in km ───────────────────────────
  {
    code: "A044",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const perYear = new Map<string, number>();
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const y = localDate(a).slice(0, 4);
        perYear.set(y, (perYear.get(y) ?? 0) + (a.distance_m ?? 0));
      }
      let bestYear: string | null = null;
      let bestVal = 0;
      for (const [y, v] of perYear) {
        if (v > bestVal) {
          bestVal = v;
          bestYear = y;
        }
      }
      if (!bestYear || bestVal < thresholdM) return null;
      return {
        value: Math.round(bestVal / 1000),
        displayUnit: "km",
        periodStart: `${bestYear}-01-01`,
        periodEnd: `${bestYear}-12-31`,
        note: `Beste jaar: ${bestYear}`,
      };
    },
  },

  // ── A045 Elevation Year — beste jaar in hoogtemeters ────────────────
  {
    code: "A045",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const threshold = t.value; // hm = m
      const perYear = new Map<string, number>();
      for (const a of acts) {
        if (!isOutdoor(a)) continue;
        const y = localDate(a).slice(0, 4);
        perYear.set(
          y,
          (perYear.get(y) ?? 0) + (a.total_elevation_gain_m ?? 0),
        );
      }
      let bestYear: string | null = null;
      let bestVal = 0;
      for (const [y, v] of perYear) {
        if (v > bestVal) {
          bestVal = v;
          bestYear = y;
        }
      }
      if (!bestYear || bestVal < threshold) return null;
      return {
        value: Math.round(bestVal),
        displayUnit: "hm",
        periodStart: `${bestYear}-01-01`,
        periodEnd: `${bestYear}-12-31`,
        note: `Beste jaar: ${bestYear}`,
      };
    },
  },

  // A046 Winter Warrior - active winter months, plus Festive 500 proxy.
  {
    code: "A046",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw?.toLowerCase() ?? "";
      const winterActs = acts.filter((a) => {
        if (!isOutdoor(a)) return false;
        const month = Number(localDate(a).slice(5, 7));
        return month === 12 || month === 1 || month === 2;
      });
      if (raw.includes("festive")) {
        const perYear = new Map<string, number>();
        for (const a of acts.filter(isOutdoor)) {
          const d = localDate(a);
          const monthDay = d.slice(5, 10);
          if (monthDay < "12-24" && monthDay > "01-01") continue;
          const year = monthDay >= "12-24" ? d.slice(0, 4) : String(Number(d.slice(0, 4)) - 1);
          perYear.set(year, (perYear.get(year) ?? 0) + (a.distance_m ?? 0));
        }
        let bestYear: string | null = null;
        let best = 0;
        for (const [year, distance] of perYear) {
          if (distance > best) {
            best = distance;
            bestYear = year;
          }
        }
        if (!bestYear || best < 500_000) return null;
        return {
          value: Math.round(best / 1000),
          displayUnit: "km festive",
          periodStart: `${bestYear}-12-24`,
          periodEnd: `${Number(bestYear) + 1}-01-01`,
          note: "Festive 500 periode",
        };
      }

      const months = Array.from(new Set(winterActs.map((a) => localDate(a).slice(0, 7)))).sort();
      const required = raw.includes("hele") ? 3 : parseLeadingNumber(raw) ?? 1;
      if (months.length < required) return null;
      return {
        value: months.length,
        displayUnit: "wintermaanden",
        periodStart: `${months[0]}-01`,
        periodEnd: monthEnd(months[months.length - 1]),
        note: "Actieve wintermaanden",
      };
    },
  },

  // A051 Group Ride Hero - count outdoor rides with Strava athlete_count > 1.
  {
    code: "A051",
    check: (acts, badge) => {
      const required = parseLeadingNumber(badge.trigger_config?.threshold?.raw ?? "");
      if (!required) return null;
      const groupRides = acts
        .filter((a) => isOutdoor(a) && athleteCount(a) > 1)
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
      if (groupRides.length < required) return null;
      return {
        value: groupRides.length,
        displayUnit: "groepsritten",
        periodStart: localDate(groupRides[0]),
        periodEnd: localDate(groupRides[groupRides.length - 1]),
        note: "Strava athlete_count > 1",
      };
    },
  },

  // ── A057 Kudos Magnet — kudos op één rit ────────────────────────────
  {
    code: "A057",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      let best: Activity | null = null;
      for (const a of acts) {
        const k = a.kudos_count ?? 0;
        if (k < t.value) continue;
        if (!best || k > (best.kudos_count ?? 0)) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: best.kudos_count,
        displayUnit: "kudos",
        periodStart: date,
        periodEnd: date,
        note: "Populairste rit",
      };
    },
  },

  // ── A071 Gravel Starter — gravel-rit langer dan X km ────────────────
  {
    code: "A071",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM, (a) => isGravel(a));
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km gravel",
        periodStart: date,
        periodEnd: date,
        note: "Langste gravel-rit",
      };
    },
  },

  // A075 Offroad Century - gravel/MTB single-ride distance.
  {
    code: "A075",
    check: (acts, badge) =>
      singleDistanceResult(
        badge,
        acts,
        "Langste offroad-rit",
        isOffroad,
        "km offroad",
      ),
  },

  // ── A081 Indoor Starter — trainer-tijd in één sessie ────────────────
  {
    code: "A081",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const u = (t.unit ?? "uur").toLowerCase();
      const thresholdSec =
        u === "uur" || u === "u"
          ? t.value * 3600
          : u === "min"
          ? t.value * 60
          : t.value;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!a.trainer) continue;
        const s = a.moving_time_seconds ?? 0;
        if (s < thresholdSec) continue;
        if (!best || s > best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round((best.moving_time_seconds / 60) * 10) / 10,
        displayUnit: "min indoor",
        periodStart: date,
        periodEnd: date,
        note: "Langste indoor-sessie",
      };
    },
  },

  // ── A084 Indoor Century — trainer-afstand in één sessie ─────────────
  {
    code: "A084",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdM = t.value * 1000;
      const best = bestSingleByDistance(acts, thresholdM, (a) => a.trainer);
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.distance_m / 100) / 10,
        displayUnit: "km indoor",
        periodStart: date,
        periodEnd: date,
        note: "Langste indoor-rit",
      };
    },
  },

  // A085 RoboPacer - trainer rides with pacer/robopacer in the title.
  {
    code: "A085",
    check: (acts, badge) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const thresholdSec = t.value * 3600;
      let best: Activity | null = null;
      for (const a of acts) {
        if (!a.trainer) continue;
        const name = rawName(a);
        if (!name.includes("pacer") && !name.includes("robopacer")) continue;
        const s = a.moving_time_seconds ?? 0;
        if (s < thresholdSec) continue;
        if (!best || s > best.moving_time_seconds) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round((best.moving_time_seconds / 3600) * 10) / 10,
        displayUnit: "uur pacer",
        periodStart: date,
        periodEnd: date,
        note: "RoboPacer-sessie",
      };
    },
  },

  // A088 Ride Ons - Strava kudos on trainer rides as Ride On proxy.
  {
    code: "A088",
    check: (acts, badge) => {
      const required = parseLeadingNumber(badge.trigger_config?.threshold?.raw ?? "");
      if (!required) return null;
      const indoor = acts.filter((a) => a.trainer);
      const total = indoor.reduce((sum, a) => sum + (a.kudos_count ?? 0), 0);
      if (total < required) return null;
      const dates = indoor.filter((a) => (a.kudos_count ?? 0) > 0).map(localDate).sort();
      return {
        value: total,
        displayUnit: "ride ons",
        periodStart: dates[0] ?? localDate(indoor[0]),
        periodEnd: dates[dates.length - 1] ?? localDate(indoor[indoor.length - 1]),
        note: "Ontvangen kudos op indoorritten",
      };
    },
  },

  // A090 Virtual Everesting - trainer elevation thresholds.
  {
    code: "A090",
    check: (acts, badge) => {
      const raw = badge.trigger_config?.threshold?.raw?.toLowerCase() ?? "";
      const threshold = raw.includes("quarter")
        ? 2212
        : raw.includes("half")
          ? 4424
          : raw.includes("10k")
            ? 10000
            : raw.includes("full")
              ? 8848
              : null;
      if (!threshold) return null;
      return singleElevationResult(
        { ...badge, trigger_config: { threshold: { value: threshold } } },
        acts,
        "Virtuele everesting-hoogte",
        (a) => a.trainer,
      );
    },
  },

  // A096 Super Randonneur - single ultra-distance ride proxy.
  {
    code: "A096",
    check: (acts, badge) =>
      singleDistanceResult(badge, acts, "Randonneur-afstand in een rit"),
  },

  // ── Col-detector-evaluators (A013-A019, A095) ─────────────────────────
  // Gebruiken ctx.climbedCols (gepopuleerd uit profile_climbed_cols).
  // Datum-bepaling: voor singleshot-cols gebruiken we today (we kennen
  // de exacte rit-datum niet via deze evaluator-shape; alternatief is
  // join met profile_climbed_cols.first_climbed_at, maar te complex).

  // A013 Alpe Finisher — alpe-d-huez geklommen
  {
    code: "A013",
    check: (_acts, _badge, ctx) => {
      if (!ctx.climbedCols.has("alpe-d-huez")) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: 1,
        displayUnit: "× Alpe d'Huez",
        periodStart: today,
        periodEnd: today,
        note: "Alpe d'Huez beklommen",
      };
    },
  },

  // A014 Ventoux Finisher — mont-ventoux geklommen
  {
    code: "A014",
    check: (_acts, _badge, ctx) => {
      if (!ctx.climbedCols.has("mont-ventoux")) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: 1,
        displayUnit: "× Mont Ventoux",
        periodStart: today,
        periodEnd: today,
        note: "Mont Ventoux beklommen",
      };
    },
  },

  // A015 Marmotte Finisher — alle 5 Marmotte-cols geklommen
  {
    code: "A015",
    check: (_acts, _badge, ctx) => {
      const MARMOTTE = [
        "col-du-glandon",
        "col-du-telegraphe",
        "col-du-galibier",
        "col-de-la-croix-de-fer",
        "alpe-d-huez",
      ];
      const done = MARMOTTE.filter((slug) => ctx.climbedCols.has(slug));
      if (done.length < MARMOTTE.length) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: MARMOTTE.length,
        displayUnit: "Marmotte-cols",
        periodStart: today,
        periodEnd: today,
        note: "Alle 5 Marmotte-cols beklommen",
      };
    },
  },

  // A016 Dolomiti Rider — minstens 1 col uit de Dolomieten
  {
    code: "A016",
    check: (_acts, _badge, ctx) => {
      const DOLOMITI = ["passo-pordoi", "passo-falzarego"];
      const done = DOLOMITI.filter((slug) => ctx.climbedCols.has(slug));
      if (done.length === 0) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: done.length,
        displayUnit: "Dolomieten-cols",
        periodStart: today,
        periodEnd: today,
        note: `${done.length} Dolomieten-col(s) beklommen`,
      };
    },
  },

  // A019 Col Collector — aantal unieke ECHTE cols (geen Watopia)
  {
    code: "A019",
    check: (_acts, badge, ctx) => {
      const t = badge.trigger_config?.threshold;
      if (!t?.value) return null;
      const count = ctx.realClimbedCols.size;
      if (count < t.value) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: count,
        displayUnit: "cols",
        periodStart: today,
        periodEnd: today,
        note: `${count} unieke cols beklommen`,
      };
    },
  },

  // A083 Alpe du Zwift — bronze (finish) + platinum (25×) auto.
  // Silver/gold zijn tijd-gebaseerd (sub 75/60 min): auto-detecteerbaar zodra
  // de Strava-segmenttijd in colBestSeconds zit.
  {
    code: "A083",
    check: (_acts, badge, ctx) => {
      const raw = (badge.trigger_config?.threshold?.raw ?? "").toLowerCase();
      const climbed = ctx.virtualClimbedCols.has("zwift-alpe-du-zwift");
      if (!climbed) return null;
      const times = ctx.colTimes.get("zwift-alpe-du-zwift") ?? 0;
      const today = new Date().toISOString().slice(0, 10);

      // "sub 75" / "sub 60" → tijd-gebaseerd op de snelste segment-effort.
      const subMatch = raw.match(/sub[\s-]?(\d{2,3})/);
      if (subMatch) {
        const best = ctx.colBestSeconds.get("zwift-alpe-du-zwift");
        if (best == null) return null;
        const limitSeconds = Number(subMatch[1]) * 60;
        if (best > limitSeconds) return null;
        const mm = Math.floor(best / 60);
        const ss = String(best % 60).padStart(2, "0");
        return {
          value: best,
          displayUnit: "s Alpe du Zwift",
          periodStart: today,
          periodEnd: today,
          note: `Alpe du Zwift in ${mm}:${ss} (sub ${subMatch[1]} min)`,
        };
      }

      if (raw.includes("finish")) {
        return {
          value: times,
          displayUnit: "× Alpe du Zwift",
          periodStart: today,
          periodEnd: today,
          note: "Alpe du Zwift voltooid",
        };
      }
      // "25× Alpe" → platinum
      const timesNeeded = parseCountTimes(raw);
      if (timesNeeded !== null) {
        if (times < timesNeeded) return null;
        return {
          value: times,
          displayUnit: "× Alpe du Zwift",
          periodStart: today,
          periodEnd: today,
          note: `${times}× Alpe du Zwift`,
        };
      }
      return null;
    },
  },

  // A090 Virtual Everesting — hoogtemeters in één virtuele rit
  // (VirtualRide). Quarter 2212 / Half 4424 / Full 8848 / 10K 10000.
  {
    code: "A090",
    check: (acts, badge) => {
      const raw = (badge.trigger_config?.threshold?.raw ?? "").toLowerCase();
      const threshold = raw.includes("quarter")
        ? 2212
        : raw.includes("half")
          ? 4424
          : raw.includes("10k")
            ? 10000
            : raw.includes("full")
              ? 8848
              : null;
      if (!threshold) return null;
      let best: Activity | null = null;
      for (const a of acts) {
        const isVirtual =
          (a.sport_type ?? "") === "VirtualRide" || Boolean(a.trainer);
        if (!isVirtual) continue;
        const hm = a.total_elevation_gain_m ?? 0;
        if (hm < threshold) continue;
        if (!best || hm > best.total_elevation_gain_m) best = a;
      }
      if (!best) return null;
      const date = localDate(best);
      return {
        value: Math.round(best.total_elevation_gain_m),
        displayUnit: "hm virtueel",
        periodStart: date,
        periodEnd: date,
        note: "Virtual Everesting-hoogte in één rit",
      };
    },
  },

  // A095 Stelvio Finisher — passo-dello-stelvio geklommen
  {
    code: "A095",
    check: (_acts, _badge, ctx) => {
      if (!ctx.climbedCols.has("passo-dello-stelvio")) return null;
      const today = new Date().toISOString().slice(0, 10);
      return {
        value: 1,
        displayUnit: "× Stelvio",
        periodStart: today,
        periodEnd: today,
        note: "Passo dello Stelvio beklommen",
      };
    },
  },
];

// ──────────────────────────────────────────────────────────────────────
// Hoofdroutine: batched select + insert
// ──────────────────────────────────────────────────────────────────────

/**
 * Haal ALLE strava_activities van een profiel op, gepagineerd via
 * .range(). Supabase capt selects standaard op 1000 rijen — zonder
 * paginatie missen riders met >1000 ritten hun recentste activiteiten
 * in de milestone-evaluatie.
 */
async function fetchAllActivitiesForEval(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<Activity[]> {
  const PAGE = 500;
  const all: Activity[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("strava_activities")
      .select(
        "id, distance_m, total_elevation_gain_m, moving_time_seconds, elapsed_time_seconds, kudos_count, start_date, trainer, commute, sport_type, raw",
      )
      .eq("profile_id", profileId)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as Activity[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export async function evaluateMilestonesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<{ awarded: number; skipped: number; errors: string[] }> {
  const codes = EVALUATORS.map((e) => e.code);

  const [{ data: badges }, acts, { data: existingAwards }] = await Promise.all([
    supabase
      .from("achievement_badges")
      .select("id, title, achievement_code, tier, trigger_config")
      .eq("kind", "milestone")
      .in("achievement_code", codes),
    fetchAllActivitiesForEval(supabase, profileId),
    supabase
      .from("achievement_awards")
      .select("badge_id")
      .eq("profile_id", profileId)
      .eq("award_scope", "milestone"),
  ]);

  const badgeRows = (badges ?? []) as BadgeRow[];
  const alreadyAwarded = new Set<string>(
    ((existingAwards ?? []) as { badge_id: string }[]).map((a) => a.badge_id),
  );

  // Climbed-cols context voor A013-A019, A082, A083, A095. Lege sets als er
  // nog niets gescand is — evaluators returnen dan gewoon null.
  const [{ data: climbedRows }, { data: virtualColRows }] = await Promise.all([
    supabase
      .from("profile_climbed_cols")
      .select("col_slug, times_climbed, best_time_seconds")
      .eq("profile_id", profileId),
    supabase.from("cols").select("slug").eq("virtual", true),
  ]);

  const virtualSlugs = new Set(
    ((virtualColRows ?? []) as { slug: string }[]).map((r) => r.slug),
  );
  const climbedCols = new Set<string>();
  const realClimbedCols = new Set<string>();
  const virtualClimbedCols = new Set<string>();
  const colTimes = new Map<string, number>();
  const colBestSeconds = new Map<string, number>();
  for (const row of (climbedRows ?? []) as {
    col_slug: string;
    times_climbed: number | null;
    best_time_seconds: number | null;
  }[]) {
    climbedCols.add(row.col_slug);
    colTimes.set(row.col_slug, row.times_climbed ?? 1);
    if (row.best_time_seconds != null) {
      colBestSeconds.set(row.col_slug, row.best_time_seconds);
    }
    if (virtualSlugs.has(row.col_slug)) virtualClimbedCols.add(row.col_slug);
    else realClimbedCols.add(row.col_slug);
  }
  const ctx: EvaluatorContext = {
    climbedCols,
    realClimbedCols,
    virtualClimbedCols,
    colTimes,
    colBestSeconds,
  };

  const evaluatorByCode = new Map(EVALUATORS.map((e) => [e.code, e] as const));

  const toInsert: Array<{
    badge_id: string;
    profile_id: string;
    award_scope: "milestone";
    period_start: string;
    period_end: string;
    value: number;
    rank: number;
    metadata: { unit?: string; note?: string };
  }> = [];

  let skipped = 0;
  const errors: string[] = [];

  for (const badge of badgeRows) {
    if (alreadyAwarded.has(badge.id)) {
      skipped++;
      continue;
    }
    const evaluator = evaluatorByCode.get(badge.achievement_code);
    if (!evaluator) continue;

    let result: TierResult | null = null;
    try {
      result = evaluator.check(acts, badge, ctx);
    } catch (err) {
      errors.push(
        `${badge.id} (${badge.achievement_code}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      continue;
    }
    if (!result) continue;

    toInsert.push({
      badge_id: badge.id,
      profile_id: profileId,
      award_scope: "milestone",
      period_start: result.periodStart,
      period_end: result.periodEnd,
      value: result.value,
      rank: 1,
      metadata: { unit: result.displayUnit, note: result.note },
    });
  }

  let awarded = 0;
  if (toInsert.length > 0) {
    // Batch insert; bij conflict op de unieke partial index slaan we 'm over.
    const { error } = await supabase
      .from("achievement_awards")
      .insert(toInsert);
    if (error) {
      errors.push(`bulk insert: ${error.message}`);
    } else {
      awarded = toInsert.length;
      await sendNotificationToMembers(
        "on_new_badge",
        {
          title: "Nieuwe ZWB-achievements",
          body:
            awarded === 1
              ? "Je hebt een nieuwe achievement-badge behaald."
              : `Je hebt ${awarded} nieuwe achievement-badges behaald.`,
          url: "/profiel",
          tag: `milestones-${profileId}-${new Date().toISOString().slice(0, 10)}`,
        },
        { profileIds: [profileId] },
      ).catch(() => null);
    }
  }

  return { awarded, skipped, errors };
}
