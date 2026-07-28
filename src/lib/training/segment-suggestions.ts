import type { WorkoutBlock, WorkoutIntensity } from "@/lib/training/workouts";

export type SegmentCandidate = {
  slug: string;
  name: string;
  distanceM: number | null;
  elevationGainM: number | null;
  virtual: boolean;
  /** Eigen besttijd in seconden, als het lid het segment al reed. */
  bestTimeSeconds?: number | null;
};

export type SegmentSuggestion = SegmentCandidate & {
  /** Geschatte of gereden duur waarop we het blok matchen. */
  estimatedSeconds: number;
  ridden: boolean;
};

/**
 * Ruwe duurschatting voor een segment dat het lid nog niet reed: 26 km/u vlak,
 * met een toeslag per hoogtemeter. Alleen bedoeld om te sorteren, niet om mee
 * te plannen.
 */
function estimateSeconds(segment: SegmentCandidate) {
  if (segment.bestTimeSeconds && segment.bestTimeSeconds > 0) return segment.bestTimeSeconds;
  const distanceKm = (segment.distanceM ?? 0) / 1000;
  if (distanceKm <= 0) return 0;
  const flatSeconds = (distanceKm / 26) * 3600;
  const climbSeconds = (segment.elevationGainM ?? 0) * 7;
  return Math.round(flatSeconds + climbSeconds);
}

/** Bergop is zinnig bij lange, zware blokken; vlak bij korte, explosieve. */
function prefersClimb(intensity: WorkoutIntensity | string | null) {
  return intensity === "threshold" || intensity === "tempo" || intensity === "vo2max";
}

function climbGradient(segment: SegmentCandidate) {
  const distanceM = segment.distanceM ?? 0;
  if (distanceM <= 0) return 0;
  return ((segment.elevationGainM ?? 0) / distanceM) * 100;
}

/**
 * Zoekt segmenten waarvan de duur bij een intervalblok past. Deterministisch:
 * eigen besttijden gaan voor, daarna hoe dicht de duur bij het blok ligt.
 */
export function suggestSegmentsForBlock(
  block: Pick<WorkoutBlock, "durationMinutes" | "intensity">,
  segments: SegmentCandidate[],
  limit = 3,
): SegmentSuggestion[] {
  const blockSeconds = Math.round((block.durationMinutes ?? 0) * 60);
  if (blockSeconds <= 0) return [];
  const wantsClimb = prefersClimb(block.intensity);

  return segments
    .map((segment) => ({
      ...segment,
      estimatedSeconds: estimateSeconds(segment),
      ridden: Boolean(segment.bestTimeSeconds && segment.bestTimeSeconds > 0),
    }))
    .filter((segment) => {
      if (segment.estimatedSeconds <= 0) return false;
      const drift = Math.abs(segment.estimatedSeconds - blockSeconds) / blockSeconds;
      return drift <= 0.25;
    })
    .sort((a, b) => {
      // 1. Segmenten die het lid zelf reed: bekende duur, dus betrouwbaarder.
      if (a.ridden !== b.ridden) return a.ridden ? -1 : 1;
      // 2. Passend profiel bij de intensiteit.
      const aFits = wantsClimb ? climbGradient(a) >= 3 : climbGradient(a) < 3;
      const bFits = wantsClimb ? climbGradient(b) >= 3 : climbGradient(b) < 3;
      if (aFits !== bFits) return aFits ? -1 : 1;
      // 3. Dichtst bij de blokduur.
      return (
        Math.abs(a.estimatedSeconds - blockSeconds) - Math.abs(b.estimatedSeconds - blockSeconds)
      );
    })
    .slice(0, limit);
}
