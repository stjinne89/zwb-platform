import { describe, expect, it } from "vitest";
import { convertPowerText, formatPower, parsePowerUnit } from "@/lib/training/power-unit";

describe("parsePowerUnit", () => {
  it("valt terug op watt bij een onbekende waarde", () => {
    expect(parsePowerUnit("wkg")).toBe("wkg");
    expect(parsePowerUnit("w")).toBe("w");
    expect(parsePowerUnit("pct")).toBe("pct");
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

  it("toont een los vermogen in watt als de keuze % FTP is", () => {
    expect(formatPower(265, "pct", 83)).toBe("265 W");
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

  it("rekent een percentage van de FTP om naar watt en W/kg", () => {
    expect(convertPowerText("45-60% FTP", "w", 80, 250)).toBe("113-150 W");
    expect(convertPowerText("65-70% FTP", "wkg", 80, 250)).toBe("2,0-2,2 W/kg");
    expect(convertPowerText("RPE 4, 65-70%", "w", 80, 250)).toBe("RPE 4, 163-175 W");
    expect(convertPowerText("75% van je FTP", "w", 80, 200)).toBe("150 W");
  });

  it("rekent wattages om naar een percentage van de FTP", () => {
    expect(convertPowerText("225-240w", "pct", 80, 250)).toBe("90-96% FTP");
    expect(convertPowerText("RPE 7: 250 W", "pct", 80, 250)).toBe("RPE 7: 100% FTP");
    expect(convertPowerText("45-60% FTP", "pct", 80, 250)).toBe("45-60% FTP");
  });

  it("rekent niet om wat er al in de gevraagde vorm staat", () => {
    expect(convertPowerText("RPE 6, 162-178w, 81-89%", "w", 80, 200)).toBe(
      "RPE 6, 162-178w, 81-89%",
    );
    expect(convertPowerText("RPE 6, 162-178w, 81-89%", "pct", 80, 200)).toBe(
      "RPE 6, 162-178w, 81-89%",
    );
  });

  it("laat een percentage staan zonder FTP, en een hartslagpercentage altijd", () => {
    expect(convertPowerText("45-60% FTP", "w", 80, null)).toBe("45-60% FTP");
    expect(convertPowerText("225-240w", "pct", 80, null)).toBe("225-240w");
    expect(convertPowerText("65-70% FTP", "wkg", null, 250)).toBe("65-70% FTP");
    expect(convertPowerText("80% HFmax", "w", 80, 250)).toBe("80% HFmax");
  });
});
