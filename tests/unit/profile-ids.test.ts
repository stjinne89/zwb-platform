import { describe, expect, it } from "vitest";
import { intervalsId, stravaHandle, zwiftId } from "@/lib/profile/ids";

// Deze parsers bepalen sinds de Zwift-dialoog ook wat er wordt opgeslagen, niet
// alleen of er een chip verschijnt. Onzin die er toch doorheen glipt levert een
// profiel op waarbij de koppeling stil kapot is.

describe("zwiftId", () => {
  it("accepteert een kaal nummer", () => {
    expect(zwiftId("1234567")).toBe("1234567");
    expect(zwiftId("  1234567  ")).toBe("1234567");
  });

  it("pelt een geplakte ZwiftPower- of ZwiftRacing-link af", () => {
    expect(zwiftId("https://zwiftpower.com/profile.php?z=2650151")).toBe("2650151");
    expect(zwiftId("https://www.zwiftracing.app/riders/2650151")).toBe("2650151");
  });

  it("weigert tekst en lege invoer", () => {
    expect(zwiftId("weet ik niet")).toBeNull();
    expect(zwiftId("12a34")).toBeNull();
    expect(zwiftId("")).toBeNull();
    expect(zwiftId(null)).toBeNull();
  });
});

describe("stravaHandle", () => {
  it("accepteert nummer, gebruikersnaam en @-prefix", () => {
    expect(stravaHandle("12345")).toBe("12345");
    expect(stravaHandle("stijn.martens")).toBe("stijn.martens");
    expect(stravaHandle("@stijn")).toBe("stijn");
  });

  it("pelt een geplakte profiel-URL af", () => {
    expect(stravaHandle("https://www.strava.com/athletes/12345")).toBe("12345");
  });

  it("weigert spaties", () => {
    expect(stravaHandle("stijn martens")).toBeNull();
  });
});

describe("intervalsId", () => {
  it("accepteert de i-vorm, ook hoofdletter", () => {
    expect(intervalsId("i141441")).toBe("i141441");
    expect(intervalsId("I141441")).toBe("i141441");
  });

  it("pelt een geplakte profiel-URL af", () => {
    expect(intervalsId("https://intervals.icu/athlete/i141441")).toBe("i141441");
  });

  it("weigert een kaal nummer", () => {
    expect(intervalsId("141441")).toBeNull();
  });
});
