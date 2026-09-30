import { describe, expect, it } from "vitest";
import {
  estimateEventMinutes,
  eventWorkoutBlocks,
  eventWorkoutDefaults,
  loadScheduleEvents,
  zwiftRaceIntensityFactor,
  zwiftRaceKind,
  type ClubEventRow,
} from "@/lib/training/events";
import { estimateTrainingLoad } from "@/lib/training/workouts";

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
    // Mediaan van de gereden ZRL-races; 60 minuten gaf elke race 100 TSS.
    expect(eventWorkoutDefaults(event({ type: "zrl" })).durationMinutes).toBe(50);
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

describe("Zwift-races", () => {
  const frrEtappe = event({
    title: "FRR Ignite · Etappe 1 · 07:00",
    type: "flamme_rouge",
    distance_km: 42.9,
    elevation_m: 333,
    zwift_event_type: "RACE",
  });

  it("rekent een Zwift-race met racesnelheid, niet met die van een buitenrit", () => {
    // 42,9 km bij 43 km/u plus 333 hm x 0,02 min: 67 minuten. Het buitenritmodel
    // gaf hier 83.
    expect(eventWorkoutDefaults(frrEtappe).durationMinutes).toBe(67);
  });

  it("geeft een Zwift-race een vermogensdoel rond de verwachte IF", () => {
    // IF bij 67 minuten: 1,05 - 0,0019 x 67 = 0,92.
    expect(eventWorkoutDefaults(frrEtappe).target).toBe("87-97%");
    expect(eventWorkoutDefaults(event({ type: "outdoor" })).target).toBe("");
  });

  it("laat de geplande TSS met de race meeschalen", () => {
    const kort = estimateTrainingLoad(
      eventWorkoutBlocks(event({ type: "zrl", distance_km: 27.57, elevation_m: 199 })),
    );
    const lang = estimateTrainingLoad(
      eventWorkoutBlocks(event({ type: "zrl", distance_km: 35.42, elevation_m: 309 })),
    );
    expect(kort).toBeLessThan(lang);
    expect(kort).toBeGreaterThan(55);
    expect(lang).toBeLessThan(90);
  });

  it("herkent een TTT aan het Zwift-type of de WTRL-tag", () => {
    expect(zwiftRaceKind(event({ type: "zrl", zwift_event_type: "TEAM_TIME_TRIAL" }))).toBe("ttt");
    expect(zwiftRaceKind(event({ type: "zrl", zwift_tags: ["wtrl", "zrl", "ttt"] }))).toBe("ttt");
    expect(zwiftRaceKind(event({ type: "zrl", zwift_tags: ["wtrl", "zrl", "scr"] }))).toBe("race");
  });

  it("rijdt een TTT sneller dan een race over dezelfde route", () => {
    const route = { type: "zrl", distance_km: 30, elevation_m: 200 };
    const race = eventWorkoutDefaults(event(route)).durationMinutes;
    const ttt = eventWorkoutDefaults(
      event({ ...route, zwift_event_type: "TEAM_TIME_TRIAL" }),
    ).durationMinutes;
    expect(ttt).toBeLessThan(race);
  });

  it("telt een Zwift-groepsrit niet als race", () => {
    expect(zwiftRaceKind(event({ type: "zwift", zwift_event_type: "GROUP_RIDE" }))).toBeNull();
    expect(zwiftRaceKind(event({ type: "zwift", zwift_event_type: "RACE" }))).toBe("race");
    expect(zwiftRaceKind(event({ type: "outdoor" }))).toBeNull();
  });

  it("rekent zonder afstand met de route en het aantal ronden", () => {
    // Route van ZRL R1 W2; de link gaf voor drie ronden 26,62 km en 232 hm.
    const viaRoute = eventWorkoutDefaults(
      event({ type: "zrl", zwift_route_id: 2592027600, laps: 3 }),
    ).durationMinutes;
    const viaLink = eventWorkoutDefaults(
      event({ type: "zrl", distance_km: 26.62, elevation_m: 232 }),
    ).durationMinutes;
    expect(viaRoute).toBe(viaLink);
  });

  it("laat een eindtijd voorgaan op de route", () => {
    const result = eventWorkoutDefaults({
      ...frrEtappe,
      start_at: "2026-10-03T07:00:00+02:00",
      end_at: "2026-10-03T08:30:00+02:00",
    });
    expect(result.durationMinutes).toBe(90);
  });

  it("houdt de IF tussen 0,80 en 1,00", () => {
    expect(zwiftRaceIntensityFactor(10)).toBe(1);
    expect(zwiftRaceIntensityFactor(55)).toBeCloseTo(0.9455, 4);
    expect(zwiftRaceIntensityFactor(200)).toBe(0.8);
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

/**
 * Minimale supabase-stub die alleen onthoudt met welke limiet er is gevraagd.
 * Elke keten levert dezelfde builder op, die awaitbaar is.
 */
function fakeAdmin(gezien: { limit: number | null }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    eq: chain,
    gte: chain,
    lte: chain,
    is: chain,
    in: chain,
    or: chain,
    not: chain,
    order: chain,
    limit: (value: number) => {
      gezien.limit = value;
      return builder;
    },
    then: (resolve: (value: { data: unknown[] }) => unknown) => resolve({ data: [] }),
  });
  return { from: () => builder } as never;
}

describe("loadScheduleEvents", () => {
  it("vraagt standaard 50 events op", async () => {
    const gezien = { limit: null as number | null };
    await loadScheduleEvents(fakeAdmin(gezien), "p1", "2026-03-01", "2026-06-01");
    expect(gezien.limit).toBe(50);
  });

  it("neemt een ruimere limiet over, voor een venster van twaalf maanden", async () => {
    const gezien = { limit: null as number | null };
    await loadScheduleEvents(fakeAdmin(gezien), "p1", "2026-03-01", "2027-03-01", 400);
    expect(gezien.limit).toBe(400);
  });
});
