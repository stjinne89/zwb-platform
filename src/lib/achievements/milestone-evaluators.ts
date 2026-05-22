// Auto-evaluators voor tiered milestone-badges.
//
// Per achievement_code een evaluator die uit Strava-activities bepaalt
// welke tiers behaald zijn. Idempotent: nieuwe awards worden alleen
// geinsert als de unieke index (badge_id, profile_id) bij award_scope=
// 'milestone' nog leeg is. We doen 1 SELECT voor alle bestaande awards
// + 1 batched INSERT, geen N+1.

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
  raw: { start_date_local?: string } | null;
};

type BadgeRow = {
  id: string;
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

type Evaluator = {
  code: string;
  /** Returns null als deze tier niet behaald is. */
  check: (acts: Activity[], badge: BadgeRow) => TierResult | null;
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

function isOutdoor(a: Activity): boolean {
  return !a.trainer;
}

function isGravel(a: Activity): boolean {
  const t = (a.sport_type ?? "").toLowerCase();
  return t.includes("gravel");
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
  // "5x 100 km" / "5× 100 km" / "3x" / "10x" / "25x".
  // The migration seed has been edited through different tools, so accept the
  // mojibake variant too to avoid over-awarding tiered count badges.
  const m = raw.match(/(\d+)\s*(?:x|×|Ã—)/i);
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
];

// ──────────────────────────────────────────────────────────────────────
// Hoofdroutine: batched select + insert
// ──────────────────────────────────────────────────────────────────────

export async function evaluateMilestonesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<{ awarded: number; skipped: number; errors: string[] }> {
  const codes = EVALUATORS.map((e) => e.code);

  const [
    { data: badges },
    { data: activities },
    { data: existingAwards },
  ] = await Promise.all([
    supabase
      .from("achievement_badges")
      .select("id, achievement_code, tier, trigger_config")
      .eq("kind", "milestone")
      .in("achievement_code", codes),
    supabase
      .from("strava_activities")
      .select(
        "id, distance_m, total_elevation_gain_m, moving_time_seconds, elapsed_time_seconds, kudos_count, start_date, trainer, commute, sport_type, raw",
      )
      .eq("profile_id", profileId),
    supabase
      .from("achievement_awards")
      .select("badge_id")
      .eq("profile_id", profileId)
      .eq("award_scope", "milestone"),
  ]);

  const badgeRows = (badges ?? []) as BadgeRow[];
  const acts = (activities ?? []) as Activity[];
  const alreadyAwarded = new Set<string>(
    ((existingAwards ?? []) as { badge_id: string }[]).map((a) => a.badge_id),
  );

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
      result = evaluator.check(acts, badge);
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
    }
  }

  return { awarded, skipped, errors };
}
