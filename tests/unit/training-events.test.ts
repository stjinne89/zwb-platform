import { describe, expect, it } from "vitest";
import {
  estimateEventMinutes,
  eventWorkoutDefaults,
  type ClubEventRow,
} from "@/lib/training/events";

function event(over: Partial<ClubEventRow> = {}): ClubEventRow {
  return {
    id: "e1",
    title: "Clubrit",
    type: "outdoor",
    start_at: "2026-08-16T09:00:00+02:00",
    end_at: null,
    distance_km: null,
    elevation_m: null,
    ...over,
  };
}

describe("eventWorkoutDefaults", () => {
  it("gebruikt de eindtijd als die er is", () => {
    const result = eventWorkoutDefaults(
      event({ start_at: "2026-08-16T09:00:00+02:00", end_at: "2026-08-16T11:30:00+02:00" }),
    );
    expect(result.durationMinutes).toBe(150);
  });

  it("rekent anders de afstand om naar minuten", () => {
    // 102 km bij 34 km/u = 3 uur, zonder hoogtemeters.
    expect(eventWorkoutDefaults(event({ distance_km: 102 })).durationMinutes).toBe(180);
  });

  it("telt hoogtemeters mee in de duur", () => {
    const flat = eventWorkoutDefaults(event({ distance_km: 102, elevation_m: 0 }));
    const hilly = eventWorkoutDefaults(event({ distance_km: 102, elevation_m: 2000 }));
    // 2000 hm bij 45 min per 1000 hm = anderhalf uur extra.
    expect(hilly.durationMinutes - flat.durationMinutes).toBe(90);
  });

  it("valt terug op een typegemiddelde zonder eindtijd en afstand", () => {
    expect(eventWorkoutDefaults(event({ type: "outdoor" })).durationMinutes).toBe(120);
    expect(eventWorkoutDefaults(event({ type: "zrl" })).durationMinutes).toBe(60);
    expect(eventWorkoutDefaults(event({ type: "training" })).durationMinutes).toBe(75);
  });

  it("laat een wedstrijd als race tellen en een clubrit als duur", () => {
    expect(eventWorkoutDefaults(event({ type: "zrl" })).intensity).toBe("race");
    expect(eventWorkoutDefaults(event({ type: "ladder" })).intensity).toBe("race");
    expect(eventWorkoutDefaults(event({ type: "outdoor" })).intensity).toBe("endurance");
  });

  it("houdt de duur binnen wat een workout mag zijn", () => {
    expect(
      eventWorkoutDefaults(event({ distance_km: 700, elevation_m: 9000 })).durationMinutes,
    ).toBeLessThanOrEqual(720);
    expect(eventWorkoutDefaults(event({ distance_km: 1 })).durationMinutes).toBeGreaterThanOrEqual(
      20,
    );
  });

  it("negeert een eindtijd die vóór de start ligt", () => {
    const result = eventWorkoutDefaults(
      event({ start_at: "2026-08-16T09:00:00+02:00", end_at: "2026-08-16T08:00:00+02:00" }),
    );
    expect(result.durationMinutes).toBe(120);
  });

  it("valt bij een onbekend type terug op de buitenrit-standaard", () => {
    expect(eventWorkoutDefaults(event({ type: "iets_nieuws" })).durationMinutes).toBe(120);
  });

  it("kent gran_fondo en zwift als eigen type", () => {
    // Vielen eerder stilzwijgend terug op 'outdoor'.
    expect(eventWorkoutDefaults(event({ type: "gran_fondo" })).durationMinutes).toBe(300);
    expect(eventWorkoutDefaults(event({ type: "zwift" })).durationMinutes).toBe(60);
    expect(eventWorkoutDefaults(event({ type: "zwift" })).intensity).toBe("race");
  });
});

/**
 * IJkpunten uit het natuurkundige model in @/lib/ride-estimate, gedraaid over de
 * GPX van echte ZWB-events. Het simpele model mag daar niet ver vanaf lopen —
 * het bestaat juist omdat lang niet elk event een GPX heeft.
 */
describe("estimateEventMinutes", () => {
  const ijkpunten: Array<[naam: string, km: number, hm: number, echt: number]> = [
    ["11 steden fietstocht", 235, 388, 432],
    ["Testrondje Marsberg", 40, 711, 100],
    ["3Ballons", 181, 4104, 501],
    ["GF Schleck", 164, 2335, 368],
    ["Velomedian Claudy Criquélion", 167, 3305, 420],
    ["Sallands Mooiste", 142, 2, 259],
    ["Marmotte Gran Fondo Alpes", 176, 5067, 570],
  ];

  it.each(ijkpunten)("blijft bij %s binnen 10%% van het GPX-model", (_naam, km, hm, echt) => {
    const geschat = estimateEventMinutes(km, hm) as number;
    expect(Math.abs(geschat - echt) / echt).toBeLessThan(0.1);
  });

  it("geeft null zonder bruikbare afstand", () => {
    expect(estimateEventMinutes(null, 1000)).toBeNull();
    expect(estimateEventMinutes(0, 1000)).toBeNull();
    expect(estimateEventMinutes("onzin", 1000)).toBeNull();
  });

  it("werkt zonder hoogtemeters", () => {
    expect(estimateEventMinutes(102, null)).toBe(180);
  });

  it("zou de Velomedian nooit meer als korte sessie zien", () => {
    // De AI plande hier ooit 150 minuten voor; dat was de aanleiding.
    expect(estimateEventMinutes(166.88, 3305)).toBeGreaterThan(360);
  });
});
