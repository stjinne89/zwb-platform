// Module Uitdaging (0337): deelnemen aan een goededoelenrit, zoals Alpe d'HuZes.
// Puur: het formulier lezen, het teamtotaal en het aftellen. De pagina en de
// acties staan in src/app/(app)/uitdaging.

import { amsterdamDateKey } from "@/lib/birthdays";

export const MAX_CLIMBS = 10;
export const MAX_EUR = 1_000_000;

/** Hoe lang een event na de start op de pagina blijft, om de uitslag in te vullen. */
export const DAYS_AFTER_EVENT = 30;

/** Vanaf welk moment een event nog op de pagina staat. */
export function eventsSince(now: Date = new Date()): string {
  return new Date(now.getTime() - DAYS_AFTER_EVENT * 86_400_000).toISOString();
}

export type ChallengeEntry = {
  profileId: string;
  targetClimbs: number;
  climbsDone: number | null;
  fundraisingTargetEur: number | null;
  raisedEur: number | null;
  fundraisingUrl: string | null;
};

export type EntryInput = Omit<ChallengeEntry, "profileId">;

type FormLike = { get(name: string): FormDataEntryValue | null };

function text(form: FormLike, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Een heel getal in een bereik, of null als het veld leeg is. */
function wholeNumber(raw: string, min: number, max: number): number | null | "fout" {
  if (raw === "") return null;
  // Bedragen mogen met punten als duizendtal ("1.250") of een euroteken.
  const cleaned = raw.replace(/[€\s.]/g, "");
  if (!/^\d+$/.test(cleaned)) return "fout";
  const n = Number(cleaned);
  return n >= min && n <= max ? n : "fout";
}

export function parseEntryForm(
  form: FormLike,
): { ok: true; value: EntryInput } | { ok: false; error: string } {
  const target = wholeNumber(text(form, "target_climbs"), 1, MAX_CLIMBS);
  if (target === null || target === "fout") {
    return { ok: false, error: `Kies 1 tot ${MAX_CLIMBS} keer.` };
  }
  const done = wholeNumber(text(form, "climbs_done"), 0, MAX_CLIMBS);
  if (done === "fout") return { ok: false, error: `Gehaald is 0 tot ${MAX_CLIMBS} keer.` };
  const goal = wholeNumber(text(form, "fundraising_target_eur"), 0, MAX_EUR);
  if (goal === "fout") return { ok: false, error: "Sponsordoel is een bedrag in hele euro's." };
  const raised = wholeNumber(text(form, "raised_eur"), 0, MAX_EUR);
  if (raised === "fout") return { ok: false, error: "Opgehaald is een bedrag in hele euro's." };

  const url = text(form, "fundraising_url");
  if (url !== "") {
    let parsed: URL | null = null;
    try {
      parsed = new URL(url);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:" || url.length > 500) {
      return { ok: false, error: "De link begint met https://." };
    }
  }

  return {
    ok: true,
    value: {
      targetClimbs: target,
      climbsDone: done,
      fundraisingTargetEur: goal,
      raisedEur: raised,
      fundraisingUrl: url === "" ? null : url,
    },
  };
}

export type TeamTotals = {
  riders: number;
  plannedClimbs: number;
  /** Null zolang nog niemand een uitslag heeft ingevuld. */
  doneClimbs: number | null;
  raisedEur: number;
  targetEur: number;
};

export function teamTotals(entries: readonly ChallengeEntry[]): TeamTotals {
  let plannedClimbs = 0;
  let doneClimbs: number | null = null;
  let raisedEur = 0;
  let targetEur = 0;
  for (const entry of entries) {
    plannedClimbs += entry.targetClimbs;
    if (entry.climbsDone !== null) doneClimbs = (doneClimbs ?? 0) + entry.climbsDone;
    raisedEur += entry.raisedEur ?? 0;
    targetEur += entry.fundraisingTargetEur ?? 0;
  }
  return { riders: entries.length, plannedClimbs, doneClimbs, raisedEur, targetEur };
}

/** Deel van het sponsordoel, 0 tot 100, of null zonder doel. */
export function percentOf(raised: number, target: number): number | null {
  if (target <= 0) return null;
  return Math.min(100, Math.round((raised / target) * 100));
}

/** Kalenderdagen tot de start, in Amsterdamse tijd. Negatief als het geweest is. */
export function daysUntil(startAt: string, now: Date = new Date()): number {
  const day = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86_400_000;
  };
  return day(amsterdamDateKey(new Date(startAt))) - day(amsterdamDateKey(now));
}

export function countdownLabel(days: number): string {
  if (days > 1) return `Nog ${days} dagen`;
  if (days === 1) return "Morgen";
  if (days === 0) return "Vandaag";
  return "Geweest";
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Wie het meest heeft opgehaald eerst, dan het hoogste doel, dan op naam. */
export function sortEntries<T extends ChallengeEntry & { name: string }>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      (b.raisedEur ?? 0) - (a.raisedEur ?? 0) ||
      b.targetClimbs - a.targetClimbs ||
      a.name.localeCompare(b.name, "nl"),
  );
}
