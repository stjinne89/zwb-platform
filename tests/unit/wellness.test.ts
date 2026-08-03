import { describe, expect, it } from "vitest";
import {
  refreshWellnessIfStale,
  summarizeTrainingReadiness,
  summarizeWellness,
  WELLNESS_MAX_AGE_MS,
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
