import { describe, expect, it } from "vitest";
import {
  bagCap,
  carbBurnPerHour,
  carbShare,
  energyPerHour,
  estimatedSweatPerHour,
  eventFluid,
  eventSetting,
  fuelAdvice,
  fuelBalance,
  gutCap,
  intakeCap,
  sweatShare,
  usableGlycogen,
} from "@/lib/nutrition/event-fuel";

// kJ per uur uit intervals.icu (docs/eventvoeding-plan.md §2) terug naar watt.
const wattsFor = (kjPerHour: number) => kjPerHour / 3.6;

describe("verbruik", () => {
  it("rekent werk om naar energie met 22% bruto-efficiëntie", () => {
    const hour = energyPerHour(250);
    expect(hour.workKj).toBe(900);
    expect(hour.energyKcal).toBeCloseTo(978, 0);
    expect(hour.heatKj).toBeCloseTo(4091 - 900, 0);
  });

  it("laat het aandeel koolhydraten met de IF stijgen, vlak buiten de punten", () => {
    expect(carbShare(0.4)).toBe(0.45);
    expect(carbShare(0.65)).toBeCloseTo(0.58);
    expect(carbShare(0.7)).toBeCloseTo(0.64);
    expect(carbShare(0.95)).toBeCloseTo(0.92);
    expect(carbShare(1.1)).toBeCloseTo(0.92);
    expect(carbShare(Number.NaN)).toBe(0.45);
    expect(carbShare(0.8)).toBeGreaterThan(carbShare(0.75));
  });

  it("verbrandt bij een Zwift-race ruim 200 g per uur en op duurtempo rond 130", () => {
    expect(carbBurnPerHour(wattsFor(847), 0.94)).toBeCloseTo(209, 0);
    expect(carbBurnPerHour(wattsFor(734), 0.71)).toBeCloseTo(130, 0);
  });
});

describe("opnamegrens", () => {
  it("geeft de darm 90, het weekgetal tijdens de darmtraining en 120 na de keuze daarvoor", () => {
    expect(gutCap(120)).toBe(90);
    expect(gutCap(120, { weekGrams: 70, minMinutes: 90, high: false })).toBe(70);
    // Korter dan de oefenrit van de darmtraining: de gewone grens.
    expect(gutCap(60, { weekGrams: 70, minMinutes: 90, high: false })).toBe(90);
    expect(gutCap(180, { weekGrams: null, minMinutes: 0, high: true })).toBe(120);
    expect(gutCap(120, { weekGrams: null, minMinutes: 0, high: true })).toBe(90);
  });

  it("weegt de soorten in de tas naar gram koolhydraten", () => {
    expect(bagCap([{ carbsG: 80, mix: "2:1" }])).toBe(90);
    expect(bagCap([{ carbsG: 50, mix: "eten" }, { carbsG: 50, mix: "glucose" }])).toBe(60);
    expect(bagCap([{ carbsG: 60, mix: "1:0.8" }, { carbsG: 60, mix: "2:1" }])).toBe(105);
    expect(bagCap([{ carbsG: 40, mix: "onbekend" }])).toBe(60);
    expect(bagCap([])).toBeNull();
    expect(bagCap([{ carbsG: 0, mix: "2:1" }])).toBeNull();
  });

  it("neemt het laagste van darm en tas", () => {
    expect(intakeCap(180, null, 60)).toEqual({ capG: 60, limitedBy: "tas" });
    expect(intakeCap(180, { weekGrams: null, minMinutes: 0, high: true }, 90)).toEqual({ capG: 90, limitedBy: "tas" });
    expect(intakeCap(180, { weekGrams: null, minMinutes: 0, high: true }, 120)).toEqual({ capG: 120, limitedBy: "darm" });
    expect(intakeCap(180, null, null)).toEqual({ capG: 90, limitedBy: "darm" });
  });
});

describe("balans", () => {
  it("rekent 60% van 6 g/kg als te gebruiken voorraad, 8 g/kg na laden", () => {
    expect(usableGlycogen(75)).toBe(270);
    expect(usableGlycogen(75, true)).toBe(360);
  });

  it("noemt de minuut waarop de voorraad op de reserve komt", () => {
    // 2 uur race op 60 g/u: ~150 g per uur uit de voorraad, 270 g op na ~1:48.
    const balance = fuelBalance({ minutes: 122, watts: wattsFor(847), intensityFactor: 0.94, weightKg: 75, intakePerHourG: 60 });
    expect(balance.burnG).toBe(426);
    expect(balance.intakeG).toBe(122);
    expect(balance.reserveAtMinute).toBe(108);
    // Eten wat je verbrandt: de voorraad blijft staan.
    expect(fuelBalance({ minutes: 120, watts: 200, intensityFactor: 0.7, weightKg: 75, intakePerHourG: 200 })).toMatchObject({
      fromStoreG: 0,
      reserveAtMinute: null,
    });
  });
});

describe("advies per uur (de voorbeelden van docs/eventvoeding-plan.md §4)", () => {
  it("ZRL van 45 minuten: niets eten, alles uit de voorraad", () => {
    const advice = fuelAdvice({ minutes: 45, watts: wattsFor(826), intensityFactor: 0.91, weightKg: 75, intensity: "race" });
    expect(advice.perHourG).toBe(0);
    expect(advice.floorG).toBe(0);
    expect(advice.closes).toBe(true);
    expect(advice.balance.burnG).toBe(148);
  });

  it("Zwift-race van twee uur: boven het oude doel van 60, tot de balans sluit", () => {
    const advice = fuelAdvice({ minutes: 122, watts: wattsFor(847), intensityFactor: 0.94, weightKg: 75, intensity: "race" });
    expect(advice.floorG).toBe(60);
    expect(advice.neededG).toBe(77);
    expect(advice.perHourG).toBe(80);
    expect(advice.closes).toBe(true);
    expect(advice.cap).toEqual({ capG: 90, limitedBy: "darm" });
  });

  it("met alleen maltodextrine in de tas houdt het op 60 en sluit het niet", () => {
    const advice = fuelAdvice({
      minutes: 122,
      watts: wattsFor(847),
      intensityFactor: 0.94,
      weightKg: 75,
      intensity: "race",
      bag: bagCap([{ carbsG: 100, mix: "glucose" }]),
    });
    expect(advice.perHourG).toBe(60);
    expect(advice.cap.limitedBy).toBe("tas");
    expect(advice.closes).toBe(false);
    expect(advice.balance.reserveAtMinute).toBe(108);
    expect(advice.loadingHelps).toBe(true);
  });

  it("toertocht van 3,5 uur op duurtempo: de ondergrens van 60 sluit al", () => {
    const advice = fuelAdvice({ minutes: 206, watts: wattsFor(734), intensityFactor: 0.71, weightKg: 75, intensity: "endurance" });
    expect(advice.neededG).toBe(51);
    expect(advice.perHourG).toBe(60);
    expect(advice.closes).toBe(true);
  });

  it("gran fondo van 5 uur: zonder laden 75 g, met laden is 60 genoeg", () => {
    const advice = fuelAdvice({ minutes: 300, watts: wattsFor(700), intensityFactor: 0.72, weightKg: 75, intensity: "endurance" });
    expect(advice.perHourG).toBe(75);
    expect(advice.loadedPerHourG).toBe(60);
    expect(advice.loadingHelps).toBe(true);
    const loaded = fuelAdvice({ minutes: 300, watts: wattsFor(700), intensityFactor: 0.72, weightKg: 75, intensity: "endurance", loaded: true });
    expect(loaded.perHourG).toBe(60);
    expect(loaded.loadingHelps).toBe(false);
  });

  it("komt nooit lager uit dan het oude doel", () => {
    // Rustig en kort genoeg om alles uit de voorraad te halen: toch de ondergrens.
    const advice = fuelAdvice({ minutes: 90, watts: 120, intensityFactor: 0.55, weightKg: 75, intensity: "endurance" });
    expect(advice.neededG).toBe(0);
    expect(advice.perHourG).toBe(30);
  });

  it("volgt tijdens de darmtraining het weekgetal", () => {
    const gut = { weekGrams: 70, minMinutes: 90, high: false };
    const advice = fuelAdvice({ minutes: 122, watts: wattsFor(847), intensityFactor: 0.94, weightKg: 75, intensity: "race", gut });
    expect(advice.perHourG).toBe(70);
  });

  it("gaat met 120 na de darmtraining en een 1:0,8-mix boven de 90 als het moet", () => {
    const advice = fuelAdvice({
      minutes: 240,
      watts: 260,
      intensityFactor: 0.85,
      weightKg: 70,
      intensity: "race",
      gut: { weekGrams: null, minMinutes: 0, high: true },
      bag: bagCap([{ carbsG: 100, mix: "1:0.8" }]),
    });
    expect(advice.cap.capG).toBe(120);
    expect(advice.perHourG).toBeGreaterThan(90);
    expect(advice.perHourG).toBeLessThanOrEqual(120);
  });
});

describe("vocht zonder zweettest", () => {
  it("schat binnen alle warmte via zweet, buiten minder naarmate het koeler is", () => {
    expect(sweatShare("binnen", 10)).toBe(1);
    expect(sweatShare("buiten", 5)).toBe(0.4);
    expect(sweatShare("buiten", 15)).toBeCloseTo(0.5);
    expect(sweatShare("buiten", null)).toBeCloseTo(0.5);
    expect(sweatShare("buiten", 40)).toBe(1);
    expect(estimatedSweatPerHour(wattsFor(826), "binnen")).toBe(1200);
    expect(estimatedSweatPerHour(wattsFor(734), "buiten", 15)).toBe(550);
  });

  it("gebruikt de zweettest als die er is", () => {
    const fluid = eventFluid({ minutes: 120, watts: 230, setting: "binnen", weightKg: 75, sweatTestMlPerHour: 900 });
    expect(fluid).toMatchObject({ estimated: false, sweatMlPerHour: 900, maxMl: 900 });
    const estimate = eventFluid({ minutes: 45, watts: wattsFor(826), setting: "binnen", weightKg: 75 });
    // 45 minuten: 2% van 75 kg is ruim genoeg, drinken mag maar hoeft niet.
    expect(estimate).toMatchObject({ estimated: true, sweatMlPerHour: 1200, minMl: 0, maxMl: 1200 });
  });

  it("rijdt Zwift, ZRL, Ladder, Flamme Rouge en SRC binnen, de rest buiten", () => {
    expect(eventSetting("zrl")).toBe("binnen");
    expect(eventSetting("src")).toBe("binnen");
    expect(eventSetting("gran_fondo")).toBe("buiten");
    expect(eventSetting("toertocht")).toBe("buiten");
  });
});
