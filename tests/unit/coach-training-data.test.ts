import { describe, expect, it, vi } from "vitest";
import {
  buildCoachTrainingData,
  fetchCoachForm,
  formFrom,
  trainingDataFrom,
  withBudget,
  RECENT_RIDES,
  type CoachRideRow,
} from "@/lib/training/training-data";

// De trainingsdata die de coach meekrijgt. Drie dingen liggen hier vast: de
// cijfers zijn dezelfde als op de Belasting-pagina (TSS uit NP en FTP, en alleen
// bij een echte vermogensmeter), een lid zonder koppeling krijgt een lege vorm in
// plaats van een verzonnen vorm, en een trage intervals.icu houdt het antwoord
// niet tegen.

const FTP = 250;

function ride(overrides: Partial<CoachRideRow> & { start_date: string }): CoachRideRow {
  return {
    id: Math.round(Math.random() * 1e9),
    name: "Rit",
    moving_time_seconds: 3600,
    distance_m: 30_000,
    total_elevation_gain_m: 200,
    sport_type: "Ride",
    synced_at: "2026-09-18T06:00:00Z",
    raw: {
      moving_time: 3600,
      device_watts: true,
      weighted_average_watts: 250,
      average_watts: 230,
      average_heartrate: 141.4,
      max_heartrate: 168,
    },
    ...overrides,
  };
}

// 18 september 2026, 10:00 Amsterdam.
const NOW = Date.parse("2026-09-18T08:00:00Z");

describe("trainingsdata voor de coach", () => {
  it("zet een rit om in dezelfde cijfers als de Belasting-pagina", () => {
    const data = trainingDataFrom({
      rides: [ride({ start_date: "2026-09-17T15:00:00Z", name: "Tempo-uurtje" })],
      ftpWatts: FTP,
      weightKg: 72.4,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: NOW,
    });

    expect(data.ritten).toHaveLength(1);
    expect(data.ritten[0]).toMatchObject({
      datum: "2026-09-17",
      titel: "Tempo-uurtje",
      soort: "Ride",
      minuten: 60,
      km: 30,
      hoogtemeters: 200,
      // Een uur op precies FTP is per definitie 100 TSS bij IF 1.
      belasting: 100,
      intensiteit: 1,
      gemHartslag: 141,
      vermogensmeter: true,
    });
  });

  it("laat belasting en intensiteit leeg zonder echte vermogensmeter", () => {
    const geschat = ride({ start_date: "2026-09-16T15:00:00Z" });
    geschat.raw = { moving_time: 3600, device_watts: false, average_watts: 180 };

    const data = trainingDataFrom({
      rides: [geschat],
      ftpWatts: FTP,
      weightKg: null,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: NOW,
    });

    expect(data.ritten[0].vermogensmeter).toBe(false);
    expect(data.ritten[0].belasting).toBeNull();
    expect(data.ritten[0].intensiteit).toBeNull();
  });

  it("telt de belasting per week op en beperkt de losse ritten", () => {
    const rides = Array.from({ length: 20 }, (_, index) => {
      const day = new Date(NOW - index * 86_400_000).toISOString();
      return ride({ start_date: day, name: `Rit ${index}` });
    });

    const data = trainingDataFrom({
      rides,
      ftpWatts: FTP,
      weightKg: 70,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: NOW,
    });

    expect(data.ritten).toHaveLength(RECENT_RIDES);
    // Nieuwste eerst, zodat "mijn laatste rit" bovenaan staat.
    expect(data.ritten[0].datum > data.ritten[1].datum).toBe(true);
    // Zeven ritten van 100 TSS in een volle week.
    expect(data.weken.some((week) => week.belasting === 700)).toBe(true);
    expect(data.volume).toMatchObject({ dagen: 28, ritten: 20, urenPerWeek: 5 });
    expect(data.bron.laatsteRit).toBe("2026-09-18");
  });

  it("neemt alleen ritten uit het volumevenster mee", () => {
    const data = trainingDataFrom({
      rides: [
        ride({ start_date: "2026-09-17T15:00:00Z" }),
        // Ruim buiten de 28 dagen: telt wel in de weekbelasting, niet in het volume.
        ride({ start_date: "2026-07-10T15:00:00Z" }),
      ],
      ftpWatts: FTP,
      weightKg: null,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: NOW,
    });

    expect(data.volume?.ritten).toBe(1);
    expect(data.weken).toHaveLength(2);
  });

  it("vat vermogen samen en laat het blok weg als er niets is", () => {
    const leeg = trainingDataFrom({
      rides: [],
      ftpWatts: null,
      weightKg: null,
      ftpTests: [],
      powerProfile: null,
      form: null,
      now: NOW,
    });
    expect(leeg.vermogen).toBeNull();
    expect(leeg.volume).toBeNull();
    expect(leeg.ritten).toEqual([]);

    const data = trainingDataFrom({
      rides: [],
      ftpWatts: 260,
      weightKg: 72.45,
      ftpTests: [
        { tested_on: "2026-08-30", test_type: "ramp", result_watts: 310, ftp_watts: 260 },
      ],
      powerProfile: {
        period: "90d",
        synced_at: "2026-09-10T10:00:00Z",
        rider_type: "allrounder",
        watts_15s: 800,
        watts_1m: 480,
        watts_5m: 330,
        watts_20m: 280,
        wkg_15s: "11.04",
        wkg_1m: "6.63",
        wkg_5m: "4.56",
        wkg_20m: "3.87",
      },
      form: null,
      now: NOW,
    });

    expect(data.vermogen).toMatchObject({ ftpWatts: 260, gewichtKg: 72.5, ftpPerKg: 3.59 });
    expect(data.vermogen?.tests[0]).toMatchObject({ datum: "2026-08-30", resultaatWatts: 310 });
    expect(data.vermogen?.curve).toMatchObject({ watt20m: 280, wkg20m: 3.87, type: "allrounder" });
  });
});

describe("vorm uit intervals.icu", () => {
  const wellness = [
    { id: "2026-09-10", ctl: 51.2, atl: 44.1, eftp: 262 },
    { id: "2026-09-17", ctl: 54.6, atl: 61.2, ramp_rate: 3.4 },
  ] as never[];

  it("rekent TSB uit CTL en ATL en pakt de laatste gevulde eFTP", () => {
    const result = formFrom(wellness);
    expect(result?.form).toMatchObject({
      gemetenOp: "2026-09-17",
      ctl: 54.6,
      atl: 61.2,
      tsb: -6.6,
      eftp: 262,
      rampRate: 3.4,
    });
  });

  it("levert de CTL-punten waarmee de weekgroei wordt berekend", () => {
    const result = formFrom(wellness);
    expect(result?.ctlPoints).toEqual([
      { date: "2026-09-10", ctl: 51.2 },
      { date: "2026-09-17", ctl: 54.6 },
    ]);

    const data = trainingDataFrom({
      rides: [ride({ start_date: "2026-09-17T15:00:00Z" })],
      ftpWatts: FTP,
      weightKg: null,
      ftpTests: [],
      powerProfile: null,
      form: result,
      now: NOW,
    });
    expect(data.bron.vormBron).toBe("intervals.icu");
    expect(data.weken.at(-1)?.ctlVerschil).toBe(3.4);
  });

  it("geeft niets terug zonder records", () => {
    expect(formFrom([])).toBeNull();
  });

  it("slaat de call over zonder koppeling", async () => {
    expect(await fetchCoachForm(null)).toBeNull();
    expect(await fetchCoachForm({ api_key: null, athlete_id: "i1" })).toBeNull();
  });
});

describe("tijdbudget", () => {
  it("geeft het antwoord terug als het op tijd is", async () => {
    expect(await withBudget(Promise.resolve("klaar"), 50)).toBe("klaar");
  });

  it("geeft null als het te lang duurt", async () => {
    const traag = new Promise((resolve) => setTimeout(() => resolve("laat"), 200));
    expect(await withBudget(traag, 20)).toBeNull();
  });

  it("geeft null bij een fout, zonder unhandled rejection", async () => {
    expect(await withBudget(Promise.reject(new Error("intervals down")), 50)).toBeNull();
  });
});

describe("queries", () => {
  it("leest alleen fietsritten van dit lid en overleeft een lege database", async () => {
    const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
    function from(table: string) {
      const entry = { table, filters: [] as Array<[string, unknown]> };
      calls.push(entry);
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "order", "limit"]) {
        builder[method] = () => builder;
      }
      for (const method of ["eq", "in", "gte"]) {
        builder[method] = (column: string, value: unknown) => {
          entry.filters.push([column, value]);
          return builder;
        };
      }
      builder.maybeSingle = async () => ({ data: null, error: null });
      builder.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve);
      return builder;
    }

    const data = await buildCoachTrainingData({ from } as never, "lid-1", null);

    expect(data.ritten).toEqual([]);
    expect(data.vorm).toBeNull();
    const rides = calls.find((call) => call.table === "strava_activities");
    expect(rides?.filters).toContainEqual(["profile_id", "lid-1"]);
    expect(rides?.filters.some(([column, value]) => column === "sport_type" && Array.isArray(value)))
      .toBe(true);
  });
});

// Geen echte netwerkcall in de suite; wie hem per ongeluk toevoegt, ziet dit falen.
vi.mock("@/lib/intervals/client", () => ({
  fetchIntervalsWellness: async () => {
    throw new Error("geen netwerk in unit-tests");
  },
}));
