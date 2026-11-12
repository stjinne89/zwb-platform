import { describe, expect, it } from "vitest";
import { combineRatings } from "@/lib/zwiftracing/combine";

const order = (ratings: Map<number, number | null>) =>
  [...ratings]
    .filter(([, v]) => v != null)
    .sort((a, b) => b[1]! - a[1]!)
    .map(([id]) => id);

describe("combineRatings", () => {
  it("houdt onze sterkte ongewijzigd als te weinig renners een rating hebben", () => {
    const rows = [
      { zwiftId: 1, power: 4, velo: 2000 },
      { zwiftId: 2, power: 3, velo: 1500 },
      { zwiftId: 3, power: 2, velo: 1000 },
      { zwiftId: 4, power: 3.5, velo: null },
      { zwiftId: 5, power: 2.5, velo: null },
    ];
    const { ratings, basis } = combineRatings(rows);
    expect(basis).toBe("power");
    expect(ratings.get(4)).toBe(3.5);
  });

  it("weegt vermogen en rating gelijk mee", () => {
    const rows = [
      // Sterk op vermogen en zwak in races, en andersom: samen in het midden.
      { zwiftId: 1, power: 5, velo: 1000 },
      { zwiftId: 2, power: 3, velo: 2000 },
      { zwiftId: 3, power: 4, velo: 1500 },
      { zwiftId: 4, power: 2, velo: 900 },
    ];
    const { ratings, basis } = combineRatings(rows);
    expect(basis).toBe("combined");
    expect(order(ratings).at(-1)).toBe(4);
    for (const value of ratings.values()) expect(value).toBeGreaterThan(0);
  });

  it("geeft een renner zonder vermogen een plek op zijn rating alleen", () => {
    const rows = [
      { zwiftId: 1, power: 4, velo: 1800 },
      { zwiftId: 2, power: 3, velo: 1400 },
      { zwiftId: 3, power: 2, velo: 1000 },
      { zwiftId: 4, power: null, velo: 2200 },
    ];
    expect(order(combineRatings(rows).ratings)[0]).toBe(4);
  });

  it("geeft null aan wie niets heeft", () => {
    const rows = [
      { zwiftId: 1, power: 4, velo: 1800 },
      { zwiftId: 2, power: 3, velo: 1400 },
      { zwiftId: 3, power: 2, velo: 1000 },
      { zwiftId: 4, power: null, velo: null },
    ];
    expect(combineRatings(rows).ratings.get(4)).toBeNull();
  });

  it("valt terug op de rating als te weinig renners vermogen hebben", () => {
    const rows = [
      { zwiftId: 1, power: 4, velo: 1800 },
      { zwiftId: 2, power: null, velo: 1400 },
      { zwiftId: 3, power: null, velo: 1000 },
    ];
    const { ratings, basis } = combineRatings(rows);
    expect(basis).toBe("velo");
    expect(order(ratings)).toEqual([1, 2, 3]);
  });
});
