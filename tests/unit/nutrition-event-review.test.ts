import { describe, expect, it } from "vitest";
import { carbBurnPerHour } from "@/lib/nutrition/event-fuel";
import { burnFromWork, eventFuelReview, pickRide, rideIntensity } from "@/lib/nutrition/event-review";

describe("na het event (stap 8)", () => {
  it("kiest de rit die in duur het dichtst bij het plan ligt, vanaf een kwartier", () => {
    const rides = [
      { minutes: 10, kj: 100, intensityFactor: null },
      { minutes: 25, kj: 300, intensityFactor: null },
      { minutes: 130, kj: 1650, intensityFactor: 0.9 },
    ];
    expect(pickRide(rides, 120)?.minutes).toBe(130);
    expect(pickRide(rides, 20)?.minutes).toBe(25);
    expect(pickRide([{ minutes: 10, kj: null, intensityFactor: null }], 10)).toBeNull();
    expect(pickRide([], 60)).toBeNull();
  });

  it("rekent de IF uit NP en FTP, anders uit icu_intensity, ook als percentage", () => {
    expect(rideIntensity({ normalized_watts: 234, ftp_watts: 260 })).toBe(0.9);
    expect(rideIntensity({ intensity: 87.5 })).toBe(0.88);
    expect(rideIntensity({ intensity: 0.82 })).toBe(0.82);
    expect(rideIntensity({ intensity: null })).toBeNull();
    expect(rideIntensity({ intensity: 250 })).toBeNull();
  });

  it("verbruik uit het werk met hetzelfde model als het advies", () => {
    // 1800 kJ in een uur is 500 W gemiddeld.
    expect(burnFromWork(1800, 60, 0.9)).toBe(Math.round(carbBurnPerHour(500, 0.9)));
    expect(burnFromWork(0, 60, 0.9)).toBeNull();
    expect(burnFromWork(1000, 0, 0.9)).toBeNull();
  });

  it("legt plan, rit en eten naast elkaar", () => {
    const review = eventFuelReview({
      plan: { minutes: 120, perHourG: 90, burnG: 425, intensityFactor: 0.85 },
      ride: { minutes: 138, kj: 1650, intensityFactor: null },
      eaten: { carbsG: 150.4, incomplete: false },
    });
    expect(review.plan.eatG).toBe(180);
    // Zonder IF van de rit rekent het verbruik met de IF van het plan.
    expect(review.ridden.burnG).toBe(burnFromWork(1650, 138, 0.85));
    expect(review.eaten).toEqual({ carbsG: 150, perHourG: 65, incomplete: false });
  });

  it("zonder kJ geen verbruik, zonder eetdagboek geen eten", () => {
    const review = eventFuelReview({
      plan: { minutes: 60, perHourG: 60, burnG: null, intensityFactor: 0.7 },
      ride: { minutes: 62, kj: null, intensityFactor: null },
      eaten: null,
    });
    expect(review.ridden.burnG).toBeNull();
    expect(review.eaten).toBeNull();
  });
});
