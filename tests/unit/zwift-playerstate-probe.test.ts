import { describe, expect, it } from "vitest";
import { decodeDropIn, decodePlayerState, toReading } from "../../scripts/zwift-playerstate-probe.mjs";

// Een PlayerState zoals Zwift hem zou sturen, met de hand opgebouwd: zo is de
// decoder te toetsen zonder Zwift-inloggegevens.

function varint(value: bigint): number[] {
  let v = BigInt.asUintN(64, value);
  const out: number[] = [];
  do {
    let byte = Number(v & BigInt(0x7f));
    v >>= BigInt(7);
    if (v > BigInt(0)) byte |= 0x80;
    out.push(byte);
  } while (v > BigInt(0));
  return out;
}

function int(no: number, value: number | bigint): number[] {
  return [...varint(BigInt(no << 3)), ...varint(BigInt(value))];
}

function float(no: number, value: number): number[] {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return [...varint(BigInt((no << 3) | 5)), ...bytes];
}

const WORLD_TIME = BigInt(380_000_000_000);

const buf = new Uint8Array([
  ...int(1, 123456),
  ...int(2, WORLD_TIME),
  ...int(3, 15_250),
  ...int(6, 41_500_000), // 41,5 km/u in mm/u
  ...int(9, 1_500_000), // 90 rpm in µHz
  ...int(10, 37),
  ...int(11, 158),
  ...int(12, 312),
  ...int(24, 125_000), // mWh
  ...float(25, -1234.5),
  ...int(29, 7354711),
  ...int(33, -4), // negatieve int32: tien bytes varint
  ...float(34, 1_525_000), // cm
  ...int(35, 6),
  ...int(39, 2_627_606_248),
  ...int(99, 1), // onbekend veld
]);

describe("zwift-playerstate-probe", () => {
  it("leest een PlayerState met de veldnummers uit Sauce' zwift.proto", () => {
    const { raw, unknown } = decodePlayerState(buf) as { raw: Record<string, number>; unknown: number[] };
    expect(raw.athleteId).toBe(123456);
    expect(raw.power).toBe(312);
    expect(raw.timeGap).toBe(-4);
    expect(raw.x).toBeCloseTo(-1234.5);
    expect(raw.routeId).toBe(2_627_606_248);
    expect(unknown).toEqual([99]);
  });

  it("rekent om zoals Sauce' processPlayerStateMessage", () => {
    const reading = toReading(decodePlayerState(buf).raw);
    expect(reading).toMatchObject({
      athleteId: 123456,
      ts: 380_000_000_000 + 1_414_016_074_400,
      power: 312,
      heartrate: 158,
      cadence: 90,
      speedKmh: 41.5,
      draft: 37,
      distanceM: 15_250,
      eventDistanceM: 15_250,
      kj: 450,
      eventSubgroupId: 7354711,
      courseId: 6,
      justWatching: false,
    });
  });

  it("geeft een lege status zonder velden", () => {
    expect(decodePlayerState(new Uint8Array()).raw).toEqual({});
    expect(toReading({}).cadence).toBe(0);
  });

  it("leest de drop-in-lijst per wereld, zonder namen", () => {
    const bytes = (no: number, inner: number[]) => [...varint(BigInt((no << 3) | 2)), ...varint(BigInt(inner.length)), ...inner];
    const player = (id: number) => [
      ...int(1, id),
      ...bytes(2, [...new TextEncoder().encode("Naam")]),
      ...int(4, 12_000),
      ...int(18, 280),
      ...int(19, 40_000_000),
      ...float(22, 3.5),
    ];
    const world = [...int(3, 7), ...int(5, 1234), ...bytes(10, player(5)), ...bytes(9, player(6))];
    const [decoded] = decodeDropIn(new Uint8Array(bytes(1, world)));
    expect(decoded.courseId).toBe(7);
    expect(decoded.zwifters).toBe(1234);
    expect(decoded.players).toHaveLength(2);
    expect(decoded.players.find((p: { athleteId: number }) => p.athleteId === 5)).toMatchObject({
      list: "others",
      distanceM: 12_000,
      power: 280,
      speedKmh: 40,
    });
    expect(JSON.stringify(decoded)).not.toContain("Naam");
  });
});
