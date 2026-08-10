import { describe, expect, it } from "vitest";
import {
  deriveReadiness,
  refreshWellnessIfStale,
  summarizeTrainingReadiness,
  summarizeWellness,
  WELLNESS_MAX_AGE_MS,
  type WellnessSummary,
} from "@/lib/training/wellness";

type Row = {
  date: string;
  resting_hr: number | null;
  hrv: number | null;
  sleep_secs: number | null;
  sleep_score: number | null;
  readiness: number | null;
  fatigue: number | null;
  stress: number | null;
  soreness: number | null;
  mood: number | null;
};

function row(date: string, readiness: number | null): Row {
  return {
    date,
    resting_hr: null,
    hrv: null,
    sleep_secs: null,
    sleep_score: null,
    readiness,
    fatigue: null,
    stress: null,
    soreness: null,
    mood: null,
  };
}

/** Vaste referentiedag: readiness telt alleen mee als hij vers is. */
const TODAY = "2026-06-28";

describe("summarizeWellness — readiness per apparaat", () => {
  it("laat een 0-100 readiness (Garmin/Oura) ongemoeid", () => {
    const rows = [row("2026-06-28", 82), row("2026-06-27", 79)];
    expect(summarizeWellness(rows, "garmin", TODAY)!.readiness).toBe(82);
    expect(summarizeWellness(rows, "oura", TODAY)!.readiness).toBe(82);
    // Zonder apparaat = huidig gedrag: 0-100.
    expect(summarizeWellness(rows, null, TODAY)!.readiness).toBe(82);
  });

  it("rekent een Polar 'OK' (4) om naar de 0-100 range i.p.v. als 4/100 te lezen", () => {
    // Officiële schaal: 4 = OK. Mag niet als 4/100 (zwaar overtraind) lezen.
    const rows = [row("2026-06-28", 4), row("2026-06-27", 5)];
    const summary = summarizeWellness(rows, "polar", TODAY)!;
    expect(summary.readiness).toBeGreaterThan(50);
    expect(summary.state).not.toBe("fatigued");
    expect(summary.note).toContain("Polar");
  });

  it("een lage Polar-waarde (1 = very poor) telt wel als vermoeid", () => {
    const summary = summarizeWellness([row("2026-06-28", 1)], "polar", TODAY)!;
    expect(summary.state).toBe("fatigued");
  });

  it("een topscore op de Polar-schaal (6 = very good) telt als goed hersteld", () => {
    const rows = [row("2026-06-28", 6), row("2026-06-27", 5)];
    expect(summarizeWellness(rows, "polar", TODAY)!.readiness).toBeGreaterThanOrEqual(75);
  });

  it("laat de ZWBeterWorden-readiness niet in recovery vallen door een Polar-'OK'", () => {
    const polarOk = summarizeWellness([row("2026-06-28", 4)], "polar", TODAY);
    const readiness = summarizeTrainingReadiness({ tsb: 0, wellness: polarOk });
    // Vóór de fix zorgde de rauwe "4" voor een recovery-advies.
    expect(readiness.state).not.toBe("recovery");
  });

  it("zonder apparaat leest een rauwe Polar-'4' nog als laag (de oorspronkelijke bug)", () => {
    // Bevestigt waarom expliciete apparaatkeuze nodig is: zonder device kan de
    // app een integer-schaal niet onderscheiden van een echte 0-100 score.
    const summary = summarizeWellness([row("2026-06-28", 4)], null, TODAY)!;
    expect(summary.state).toBe("fatigued");
  });
});

// Zelfherstellende sync: de opgeslagen kopie mag niet leeg blijven doordat één
// eerste poging bij het aanzetten van de opt-in stilletjes mislukte.
describe("refreshWellnessIfStale", () => {
  type Upsert = { profile_id: string; date: string };

  function fakeDb(syncedAt: string | null) {
    const upserts: Upsert[][] = [];
    return {
      upserts,
      from() {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: syncedAt ? { synced_at: syncedAt } : null,
                  }),
                }),
              }),
            }),
          }),
          upsert: async (rows: Upsert[]) => {
            upserts.push(rows);
            return { error: null };
          },
        };
      },
    };
  }

  const records = [
    { id: "2026-08-01", restingHR: 48, hrv: 90, sleepSecs: 27000 },
    { id: "2026-08-02", restingHR: 47, hrv: 95, sleepSecs: 26000 },
  ];

  it("vult een lege kopie alsnog (het geval waarin de eerste sync mislukte)", async () => {
    const db = fakeDb(null);
    const result = await refreshWellnessIfStale(db, "p1", {
      apiKey: "k",
      athleteId: "i1",
      records,
    });
    expect(result.refreshed).toBe(true);
    expect(result.upserted).toBe(2);
    expect(db.upserts[0]).toHaveLength(2);
  });

  it("ververst een verouderde kopie", async () => {
    const old = new Date(Date.now() - WELLNESS_MAX_AGE_MS - 60_000).toISOString();
    const db = fakeDb(old);
    const result = await refreshWellnessIfStale(db, "p1", {
      apiKey: "k",
      athleteId: "i1",
      records,
    });
    expect(result.refreshed).toBe(true);
  });

  it("laat een verse kopie met rust, zodat elke paginaweergave geen call kost", async () => {
    const db = fakeDb(new Date().toISOString());
    const result = await refreshWellnessIfStale(db, "p1", {
      apiKey: "k",
      athleteId: "i1",
      records,
    });
    expect(result.refreshed).toBe(false);
    expect(db.upserts).toHaveLength(0);
  });

  it("slaat dagen zonder enige herstelwaarde over", async () => {
    const db = fakeDb(null);
    await refreshWellnessIfStale(db, "p1", {
      apiKey: "k",
      athleteId: "i1",
      records: [...records, { id: "2026-08-03" }],
    });
    expect(db.upserts[0]).toHaveLength(2);
  });
});

// De drie regels die het ZWBeterWorden-niveau bepalen naast readiness.
describe("summarizeWellness — baseline, slaap en recentheid", () => {
  function day(date: string, over: Partial<Row> = {}): Row {
    return {
      date,
      resting_hr: 45,
      hrv: 90,
      sleep_secs: 7 * 3600,
      sleep_score: null,
      readiness: null,
      fatigue: null,
      stress: null,
      soreness: null,
      mood: null,
      ...over,
    };
  }

  /** N dagen terug vanaf `to`, nieuwste eerst. */
  function series(to: string, count: number, over: (i: number) => Partial<Row> = () => ({})) {
    const end = new Date(`${to}T12:00:00`).getTime();
    return Array.from({ length: count }, (_, i) =>
      day(new Date(end - i * 86_400_000).toISOString().slice(0, 10), over(i)),
    );
  }

  it("gebruikt 30 dagen als baseline, niet het hele venster", () => {
    // Laatste 30 dagen rond HRV 90, daarvóór een jaar op 120. Met een baseline
    // over alles zou de recente 90 als "onder baseline" lezen; over 30 dagen niet.
    const recent = series("2026-06-28", 30, () => ({ hrv: 90 }));
    const oud = series("2026-05-28", 300, () => ({ hrv: 120 }));
    const summary = summarizeWellness([...recent, ...oud], null, "2026-06-28")!;
    expect(summary.state).not.toBe("fatigued");
    expect(summary.note).not.toContain("HRV onder baseline");
  });

  it("6,4u slaap kost punten maar zet de status niet op vermoeid", () => {
    const rows = series("2026-06-28", 30, () => ({ sleep_secs: 6.4 * 3600 }));
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.state).not.toBe("fatigued");
    expect(summary.sleepPenalty).toBe(6);
    expect(summary.note).toContain("Iets weinig slaap");
  });

  it("onder 5,5u slaap telt nog wel als vermoeid", () => {
    const rows = series("2026-06-28", 30, () => ({ sleep_secs: 5.2 * 3600 }));
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.state).toBe("fatigued");
    expect(summary.sleepPenalty).toBe(22);
  });

  it("laat readiness ouder dan 7 dagen vervallen naar een streepje", () => {
    const rows = [
      ...series("2026-06-28", 8),
      day("2026-06-19", { readiness: 82 }),
    ];
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.readiness).toBeNull();
    expect(summary.note).toContain("Geen readiness van de laatste 7 dagen");
  });

  it("readiness van binnen 7 dagen telt gewoon mee", () => {
    const rows = [
      ...series("2026-06-28", 3),
      day("2026-06-24", { readiness: 82 }),
    ];
    expect(summarizeWellness(rows, null, "2026-06-28")!.readiness).toBe(82);
  });

  it("de gestaffelde slaapaftrek landt in de trainingsruimte", () => {
    const rows = series("2026-06-28", 30, () => ({ sleep_secs: 6.4 * 3600 }));
    const wellness = summarizeWellness(rows, null, "2026-06-28");
    const zonderSlaaptekort = summarizeWellness(
      series("2026-06-28", 30),
      null,
      "2026-06-28",
    );
    const met = summarizeTrainingReadiness({ tsb: -7.4, wellness });
    const zonder = summarizeTrainingReadiness({ tsb: -7.4, wellness: zonderSlaaptekort });
    expect(met.score!).toBeLessThan(zonder.score!);
  });
});

describe("summarizeWellness — versheidsgrens", () => {
  function day(date: string, over: Partial<Row> = {}): Row {
    return {
      date,
      resting_hr: 45,
      hrv: 90,
      sleep_secs: 7.5 * 3600,
      sleep_score: 85,
      readiness: null,
      fatigue: null,
      stress: null,
      soreness: null,
      mood: null,
      ...over,
    };
  }

  function series(to: string, count: number, over: (i: number) => Partial<Row> = () => ({})) {
    const end = new Date(`${to}T12:00:00`).getTime();
    return Array.from({ length: count }, (_, i) =>
      day(new Date(end - i * 86_400_000).toISOString().slice(0, 10), over(i)),
    );
  }

  it("rekent over de laatste 7 dagen, niet over de 7 nieuwste rijen", () => {
    // Eén verse dag met een uitschieter, de rest van maanden geleden. Op
    // rijvolgorde zou het oude blok het weekgemiddelde bepalen.
    const rows = [day("2026-06-28", { hrv: 60 }), ...series("2026-02-21", 20, () => ({ hrv: 90 }))];
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.hrv).toBe(60);
  });

  it("negeert oude rijen in de baseline", () => {
    const rows = [
      ...series("2026-06-28", 20, () => ({ hrv: 90 })),
      ...series("2026-02-21", 100, () => ({ hrv: 150 })),
    ];
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    // Zonder datumvenster zou de oude 150 de baseline optrekken en de verse 90
    // als "onder baseline" laten lezen.
    expect(summary.state).not.toBe("fatigued");
    expect(summary.days).toBe(20);
  });

  it("meldt het als er niets recents is in plaats van oude cijfers te tonen", () => {
    const summary = summarizeWellness(series("2026-02-21", 30), null, "2026-06-28")!;
    expect(summary.state).toBe("unknown");
    expect(summary.hrv).toBeNull();
    expect(summary.restingHr).toBeNull();
    expect(summary.sleepHours).toBeNull();
    expect(summary.days).toBe(0);
    expect(summary.note).toContain("Geen hersteldata van de laatste 30 dagen");
    // De laatste meting blijft zichtbaar, zodat het lid weet sinds wanneer.
    expect(summary.latestDate).toBe("2026-02-21");
    expect(summary.note).toContain("2026-02-21");
  });

  it("noemt geen normale herstelwaarden meer bij verouderde data", () => {
    const summary = summarizeWellness(series("2026-02-21", 30), null, "2026-06-28")!;
    expect(summary.note).not.toContain("binnen de normale range");
  });

  it("negeert rijen met een datum in de toekomst", () => {
    const rows = [day("2026-07-05", { hrv: 200 }), ...series("2026-06-28", 20)];
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.hrv).toBe(90);
  });
});

// Garmin levert geen readiness aan intervals.icu (Body Battery en Training
// Readiness blijven in Garmin Connect). Voor die leden rekenen we er zelf een
// uit de signalen die er wél elke dag zijn.
describe("deriveReadiness", () => {
  const basis = {
    hrv: 90,
    hrvBase: 90,
    restingHr: 45,
    rhrBase: 45,
    sleepHours: 7.5,
    sleepScore: null,
    baselineDays: 30,
    dataAgeDays: 0,
  };

  it("geeft een neutrale score als alles op de eigen baseline zit", () => {
    expect(deriveReadiness(basis)).toBe(70);
  });

  it("zakt als de HRV onder de eigen baseline ligt", () => {
    // 10% onder baseline raakt de ondergrens van de HRV-bijdrage.
    expect(deriveReadiness({ ...basis, hrv: 81 })).toBe(50);
  });

  it("stijgt als de HRV boven de baseline ligt, maar minder hard dan hij zakt", () => {
    const omhoog = deriveReadiness({ ...basis, hrv: 99 })! - 70;
    const omlaag = 70 - deriveReadiness({ ...basis, hrv: 81 })!;
    expect(omhoog).toBeGreaterThan(0);
    expect(omhoog).toBeLessThan(omlaag);
  });

  it("straft een verhoogde rust-hartslag af", () => {
    expect(deriveReadiness({ ...basis, restingHr: 48 })!).toBeLessThan(60);
  });

  it("verwerkt korte nachten met dezelfde staffel als de rest van de app", () => {
    expect(deriveReadiness({ ...basis, sleepHours: 6.4 })).toBe(64);
    expect(deriveReadiness({ ...basis, sleepHours: 5.2 })).toBe(48);
  });

  it("neemt de slaapscore mee als bijstelling rond een neutrale 75", () => {
    expect(deriveReadiness({ ...basis, sleepScore: 90 })!).toBeGreaterThan(70);
    expect(deriveReadiness({ ...basis, sleepScore: 60 })!).toBeLessThan(70);
  });

  it("claimt nooit een 0 of een 100", () => {
    const bodem = deriveReadiness({
      ...basis,
      hrv: 40,
      restingHr: 60,
      sleepHours: 4,
      sleepScore: 10,
    })!;
    const plafond = deriveReadiness({
      ...basis,
      hrv: 200,
      restingHr: 35,
      sleepHours: 9,
      sleepScore: 100,
    })!;
    expect(bodem).toBeGreaterThanOrEqual(5);
    expect(plafond).toBeLessThanOrEqual(95);
  });

  it("weigert te rekenen zonder bruikbare baseline", () => {
    expect(deriveReadiness({ ...basis, baselineDays: 10 })).toBeNull();
  });

  it("weigert te rekenen op alleen slaap", () => {
    expect(
      deriveReadiness({ ...basis, hrv: null, hrvBase: null, restingHr: null, rhrBase: null }),
    ).toBeNull();
  });

  it("weigert te rekenen op alleen rust-hartslag", () => {
    // Het verschil tussen week- en maandgemiddelde is daar vaak twee slagen;
    // daarop een oordeel bouwen zet leden op 'matig' door meetruis.
    expect(deriveReadiness({ ...basis, hrv: null, hrvBase: null })).toBeNull();
  });

  it("weigert te rekenen op data die niet vers meer is", () => {
    expect(deriveReadiness({ ...basis, dataAgeDays: 8 })).toBeNull();
    expect(deriveReadiness({ ...basis, dataAgeDays: null })).toBeNull();
    expect(deriveReadiness({ ...basis, dataAgeDays: 7 })).not.toBeNull();
  });
});

describe("summarizeWellness — readiness afleiden", () => {
  function day(date: string, over: Partial<Row> = {}): Row {
    return {
      date,
      resting_hr: 45,
      hrv: 90,
      sleep_secs: 7.5 * 3600,
      sleep_score: 85,
      readiness: null,
      fatigue: null,
      stress: null,
      soreness: null,
      mood: null,
      ...over,
    };
  }

  function series(to: string, count: number, over: (i: number) => Partial<Row> = () => ({})) {
    const end = new Date(`${to}T12:00:00`).getTime();
    return Array.from({ length: count }, (_, i) =>
      day(new Date(end - i * 86_400_000).toISOString().slice(0, 10), over(i)),
    );
  }

  it("berekent er zelf een als het apparaat niets levert", () => {
    const summary = summarizeWellness(series("2026-06-28", 30), "garmin", "2026-06-28")!;
    expect(summary.readinessSource).toBe("afgeleid");
    expect(summary.readiness).not.toBeNull();
    expect(summary.note).toContain("berekend uit je HRV");
  });

  it("laat de waarde van het apparaat voorgaan", () => {
    const rows = series("2026-06-28", 30, (i) => (i === 0 ? { readiness: 82 } : {}));
    const summary = summarizeWellness(rows, "whoop", "2026-06-28")!;
    expect(summary.readinessSource).toBe("device");
    expect(summary.readiness).toBe(82);
  });

  it("laat de berekende waarde de status niet nog een keer beïnvloeden", () => {
    // HRV ver onder baseline zet de status al op 'fatigued'; de afgeleide
    // readiness komt uit dezelfde HRV en mag daar niet bovenop komen.
    const rows = [
      ...series("2026-06-28", 7, () => ({ hrv: 60 })),
      ...series("2026-06-21", 23, () => ({ hrv: 90 })),
    ];
    const summary = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(summary.state).toBe("fatigued");
    expect(summary.note).not.toContain("Readiness laag");
  });

  it("blijft leeg als er te weinig dagen zijn voor een baseline", () => {
    const summary = summarizeWellness(series("2026-06-28", 5), "garmin", "2026-06-28")!;
    expect(summary.readiness).toBeNull();
    expect(summary.readinessSource).toBeNull();
  });

  it("blijft leeg voor een horloge dat geen HRV meet", () => {
    const rows = series("2026-06-28", 30, () => ({ hrv: null }));
    const summary = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(summary.readiness).toBeNull();
    expect(summary.readinessSource).toBeNull();
  });

  it("blijft leeg als de laatste meting maanden oud is", () => {
    // Een horloge dat is gestopt met leveren kreeg anders een keurige score op
    // data van vorig seizoen.
    const rows = series("2026-02-21", 30);
    const summary = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(summary.readiness).toBeNull();
    expect(summary.readinessSource).toBeNull();
  });

  it("telt de slaapaftrek niet dubbel in de trainingsruimte", () => {
    // De aftrek zit al in het berekende getal; nog eens apart aftrekken zou een
    // korte nacht twee keer laten meetellen.
    const rows = series("2026-06-28", 30, () => ({ sleep_secs: 6.4 * 3600 }));
    const wellness = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(wellness.readinessSource).toBe("afgeleid");
    expect(wellness.sleepPenalty).toBe(6);

    const metAftrek = summarizeTrainingReadiness({ tsb: 0, wellness });
    const zonderAftrek = summarizeTrainingReadiness({
      tsb: 0,
      wellness: { ...wellness, sleepPenalty: 0 },
    });
    expect(metAftrek.score).toBe(zonderAftrek.score);
  });
});

// Het advies weegt twee assen: trainingsbelasting (TSB) en herstel. Normaal
// wint de slechtste van de twee. Uitzondering: een diep negatieve TSB bij
// aantoonbaar goed herstel hoort bij een opbouwblok, niet bij overtraining.
describe("summarizeTrainingReadiness — belasting tegen herstel", () => {
  function wellness(over: Partial<WellnessSummary> = {}): WellnessSummary {
    return {
      days: 30,
      latestDate: "2026-06-28",
      restingHr: 45,
      hrv: 90,
      sleepHours: 7.5,
      readiness: 95,
      readinessSource: "afgeleid",
      sleepPenalty: 0,
      state: "fresh",
      note: "",
      ...over,
    };
  }

  it("laat goed herstel een zware TSB verzachten", () => {
    const result = summarizeTrainingReadiness({ tsb: -26.4, wellness: wellness() });
    expect(result.state).toBe("caution");
    expect(result.notes.join(" ")).toContain("geen herstelrust nodig");
  });

  it("verzacht niet als het herstel maar middelmatig is", () => {
    const result = summarizeTrainingReadiness({
      tsb: -26.4,
      wellness: wellness({ state: "normal", readiness: 62 }),
    });
    expect(result.state).toBe("recovery");
  });

  it("verzacht niet bij een extreem negatieve TSB", () => {
    const result = summarizeTrainingReadiness({ tsb: -45, wellness: wellness() });
    expect(result.state).toBe("recovery");
  });

  it("verzacht nooit andersom: slecht herstel wint van een goede TSB", () => {
    const result = summarizeTrainingReadiness({
      tsb: 12,
      wellness: wellness({ state: "fatigued", readiness: 40 }),
    });
    expect(result.state).toBe("recovery");
  });

  it("houdt de zwaarte zichtbaar in de score", () => {
    // Verzacht naar 'caution', maar wel onderin die band: de belasting is echt.
    const zwaar = summarizeTrainingReadiness({ tsb: -26.4, wellness: wellness() });
    const lichter = summarizeTrainingReadiness({ tsb: -11, wellness: wellness() });
    expect(zwaar.score!).toBeLessThan(lichter.score!);
  });

  it("verzacht niet zonder hersteldata", () => {
    const result = summarizeTrainingReadiness({ tsb: -26.4, wellness: null });
    expect(result.state).toBe("recovery");
  });
});
