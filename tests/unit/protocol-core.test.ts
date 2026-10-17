import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeDb } from "./fake-db";
import { protocolBySlug, runDates, type ProtocolRun } from "@/lib/protocols";
import {
  CORE_THRESHOLD_C,
  coreCandidates,
  coreTemperatureStream,
  formatCoreSession,
  meetsCoreTarget,
  protocolUsesCore,
  summarizeCoreTemperature,
  type CoreActivity,
} from "@/lib/protocols/core-temperature";

const mocks = vi.hoisted(() => ({
  activities: vi.fn(),
  streams: vi.fn(),
}));

vi.mock("@/lib/intervals/client", () => ({
  fetchIntervalsActivities: mocks.activities,
  fetchIntervalsActivityStreams: mocks.streams,
}));

const { fillCoreSessions } = await import("@/lib/protocols/core-fill");
const { PROTOCOL_CONSENT_VERSION } = await import("@/lib/protocols/consent");

/**
 * Elke seconde een meting; de laatste `above` seconden op 38,8 °C, de rest op
 * 37,9 °C. De laatste meting heeft geen volgende en telt dus niet mee.
 */
function ride(seconds: number, above: number) {
  const core = Array.from({ length: seconds }, (_, i) => (i >= seconds - above - 1 ? 38.8 : 37.9));
  return [
    { type: "time", data: Array.from({ length: seconds }, (_, i) => i) },
    { type: "watts", data: Array.from({ length: seconds }, () => 180) },
    { type: "core_temperature", data: core },
  ];
}

describe("kerntemperatuur uitrekenen", () => {
  it("vindt de stream, ook met een voorvoegsel uit Connect IQ", () => {
    expect(coreTemperatureStream([{ type: "core_temperature", data: [38] }])).toEqual([38]);
    expect(coreTemperatureStream([{ type: "0_95_core_temperature", data: [37] }])).toEqual([37]);
    expect(coreTemperatureStream([{ type: "skin_temperature", data: [34] }, { type: "temp", data: [20] }])).toBeNull();
  });

  it("leest bij een oudere Wahoo de kerntemperatuur uit het THb-veld", () => {
    const core = [37.6, 38.2, 38.7, 38.9];
    const skin = [34.1, 34.6, 35.0, 35.2];
    expect(coreTemperatureStream([{ type: "time", data: [0, 1, 2, 3] }, { type: "thb", data: core }])).toEqual(core);
    // Kern en huid op twee kanalen: de hoogste mediaan is de kern.
    expect(
      coreTemperatureStream([
        { type: "thb", data: skin },
        { type: "thb_2", data: core },
      ]),
    ).toEqual(core);
    // Een echte spierzuurstofsensor, of alleen de huid: geen kerntemperatuur.
    expect(coreTemperatureStream([{ type: "thb", data: [12.4, 12.8, 13.1, null] }])).toBeNull();
    expect(coreTemperatureStream([{ type: "thb", data: skin }])).toBeNull();
    // De echte stream gaat voor.
    expect(
      coreTemperatureStream([
        { type: "thb", data: core },
        { type: "core_temperature", data: [38] },
      ]),
    ).toEqual([38]);
  });

  it("telt de minuten op of boven de drempel", () => {
    const streams = ride(3600, 1800);
    const summary = summarizeCoreTemperature(streams[2].data, streams[0].data);
    expect(summary).toEqual({ maxC: 38.8, minutesAbove: 30 });
  });

  it("telt een gat in de metingen hooguit 30 seconden mee", () => {
    expect(summarizeCoreTemperature([39, 39, 39, 39], [0, 300, 301, 302])).toEqual({
      maxC: 39,
      minutesAbove: 0,
    });
    // 30 + 1 + 1 + 60 x 1 seconde
    const values = Array.from({ length: 63 }, () => 38.6);
    const time = [0, 300, ...Array.from({ length: 61 }, (_, i) => 301 + i)];
    expect(summarizeCoreTemperature(values, time)?.minutesAbove).toBe(1);
  });

  it("negeert nullen en onmogelijke waarden", () => {
    expect(summarizeCoreTemperature([0, null, 55, 38.4, null], null)).toEqual({ maxC: 38.4, minutesAbove: 0 });
    expect(summarizeCoreTemperature([0, null, 0], null)).toBeNull();
    expect(summarizeCoreTemperature([], null)).toBeNull();
  });

  it("rekent zonder tijdreeks met een meting per seconde", () => {
    const values = Array.from({ length: 121 }, () => CORE_THRESHOLD_C);
    expect(summarizeCoreTemperature(values, null)?.minutesAbove).toBe(2);
  });

  it("vinkt pas af bij genoeg minuten", () => {
    expect(meetsCoreTarget({ coreMinutes: 30 }, { maxC: 38.9, minutesAbove: 30 })).toBe(true);
    expect(meetsCoreTarget({ coreMinutes: 30 }, { maxC: 38.9, minutesAbove: 29 })).toBe(false);
    expect(meetsCoreTarget({}, { maxC: 39.5, minutesAbove: 60 })).toBe(false);
    expect(meetsCoreTarget({ coreMinutes: 30 }, null)).toBe(false);
  });

  it("toont de meting kort", () => {
    expect(formatCoreSession({ maxC: 38.76, minutesAbove: 42 })).toBe("38,8 °C · 42 min boven 38,5 °C");
  });

  it("geeft alleen de hitteprotocollen een CORE-drempel", () => {
    expect(protocolUsesCore(protocolBySlug("hitte-kort")!)).toBe(true);
    expect(protocolUsesCore(protocolBySlug("hitte-lang")!)).toBe(true);
    expect(protocolUsesCore(protocolBySlug("lage-cadans-vo2max")!)).toBe(false);
    expect(protocolUsesCore(protocolBySlug("cafeine")!)).toBe(false);
  });
});

function run(slug: string, dates: { startDate?: string; raceDate?: string }, id = `run-${slug}`): ProtocolRun {
  const resolved = runDates(protocolBySlug(slug)!, dates)!;
  return { id, protocolSlug: slug, status: "actief", ...resolved };
}

function activity(id: string, day: string, extra: Partial<CoreActivity> = {}): CoreActivity {
  return { id, start_date_local: `${day}T18:00:00`, type: "VirtualRide", source: "GARMIN_CONNECT", moving_time: 3600, ...extra };
}

describe("welke ritten de app bekijkt", () => {
  const TODAY = "2026-10-14";
  const lang = run("hitte-lang", { startDate: "2026-10-12" });

  it("neemt fietsritten op hittedagen, nieuwste eerst", () => {
    const candidates = coreCandidates(
      [lang],
      [activity("a", "2026-10-12"), activity("b", "2026-10-14"), activity("c", "2026-10-13")],
      new Set(),
      TODAY,
    );
    expect(candidates.map((item) => item.intervalsId)).toEqual(["b", "c", "a"]);
    expect(candidates[0]).toMatchObject({ day: "2026-10-14", run: lang });
  });

  it("slaat Strava-ritten, hardlopen, te korte en bekeken ritten over", () => {
    const candidates = coreCandidates(
      [lang],
      [
        activity("strava", TODAY, { source: "STRAVA" }),
        activity("stub", TODAY, { _note: "STRAVA activities are not available via the API" }),
        activity("loop", TODAY, { type: "Run" }),
        activity("kort", TODAY, { moving_time: 4 * 60 }),
        activity("gezien", TODAY),
        activity("ervoor", "2026-10-11"),
        activity("goed", TODAY),
      ],
      new Set([`${lang.id}|gezien`]),
      TODAY,
    );
    expect(candidates.map((item) => item.intervalsId)).toEqual(["goed"]);
  });

  it("meet ook een korte rit, zoals de testrit van de eigenaar", () => {
    // i198325696: 644 seconden op een BOLT 2, via de Wahoo-koppeling.
    const test = activity("i198325696", TODAY, {
      moving_time: 644,
      source: "WAHOO",
      stream_types: ["time", "watts", "cadence", "heartrate", "distance", "latlng", "velocity_smooth", "core_temperature", "torque"],
    });
    expect(coreCandidates([lang], [test], new Set(), TODAY)).toEqual([
      expect.objectContaining({ intervalsId: "i198325696", streamTypes: ["time", "core_temperature"] }),
    ]);
  });

  it("slaat een rit zonder CORE-stream over zonder hem op te halen", () => {
    const candidates = coreCandidates(
      [lang],
      [
        activity("zonder", TODAY, { stream_types: ["time", "watts", "heartrate"] }),
        activity("wahoo-oud", TODAY, { stream_types: ["time", "watts", "smo2", "thb", "thb_2"] }),
        activity("onbekend", TODAY),
      ],
      new Set(),
      TODAY,
    );
    expect(candidates.map((item) => [item.intervalsId, item.streamTypes])).toEqual([
      ["wahoo-oud", ["time", "thb", "thb_2"]],
      ["onbekend", []],
    ]);
  });

  it("kijkt niet verder terug dan twee weken en niet voorbij het einde", () => {
    const old = run("hitte-lang", { startDate: "2026-09-01" }, "oud");
    const days = coreCandidates(
      [old],
      [activity("x", "2026-09-29"), activity("y", "2026-09-30"), activity("z", "2026-10-14")],
      new Set(),
      TODAY,
    ).map((item) => item.day);
    expect(days).toEqual(["2026-10-14", "2026-09-30"]);

    const ended = run("hitte-kort", { raceDate: "2026-10-10" }, "voorbij");
    expect(coreCandidates([ended], [activity("na", "2026-10-12")], new Set(), TODAY)).toEqual([]);
  });

  it("laat een korte hittesessie al bij tien minuten meetellen, maar niet op de wedstrijddag", () => {
    const kort = run("hitte-kort", { raceDate: "2026-10-16" }, "kort");
    const candidates = coreCandidates(
      [kort],
      [activity("vasthouden", TODAY, { moving_time: 15 * 60 })],
      new Set(),
      TODAY,
    );
    expect(candidates.map((item) => item.intervalsId)).toEqual(["vasthouden"]);
    expect(coreCandidates([kort], [activity("race", "2026-10-16")], new Set(), "2026-10-16")).toEqual([]);
  });
});

describe("fillCoreSessions", () => {
  const TODAY = "2026-10-14";
  const PROFILE = "lid";
  const RUN = "run-1";

  function db(extra: Record<string, Record<string, unknown>[]> = {}, consent = PROTOCOL_CONSENT_VERSION) {
    return fakeDb({
      member_protocols: [
        {
          id: RUN,
          profile_id: PROFILE,
          protocol_slug: "hitte-lang",
          start_date: "2026-10-12",
          race_date: null,
          status: "actief",
          consent_version: consent,
        },
      ],
      member_protocol_checks: [],
      member_protocol_core_sessions: [],
      ...extra,
    });
  }

  function fill(fake: ReturnType<typeof fakeDb>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return fillCoreSessions(fake as any, PROFILE, { api_key: "k", athlete_id: "i1" }, TODAY);
  }

  beforeEach(() => {
    mocks.activities.mockReset();
    mocks.streams.mockReset();
    mocks.activities.mockResolvedValue([activity("r1", TODAY)]);
    mocks.streams.mockResolvedValue(ride(3600, 40 * 60));
  });

  it("bewaart de samenvatting en vinkt de hittesessie af", async () => {
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 1, empty: 0, checked: 1 });
    expect(mocks.streams).toHaveBeenCalledWith("k", "r1", []);
    expect(fake.tables.member_protocol_checks).toEqual([
      { protocol_id: RUN, day: TODAY, task_key: "hittesessie" },
    ]);
    expect(fake.tables.member_protocol_core_sessions).toEqual([
      {
        protocol_id: RUN,
        intervals_id: "r1",
        day: TODAY,
        max_core_c: 38.8,
        minutes_above: 40,
        auto_checked: true,
      },
    ]);
  });

  it("vraagt alleen tijd en kerntemperatuur op als de lijst de streams noemt", async () => {
    mocks.activities.mockResolvedValue([
      activity("r1", TODAY, { moving_time: 644, stream_types: ["time", "watts", "core_temperature"] }),
    ]);
    mocks.streams.mockResolvedValue(ride(644, 0).filter((stream) => stream.type !== "watts"));
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 1, empty: 0, checked: 0 });
    expect(mocks.streams).toHaveBeenCalledWith("k", "r1", ["time", "core_temperature"]);
    expect(fake.tables.member_protocol_core_sessions[0]).toMatchObject({ minutes_above: 0, auto_checked: false });
  });

  it("bewaart te weinig minuten wel, maar vinkt niet af", async () => {
    mocks.streams.mockResolvedValue(ride(3600, 20 * 60));
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 1, empty: 0, checked: 0 });
    expect(fake.tables.member_protocol_checks).toEqual([]);
    expect(fake.tables.member_protocol_core_sessions[0]).toMatchObject({ minutes_above: 20, auto_checked: false });
  });

  it("legt een rit zonder CORE-data vast als bekeken", async () => {
    mocks.streams.mockResolvedValue(ride(3600, 0).slice(0, 2));
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 0, empty: 1, checked: 0 });
    expect(fake.tables.member_protocol_core_sessions[0]).toMatchObject({
      max_core_c: null,
      minutes_above: null,
      auto_checked: false,
    });
  });

  it("vraagt een bekeken rit niet opnieuw op en zet een weggehaald vinkje niet terug", async () => {
    const fake = db({
      member_protocol_core_sessions: [
        { protocol_id: RUN, intervals_id: "r1", day: TODAY, max_core_c: 38.8, minutes_above: 40, auto_checked: true },
      ],
    });
    expect(await fill(fake)).toEqual({ measured: 0, empty: 0, checked: 0 });
    expect(mocks.streams).not.toHaveBeenCalled();
    expect(fake.tables.member_protocol_checks).toEqual([]);
  });

  it("vinkt niet dubbel af als het lid het zelf al deed", async () => {
    const fake = db({ member_protocol_checks: [{ protocol_id: RUN, day: TODAY, task_key: "hittesessie" }] });
    expect(await fill(fake)).toEqual({ measured: 1, empty: 0, checked: 0 });
    expect(fake.tables.member_protocol_checks).toHaveLength(1);
    expect(fake.tables.member_protocol_core_sessions[0]).toMatchObject({ auto_checked: false });
  });

  it("doet niets voor een run onder de eerste toestemmingstekst", async () => {
    const fake = db({}, "2026-10-14");
    expect(await fill(fake)).toEqual({ measured: 0, empty: 0, checked: 0 });
    expect(mocks.activities).not.toHaveBeenCalled();
    expect(mocks.streams).not.toHaveBeenCalled();
  });

  it("haalt hooguit drie ritten per keer op", async () => {
    mocks.activities.mockResolvedValue(
      ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-14", "2026-10-13"].map((day, i) =>
        activity(`r${i}`, day),
      ),
    );
    const fake = db();
    await fill(fake);
    expect(mocks.streams).toHaveBeenCalledTimes(3);
    expect(fake.tables.member_protocol_core_sessions).toHaveLength(3);
    // De nieuwste dagen eerst.
    expect(fake.tables.member_protocol_core_sessions.map((row) => row.day)).toEqual([
      "2026-10-14",
      "2026-10-14",
      "2026-10-13",
    ]);
  });

  it("meet ook een rit van een oudere Wahoo", async () => {
    const streams = ride(3600, 40 * 60);
    mocks.streams.mockResolvedValue([streams[0], { type: "thb", data: streams[2].data }]);
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 1, empty: 0, checked: 1 });
  });

  it("probeert het de volgende keer opnieuw als ophalen mislukt", async () => {
    mocks.streams.mockRejectedValue(new Error("intervals.icu 500"));
    const fake = db();
    expect(await fill(fake)).toEqual({ measured: 0, empty: 0, checked: 0 });
    expect(fake.tables.member_protocol_core_sessions).toEqual([]);
  });
});
