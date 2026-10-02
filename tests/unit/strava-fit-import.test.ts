import { describe, expect, it } from "vitest";
import polyline from "@mapbox/polyline";
import { looksLikeFit, parseFit } from "@/lib/strava/fit";
import { stravaActivityFromFit } from "@/lib/strava/import";
import { planRideImport } from "@/lib/strava/import-merge";
import { isZwiftRide, zwiftBlocksForRide } from "@/lib/zwblokken/zwift";

const profileId = "11111111-1111-4111-8111-111111111111";

// --- Een klein FIT-bestand opbouwen, veld voor veld ---

type FieldSpec = { num: number; size: 1 | 2 | 4; value: number; signed?: boolean };
type Message = { global: number; fields: FieldSpec[]; developerBytes?: number };

const FIT_EPOCH_S = Date.UTC(1989, 11, 31) / 1000;
const fitTime = (iso: string) => Date.parse(iso) / 1000 - FIT_EPOCH_S;
const semicircles = (degrees: number) => Math.round((degrees * 2 ** 31) / 180);

function buildFit(messages: Message[], options: { bigEndian?: boolean; headerSize?: 12 | 14 } = {}): Uint8Array {
  const littleEndian = !options.bigEndian;
  const headerSize = options.headerSize ?? 14;
  const body: number[] = [];
  const push = (value: number, size: number, signed = false) => {
    const buffer = new DataView(new ArrayBuffer(4));
    if (size === 1) buffer.setUint8(0, value);
    else if (size === 2) buffer.setUint16(0, value, littleEndian);
    else if (signed) buffer.setInt32(0, value, littleEndian);
    else buffer.setUint32(0, value, littleEndian);
    for (let i = 0; i < size; i++) body.push(buffer.getUint8(i));
  };

  // Elk bericht met een eigen definitie ervoor, steeds op lokaal nummer 0: zo
  // test de lezer ook dat een nieuwe definitie de vorige vervangt.
  for (const message of messages) {
    const developer = message.developerBytes ?? 0;
    body.push(developer > 0 ? 0x60 : 0x40, 0, littleEndian ? 0 : 1);
    push(message.global, 2);
    body.push(message.fields.length);
    for (const field of message.fields) body.push(field.num, field.size, 0);
    if (developer > 0) body.push(1, 0, developer, 0);
    body.push(0x00);
    for (const field of message.fields) push(field.value, field.size, field.signed);
    for (let i = 0; i < developer; i++) body.push(0xab);
  }

  const header = new Uint8Array(headerSize);
  const view = new DataView(header.buffer);
  header[0] = headerSize;
  header[1] = 0x20;
  view.setUint32(4, body.length, true);
  header.set([0x2e, 0x46, 0x49, 0x54], 8);
  return new Uint8Array([...header, ...body, 0, 0]);
}

const fileId = (manufacturer: number, type = 4): Message => ({
  global: 0,
  fields: [
    { num: 0, size: 1, value: type },
    { num: 1, size: 2, value: manufacturer },
  ],
});

function record(iso: string, lat: number | null, lon: number | null, distanceM: number, altitudeM = 10): Message {
  return {
    global: 20,
    fields: [
      { num: 253, size: 4, value: fitTime(iso) },
      { num: 0, size: 4, value: lat === null ? 0x7fffffff : semicircles(lat), signed: true },
      { num: 1, size: 4, value: lon === null ? 0x7fffffff : semicircles(lon), signed: true },
      { num: 5, size: 4, value: distanceM * 100 },
      { num: 2, size: 2, value: (altitudeM + 500) * 5 },
      // Vermogen: een veld dat de lezer moet overslaan.
      { num: 7, size: 2, value: 250 },
    ],
  };
}

function session(sport: number, subSport: number, startIso: string, distanceM: number): Message {
  return {
    global: 18,
    fields: [
      { num: 253, size: 4, value: fitTime(startIso) + 3600 },
      { num: 2, size: 4, value: fitTime(startIso) },
      { num: 5, size: 1, value: sport },
      { num: 6, size: 1, value: subSport },
      { num: 7, size: 4, value: 3600 * 1000 },
      { num: 8, size: 4, value: 3500 * 1000 },
      { num: 9, size: 4, value: distanceM * 100 },
      { num: 22, size: 2, value: 420 },
    ],
  };
}

// Watopia ligt in de Salomonzee.
const zwiftRide = buildFit([
  fileId(260),
  record("2026-09-29T18:01:15Z", -11.6366, 166.9726, 0),
  record("2026-09-29T18:01:16Z", -11.6376, 166.9736, 150),
  record("2026-09-29T18:31:16Z", -11.65, 166.96, 20_000),
  record("2026-09-29T19:01:15Z", -11.66, 166.95, 40_200),
  session(2, 58, "2026-09-29T18:01:15Z", 40_200),
]);

describe("parseFit", () => {
  it("herkent een FIT-bestand aan zijn kop", () => {
    expect(looksLikeFit(zwiftRide)).toBe(true);
    expect(looksLikeFit(new TextEncoder().encode("<?xml version='1.0'?><gpx></gpx>"))).toBe(false);
    expect(parseFit(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it("leest punten, sessie en toestel", () => {
    const fit = parseFit(zwiftRide);
    expect(fit).not.toBeNull();
    expect(fit!.manufacturer).toBe(260);
    expect(fit!.sport).toBe(2);
    expect(fit!.subSport).toBe(58);
    expect(fit!.points).toHaveLength(4);
    expect(fit!.points[0].lat).toBeCloseTo(-11.6366, 5);
    expect(fit!.points[0].lon).toBeCloseTo(166.9726, 5);
    expect(fit!.points[0].ele).toBeCloseTo(10, 5);
    expect(fit!.points[0].timeMs).toBe(Date.parse("2026-09-29T18:01:15Z"));
    expect(fit!.session).toEqual({
      startMs: Date.parse("2026-09-29T18:01:15Z"),
      elapsedSeconds: 3600,
      timerSeconds: 3500,
      distanceM: 40_200,
      ascentM: 420,
    });
  });

  it("leest big-endian, een kop van 12 bytes en ontwikkelaarsvelden", () => {
    const messages = [
      fileId(1),
      { ...record("2025-06-01T08:00:00Z", 50.85, 4.35, 0), developerBytes: 3 },
      { ...record("2025-06-01T08:10:00Z", 50.9, 4.4, 6500), developerBytes: 3 },
    ];
    const fit = parseFit(buildFit(messages, { bigEndian: true, headerSize: 12 }));
    expect(fit!.manufacturer).toBe(1);
    expect(fit!.points.map((p) => [Number(p.lat.toFixed(4)), Number(p.lon.toFixed(4))])).toEqual([
      [50.85, 4.35],
      [50.9, 4.4],
    ]);
    expect(fit!.recordDistanceM).toBe(6500);
  });

  it("slaat records zonder positie over maar onthoudt hun tijd", () => {
    const fit = parseFit(
      buildFit([
        fileId(1),
        record("2025-06-01T08:00:00Z", null, null, 0),
        record("2025-06-01T08:00:30Z", 50.85, 4.35, 200),
        record("2025-06-01T08:10:00Z", 50.9, 4.4, 6500),
      ]),
    );
    expect(fit!.points).toHaveLength(2);
    expect(fit!.firstRecordMs).toBe(Date.parse("2025-06-01T08:00:00Z"));
  });

  it("vult een tijd in bij een record met een verkorte kop", () => {
    const base = fitTime("2025-06-01T08:00:00Z");
    const little = (value: number, size: number) =>
      Array.from({ length: size }, (_, i) => Math.floor(value / 256 ** i) % 256);
    const lat = little(semicircles(50.85), 4);
    const lon = little(semicircles(4.35), 4);
    const body = [
      // Lokaal 0: record met tijdstempel. Lokaal 1: record zonder.
      0x40, 0, 0, 20, 0, 3, 253, 4, 0, 0, 4, 0, 1, 4, 0,
      0x41, 0, 0, 20, 0, 2, 0, 4, 0, 1, 4, 0,
      0x00, ...little(base, 4), ...lat, ...lon,
      // Verkorte kop: lokaal 1, vijf seconden na de laatste vijf bits van `base`.
      0x80 | (1 << 5) | ((base % 32) + 5) % 32, ...lat, ...lon,
    ];
    const header = [14, 0x20, 0, 0, ...little(body.length, 4), 0x2e, 0x46, 0x49, 0x54, 0, 0];
    const fit = parseFit(new Uint8Array([...header, ...body, 0, 0]));
    expect(fit!.points).toHaveLength(2);
    expect(fit!.points[1].timeMs).toBe(Date.parse("2025-06-01T08:00:05Z"));
  });

  it("houdt de punten van een opname die halverwege is afgebroken", () => {
    // De sessie aan het eind is doormidden; de vier records ervoor zijn heel.
    const fit = parseFit(zwiftRide.slice(0, zwiftRide.length - 12));
    expect(fit!.points).toHaveLength(4);
    expect(fit!.session).toBeNull();
  });

  it("geeft null bij een bericht zonder definitie", () => {
    // Na de kop meteen een databericht op lokaal nummer 5, dat nooit gedefinieerd is.
    expect(parseFit(new Uint8Array([...zwiftRide.slice(0, 14), 0x05, 1, 2]))).toBeNull();
  });
});

describe("stravaActivityFromFit", () => {
  it("maakt van een Zwift-bestand een VirtualRide met spoor", () => {
    const result = stravaActivityFromFit(zwiftRide, profileId, 42);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { row } = result;
    expect(row.sport_type).toBe("VirtualRide");
    expect(row.trainer).toBe(true);
    expect(row.start_date).toBe("2026-09-29T18:01:15.000Z");
    // De afstand van Zwift zelf, niet nagemeten op de coördinaten.
    expect(row.distance_m).toBe(40_200);
    expect(row.total_elevation_gain_m).toBe(420);
    expect(row.elapsed_time_seconds).toBe(3600);
    expect(row.moving_time_seconds).toBe(3500);
    expect(row.raw.import_source).toBe("strava_fit");
    expect(row.raw.device_name).toBe("Zwift");
    expect(Number(row.id)).toBeLessThan(0);
    expect(row.strava_athlete_id).toBe(42);
    expect(row.efforts_fetched_at).toBe(row.synced_at);
    expect(result.track).toHaveLength(4);
  });

  it("levert een rit op die ZWBlokken als Zwift herkent", () => {
    const result = stravaActivityFromFit(zwiftRide, profileId);
    if (!result.ok) throw new Error(result.error);
    const { row } = result;
    const map = row.raw.map as { summary_polyline: string };
    const points = (polyline.decode(map.summary_polyline) as [number, number][]).map(([lat, lon]) => ({ lat, lon }));
    const ride = zwiftBlocksForRide({
      points,
      name: row.name,
      deviceName: row.raw.device_name as string,
    });
    expect(ride?.world.slug).toBe("watopia");
    expect(ride!.blocks.size).toBeGreaterThan(0);
  });

  it("is deterministisch bij opnieuw uploaden", () => {
    const first = stravaActivityFromFit(zwiftRide, profileId);
    const second = stravaActivityFromFit(zwiftRide, profileId);
    expect(first.ok && second.ok && first.row.id === second.row.id).toBe(true);
  });

  it("rekent zelf als het bestand geen sessie heeft", () => {
    const result = stravaActivityFromFit(
      buildFit([
        fileId(1),
        record("2025-06-01T08:00:00Z", 50.85, 4.35, 0, 10),
        record("2025-06-01T08:00:10Z", 50.86, 4.35, 1100, 25),
      ]),
      profileId,
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.row.sport_type).toBe("Ride");
    expect(result.row.trainer).toBe(false);
    expect(result.row.distance_m).toBe(1100);
    expect(result.row.total_elevation_gain_m).toBe(15);
    expect(result.row.elapsed_time_seconds).toBe(10);
    expect(result.row.raw.device_name).toBeUndefined();
  });

  it("herkent gravel en mountainbike", () => {
    const ride = (subSport: number) =>
      stravaActivityFromFit(
        buildFit([
          fileId(1),
          record("2025-06-01T08:00:00Z", 50.85, 4.35, 0),
          record("2025-06-01T09:00:00Z", 50.9, 4.4, 20_000),
          session(2, subSport, "2025-06-01T08:00:00Z", 20_000),
        ]),
        profileId,
      );
    const gravel = ride(46);
    const mtb = ride(8);
    expect(gravel.ok && gravel.row.sport_type).toBe("GravelRide");
    expect(mtb.ok && mtb.row.sport_type).toBe("MountainBikeRide");
  });

  it("slaat een hardloopje over zonder het een fout te noemen", () => {
    const result = stravaActivityFromFit(
      buildFit([
        fileId(1),
        record("2025-06-01T08:00:00Z", 50.85, 4.35, 0),
        record("2025-06-01T09:00:00Z", 50.9, 4.4, 10_000),
        session(1, 0, "2025-06-01T08:00:00Z", 10_000),
      ]),
      profileId,
    );
    expect(result).toMatchObject({ ok: false, skip: "non_cycling" });
  });

  it("slaat een rit zonder GPS over", () => {
    const result = stravaActivityFromFit(
      buildFit([
        fileId(1),
        record("2025-06-01T08:00:00Z", null, null, 0),
        record("2025-06-01T09:00:00Z", null, null, 30_000),
        session(2, 6, "2025-06-01T08:00:00Z", 30_000),
      ]),
      profileId,
    );
    expect(result).toMatchObject({ ok: false, skip: "no_track" });
  });

  it("weigert een route of workout", () => {
    const result = stravaActivityFromFit(
      buildFit([fileId(1, 6), record("2025-06-01T08:00:00Z", 50.85, 4.35, 0), record("2025-06-01T09:00:00Z", 50.9, 4.4, 10_000)]),
      profileId,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.skip).toBeUndefined();
  });

  it("weigert een onleesbaar bestand", () => {
    expect(stravaActivityFromFit(new Uint8Array(40), profileId).ok).toBe(false);
  });
});

describe("FIT bij een rit uit activities.csv", () => {
  it("vult het spoor aan en geeft het Zwift-toestel mee", () => {
    const result = stravaActivityFromFit(zwiftRide, profileId);
    if (!result.ok) throw new Error(result.error);
    const plan = planRideImport(
      [result.row],
      [
        {
          id: 9001,
          start_date: "2026-09-29T18:01:15.000Z",
          distance_m: 40_187,
          import_source: "strava_csv",
          has_track: false,
        },
      ],
    );
    expect(plan.upsert).toHaveLength(0);
    expect(plan.attach).toHaveLength(1);
    expect(plan.attach[0].id).toBe(9001);
    expect(plan.attach[0].deviceName).toBe("Zwift");
    // Een hernoemde Zwift-rit: de naam verraadt hem niet, het toestel wel.
    expect(isZwiftRide({ name: "Dinsdagtraining", deviceName: plan.attach[0].deviceName })).toBe(true);
  });
});
