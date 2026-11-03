import { describe, expect, it } from "vitest";
import { scoopsLabel } from "@/lib/nutrition/scoops";

describe("scoopsLabel", () => {
  it("rondt af op halve scheppen", () => {
    expect(scoopsLabel(32, 32)).toBe("1 schep");
    expect(scoopsLabel(48, 32)).toBe("1½ schep");
    expect(scoopsLabel(64, 32)).toBe("2 scheppen");
    expect(scoopsLabel(21, 32)).toBe("½ schep");
  });

  it("toont minstens een halve schep", () => {
    expect(scoopsLabel(3, 32)).toBe("½ schep");
  });

  it("zonder schepmaat geen tekst", () => {
    expect(scoopsLabel(32, null)).toBeNull();
    expect(scoopsLabel(32, undefined)).toBeNull();
    expect(scoopsLabel(32, 0)).toBeNull();
    expect(scoopsLabel(0, 32)).toBeNull();
  });
});
