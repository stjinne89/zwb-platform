// Herstel-data (wellness) uit intervals.icu syncen + samenvatten voor de
// AI-trainingsplanning. Strikt opt-in (wellness_opt_in op de koppeling);
// writes via service-role naar profile_wellness.

import { fetchIntervalsWellness } from "@/lib/intervals/client";

export type WellnessSummary = {
  days: number; // hoeveel dagen met data in het venster
  latestDate: string | null;
  restingHr: number | null; // gemiddelde laatste 7d
  hrv: number | null; // gemiddelde laatste 7d
  sleepHours: number | null; // gemiddelde laatste 7d
  readiness: number | null; // meest recente
  // Trend t.o.v. eigen baseline: 'fresh' | 'normal' | 'fatigued' | 'unknown'.
  state: "fresh" | "normal" | "fatigued" | "unknown";
  note: string;
};

type WellnessRow = {
  date: string;
  resting_hr: number | null;
  hrv: number | null;
  sleep_secs: number | null;
  sleep_score: number | null;
  readiness: number | null;
  fatigue: number | null;
  stress: number | null;
  soreness: number | null;
  mood: number | null;
};

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Haalt de wellness-records uit intervals.icu en upsert ze in
 * profile_wellness. Schrijft alleen dagen met minstens één herstel-veld.
 */
export async function syncWellnessForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  apiKey: string,
  athleteId: string,
  profileId: string,
  days = 30,
): Promise<{ upserted: number }> {
  const records = await fetchIntervalsWellness(apiKey, athleteId, days);
  const now = new Date().toISOString();

  const rows = records
    .map((r) => ({
      profile_id: profileId,
      date: r.id, // intervals wellness-id = "YYYY-MM-DD"
      resting_hr: num(r.restingHR),
      hrv: num(r.hrv ?? r.hrvSDNN),
      sleep_secs: num(r.sleepSecs),
      sleep_score: num(r.sleepScore),
      readiness: num(r.readiness),
      fatigue: num(r.fatigue),
      stress: num(r.stress),
      soreness: num(r.soreness),
      mood: num(r.mood),
      synced_at: now,
    }))
    .filter(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        (r.resting_hr != null ||
          r.hrv != null ||
          r.sleep_secs != null ||
          r.sleep_score != null ||
          r.readiness != null ||
          r.fatigue != null ||
          r.stress != null ||
          r.soreness != null ||
          r.mood != null),
    );

  if (rows.length === 0) return { upserted: 0 };

  const { error } = await supabase
    .from("profile_wellness")
    .upsert(rows, { onConflict: "profile_id,date" });
  if (error) return { upserted: 0 };
  return { upserted: rows.length };
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Vat de laatste 7 dagen herstel samen + bepaalt een grove "state" door de
 * recente HRV/rust-HR te vergelijken met de baseline van het hele venster.
 */
export function summarizeWellness(rows: WellnessRow[]): WellnessSummary | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date)); // nieuwste eerst
  const last7 = sorted.slice(0, 7);

  const restingHr = avg(last7.map((r) => r.resting_hr));
  const hrv = avg(last7.map((r) => r.hrv));
  const sleepSecs = avg(last7.map((r) => r.sleep_secs));
  const readiness = sorted.find((r) => r.readiness != null)?.readiness ?? null;
  const sleepHours = sleepSecs != null ? sleepSecs / 3600 : null;

  // Baseline over het hele venster voor HRV + rust-HR.
  const hrvBase = avg(sorted.map((r) => r.hrv));
  const rhrBase = avg(sorted.map((r) => r.resting_hr));

  let state: WellnessSummary["state"] = "unknown";
  const notes: string[] = [];
  if (hrv != null && hrvBase != null && hrvBase > 0) {
    const ratio = hrv / hrvBase;
    if (ratio < 0.9) {
      state = "fatigued";
      notes.push("HRV onder baseline (mogelijk vermoeid).");
    } else if (ratio > 1.05) {
      state = "fresh";
      notes.push("HRV boven baseline (goed hersteld).");
    } else {
      state = "normal";
    }
  }
  if (state !== "fatigued" && restingHr != null && rhrBase != null) {
    if (restingHr > rhrBase + 3) {
      state = "fatigued";
      notes.push("Rust-hartslag verhoogd t.o.v. baseline.");
    }
  }
  if (readiness != null) {
    if (readiness <= 40) {
      state = "fatigued";
      notes.push(`Readiness laag (${Math.round(readiness)}).`);
    } else if (readiness >= 75 && state === "unknown") {
      state = "fresh";
    }
  }
  if (sleepHours != null && sleepHours < 6.5) {
    notes.push(`Gemiddeld weinig slaap (${sleepHours.toFixed(1)}u).`);
    if (state === "unknown" || state === "normal") state = "fatigued";
  }

  if (notes.length === 0) {
    notes.push(
      state === "fresh"
        ? "Herstelwaarden zien er goed uit."
        : "Herstelwaarden binnen de normale range.",
    );
  }

  return {
    days: sorted.length,
    latestDate: sorted[0]?.date ?? null,
    restingHr: restingHr != null ? Math.round(restingHr) : null,
    hrv: hrv != null ? Math.round(hrv) : null,
    sleepHours: sleepHours != null ? Math.round(sleepHours * 10) / 10 : null,
    readiness: readiness != null ? Math.round(readiness) : null,
    state,
    note: notes.join(" "),
  };
}

/**
 * Voor de AI-flow: als het lid wellness deelt (opt-in) + intervals gekoppeld
 * is, synct het de verse data (best-effort) en geeft een samenvatting terug.
 * Geeft null als er geen opt-in/koppeling/data is. Gebruik met service-role.
 */
export async function wellnessForAi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<WellnessSummary | null> {
  const { data: conn } = await admin
    .from("intervals_connections")
    .select("api_key, athlete_id, wellness_opt_in")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (!conn?.wellness_opt_in || !conn.api_key || !conn.athlete_id) return null;

  try {
    await syncWellnessForUser(admin, conn.api_key, conn.athlete_id, profileId, 30);
  } catch {
    // niet kritiek; val terug op wat al in profile_wellness staat
  }
  return getWellnessSummary(admin, profileId);
}

/** Laadt + vat de laatste N dagen profile_wellness samen (service-role). */
export async function getWellnessSummary(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  days = 21,
): Promise<WellnessSummary | null> {
  const oldest = new Date(Date.now() - days * 86400_000)
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from("profile_wellness")
    .select(
      "date, resting_hr, hrv, sleep_secs, sleep_score, readiness, fatigue, stress, soreness, mood",
    )
    .eq("profile_id", profileId)
    .gte("date", oldest)
    .order("date", { ascending: false });
  return summarizeWellness((data ?? []) as WellnessRow[]);
}
