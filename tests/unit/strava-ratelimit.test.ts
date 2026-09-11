import { describe, expect, it } from "vitest";
import {
  isSameUtcDay,
  isUsageFresh,
  shouldPauseForRateLimit,
} from "@/lib/strava/rate-limit-budget";
import { evaluateStravaWebhook } from "@/lib/health/checks";

const NOW = new Date("2026-09-05T10:00:00.000Z");

describe("shouldPauseForRateLimit", () => {
  it("gaat door zonder meting", () => {
    // Geen meting mag nooit betekenen "stop": dan zou een verse omgeving nooit
    // beginnen.
    expect(shouldPauseForRateLimit(null)).toEqual({ pause: false });
  });

  it("gaat door ruim onder de limieten", () => {
    expect(
      shouldPauseForRateLimit({
        shortTermUsed: 20,
        shortTermLimit: 200,
        dailyUsed: 100,
        dailyLimit: 2000,
      }),
    ).toEqual({ pause: false });
  });

  it("stopt tegen het 15-minutenvenster", () => {
    const verdict = shouldPauseForRateLimit({
      shortTermUsed: 150,
      shortTermLimit: 200,
      dailyUsed: 100,
      dailyLimit: 2000,
    });
    expect(verdict.pause).toBe(true);
    expect(verdict.pause && verdict.reason).toBe("short_term");
  });

  it("stopt tegen de daglimiet", () => {
    const verdict = shouldPauseForRateLimit({
      shortTermUsed: 5,
      shortTermLimit: 200,
      dailyUsed: 1900,
      dailyLimit: 2000,
    });
    expect(verdict.pause).toBe(true);
    expect(verdict.pause && verdict.reason).toBe("daily");
  });

  it("respecteert eigen drempels", () => {
    const usage = {
      shortTermUsed: 60,
      shortTermLimit: 200,
      dailyUsed: 0,
      dailyLimit: 2000,
    };
    expect(shouldPauseForRateLimit(usage).pause).toBe(false);
    expect(shouldPauseForRateLimit(usage, { shortTermRatio: 0.25 }).pause).toBe(true);
  });

  it("negeert een halve meting zonder limiet", () => {
    expect(
      shouldPauseForRateLimit({
        shortTermUsed: 9999,
        shortTermLimit: null,
        dailyUsed: 9999,
        dailyLimit: null,
      }),
    ).toEqual({ pause: false });
  });
});

describe("vensters van de meting", () => {
  it("laat het 15-minutenvenster vervallen", () => {
    expect(isUsageFresh("2026-09-05T09:55:00.000Z", NOW)).toBe(true);
    expect(isUsageFresh("2026-09-05T09:40:00.000Z", NOW)).toBe(false);
    expect(isUsageFresh(null, NOW)).toBe(false);
    expect(isUsageFresh("onzin", NOW)).toBe(false);
  });

  it("laat de dagteller om middernacht UTC vervallen", () => {
    expect(isSameUtcDay("2026-09-05T00:00:01.000Z", NOW)).toBe(true);
    expect(isSameUtcDay("2026-09-04T23:59:59.000Z", NOW)).toBe(false);
    expect(isSameUtcDay(null, NOW)).toBe(false);
  });
});

describe("evaluateStravaWebhook", () => {
  it("faalt zonder subscription", () => {
    // Strava verwijdert de subscription bij herhaald falen van onze callback; dan
    // blijft de app stil zónder foutmelding. Dit is het enige signaal dat dat is
    // gebeurd.
    const result = evaluateStravaWebhook(false, "2026-09-05T09:00:00.000Z", 48, NOW);
    expect(result.ok).toBe(false);
    expect(result.detail).toContain("geen actieve subscription");
  });

  it("is ok bij recente events", () => {
    expect(evaluateStravaWebhook(true, "2026-09-05T08:00:00.000Z", 48, NOW).ok).toBe(true);
  });

  it("is ok bij een verse subscription zonder events", () => {
    expect(evaluateStravaWebhook(true, null, 48, NOW).ok).toBe(true);
  });

  it("faalt bij te lange stilte", () => {
    const result = evaluateStravaWebhook(true, "2026-09-01T10:00:00.000Z", 48, NOW);
    expect(result.ok).toBe(false);
    expect(result.detail).toBe("96u geen events");
  });
});
