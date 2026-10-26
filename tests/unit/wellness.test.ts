import { describe, expect, it } from "vitest";
import {
  deriveReadiness,
  hrvBand,
  refreshWellnessIfStale,
  restingHrBand,
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

  it("laat de Polar-score van gisteren niet als readiness van vandaag sturen", () => {
    // 12 september 2026: de "poor" van de dag ervoor gaf 's ochtends een
    // herstelrit van een half uur, terwijl die nacht "very good" was.
    const rows = [row("2026-06-27", 2), row("2026-06-26", 5)];
    const summary = summarizeWellness(rows, "polar", TODAY)!;
    expect(summary.readiness).toBe(30);
    expect(summary.readinessDate).toBe("2026-06-27");
    expect(summary.readinessCurrent).toBe(false);
    expect(summary.state).not.toBe("fatigued");
    expect(summary.note).toContain("Readiness van vandaag nog niet binnen");
    expect(summary.note).not.toContain("Readiness laag");
    expect(summarizeTrainingReadiness({ tsb: 0, wellness: summary }).state).not.toBe("recovery");
  });

  it("de Polar-score van vandaag stuurt wel", () => {
    const summary = summarizeWellness([row("2026-06-28", 2)], "polar", TODAY)!;
    expect(summary.readinessCurrent).toBe(true);
    expect(summary.readinessDate).toBe("2026-06-28");
    expect(summary.state).toBe("fatigued");
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

  it("haalt met force ook bij een verse kopie opnieuw op", async () => {
    const db = fakeDb(new Date().toISOString());
    const result = await refreshWellnessIfStale(
      db,
      "p1",
      { apiKey: "k", athleteId: "i1", records },
      { force: true },
    );
    expect(result.refreshed).toBe(true);
    expect(db.upserts).toHaveLength(1);
  });

  it("neemt geen SDNN over als rMSSD ontbreekt", async () => {
    // SDNN is een andere maat; in dezelfde reeks vertekende hij de band.
    const db = fakeDb(null);
    await refreshWellnessIfStale(db, "p1", {
      apiKey: "k",
      athleteId: "i1",
      records: [{ id: "2026-08-04", restingHR: 48, hrvSDNN: 70 }],
    });
    expect((db.upserts[0][0] as Upsert & { hrv: number | null }).hrv).toBeNull();
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

  it("gebruikt de 30 dagen vóór de laatste week als baseline, niet het hele venster", () => {
    // Laatste 37 dagen rond HRV 90, daarvóór een jaar op 120. Met een baseline
    // over alles zou de recente 90 als "onder baseline" lezen; over 30 dagen niet.
    const recent = series("2026-06-28", 37, () => ({ hrv: 90 }));
    const oud = series("2026-05-22", 300, () => ({ hrv: 120 }));
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
    expect(summary.note).toContain("Geen hersteldata van de laatste 37 dagen");
    // De laatste meting blijft zichtbaar, zodat het lid weet sinds wanneer.
    expect(summary.latestDate).toBe("2026-02-21");
    expect(summary.note).toContain("2026-02-21");
  });

  it("noemt geen normale herstelwaarden meer bij verouderde data", () => {
    const summary = summarizeWellness(series("2026-02-21", 30), null, "2026-06-28")!;
    expect(summary.note).not.toContain("binnen de normale range");
  });

  it("meldt een lege week ook als de baseline nog wel gevuld is", () => {
    // Garmin-koppeling met intervals.icu ligt sinds 4 oktober stil.
    const summary = summarizeWellness(series("2026-10-04", 13), "garmin", "2026-10-22")!;
    expect(summary.state).toBe("unknown");
    expect(summary.hrv).toBeNull();
    expect(summary.readiness).toBeNull();
    expect(summary.days).toBe(13);
    expect(summary.note).toBe("Geen hersteldata van de laatste 7 dagen; laatste meting 2026-10-04.");
  });

  it("telt precies 7 dagen voor het weekgemiddelde, vandaag meegerekend", () => {
    // De dag van acht dagen geleden (hrv 200) hoort er niet meer bij.
    const rows = series("2026-06-28", 30, (i) => (i === 7 ? { hrv: 200 } : {}));
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.hrv).toBe(90);
  });

  it("telt precies 37 dagen: de laatste week plus 30 dagen baseline", () => {
    const summary = summarizeWellness(series("2026-06-28", 45), null, "2026-06-28")!;
    expect(summary.days).toBe(37);
  });

  it("laat de laatste week niet in zijn eigen baseline meetellen", () => {
    // Tot 2026-10-16 telde de vermoeide week zelf mee en trok hij zijn eigen
    // maatstaf omlaag. Een week op 80 na een maand op 90 is nu een signaal.
    const rows = series("2026-06-28", 37, (i) => ({ hrv: i < 7 ? 80 : 90 }));
    const summary = summarizeWellness(rows, null, "2026-06-28")!;
    expect(summary.hrvBand).toBe("below");
    expect(summary.state).toBe("fatigued");
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
  // Afwijkingen tellen in banden: de halve breedte van de eigen normale band.
  const basis = {
    hrvDelta: 0,
    hrvHalf: 0.08,
    rhrDelta: 0,
    rhrHalf: 3,
    sleepScore: null,
    baselineDays: 30,
    dataAgeDays: 0,
  };

  it("geeft een neutrale score als alles in de eigen band zit", () => {
    expect(deriveReadiness(basis)).toBe(70);
  });

  it("kost 15 punten per band onder de norm, tot een ondergrens", () => {
    expect(deriveReadiness({ ...basis, hrvDelta: -0.08 })).toBe(55);
    expect(deriveReadiness({ ...basis, hrvDelta: -0.4 })).toBe(45);
  });

  it("stijgt boven de band minder hard dan hij zakt", () => {
    const omhoog = deriveReadiness({ ...basis, hrvDelta: 0.16 })! - 70;
    const omlaag = 70 - deriveReadiness({ ...basis, hrvDelta: -0.16 })!;
    expect(omhoog).toBe(10);
    expect(omhoog).toBeLessThan(omlaag);
  });

  it("weegt dezelfde daling zwaarder bij een lid met stabiele metingen", () => {
    const stabiel = deriveReadiness({ ...basis, hrvDelta: -0.05, hrvHalf: 0.04 })!;
    const grillig = deriveReadiness({ ...basis, hrvDelta: -0.05, hrvHalf: 0.12 })!;
    expect(stabiel).toBeLessThan(grillig);
  });

  it("straft een verhoogde rust-hartslag af", () => {
    expect(deriveReadiness({ ...basis, rhrDelta: 3 })!).toBeLessThan(60);
  });

  it("neemt de slaapscore mee als bijstelling rond een neutrale 75", () => {
    expect(deriveReadiness({ ...basis, sleepScore: 90 })!).toBeGreaterThan(70);
    expect(deriveReadiness({ ...basis, sleepScore: 60 })!).toBeLessThan(70);
  });

  it("claimt nooit een 0 of een 100", () => {
    const bodem = deriveReadiness({ ...basis, hrvDelta: -1, rhrDelta: 20, sleepScore: 10 })!;
    const plafond = deriveReadiness({ ...basis, hrvDelta: 1, rhrDelta: -20, sleepScore: 100 })!;
    expect(bodem).toBeGreaterThanOrEqual(5);
    expect(plafond).toBeLessThanOrEqual(95);
  });

  it("weigert te rekenen zonder bruikbare baseline", () => {
    expect(deriveReadiness({ ...basis, baselineDays: 10 })).toBeNull();
  });

  it("weigert te rekenen op alleen slaap", () => {
    expect(
      deriveReadiness({ ...basis, hrvDelta: null, hrvHalf: null, rhrDelta: null, rhrHalf: null }),
    ).toBeNull();
  });

  it("weigert te rekenen op alleen rust-hartslag", () => {
    // Het verschil tussen week- en maandgemiddelde is daar vaak twee slagen;
    // daarop een oordeel bouwen zet leden op 'matig' door meetruis.
    expect(deriveReadiness({ ...basis, hrvDelta: null, hrvHalf: null })).toBeNull();
  });

  it("weigert te rekenen op data die niet vers meer is", () => {
    expect(deriveReadiness({ ...basis, dataAgeDays: 8 })).toBeNull();
    expect(deriveReadiness({ ...basis, dataAgeDays: null })).toBeNull();
    expect(deriveReadiness({ ...basis, dataAgeDays: 7 })).not.toBeNull();
  });
});

// De normale band: weekgemiddelde van ln rMSSD tegen gemiddelde ± 0,5 SD van
// de 30 dagen ervóór (Plews 2012; Vesterinen 2016).
describe("hrvBand en restingHrBand", () => {
  const wisselend = (a: number, b: number, n: number) =>
    Array.from({ length: n }, (_, i) => (i % 2 === 0 ? a : b));

  it("plaatst een week binnen, onder of boven de eigen band", () => {
    const basis = wisselend(80, 100, 30);
    expect(hrvBand([90, 90, 90, 90, 90, 90, 90], basis)!.position).toBe("within");
    expect(hrvBand([75, 75, 75, 75, 75, 75, 75], basis)!.position).toBe("below");
    expect(hrvBand([110, 110, 110, 110, 110, 110, 110], basis)!.position).toBe("above");
  });

  it("maakt de band breder bij een lid met meer dagelijkse ruis", () => {
    const rustig = hrvBand([90, 90, 90], wisselend(85, 95, 30))!;
    const druk = hrvBand([90, 90, 90], wisselend(70, 115, 30))!;
    expect(druk.half).toBeGreaterThan(rustig.half);
  });

  it("houdt een ondergrens aan voor heel stabiele metingen", () => {
    const band = hrvBand([88, 88, 88], Array(30).fill(90))!;
    expect(band.half).toBeCloseTo(0.03);
    expect(band.position).toBe("within");
  });

  it("geeft geen oordeel met te weinig metingen", () => {
    expect(hrvBand([90, 90], wisselend(80, 100, 30))).toBeNull();
    expect(hrvBand([90, 90, 90], wisselend(80, 100, 10))).toBeNull();
    expect(hrvBand([90, null, 90, null, 90], wisselend(80, 100, 30))).not.toBeNull();
  });

  it("is voor de rust-hartslag nooit gevoeliger dan drie slagen", () => {
    const basis = Array(30).fill(45);
    expect(restingHrBand([47, 47, 47], basis)!.raised).toBe(false);
    expect(restingHrBand([49, 49, 49], basis)!.raised).toBe(true);
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

  it("rekent slaapduur niet in het berekende getal", () => {
    const uitgerust = summarizeWellness(series("2026-06-28", 30), "garmin", "2026-06-28")!;
    const kortGeslapen = summarizeWellness(
      series("2026-06-28", 30, () => ({ sleep_secs: 5.8 * 3600 })),
      "garmin",
      "2026-06-28",
    )!;
    expect(kortGeslapen.readiness).toBe(uitgerust.readiness);
    expect(kortGeslapen.sleepPenalty).toBe(14);
  });

  it("trekt korte nachten één keer af, net als bij een apparaat", () => {
    const rows = series("2026-06-28", 30, () => ({ sleep_secs: 6.4 * 3600 }));
    const wellness = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(wellness.readinessSource).toBe("afgeleid");
    expect(wellness.sleepPenalty).toBe(6);

    const metAftrek = summarizeTrainingReadiness({ tsb: 0, wellness });
    const zonderAftrek = summarizeTrainingReadiness({
      tsb: 0,
      wellness: { ...wellness, sleepPenalty: 0 },
    });
    expect(metAftrek.score).toBe(zonderAftrek.score! - 6);
  });

  it("zet een lid met herstel op baseline niet op herstel door een paar korte nachten", () => {
    // Een Garmin-lid met een ruime TSB, HRV en rust-HR vrijwel op baseline en
    // een week met ~5,9 uur slaap stond op "herstel voorrang": de slaapaftrek
    // zat in het berekende getal en duwde dat onder de 50. Met een apparaat dat
    // zelf readiness levert was het bij een aftrek gebleven. De baseline heeft
    // de dagelijkse ruis van een echt horloge; een vlakke reeks heeft geen band.
    const rows = [
      ...series("2026-06-28", 7, () => ({
        hrv: 86,
        resting_hr: 46,
        sleep_secs: 5.9 * 3600,
        sleep_score: 65,
      })),
      ...series("2026-06-21", 30, (i) =>
        i % 2 === 0 ? { hrv: 75, resting_hr: 42 } : { hrv: 105, resting_hr: 48 },
      ),
    ];
    const wellness = summarizeWellness(rows, "garmin", "2026-06-28")!;
    expect(wellness.state).toBe("normal");
    expect(wellness.sleepPenalty).toBe(14);
    expect(wellness.readiness!).toBeGreaterThan(50);

    const result = summarizeTrainingReadiness({ tsb: 23, wellness });
    expect(result.state).toBe("caution");
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
      readiness: 80,
      readinessSource: "afgeleid",
      readinessDate: "2026-06-28",
      readinessCurrent: true,
      sleepPenalty: 0,
      hrvBand: "within",
      restingHrRaised: false,
      state: "normal",
      note: "",
      ...over,
    };
  }

  it("laat HRV en rust-HR in de eigen band een zware TSB verzachten", () => {
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

  it("ziet een HRV ver boven de band bij zware belasting niet als geruststelling", () => {
    // Bij overbelaste sporters steeg het weekgemiddelde juist (Le Meur 2013;
    // Manresa-Rocamora 2021). Tot 2026-10-16 verzachtte dit naar 'caution'.
    const result = summarizeTrainingReadiness({
      tsb: -26.4,
      wellness: wellness({ hrvBand: "above", state: "fresh", readiness: 92 }),
    });
    expect(result.state).toBe("recovery");
    expect(result.notes.join(" ")).toContain("ook overbelasting");
  });

  it("verzacht niet bij een verhoogde rust-hartslag of korte nachten", () => {
    expect(
      summarizeTrainingReadiness({ tsb: -26.4, wellness: wellness({ restingHrRaised: true }) })
        .state,
    ).toBe("recovery");
    expect(
      summarizeTrainingReadiness({ tsb: -26.4, wellness: wellness({ sleepPenalty: 6 }) }).state,
    ).toBe("recovery");
  });
});

describe("summarizeTrainingReadiness — gevoel van het lid", () => {
  const fris: WellnessSummary = {
    days: 37,
    latestDate: "2026-06-28",
    restingHr: 45,
    hrv: 100,
    sleepHours: 7.5,
    readiness: 85,
    readinessSource: "device",
    readinessDate: "2026-06-28",
    readinessCurrent: true,
    sleepPenalty: 0,
    hrvBand: "above",
    restingHrRaised: false,
    state: "fresh",
    note: "",
  };
  const zwaar = { heavy: true, note: "Een rustige rit van de laatste dagen voelde zwaar." };

  it("haalt de ruimte voor kwaliteit weg als het lid aangeeft dat het zwaar gaat", () => {
    expect(summarizeTrainingReadiness({ tsb: 12, wellness: fris }).state).toBe("ready");
    const result = summarizeTrainingReadiness({ tsb: 12, wellness: fris, subjective: zwaar });
    expect(result.state).toBe("caution");
    expect(result.notes).toContain(zwaar.note);
  });

  it("zet niemand op herstel op alleen een zwaar verslag", () => {
    const result = summarizeTrainingReadiness({ tsb: 12, wellness: null, subjective: zwaar });
    expect(result.state).toBe("caution");
  });

  it("verzacht een zware TSB niet als het lid zich slecht voelt", () => {
    const inBand = { ...fris, hrvBand: "within" as const, state: "normal" as const, readiness: 80 };
    expect(summarizeTrainingReadiness({ tsb: -26.4, wellness: inBand }).state).toBe("caution");
    expect(
      summarizeTrainingReadiness({ tsb: -26.4, wellness: inBand, subjective: zwaar }).state,
    ).toBe("recovery");
  });
});
