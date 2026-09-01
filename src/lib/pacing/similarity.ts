// "Hier lijkt dit op": eerdere ritten scoren op gelijkenis met het parcours.
//
// Zonder verwijzing is een pacingvoorstel een gok met decimalen. Met de zin
// "vorig jaar reed je hier 3,4 w/kg over 42 km met 700 hm" wordt het een
// vergelijking die het lid zelf kan wegen. Daarom levert dit bestand niet alleen
// een score maar ook de reden ervan, en houdt de aanroeper de rit-id vast zodat
// er naar dat ritverslag gelinkt kan worden.
//
// Gelijkenis op vier assen: afstand, hoogtemeters per kilometer, de langste klim
// en de rijduur. Elk als een verhoudingsscore, zodat "half zo lang" en "twee keer
// zo lang" even ver weg liggen. Geen enkele as mag alleen beslissen: een vlakke
// 40 km lijkt niet op een bergrit van 40 km.
//
// Pure logica; de aanroeper haalt de ritten uit strava_activities en
// intervals_activities.

export type RideSource = "strava" | "intervals";

export type RideCandidate = {
  id: string;
  source: RideSource;
  name: string;
  /** ISO-datum van de rit. */
  date: string;
  distanceKm: number;
  elevationM: number;
  movingSeconds: number;
  /** Gemiddeld vermogen; alleen bij een echte vermogensmeter. */
  avgWatts?: number | null;
  /** Genormaliseerd vermogen, als intervals.icu het kent. */
  normalizedWatts?: number | null;
  /** Zwaarste klim in de rit, als die bekend is. */
  longestClimbKm?: number | null;
  /**
   * Gereden op precies dezelfde route (bv. hetzelfde Zwift-segment). Krijgt een
   * eigen label; de score volgt gewoon uit de assen hieronder.
   */
  sameRoute?: boolean;
};

export type SimilarityTarget = {
  distanceKm: number;
  elevationM: number;
  longestClimbKm: number | null;
  /** Verwachte rijduur; laat weg als die nog niet berekend is. */
  expectedSeconds?: number | null;
};

export type ScoredRide = {
  ride: RideCandidate;
  /** 0..1, hoger is meer vergelijkbaar. */
  score: number;
  /** Leesbare redenen, sterkste eerst. */
  reasons: string[];
  /** Vermogen dat het lid daar leverde, als dat bekend is. */
  wattsUsed: number | null;
};

/**
 * Verhoudingsscore: 1 bij gelijk, aflopend naar 0 naarmate de waarden verder
 * uiteenlopen. Symmetrisch — twee keer zoveel scoort even laag als de helft.
 */
export function ratioScore(actual: number, target: number): number {
  if (target <= 0 || actual <= 0) return 0;
  const ratio = actual > target ? target / actual : actual / target;
  return ratio;
}

const WEIGHTS = {
  distance: 0.3,
  climbing: 0.35,
  longestClimb: 0.2,
  duration: 0.15,
} as const;

/** Onder deze score is "vergelijkbaar" een te groot woord. */
export const MIN_USABLE_SCORE = 0.55;
/** Ritten korter dan dit zijn geen referentie voor een event. */
const MIN_DISTANCE_KM = 5;

function climbingPerKm(distanceKm: number, elevationM: number): number {
  return distanceKm > 0 ? elevationM / distanceKm : 0;
}

export function scoreRide(
  target: SimilarityTarget,
  ride: RideCandidate,
): ScoredRide {
  const reasons: Array<{ text: string; weight: number }> = [];

  const distance = ratioScore(ride.distanceKm, target.distanceKm);
  const climbing = ratioScore(
    climbingPerKm(ride.distanceKm, ride.elevationM),
    climbingPerKm(target.distanceKm, target.elevationM),
  );

  let weightSum = WEIGHTS.distance + WEIGHTS.climbing;
  let total = distance * WEIGHTS.distance + climbing * WEIGHTS.climbing;

  if (distance > 0.85) {
    reasons.push({
      text: `vergelijkbare afstand (${ride.distanceKm.toFixed(0)} km)`,
      weight: distance,
    });
  }
  if (climbing > 0.85) {
    reasons.push({
      text: `vergelijkbaar klimwerk (${Math.round(climbingPerKm(ride.distanceKm, ride.elevationM))} hm/km)`,
      weight: climbing,
    });
  }

  // De langste klim telt alleen mee als beide kanten hem kennen; anders zou een
  // rit zonder klimdata automatisch slechter scoren dan een met.
  if (target.longestClimbKm != null && ride.longestClimbKm != null) {
    const longest = ratioScore(ride.longestClimbKm, target.longestClimbKm);
    total += longest * WEIGHTS.longestClimb;
    weightSum += WEIGHTS.longestClimb;
    if (longest > 0.8) {
      reasons.push({
        text: `klim van vergelijkbare lengte (${ride.longestClimbKm.toFixed(1)} km)`,
        weight: longest,
      });
    }
  }

  if (target.expectedSeconds && ride.movingSeconds > 0) {
    const duration = ratioScore(ride.movingSeconds, target.expectedSeconds);
    total += duration * WEIGHTS.duration;
    weightSum += WEIGHTS.duration;
    if (duration > 0.85) {
      reasons.push({
        text: `vergelijkbare rijduur (${formatDuration(ride.movingSeconds)})`,
        weight: duration,
      });
    }
  }

  if (ride.sameRoute) {
    reasons.unshift({ text: "dezelfde route", weight: 2 });
  }

  return {
    ride,
    score: weightSum > 0 ? total / weightSum : 0,
    reasons: reasons
      .sort((a, b) => b.weight - a.weight)
      .map((reason) => reason.text),
    wattsUsed: ride.normalizedWatts ?? ride.avgWatts ?? null,
  };
}

/**
 * De best vergelijkbare ritten, sterkste eerst. Ritten op dezelfde route komen
 * bovenaan bij gelijke score, want een exacte match is als referentie meer waard
 * dan een die er alleen op lijkt.
 */
export function scoreSimilarRides(
  target: SimilarityTarget,
  rides: RideCandidate[],
  limit = 3,
): ScoredRide[] {
  return rides
    .filter((ride) => ride.distanceKm >= MIN_DISTANCE_KM)
    .map((ride) => scoreRide(target, ride))
    .filter((scored) => scored.score >= MIN_USABLE_SCORE)
    .sort((a, b) => {
      if (a.ride.sameRoute !== b.ride.sameRoute) return a.ride.sameRoute ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      // Bij gelijke score wint de recentste rit: die zegt het meest over de vorm.
      return b.ride.date.localeCompare(a.ride.date);
    })
    .slice(0, limit);
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}u ${String(rest).padStart(2, "0")}m` : `${rest} min`;
}
