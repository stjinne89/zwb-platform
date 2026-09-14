// Plant een heel Omnium-seizoen uit één regel.
//
// Seizoen 2026/27 is zes edities, elke tweede zondag van de maand van oktober
// tot en met maart, om 11:00 Nederlandse tijd. Dat is geen willekeurige keuze:
// dinsdag valt af omdat de ZRL daar zit (en in oktober en maart is er geen
// enkele vrije dinsdag), donderdag valt af om de WTRL TTT, en zaterdag valt af
// om de Zwift Insider Tiny Races — vier korte races binnen een uur, vrijwel
// hetzelfde format. Zie known-series.ts voor de conflictcheck zelf.
//
// De starttijd staat vast op Nederlandse tijd, dus 11:00 blijft 11:00 ook als
// de klok verspringt. Gevolg voor het internationale veld: de oktober-editie
// valt nog in zomertijd (09:00 UTC), de rest in wintertijd (10:00 UTC).

import { amsterdamWallTimeToIso } from "@/lib/birthdays";

export type OmniumSeasonPlanSpec = {
  /** Bijvoorbeeld "2026/27". */
  season: string;
  /** Eerste maand van het seizoen, yyyy-mm. */
  firstMonth: string;
  /** Aantal maandelijkse edities. */
  monthCount: number;
  /** 0 = zondag, 1 = maandag ... 6 = zaterdag. */
  weekday: number;
  /** Hoeveelste voorkomen van die weekdag in de maand, 1-based. */
  occurrence: number;
  /** Lokale starttijd, "11:00". */
  timeLocal: string;
  /** Minuten voorbeschouwing vóór de eerste start. */
  preshowMinutesBefore?: number;
  /** Handmatige uitzonderingen: editienummer -> yyyy-mm-dd. */
  overrides?: Record<number, string>;
};

export type PlannedEdition = {
  number: number;
  dateKey: string;
  startAtIso: string;
  preshowAtIso: string | null;
  /** True als deze datum uit overrides komt in plaats van uit de regel. */
  isOverride: boolean;
};

const WEEKDAY_NAMES = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseMonth(month: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) return null;
  return { year, month: monthNumber };
}

/** Het n-de voorkomen van een weekdag in een maand, of null als die niet bestaat. */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number,
): string | null {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (occurrence - 1) * 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function weekdayOf(dateKey: string): number | null {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.getUTCDay();
}

export function validateSeasonPlanSpec(spec: OmniumSeasonPlanSpec): string[] {
  const errors: string[] = [];
  if (!spec.season.trim()) errors.push("Vul een seizoen in, bijvoorbeeld 2026/27.");
  if (!parseMonth(spec.firstMonth)) {
    errors.push("Vul een geldige eerste maand in, bijvoorbeeld 2026-10.");
  }
  if (!Number.isInteger(spec.monthCount) || spec.monthCount < 1 || spec.monthCount > 12) {
    errors.push("Een seizoen heeft tussen 1 en 12 edities.");
  }
  if (!Number.isInteger(spec.weekday) || spec.weekday < 0 || spec.weekday > 6) {
    errors.push("Kies een geldige weekdag.");
  }
  if (!Number.isInteger(spec.occurrence) || spec.occurrence < 1 || spec.occurrence > 5) {
    errors.push("Kies het eerste tot en met vijfde voorkomen in de maand.");
  }
  if (!/^\d{2}:\d{2}$/.test(spec.timeLocal)) {
    errors.push("Vul een tijd in als 11:00.");
  }
  for (const [number, dateKey] of Object.entries(spec.overrides ?? {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      errors.push(`Uitzondering voor editie ${number} is geen geldige datum.`);
    }
  }
  return errors;
}

/**
 * De datums van een heel seizoen. Een maand waarin het gevraagde voorkomen niet
 * bestaat (een vijfde zondag die er niet is) wordt overgeslagen in plaats van
 * stilzwijgend naar de volgende maand te schuiven.
 */
export function planOmniumSeason(spec: OmniumSeasonPlanSpec): PlannedEdition[] {
  if (validateSeasonPlanSpec(spec).length > 0) return [];
  const start = parseMonth(spec.firstMonth);
  if (!start) return [];

  const preshowMinutes = spec.preshowMinutesBefore ?? 0;
  const editions: PlannedEdition[] = [];

  for (let index = 0; index < spec.monthCount; index++) {
    const monthIndex = start.month - 1 + index;
    const year = start.year + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const number = index + 1;

    const override = spec.overrides?.[number];
    const dateKey =
      override ?? nthWeekdayOfMonth(year, month, spec.weekday, spec.occurrence);
    if (!dateKey) continue;

    const startAtIso = amsterdamWallTimeToIso(dateKey, spec.timeLocal);
    if (!startAtIso) continue;

    const preshowAtIso = preshowMinutes
      ? new Date(new Date(startAtIso).getTime() - preshowMinutes * 60_000).toISOString()
      : null;

    editions.push({
      number,
      dateKey,
      startAtIso,
      preshowAtIso,
      isOverride: Boolean(override),
    });
  }

  return editions;
}

/** Het seizoen 2026/27 zoals vastgesteld: zes edities, 2e zondag, 11:00. */
export const OMNIUM_2026_27_PLAN: OmniumSeasonPlanSpec = {
  season: "2026/27",
  firstMonth: "2026-10",
  monthCount: 6,
  weekday: 0,
  occurrence: 2,
  timeLocal: "11:00",
  preshowMinutesBefore: 30,
};

export function weekdayLabel(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? "onbekend";
}
