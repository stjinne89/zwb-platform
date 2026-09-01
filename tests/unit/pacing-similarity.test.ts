import { describe, expect, it } from "vitest";
import {
  MIN_USABLE_SCORE,
  ratioScore,
  scoreRide,
  scoreSimilarRides,
  type RideCandidate,
  type SimilarityTarget,
} from "@/lib/pacing/similarity";

const FLAT_40: SimilarityTarget = {
  distanceKm: 40,
  elevationM: 200,
  longestClimbKm: null,
  expectedSeconds: 3900,
};

function ride(overrides: Partial<RideCandidate> = {}): RideCandidate {
  return {
    id: "1",
    source: "strava",
    name: "Rit",
    date: "2026-05-01",
    distanceKm: 40,
    elevationM: 200,
    movingSeconds: 3900,
    ...overrides,
  };
}

describe("ratioScore", () => {
  it("is 1 bij gelijke waarden", () => {
    expect(ratioScore(40, 40)).toBe(1);
  });

  it("straft twee keer zoveel even hard als de helft", () => {
    expect(ratioScore(80, 40)).toBeCloseTo(ratioScore(20, 40), 10);
  });

  it("is 0 bij een ontbrekende of onmogelijke waarde", () => {
    expect(ratioScore(0, 40)).toBe(0);
    expect(ratioScore(40, 0)).toBe(0);
  });
});

describe("scoreRide", () => {
  it("scoort een identieke rit bijna maximaal", () => {
    const scored = scoreRide(FLAT_40, ride());
    expect(scored.score).toBeGreaterThan(0.95);
    expect(scored.reasons.length).toBeGreaterThan(0);
  });

  it("scoort een vlakke 40 km hoger tegen een vlakke 40 km dan tegen een bergrit", () => {
    const flat = scoreRide(FLAT_40, ride({ distanceKm: 42, elevationM: 240 }));
    const mountains = scoreRide(
      FLAT_40,
      ride({ id: "2", distanceKm: 120, elevationM: 2600, movingSeconds: 16_000 }),
    );
    expect(flat.score).toBeGreaterThan(mountains.score);
    expect(mountains.score).toBeLessThan(MIN_USABLE_SCORE);
  });

  it("laat klimwerk per kilometer zwaarder wegen dan pure afstand", () => {
    // Zelfde afstand, heel ander karakter.
    const sameDistance = scoreRide(FLAT_40, ride({ elevationM: 1400 }));
    // Andere afstand, zelfde karakter.
    const sameCharacter = scoreRide(FLAT_40, ride({ distanceKm: 55, elevationM: 275 }));
    expect(sameCharacter.score).toBeGreaterThan(sameDistance.score);
  });

  it("negeert de langste klim als een van beide kanten die niet kent", () => {
    const withoutClimbData = scoreRide(FLAT_40, ride({ longestClimbKm: 4 }));
    const plain = scoreRide(FLAT_40, ride());
    expect(withoutClimbData.score).toBeCloseTo(plain.score, 10);
  });

  it("telt de langste klim mee als beide kanten die kennen", () => {
    const target: SimilarityTarget = { ...FLAT_40, longestClimbKm: 4 };
    const match = scoreRide(target, ride({ longestClimbKm: 4 }));
    const mismatch = scoreRide(target, ride({ longestClimbKm: 0.4 }));
    expect(match.score).toBeGreaterThan(mismatch.score);
  });

  it("zet 'dezelfde route' vooraan bij de redenen", () => {
    const scored = scoreRide(FLAT_40, ride({ sameRoute: true }));
    expect(scored.reasons[0]).toBe("dezelfde route");
  });

  it("gebruikt genormaliseerd vermogen boven gemiddeld vermogen", () => {
    expect(scoreRide(FLAT_40, ride({ avgWatts: 210, normalizedWatts: 245 })).wattsUsed).toBe(245);
    expect(scoreRide(FLAT_40, ride({ avgWatts: 210 })).wattsUsed).toBe(210);
    expect(scoreRide(FLAT_40, ride()).wattsUsed).toBeNull();
  });
});

describe("scoreSimilarRides", () => {
  it("levert de best passende ritten, sterkste eerst", () => {
    const rides = [
      ride({ id: "ver", distanceKm: 130, elevationM: 3000, movingSeconds: 18_000 }),
      ride({ id: "dichtbij", distanceKm: 43, elevationM: 230 }),
      ride({ id: "exact" }),
    ];
    const result = scoreSimilarRides(FLAT_40, rides);
    expect(result[0].ride.id).toBe("exact");
    expect(result[1].ride.id).toBe("dichtbij");
    expect(result.map((item) => item.ride.id)).not.toContain("ver");
  });

  it("zet dezelfde route bovenaan, ook bij een iets lagere score", () => {
    const rides = [
      ride({ id: "perfect" }),
      ride({ id: "zelfde-route", distanceKm: 44, elevationM: 250, sameRoute: true }),
    ];
    expect(scoreSimilarRides(FLAT_40, rides)[0].ride.id).toBe("zelfde-route");
  });

  it("kiest bij gelijke score de recentste rit", () => {
    const rides = [
      ride({ id: "oud", date: "2023-04-01" }),
      ride({ id: "nieuw", date: "2026-04-01" }),
    ];
    expect(scoreSimilarRides(FLAT_40, rides)[0].ride.id).toBe("nieuw");
  });

  it("gooit rondjes om de kerk eruit", () => {
    const result = scoreSimilarRides(
      FLAT_40,
      [ride({ id: "kort", distanceKm: 2, elevationM: 10, movingSeconds: 400 })],
    );
    expect(result).toHaveLength(0);
  });

  it("houdt zich aan de gevraagde limiet", () => {
    const rides = Array.from({ length: 8 }, (_, index) =>
      ride({ id: `r${index}`, distanceKm: 40 + index }),
    );
    expect(scoreSimilarRides(FLAT_40, rides, 3)).toHaveLength(3);
  });
});
