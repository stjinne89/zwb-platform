// Van een blok-doel naar een leesbare wattage-hint. Stond eerder los in de
// trainingspagina met een eigen kopie van de %FTP-banden; die banden komen nu
// uit één bron (INTENSITY_FTP_RANGE in workouts.ts).

import { INTENSITY_FTP_RANGE, type WorkoutIntensity } from "@/lib/training/workouts";

export function percentRangeForIntensity(intensity: string): [number, number] | null {
  const range = INTENSITY_FTP_RANGE[intensity as WorkoutIntensity];
  if (!range) return null;
  // Rust is geen vermogensband maar "niet rijden"; de hint toont dat als tekst.
  return intensity === "rest" ? [0, 0] : range;
}

export function percentRangeForRpe(rpe: number): [number, number] | null {
  if (rpe <= 1) return [0, 45];
  if (rpe <= 3) return [45, 60];
  if (rpe === 4) return [60, 70];
  if (rpe === 5) return [70, 80];
  if (rpe === 6) return [80, 90];
  if (rpe === 7) return [90, 100];
  if (rpe === 8) return [100, 110];
  if (rpe === 9) return [110, 125];
  return [125, 150];
}

export function rpeFromText(text: string) {
  const match = text.match(/\brpe\s*([1-9]|10)\b/i);
  return match ? Number(match[1]) : null;
}

export function wattRangeLabel(
  ftpWatts: number | null | undefined,
  range: [number, number] | null,
) {
  if (!ftpWatts || !range) return null;
  const [low, high] = range;
  if (low === 0 && high === 0) return "Rust";
  return `${Math.round((ftpWatts * low) / 100)}-${Math.round((ftpWatts * high) / 100)}w`;
}

/**
 * Wattage-hint bij een blok. Geeft null als het doel zelf al een wattage bevat
 * (dan zou de hint hetzelfde herhalen) of als er geen FTP bekend is.
 */
export function targetHint({
  ftpWatts,
  intensity,
  target,
  notes,
}: {
  ftpWatts?: number | null;
  intensity: string;
  target?: string;
  notes?: string;
}) {
  const text = `${target ?? ""} ${notes ?? ""}`;
  const rpe = rpeFromText(text);
  const range = rpe ? percentRangeForRpe(rpe) : percentRangeForIntensity(intensity);
  const watts = wattRangeLabel(ftpWatts, range);
  if (!watts || /(\d+\s*-\s*\d+\s*w|\d+\s*w)/i.test(target ?? "")) return null;
  return rpe ? `RPE ${rpe}: ${watts}` : watts;
}
