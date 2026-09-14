import { describe, expect, it } from "vitest";
import { convertPowerText, formatPower, parsePowerUnit } from "@/lib/training/power-unit";

describe("parsePowerUnit", () => {
  it("valt terug op watt bij een onbekende waarde", () => {
    expect(parsePowerUnit("wkg")).toBe("wkg");
    expect(parsePowerUnit("w")).toBe("w");
    expect(parsePowerUnit(undefined)).toBe("w");
    expect(parsePowerUnit("kg")).toBe("w");
  });
});

describe("formatPower", () => {
  it("toont watt of W/kg met twee decimalen", () => {
    expect(formatPower(265, "w", 83)).toBe("265 W");
    expect(formatPower(265, "wkg", 83)).toBe("3,19 W/kg");
  });

  it("blijft op watt zonder bruikbaar gewicht", () => {
    expect(formatPower(265, "wkg", null)).toBe("265 W");
    expect(formatPower(265, "wkg", 0)).toBe("265 W");
    expect(formatPower(null, "wkg", 83)).toBe("-");
  });
});

describe("convertPowerText", () => {
  it("rekent een wattbereik en een los wattage om", () => {
    expect(convertPowerText("225-240w", "wkg", 80)).toBe("2,8-3,0 W/kg");
    expect(convertPowerText("Drempel · 95-100% · 225-240w", "wkg", 80)).toBe(
      "Drempel · 95-100% · 2,8-3,0 W/kg",
    );
    expect(convertPowerText("RPE 7: 250 W", "wkg", 80)).toBe("RPE 7: 3,1 W/kg");
  });

  it("laat percentages, watt-modus en tekst zonder gewicht ongemoeid", () => {
    expect(convertPowerText("88-92%", "wkg", 80)).toBe("88-92%");
    expect(convertPowerText("225-240w", "w", 80)).toBe("225-240w");
    expect(convertPowerText("225-240w", "wkg", null)).toBe("225-240w");
    expect(convertPowerText("3,0 W/kg", "wkg", 80)).toBe("3,0 W/kg");
  });
});
