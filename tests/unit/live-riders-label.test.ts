import { describe, expect, it } from "vitest";
import { liveRidersLabel } from "@/lib/live/riders-label";

const rider = (profileId: string, name: string) => ({ profileId, name });

describe("liveRidersLabel", () => {
  it("noemt één renner bij naam", () => {
    expect(liveRidersLabel([rider("a", "Anna")], "x")).toBe("Anna");
  });

  it("zet de kijker voorop als Jij", () => {
    expect(liveRidersLabel([rider("a", "Anna"), rider("x", "Xander")], "x")).toBe("Jij en Anna");
    expect(liveRidersLabel([rider("x", "Xander")], "x")).toBe("Jij");
  });

  it("noemt hooguit drie namen en telt de rest", () => {
    const riders = ["Anna", "Bert", "Carla", "Dirk", "Eva"].map((name) => rider(name, name));
    expect(liveRidersLabel(riders.slice(0, 3), null)).toBe("Anna, Bert en Carla");
    expect(liveRidersLabel(riders.slice(0, 4), null)).toBe("Anna, Bert, Carla en 1 ander");
    expect(liveRidersLabel(riders, null)).toBe("Anna, Bert, Carla en 2 anderen");
  });

  it("geeft een lege tekst zonder renners", () => {
    expect(liveRidersLabel([], "x")).toBe("");
  });
});
