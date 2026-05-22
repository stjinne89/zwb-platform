// Auto-evaluators voor tiered milestone-badges.
// Per achievement_code een evaluator die uit Strava-activities bepaalt
// welke tiers behaald zijn. Idempotent: nieuwe awards worden alleen
// geinsert als de unieke index (badge_id, profile_id) bij award_scope=
// 'milestone' nog leeg is.

type Activity = {
  distance_m: number;
  total_elevation_gain_m: number;
  moving_time_seconds: number;
  start_date: string;
  trainer: boolean;
};

type BadgeRow = {
  id: string;
  achievement_code: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  trigger_config: {
    threshold?: { value?: number; unit?: string; raw?: string };
  } | null;
};

type AwardInsert = {
  badge_id: string;
  profile_id: string;
  award_scope: "milestone";
  period_start: string; // ISO date
  period_end: string; // ISO date
  value: number;
  rank: number;
  metadata: { unit?: string; note?: string };
};

/**
 * Per code: hoe extraheren we de te-meten waarde uit activities, en
 * hoe converteren we de threshold-unit naar dezelfde SI-base.
 */
type Evaluator = {
  code: string;
  metricLabel: string;
  /** Single-activity check, geeft de max-waarde + bijbehorende activity terug. */
  bestSingleActivity: (
    activities: Activity[],
  ) => { value: number; activity: Activity } | null;
  /** Threshold uit trigger_config converteren naar SI-base zodat we kunnen vergelijken. */
  thresholdToSi: (rawValue: number, unit: string) => number;
  /** Voor metadata: omgekeerd, SI-base → display-eenheid. */
  toDisplay: (siValue: number) => { value: number; unit: string };
};

const EVALUATORS: Evaluator[] = [
  // A001 — Distance Ride: meest afstand in één rit
  {
    code: "A001",
    metricLabel: "max single-activity distance",
    bestSingleActivity: (activities) => {
      let best: { value: number; activity: Activity } | null = null;
      for (const a of activities) {
        const d = Number(a.distance_m) || 0;
        if (!best || d > best.value) best = { value: d, activity: a };
      }
      return best && best.value > 0 ? best : null;
    },
    thresholdToSi: (raw, unit) => {
      const u = unit.toLowerCase();
      if (u === "km") return raw * 1000;
      if (u === "mi") return raw * 1609.344;
      return raw; // m
    },
    toDisplay: (si) => ({ value: Math.round(si / 100) / 10, unit: "km" }),
  },

  // A002 — Climbing Ride: max hoogtemeters in één rit
  {
    code: "A002",
    metricLabel: "max single-activity elevation",
    bestSingleActivity: (activities) => {
      let best: { value: number; activity: Activity } | null = null;
      for (const a of activities) {
        const e = Number(a.total_elevation_gain_m) || 0;
        if (!best || e > best.value) best = { value: e, activity: a };
      }
      return best && best.value > 0 ? best : null;
    },
    thresholdToSi: (raw) => {
      // "hm" = hoogtemeter = m, "m" idem
      return raw; // hm/m beide direct in meters
    },
    toDisplay: (si) => ({ value: Math.round(si), unit: "m" }),
  },

  // A003 — Long Day Out: langste duur in één rit
  {
    code: "A003",
    metricLabel: "max single-activity duration",
    bestSingleActivity: (activities) => {
      let best: { value: number; activity: Activity } | null = null;
      for (const a of activities) {
        const t = Number(a.moving_time_seconds) || 0;
        if (!best || t > best.value) best = { value: t, activity: a };
      }
      return best && best.value > 0 ? best : null;
    },
    thresholdToSi: (raw, unit) => {
      const u = unit.toLowerCase();
      if (u === "uur" || u === "u") return raw * 3600;
      if (u === "min") return raw * 60;
      return raw; // seconden
    },
    toDisplay: (si) => ({
      value: Math.round((si / 3600) * 10) / 10,
      unit: "uur",
    }),
  },
];

/**
 * Hoofdroutine: laad alle relevante milestone-badges + alle Strava-activities
 * van deze gebruiker, en upsert awards voor elke behaalde tier.
 */
export async function evaluateMilestonesForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<{ awarded: number; skipped: number; errors: string[] }> {
  const codes = EVALUATORS.map((e) => e.code);

  const [{ data: badges }, { data: activities }] = await Promise.all([
    supabase
      .from("achievement_badges")
      .select("id, achievement_code, tier, trigger_config")
      .eq("kind", "milestone")
      .in("achievement_code", codes),
    supabase
      .from("strava_activities")
      .select(
        "distance_m, total_elevation_gain_m, moving_time_seconds, start_date, trainer",
      )
      .eq("profile_id", profileId),
  ]);

  const badgeRows = (badges ?? []) as BadgeRow[];
  const acts = (activities ?? []) as Activity[];

  let awarded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const evaluator of EVALUATORS) {
    const best = evaluator.bestSingleActivity(acts);
    if (!best) continue;

    const tiersForCode = badgeRows
      .filter((b) => b.achievement_code === evaluator.code)
      .sort((a, b) => {
        const order = ["bronze", "silver", "gold", "platinum"];
        return order.indexOf(a.tier) - order.indexOf(b.tier);
      });

    for (const badge of tiersForCode) {
      const t = badge.trigger_config?.threshold;
      const rawValue = t?.value;
      const rawUnit = t?.unit ?? "";
      if (rawValue === undefined) continue;

      const thresholdSi = evaluator.thresholdToSi(rawValue, rawUnit);
      if (best.value < thresholdSi) continue;

      const display = evaluator.toDisplay(best.value);
      const dateOnly = best.activity.start_date.slice(0, 10);

      const row: AwardInsert = {
        badge_id: badge.id,
        profile_id: profileId,
        award_scope: "milestone",
        period_start: dateOnly,
        period_end: dateOnly,
        value: display.value,
        rank: 1,
        metadata: { unit: display.unit, note: evaluator.metricLabel },
      };

      // Idempotent: de unieke index op (badge_id, profile_id) WHERE
      // award_scope='milestone' voorkomt duplicaten. We negeren ON CONFLICT
      // door eerst te checken of er al een award is.
      const { data: existing } = await supabase
        .from("achievement_awards")
        .select("id")
        .eq("badge_id", badge.id)
        .eq("profile_id", profileId)
        .eq("award_scope", "milestone")
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from("achievement_awards").insert(row);
      if (error) {
        errors.push(`${badge.id}: ${error.message}`);
      } else {
        awarded++;
      }
    }
  }

  return { awarded, skipped, errors };
}
