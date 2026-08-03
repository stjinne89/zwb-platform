// Herstel-data (wellness) uit intervals.icu syncen + samenvatten voor de
// AI-trainingsplanning. Strikt opt-in (wellness_opt_in op de koppeling);
// writes via service-role naar profile_wellness.

import { fetchIntervalsWellness, type IntervalsWellness } from "@/lib/intervals/client";

export type WellnessSummary = {
  days: number; // hoeveel dagen met data in het venster
  latestDate: string | null;
  restingHr: number | null; // gemiddelde laatste 7d
  hrv: number | null; // gemiddelde laatste 7d
  sleepHours: number | null; // gemiddelde laatste 7d
  readiness: number | null; // meest recente, mits niet ouder dan 7 dagen
  /** Aftrek op de trainingsruimte door korte nachten (0 = genoeg geslapen). */
  sleepPenalty: number;
  // Trend t.o.v. eigen baseline: 'fresh' | 'normal' | 'fatigued' | 'unknown'.
  state: "fresh" | "normal" | "fatigued" | "unknown";
  note: string;
};

export type TrainingReadinessSummary = {
  state: "ready" | "caution" | "recovery" | "unknown";
  label: string;
  score: number | null;
  notes: string[];
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

/** Hoe oud de opgeslagen kopie mag zijn voordat we opnieuw ophalen. */
export const WELLNESS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** Records uit intervals.icu naar rijen; dagen zonder enige waarde vallen af. */
function wellnessRows(profileId: string, records: IntervalsWellness[]) {
  const now = new Date().toISOString();
  return records
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
}

/**
 * Schrijft al opgehaalde wellness-records weg. Aparte functie omdat de
 * trainingspagina's die records tóch al ophalen; die hoeven intervals.icu niet
 * een tweede keer te bevragen om de opgeslagen kopie bij te werken.
 */
export async function persistWellnessRecords(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  records: IntervalsWellness[],
): Promise<{ upserted: number }> {
  const rows = wellnessRows(profileId, records);
  if (rows.length === 0) return { upserted: 0 };

  const { error } = await supabase
    .from("profile_wellness")
    .upsert(rows, { onConflict: "profile_id,date" });
  if (error) {
    // Stil falen was precies waardoor een lege kopie maandenlang leeg bleef.
    console.error("[wellness] wegschrijven mislukt", { profileId, error: error.message });
    return { upserted: 0 };
  }
  return { upserted: rows.length };
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
  return persistWellnessRecords(supabase, profileId, records);
}

/** Leeftijd van de opgeslagen kopie; null als er nog niets staat. */
export async function wellnessCopyAgeMs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("profile_wellness")
    .select("synced_at")
    .eq("profile_id", profileId)
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.synced_at) return null;
  const ms = new Date(data.synced_at).getTime();
  return Number.isFinite(ms) ? Date.now() - ms : null;
}

/**
 * Zelfherstellend: werkt de opgeslagen kopie bij zodra die ouder is dan
 * `WELLNESS_MAX_AGE_MS` (of nog helemaal ontbreekt). Geef `records` mee als de
 * beller ze al heeft; dan gaat er geen extra call naar intervals.icu.
 *
 * Bewust best-effort: een mislukte verversing mag een pagina nooit breken,
 * maar wordt wel gelogd zodat het niet opnieuw jarenlang onopgemerkt blijft.
 */
export async function refreshWellnessIfStale(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  profileId: string,
  source: { apiKey: string; athleteId: string; records?: IntervalsWellness[] },
): Promise<{ refreshed: boolean; upserted: number }> {
  try {
    const age = await wellnessCopyAgeMs(supabase, profileId);
    if (age != null && age < WELLNESS_MAX_AGE_MS) {
      return { refreshed: false, upserted: 0 };
    }
    const { upserted } = source.records
      ? await persistWellnessRecords(supabase, profileId, source.records)
      : await syncWellnessForUser(supabase, source.apiKey, source.athleteId, profileId, 30);
    return { refreshed: true, upserted };
  } catch (err) {
    console.error("[wellness] verversen mislukt", {
      profileId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { refreshed: false, upserted: 0 };
  }
}

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Het readiness-veld in intervals.icu is één veld waar elke wellness-bron z'n
// eigen schaal in duwt. Garmin (Training Readiness), Oura en Whoop leveren
// 0-100. Polar's Nightly Recharge komt binnen als kleine integer-schaal ("very
// poor → very good"). Zonder correctie leest de app een Polar-"3" (Ok) als
// "3 van de 100 = zwaar overtraind". Het lid kiest z'n apparaat in het profiel
// zodat we de juiste interpretatie kunnen toepassen.
export const WELLNESS_DEVICES = [
  "garmin",
  "polar",
  "oura",
  "whoop",
  "coros",
  "suunto",
  "other",
] as const;
export type WellnessDevice = (typeof WELLNESS_DEVICES)[number];

// Polar Nightly Recharge status is een officiële 6-staps schaal:
// 1 very poor · 2 poor · 3 compromised · 4 OK · 5 good · 6 very good.
// We rekenen die om naar de 0-100 range waarop summarizeTrainingReadiness/ZWB
// rekent (≤50 vermoeid, ≥75 fris), zodat een "OK" (4 → 62) niet langer als
// 4/100 = overtraind leest. Waarden buiten 1..6 worden geclamped.
const POLAR_READINESS_TO_100: Record<number, number> = {
  1: 15,
  2: 30,
  3: 45,
  4: 62,
  5: 78,
  6: 90,
};

/** Venster waarover HRV en rust-HR hun baseline krijgen. */
export const BASELINE_DAYS = 30;

/** Ouder dan dit telt readiness niet meer mee en toont de app een streepje. */
export const READINESS_MAX_AGE_DAYS = 7;

/**
 * Gestaffelde slaapaftrek. Alleen structureel korte nachten zetten de status op
 * "fatigued"; daarboven is het een score-aftrek, zodat vijf minuten verschil in
 * het weekgemiddelde niet langer een heel adviesniveau kost.
 */
const SLEEP_STEPS: Array<{ below: number; penalty: number; note: string }> = [
  { below: 5.5, penalty: 22, note: "Structureel weinig slaap" },
  { below: 6.0, penalty: 14, note: "Weinig slaap" },
  { below: 6.5, penalty: 6, note: "Iets weinig slaap" },
];

/** Hele dagen tussen twee datumsleutels ("YYYY-MM-DD"); null bij onzin. */
function daysBetween(from: string, to: string): number | null {
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

function normalizeReadiness(
  raw: number,
  device?: WellnessDevice | null,
): number {
  if (device === "polar") {
    const step = Math.min(6, Math.max(1, Math.round(raw)));
    return POLAR_READINESS_TO_100[step];
  }
  return raw; // garmin/oura/whoop/coros/suunto/other/onbekend = al 0-100
}

/**
 * Vat de laatste 7 dagen herstel samen + bepaalt een grove "state" door de
 * recente HRV/rust-HR te vergelijken met de baseline van het hele venster.
 * `device` bepaalt hoe de readiness-schaal geïnterpreteerd wordt (zie boven).
 */
export function summarizeWellness(
  rows: WellnessRow[],
  device?: WellnessDevice | null,
  /** Referentiedag voor de recentheidsgrens; los meegeefbaar zodat dit testbaar blijft. */
  today: string = new Date().toISOString().slice(0, 10),
): WellnessSummary | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date)); // nieuwste eerst
  const last7 = sorted.slice(0, 7);

  const restingHr = avg(last7.map((r) => r.resting_hr));
  const hrv = avg(last7.map((r) => r.hrv));
  const sleepSecs = avg(last7.map((r) => r.sleep_secs));

  // Readiness telt alleen als hij vers is. Zonder deze grens bleef een waarde
  // van maanden geleden meetellen zodra een apparaat stopte met leveren; nu
  // valt hij terug op "-" en is zichtbaar dat er niets is aangeleverd.
  const readinessRow = sorted.find((r) => r.readiness != null) ?? null;
  const readinessAgeDays =
    readinessRow == null ? null : daysBetween(readinessRow.date, today);
  const readinessIsStale =
    readinessAgeDays == null || readinessAgeDays > READINESS_MAX_AGE_DAYS;
  const rawReadiness = readinessIsStale ? null : (readinessRow?.readiness ?? null);
  const readiness =
    rawReadiness == null ? null : normalizeReadiness(rawReadiness, device);
  const sleepHours = sleepSecs != null ? sleepSecs / 3600 : null;

  // Baseline over de laatste 30 dagen. Over het hele venster (tot 2 jaar) moest
  // een weekgemiddelde een tweejaarsgemiddelde verslaan om als "fris" te gelden;
  // dat lukte vrijwel nooit en liet de baseline bovendien meedrijven met
  // seizoen en vormopbouw.
  const baselineWindow = sorted.slice(0, BASELINE_DAYS);
  const hrvBase = avg(baselineWindow.map((r) => r.hrv));
  const rhrBase = avg(baselineWindow.map((r) => r.resting_hr));

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
    if (readiness <= 50) {
      state = "fatigued";
      notes.push(`Readiness laag (${Math.round(readiness)}).`);
    } else if (readiness < 70) {
      if (state === "fresh" || state === "unknown") state = "normal";
      notes.push(`Readiness middelmatig (${Math.round(readiness)}).`);
    } else if (readiness >= 75 && state === "unknown") {
      state = "fresh";
    }
    if (device === "polar") {
      notes.push("Readiness omgerekend van Polar's Nightly Recharge-schaal naar 0-100.");
    }
  } else if (readinessRow) {
    // Er is wél ooit een readiness geweest, maar te oud om nog iets te zeggen.
    notes.push(
      `Geen readiness van de laatste ${READINESS_MAX_AGE_DAYS} dagen; laatste meting ${readinessRow.date}.`,
    );
  }

  // Gestaffeld: alleen de zwaarste stap zet de status om, de lichtere stappen
  // zijn een aftrek op de score.
  let sleepPenalty = 0;
  if (sleepHours != null) {
    const step = SLEEP_STEPS.find((entry) => sleepHours < entry.below);
    if (step) {
      sleepPenalty = step.penalty;
      notes.push(`${step.note} (${sleepHours.toFixed(1)}u gemiddeld).`);
      if (step.below === 5.5 && (state === "unknown" || state === "normal")) {
        state = "fatigued";
      }
    }
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
    sleepPenalty,
    state,
    note: notes.join(" "),
  };
}

export function summarizeTrainingReadiness({
  tsb,
  wellness,
}: {
  tsb: number | null | undefined;
  wellness: WellnessSummary | null | undefined;
}): TrainingReadinessSummary {
  const notes: string[] = [];
  let loadState: TrainingReadinessSummary["state"] = "unknown";
  let recoveryState: TrainingReadinessSummary["state"] = "unknown";
  let score = 72;

  if (tsb == null || !Number.isFinite(tsb)) {
    notes.push("TSB ontbreekt, dus trainingsbelasting telt niet mee.");
  } else if (tsb <= -25) {
    loadState = "recovery";
    score -= 32;
    notes.push(`TSB ${tsb.toFixed(1)}: hoge trainingsvermoeidheid.`);
  } else if (tsb <= -10) {
    loadState = "caution";
    score -= 18;
    notes.push(`TSB ${tsb.toFixed(1)}: nog duidelijk belast.`);
  } else if (tsb < 8) {
    loadState = "caution";
    score -= 6;
    notes.push(`TSB ${tsb.toFixed(1)}: redelijk in balans.`);
  } else {
    loadState = "ready";
    score += 6;
    notes.push(`TSB ${tsb.toFixed(1)}: belasting is goed gezakt.`);
  }

  if (!wellness) {
    notes.push("Geen gedeelde hersteldata om readiness, slaap, HRV en rust-HR mee te wegen.");
  } else {
    const readiness = wellness.readiness;
    if (wellness.state === "fatigued" || (readiness != null && readiness <= 50)) {
      recoveryState = "recovery";
      score -= 28;
    } else if (readiness != null && readiness < 70) {
      recoveryState = "caution";
      score -= 16;
    } else if (wellness.state === "fresh" && (readiness == null || readiness >= 75)) {
      recoveryState = "ready";
      score += 8;
    } else if (wellness.state === "normal" || readiness != null) {
      recoveryState = "caution";
      score -= 4;
    }

    if (readiness != null) {
      notes.push(`Readiness ${Math.round(readiness)}: ${
        readiness >= 75 ? "goed" : readiness >= 70 ? "ok" : readiness >= 51 ? "matig" : "laag"
      }.`);
    }

    // Korte nachten drukken de score gestaffeld; de zwaarste stap zit al in
    // `state` verwerkt en telt daar niet nog een keer bovenop.
    if (wellness.sleepPenalty > 0 && wellness.state !== "fatigued") {
      score -= wellness.sleepPenalty;
      if (recoveryState === "ready") recoveryState = "caution";
    }

    notes.push(wellness.note);
  }

  const states = [loadState, recoveryState];
  const hasUnknown = states.includes("unknown");
  const state: TrainingReadinessSummary["state"] =
    states.includes("recovery")
      ? "recovery"
      : states.includes("caution")
        ? "caution"
        : hasUnknown && states.includes("ready")
          ? "caution"
          : states.includes("ready")
          ? "ready"
          : "unknown";
  const boundedScore =
    state === "ready"
      ? Math.max(75, score)
      : state === "caution"
        ? Math.max(45, Math.min(69, score))
        : state === "recovery"
          ? Math.min(44, score)
          : null;

  return {
    state,
    label:
      state === "ready"
        ? "Ruimte voor kwaliteit"
        : state === "recovery"
          ? "Herstel voorrang"
          : state === "caution"
            ? "Beperkte trainingsruimte"
            : "Te weinig data",
    score: boundedScore == null ? null : Math.max(0, Math.min(100, Math.round(boundedScore))),
    notes,
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

  // Zelfde staleness-regel als de trainingspagina's: is de kopie vers, dan
  // slaan we de call over; is hij oud of leeg, dan halen we hem eerst in.
  await refreshWellnessIfStale(admin, profileId, {
    apiKey: conn.api_key,
    athleteId: conn.athlete_id,
  });
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
  const [{ data }, { data: profile }] = await Promise.all([
    supabase
      .from("profile_wellness")
      .select(
        "date, resting_hr, hrv, sleep_secs, sleep_score, readiness, fatigue, stress, soreness, mood",
      )
      .eq("profile_id", profileId)
      .gte("date", oldest)
      .order("date", { ascending: false }),
    supabase
      .from("profiles")
      .select("wellness_device")
      .eq("id", profileId)
      .maybeSingle(),
  ]);
  return summarizeWellness(
    (data ?? []) as WellnessRow[],
    (profile?.wellness_device ?? null) as WellnessDevice | null,
  );
}
