import { describe, expect, it } from "vitest";
import {
  ZWB_LEVEL_DESCRIPTIONS,
  amsterdamDayKey,
  ctlTrend,
  dayIndex,
  eftpTrend,
  fitnessTrendFromDelta,
  zwbeterWordenAdvice,
} from "@/lib/training/zwbeterworden";
import type { TrainingReadinessSummary } from "@/lib/training/wellness";
import type { IntervalsWellness } from "@/lib/intervals/client";

/** Wellness-rij `daysAgo` dagen terug, met alleen de velden die we hier nodig hebben. */
function day(
  daysAgo: number,
  fields: Partial<IntervalsWellness> = {},
): IntervalsWellness {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return { id: date.toISOString().slice(0, 10), ...fields };
}

function readiness(
  state: TrainingReadinessSummary["state"],
  score: number | null,
): TrainingReadinessSummary {
  return { state, score, label: "", notes: [] };
}

describe("zwbeterWordenAdvice", () => {
  it("geeft niveau 0 bij onbekende state of ontbrekende score", () => {
    expect(zwbeterWordenAdvice(readiness("unknown", null)).level).toBe(0);
    expect(zwbeterWordenAdvice(readiness("ready", null)).level).toBe(0);
  });

  it("recovery → niveau 1 of 2 op basis van score", () => {
    expect(zwbeterWordenAdvice(readiness("recovery", 10)).level).toBe(1);
    expect(zwbeterWordenAdvice(readiness("recovery", 40)).level).toBe(2);
  });

  it("caution → niveau 3 of 4 op basis van score", () => {
    expect(zwbeterWordenAdvice(readiness("caution", 50)).level).toBe(3);
    expect(zwbeterWordenAdvice(readiness("caution", 60)).level).toBe(4);
  });

  it("ready → niveau 5", () => {
    expect(zwbeterWordenAdvice(readiness("ready", 90)).level).toBe(5);
  });

  it("levert opmaak-klassen en titel per niveau", () => {
    const advice = zwbeterWordenAdvice(readiness("ready", 90));
    expect(advice.pill).toBeTruthy();
    expect(advice.block).toBeTruthy();
    expect(advice.title).toBe("BETER WORDT HET NIET");
  });
});

describe("dagelijkse tekstrotatie", () => {
  it("heeft 10 varianten per niveau", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(ZWB_LEVEL_DESCRIPTIONS[level]).toHaveLength(10);
    }
  });

  it("is deterministisch voor dezelfde dag", () => {
    const a = zwbeterWordenAdvice(readiness("ready", 90), null, "2026-06-22");
    const b = zwbeterWordenAdvice(readiness("ready", 90), null, "2026-06-22");
    expect(a.description).toBe(b.description);
  });

  it("wisselt over verschillende dagen", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const key = `2026-06-${String(d).padStart(2, "0")}`;
      seen.add(
        zwbeterWordenAdvice(readiness("ready", 90), null, key).description,
      );
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("vervangt de {partner}-placeholder volledig", () => {
    // Over alle dagen mag er nooit een letterlijke {partner} blijven staan.
    for (let d = 1; d <= 31; d++) {
      const key = `2026-01-${String(d).padStart(2, "0")}`;
      const women = zwbeterWordenAdvice(readiness("recovery", 10), "women", key);
      const open = zwbeterWordenAdvice(readiness("recovery", 10), "open", key);
      expect(women.description).not.toContain("{partner}");
      expect(open.description).not.toContain("{partner}");
    }
  });

  it("kiest de partner-tekst op basis van de ZRL-divisie", () => {
    // Zoek een dag die een variant mét {partner} selecteert (niveau 1).
    const withPartner = ZWB_LEVEL_DESCRIPTIONS[1].findIndex((d) =>
      d.includes("{partner}"),
    );
    let key = "";
    for (let d = 1; d <= 60; d++) {
      const k = `2026-03-${String(d).padStart(2, "0")}`;
      if (dayIndex(k, 10) === withPartner) {
        key = k;
        break;
      }
    }
    expect(key).not.toBe("");
    expect(zwbeterWordenAdvice(readiness("recovery", 10), "women", key).description).toContain("man");
    expect(zwbeterWordenAdvice(readiness("recovery", 10), "open", key).description).toContain("vrouw");
  });
});

describe("eftpTrend", () => {
  it("neemt de oudste meting binnen het venster als vertrekpunt", () => {
    const trend = eftpTrend(
      [day(120, { eftp: 200 }), day(80, { eftp: 273 }), day(2, { eftp: 285 })],
      90,
    );
    expect(trend.first).toBe(273);
    expect(trend.latest).toBe(285);
    expect(trend.delta).toBe(12);
  });

  it("verdraagt ongesorteerde invoer", () => {
    const trend = eftpTrend([day(2, { eftp: 285 }), day(80, { eftp: 273 })], 90);
    expect(trend.delta).toBe(12);
  });

  it("geeft null als er geen eFTP-meting is", () => {
    const trend = eftpTrend([day(5, { ctl: 40 })], 90);
    expect(trend.first).toBeNull();
    expect(trend.latest).toBeNull();
    expect(trend.delta).toBeNull();
  });

  it("geeft delta 0 bij één meting binnen het venster", () => {
    const trend = eftpTrend([day(5, { eftp: 280 })], 90);
    expect(trend.delta).toBe(0);
  });

  it("geeft geen delta als de enige meting buiten het venster valt", () => {
    const trend = eftpTrend([day(200, { eftp: 280 })], 90);
    expect(trend.first).toBeNull();
    expect(trend.delta).toBeNull();
  });
});

describe("ctlTrend", () => {
  it("vergelijkt de nieuwste CTL met de oudste binnen het venster", () => {
    expect(ctlTrend([day(40, { ctl: 38 }), day(1, { ctl: 45 })], 42)).toBe(7);
  });

  it("geeft null zonder CTL-metingen", () => {
    expect(ctlTrend([day(1, { eftp: 280 })], 42)).toBeNull();
  });
});

describe("fitnessTrendFromDelta", () => {
  it("laat eFTP voorgaan op CTL", () => {
    expect(fitnessTrendFromDelta(5, -10)).toBe("improving");
    expect(fitnessTrendFromDelta(-5, 10)).toBe("declining");
    expect(fitnessTrendFromDelta(1, 10)).toBe("stable");
  });

  it("valt terug op CTL zonder eFTP-delta", () => {
    expect(fitnessTrendFromDelta(null, 5)).toBe("improving");
    expect(fitnessTrendFromDelta(null, -5)).toBe("declining");
    expect(fitnessTrendFromDelta(null, 1)).toBe("stable");
  });

  it("geeft unknown als er niets te vergelijken is", () => {
    expect(fitnessTrendFromDelta(null, null)).toBe("unknown");
  });
});

describe("amsterdamDayKey", () => {
  it("houdt 23:30 CEST op dezelfde dag", () => {
    expect(amsterdamDayKey(new Date("2026-07-30T23:30:00+02:00"))).toBe(
      "2026-07-30",
    );
  });

  it("rekent 00:30 CEST niet terug naar de UTC-dag ervoor", () => {
    expect(amsterdamDayKey(new Date("2026-07-30T00:30:00+02:00"))).toBe(
      "2026-07-30",
    );
  });

  it("volgt de zomertijdovergang", () => {
    // Laatste zondag van oktober 2026: 03:00 CEST wordt 02:00 CET.
    expect(amsterdamDayKey(new Date("2026-10-25T00:30:00+02:00"))).toBe(
      "2026-10-25",
    );
    expect(amsterdamDayKey(new Date("2026-10-25T23:30:00+01:00"))).toBe(
      "2026-10-25",
    );
  });
});
