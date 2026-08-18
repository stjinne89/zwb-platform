// Genereert de ZRL-racekalender voor één ronde.
//
// Waarom genereren en niet ophalen: WTRL verbiedt scraping en het aanroepen van
// hun endpoints van buiten hun domein zonder schriftelijke toestemming
// (https://www.wtrl.racing/terms-of-service.php). Dat hoeft ook niet — de
// structuur is een patroon. ZRL rijdt op dinsdag, een ronde is een reeks
// opeenvolgende weken, en de eerste race van elke ronde is een Race of Truth
// (puntenrace zonder stayeren). Uit die drie gegevens volgt de hele ronde.
//
// Gevolg: één formulier per ronde in plaats van elke week handwerk, en niemands
// voorwaarden geschonden.

import { amsterdamWallTimeToIso } from "@/lib/birthdays";

export type ZrlRaceFormat = "race_of_truth" | "race";

export type ZrlRoundSpec = {
  /** Bijvoorbeeld "2026/27". */
  season: string;
  /** 1 tot 4. */
  round: number;
  /** Datum van de eerste race, yyyy-mm-dd. Hoort een dinsdag te zijn. */
  firstRaceDate: string;
  /** Aantal weken in deze ronde. */
  raceCount: number;
  /** Lokale starttijd, "20:00". */
  timeLocal: string;
  /** Naam van het ZWB-team, komt in de titel. */
  teamName?: string;
};

export type GeneratedZrlEvent = {
  week: number;
  format: ZrlRaceFormat;
  title: string;
  startAtIso: string;
  /** yyyy-mm-dd, handig voor weergave en tests. */
  dateKey: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const MAX_ROSTER = 10;
/** Van de tien op de roster mogen er vijf per race starten. */
export const MAX_PER_RACE = 5;

export function isTuesday(dateKey: string): boolean {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.getUTCDay() === 2;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return new Date(date.getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export type ZrlSpecError = string;

export function validateRoundSpec(spec: ZrlRoundSpec): ZrlSpecError[] {
  const errors: ZrlSpecError[] = [];
  if (!spec.season.trim()) errors.push("Vul een seizoen in, bijvoorbeeld 2026/27.");
  if (!Number.isInteger(spec.round) || spec.round < 1 || spec.round > 4) {
    errors.push("Een ZRL-seizoen heeft vier rondes.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spec.firstRaceDate)) {
    errors.push("Vul een geldige datum voor de eerste race in.");
  }
  if (!Number.isInteger(spec.raceCount) || spec.raceCount < 1 || spec.raceCount > 12) {
    errors.push("Een ronde heeft tussen 1 en 12 races.");
  }
  if (!/^\d{2}:\d{2}$/.test(spec.timeLocal)) {
    errors.push("Vul een tijd in als 20:00.");
  }
  return errors;
}

/**
 * De weken van één ronde. Week 1 is de Race of Truth; daarna gewone races.
 * Het formaat per week (scratch, punten, TTT) wordt door WTRL pas per ronde
 * bekendgemaakt, dus dat vullen we niet in — behalve de Race of Truth, want die
 * staat vast als opener.
 */
export function generateZrlRound(spec: ZrlRoundSpec): GeneratedZrlEvent[] {
  if (validateRoundSpec(spec).length > 0) return [];

  const events: GeneratedZrlEvent[] = [];
  for (let week = 1; week <= spec.raceCount; week++) {
    const dateKey = addDays(spec.firstRaceDate, (week - 1) * 7);
    const startAtIso = amsterdamWallTimeToIso(dateKey, spec.timeLocal);
    if (!startAtIso) continue;

    const format: ZrlRaceFormat = week === 1 ? "race_of_truth" : "race";
    const parts = [`ZRL ${spec.season}`, `R${spec.round}`, `W${week}`];
    if (spec.teamName) parts.push(spec.teamName);
    const title =
      format === "race_of_truth"
        ? `${parts.join(" · ")} — Race of Truth`
        : parts.join(" · ");

    events.push({ week, format, title, startAtIso, dateKey });
  }
  return events;
}

/** De vier rondes van 2026/27, met de racevensters die WTRL heeft gepubliceerd. */
export const ZRL_2026_27_ROUNDS: Array<{
  round: number;
  registrationOpens: string;
  firstRaceDate: string;
  lastRaceDate: string;
}> = [
  { round: 1, registrationOpens: "2026-08-18", firstRaceDate: "2026-09-22", lastRaceDate: "2026-10-27" },
  { round: 2, registrationOpens: "2026-09-19", firstRaceDate: "2026-11-17", lastRaceDate: "2026-12-22" },
  { round: 3, registrationOpens: "2026-11-15", firstRaceDate: "2027-01-12", lastRaceDate: "2027-02-16" },
  { round: 4, registrationOpens: "2027-01-09", firstRaceDate: "2027-03-02", lastRaceDate: "2027-04-06" },
];

/** Aantal dinsdagen tussen eerste en laatste race, grens inbegrepen. */
export function weeksBetween(firstDateKey: string, lastDateKey: string): number {
  const first = new Date(`${firstDateKey}T12:00:00Z`).getTime();
  const last = new Date(`${lastDateKey}T12:00:00Z`).getTime();
  if (Number.isNaN(first) || Number.isNaN(last) || last < first) return 0;
  return Math.round((last - first) / (7 * MS_PER_DAY)) + 1;
}
