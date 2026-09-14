// Conflictcheck tegen de vaste Zwift-kalender.
//
// "Inpassen bij belangrijke andere Zwift-events" is voor het grootste deel een
// vraag naar terugkerende patronen, en die zijn bekend: de ZRL rijdt dinsdag,
// de WTRL TTT is donderdag, en Tour de Zwift en Zwift Games bezetten elk een
// blok van zes weken. Dat is hier data, zodat de seizoensplanner een datum kan
// afkeuren voordat hij in de agenda staat.
//
// Bewust géén scraping: de ZRL-rondes komen uit dezelfde constante die de
// racekalender al gebruikt, en de seriesvensters staan hier met de hand in
// omdat Zwift ze pas laat aankondigt. Een venster met confirmed: false is een
// schatting op basis van vorig jaar en hoort ook zo getoond te worden.

import { ZRL_2026_27_ROUNDS } from "@/lib/teams/zrl-season";

export type ConflictSeverity = "clash" | "adjacent" | "series_window";

export type SeriesConflict = {
  series: string;
  severity: ConflictSeverity;
  detail: string;
  /** false = geschatte datums, nog niet officieel aangekondigd. */
  confirmed: boolean;
};

export type SeriesWindow = {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  confirmed: boolean;
};

// Tour de Zwift liep in 2026 van 5 januari tot 22 februari, Zwift Games van
// 16 februari tot 29 maart. De 2027-datums waren in augustus 2026 nog niet
// aangekondigd; dit zijn schattingen op basis van dat patroon en ze moeten
// worden bijgewerkt zodra Zwift ze publiceert.
export const ZWIFT_SERIES_WINDOWS: SeriesWindow[] = [
  {
    id: "tour-de-zwift-2027",
    label: "Tour de Zwift",
    startsOn: "2027-01-04",
    endsOn: "2027-02-21",
    confirmed: false,
  },
  {
    id: "zwift-games-2027",
    label: "Zwift Games",
    startsOn: "2027-02-15",
    endsOn: "2027-03-28",
    confirmed: false,
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(dateKey: string): Date | null {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function shiftDays(dateKey: string, days: number): string {
  const date = toDate(dateKey);
  if (!date) return dateKey;
  return new Date(date.getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function withinRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to;
}

/** Is dit een dinsdag waarop de ZRL rijdt? Zo ja: welke ronde. */
export function zrlRaceRound(dateKey: string): number | null {
  const date = toDate(dateKey);
  if (!date || date.getUTCDay() !== 2) return null;
  for (const round of ZRL_2026_27_ROUNDS) {
    if (withinRange(dateKey, round.firstRaceDate, round.lastRaceDate)) {
      return round.round;
    }
  }
  return null;
}

/**
 * Alle bekende botsingen voor één datum. "adjacent" is de dag vóór of ná een
 * ZRL-race: geen agendaconflict, maar wel benen die gespaard of hersteld
 * moeten worden — voor een onderdeel van negentig minuten op intensiteit is
 * dat het vermelden waard.
 */
export function conflictsForDate(
  dateKey: string,
  windows: SeriesWindow[] = ZWIFT_SERIES_WINDOWS,
): SeriesConflict[] {
  const conflicts: SeriesConflict[] = [];
  const date = toDate(dateKey);
  if (!date) return conflicts;

  const sameDayRound = zrlRaceRound(dateKey);
  if (sameDayRound !== null) {
    conflicts.push({
      series: "Zwift Racing League",
      severity: "clash",
      detail: `ZRL ronde ${sameDayRound} rijdt op deze dinsdag.`,
      confirmed: true,
    });
  } else {
    const before = zrlRaceRound(shiftDays(dateKey, -1));
    const after = zrlRaceRound(shiftDays(dateKey, 1));
    if (before !== null) {
      conflicts.push({
        series: "Zwift Racing League",
        severity: "adjacent",
        detail: `De dag na een race van ZRL ronde ${before}.`,
        confirmed: true,
      });
    }
    if (after !== null) {
      conflicts.push({
        series: "Zwift Racing League",
        severity: "adjacent",
        detail: `De dag voor een race van ZRL ronde ${after}.`,
        confirmed: true,
      });
    }
  }

  if (date.getUTCDay() === 4) {
    conflicts.push({
      series: "WTRL Team Time Trial",
      severity: "clash",
      detail: "De WTRL TTT rijdt elke donderdag.",
      confirmed: true,
    });
  }

  // Zaterdag: de Zwift Insider Tiny Races zijn vier korte races binnen een uur
  // in drie tijdvakken, dus vrijwel hetzelfde format als een Omnium-editie.
  if (date.getUTCDay() === 6) {
    conflicts.push({
      series: "Zwift Insider Tiny Races",
      severity: "clash",
      detail: "Tiny Races rijden op zaterdag in drie tijdvakken.",
      confirmed: true,
    });
  }

  for (const window of windows) {
    if (withinRange(dateKey, window.startsOn, window.endsOn)) {
      conflicts.push({
        series: window.label,
        severity: "series_window",
        detail: window.confirmed
          ? `${window.label} loopt van ${window.startsOn} tot ${window.endsOn}.`
          : `${window.label} loopt naar schatting van ${window.startsOn} tot ${window.endsOn}.`,
        confirmed: window.confirmed,
      });
    }
  }

  return conflicts;
}

export type DateConflicts = {
  dateKey: string;
  conflicts: SeriesConflict[];
};

export function conflictsForDates(
  dateKeys: string[],
  windows: SeriesWindow[] = ZWIFT_SERIES_WINDOWS,
): DateConflicts[] {
  return dateKeys.map((dateKey) => ({
    dateKey,
    conflicts: conflictsForDate(dateKey, windows),
  }));
}

/** Alleen de echte botsingen; series_window is aandacht, geen agendaprobleem. */
export function hasBlockingConflict(conflicts: SeriesConflict[]): boolean {
  return conflicts.some((conflict) => conflict.severity === "clash");
}
