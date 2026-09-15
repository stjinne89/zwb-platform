// Gemeten tijd per zone bij een gereden training.
//
// Jeroen wilde bij een training uit het verleden de zones zien, net als bij een
// komende. De geplande opbouw staat er sinds R3; dit is de gemeten kant: hoeveel
// minuten je werkelijk in elke zone reed.
//
// Bron is de watt-stream uit intervals.icu, ingedeeld in de zes Zwift-zones die
// ook de blokken kleuren (workouts.ts). intervals.icu rekent zelf ook zonetijden
// uit (icu_zone_times), maar op de eigen zones van het lid (Z1-Z7 plus
// sweetspot); die passen niet op de kleuren van de blokken. Keuze van de
// eigenaar, 15 september 2026.
//
// Alleen ritten die rechtstreeks in intervals.icu staan (Garmin, Wahoo, …). Een
// rit die via Strava binnenkwam is daar een stub zonder stream; Strava zelf
// vragen kost budget onder de atletenlimiet en doen we bewust niet.
//
// Dit bestand is puur (ook in de browser bruikbaar); het ophalen en opslaan
// staat in zone-times-fill.ts.

import {
  powerRangePercentForBlock,
  ZWIFT_ZONES,
  zwiftZoneForPct,
  type WorkoutBlock,
} from "@/lib/training/workouts";

export type ZoneTimes =
  | {
      source: "intervals";
      intervalsId: string;
      /** De FTP waarmee is ingedeeld; een latere FTP deelt niet opnieuw in. */
      ftpWatts: number;
      /** Seconden per Zwift-zone, Z1 tot en met Z6. */
      seconds: number[];
    }
  | { source: "none"; checkedAt: string };

/** Een gat in de stream langer dan dit is stilstaan, geen rijden. */
const MAX_SAMPLE_GAP_S = 10;

/**
 * Seconden per Zwift-zone uit een watt-stream. Zonder tijdreeks telt elk sample
 * als één seconde (intervals.icu levert 1 Hz). Een ontbrekende waarde is uitval
 * van de meter en telt niet mee; een gat in de tijd langer dan tien seconden is
 * een pauze.
 */
export function zoneSecondsFromStream(
  watts: Array<number | null | undefined>,
  time: Array<number | null | undefined> | null,
  ftpWatts: number,
): number[] {
  const seconds = ZWIFT_ZONES.map(() => 0);
  if (!(ftpWatts > 0)) return seconds;
  for (let i = 0; i < watts.length; i++) {
    const value = watts[i];
    if (value == null || !Number.isFinite(value) || value < 0) continue;
    let duration = 1;
    if (time && i + 1 < time.length && time[i] != null && time[i + 1] != null) {
      const delta = Number(time[i + 1]) - Number(time[i]);
      duration = delta > 0 && delta <= MAX_SAMPLE_GAP_S ? delta : delta > MAX_SAMPLE_GAP_S ? 0 : 1;
    }
    seconds[zwiftZoneForPct((value / ftpWatts) * 100).zone - 1] += duration;
  }
  return seconds;
}

/** Geplande seconden per Zwift-zone, op het midden van elk blokdoel. */
export function plannedZoneSeconds(blocks: WorkoutBlock[], ftpWatts: number | null): number[] {
  const seconds = ZWIFT_ZONES.map(() => 0);
  for (const block of blocks) {
    const range = block.intensity === "rest" ? [0, 0] : powerRangePercentForBlock(block, ftpWatts);
    const pct = range ? (range[0] + range[1]) / 2 : 0;
    seconds[zwiftZoneForPct(pct).zone - 1] += block.durationMinutes * 60;
  }
  return seconds;
}

export type IntervalsCandidate = {
  intervalsId: string;
  /** "YYYY-MM-DDTHH:mm:ss", lokale tijd zonder zone, zoals intervals.icu hem geeft. */
  startLocal: string;
  movingSeconds: number | null;
  source: string | null;
};

/** Starttijd in minuten sinds epoch, zonder tijdzone te interpreteren. */
function localMinutes(value: string): number | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  return Date.UTC(y, mo - 1, d, h, mi) / 60_000;
}

const START_TOLERANCE_MIN = 10;
const MOVING_TOLERANCE = 0.15;

/**
 * Welke intervals-activiteit hoort bij deze Strava-rit? Dezelfde lokale start
 * (binnen tien minuten) en ongeveer dezelfde rijtijd. Een activiteit die zelf
 * van Strava kwam telt niet: die heeft geen stream. Bij twee kandidaten wint de
 * dichtstbijzijnde start.
 */
export function pickIntervalsActivity(
  ride: { startLocal: string; movingSeconds: number | null },
  candidates: IntervalsCandidate[],
): IntervalsCandidate | null {
  const rideStart = localMinutes(ride.startLocal);
  if (rideStart == null) return null;
  let best: IntervalsCandidate | null = null;
  let bestDelta = Infinity;
  for (const candidate of candidates) {
    if ((candidate.source ?? "").toUpperCase() === "STRAVA") continue;
    const start = localMinutes(candidate.startLocal);
    if (start == null) continue;
    const delta = Math.abs(start - rideStart);
    if (delta > START_TOLERANCE_MIN) continue;
    if (ride.movingSeconds && candidate.movingSeconds) {
      const ratio = Math.abs(candidate.movingSeconds - ride.movingSeconds) / ride.movingSeconds;
      if (ratio > MOVING_TOLERANCE) continue;
    }
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best;
}
