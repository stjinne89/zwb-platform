// Klachtenlogboek.
//
// Bewust klachten en geen cyclusfase: fase-effecten op prestatie zijn in de
// literatuur inconsistent, klachtenlast hangt wél samen met ervaren
// belastbaarheid en gemiste sessies. Zie docs/training-en-cyclus.md.

export const SYMPTOM_OPTIONS = [
  { key: "kramp", label: "Buikpijn of kramp" },
  { key: "hoofdpijn", label: "Hoofdpijn" },
  { key: "darmen", label: "Opgeblazen of darmklachten" },
  { key: "slaap", label: "Slecht geslapen" },
  { key: "stemming", label: "Stemming" },
  { key: "moe", label: "Extra moe" },
  { key: "gevoelig", label: "Gevoelige borsten" },
] as const;

export type SymptomKey = (typeof SYMPTOM_OPTIONS)[number]["key"];

export function isSymptomKey(value: string): value is SymptomKey {
  return SYMPTOM_OPTIONS.some((option) => option.key === value);
}

export function symptomLabel(key: string): string {
  return SYMPTOM_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export type SymptomLog = {
  id: string;
  log_date: string;
  severity: number | null;
  symptoms: string[];
  cycle_start: boolean;
  note: string | null;
};

export const SEVERITY_LABELS: Record<number, string> = {
  1: "Geen last",
  2: "Beetje",
  3: "Merkbaar",
  4: "Veel",
  5: "Heel veel",
};

export type SymptomLoad = {
  /** 0 = geen last gemeld, 1 = maximale last. */
  score: number;
  /** Hoeveel van de laatste dagen een melding hebben. */
  days: number;
  label: string;
};

/**
 * Vat de laatste dagen samen tot één getal, zodat het schema er net zo mee kan
 * rekenen als met readiness. Alleen dagen mét invoer tellen mee — niets invullen
 * betekent "geen signaal", niet "geen klachten".
 */
export function summarizeSymptomLoad(
  logs: SymptomLog[],
  windowDays = 7,
  now: Date = new Date(),
): SymptomLoad | null {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - windowDays);
  const recent = logs.filter(
    (log) => log.severity != null && new Date(log.log_date) >= cutoff,
  );
  if (recent.length === 0) return null;

  const mean =
    recent.reduce((sum, log) => sum + (log.severity ?? 0), 0) / recent.length;
  // 1..5 → 0..1
  const score = Math.min(1, Math.max(0, (mean - 1) / 4));
  const label =
    score >= 0.65 ? "hoge klachtenlast" : score >= 0.35 ? "wat klachten" : "weinig klachten";
  return { score, days: recent.length, label };
}

/**
 * Klachtenlast voor de schema-generatie. Levert null als het lid het logboek
 * niet aan heeft staan — dan mag er ook niets mee gerekend worden.
 */
export async function loadSymptomLoadForAi(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  profileId: string,
): Promise<{ score: number; label: string; daysLogged: number } | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("symptom_tracking_enabled")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile?.symptom_tracking_enabled) return null;

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const { data } = await admin
    .from("symptom_logs")
    .select("id, log_date, severity, symptoms, cycle_start, note")
    .eq("profile_id", profileId)
    .gte("log_date", since.toISOString().slice(0, 10));

  const summary = summarizeSymptomLoad((data ?? []) as SymptomLog[]);
  if (!summary) return null;
  return { score: summary.score, label: summary.label, daysLogged: summary.days };
}

/** Verwachte volgende menstruatie op basis van de laatste twee markeringen. */
export function estimateCycle(logs: SymptomLog[]): {
  lastStart: string;
  averageLengthDays: number | null;
} | null {
  const starts = logs
    .filter((log) => log.cycle_start)
    .map((log) => log.log_date)
    .sort()
    .reverse();
  if (starts.length === 0) return null;
  if (starts.length === 1) return { lastStart: starts[0], averageLengthDays: null };

  const gaps: number[] = [];
  for (let i = 0; i < starts.length - 1 && i < 6; i++) {
    const days =
      (new Date(starts[i]).getTime() - new Date(starts[i + 1]).getTime()) /
      (24 * 60 * 60 * 1000);
    if (days > 15 && days < 60) gaps.push(days);
  }
  return {
    lastStart: starts[0],
    averageLengthDays:
      gaps.length > 0
        ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
        : null,
  };
}
