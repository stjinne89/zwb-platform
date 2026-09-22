import { describe, expect, it } from "vitest";
import {
  ZWIFT_WORLD_TIME_EPOCH_MS,
  decodeSegmentResults,
  describeProtobuf,
} from "@/lib/zwift/segment-results-pb";

function varint(value: bigint): number[] {
  let v = BigInt.asUintN(64, value);
  const out: number[] = [];
  do {
    let byte = Number(v & BigInt(0x7f));
    v >>= BigInt(7);
    if (v) byte |= 0x80;
    out.push(byte);
  } while (v);
  return out;
}

const vField = (no: number, value: number | bigint) => [...varint(BigInt(no << 3)), ...varint(BigInt(value))];
const bField = (no: number, bytes: number[]) => [...varint(BigInt((no << 3) | 2)), ...varint(BigInt(bytes.length)), ...bytes];
const sField = (no: number, value: string) => bField(no, [...new TextEncoder().encode(value)]);

// Waarden uit de meting van 2026-09-22 (Sauce toonde ze gedecodeerd).
const result = [
  ...vField(1, BigInt("2144228805324128288")),
  ...vField(2, 745097),
  ...vField(4, 1059797545),
  ...sField(6, "♡"),
  ...sField(7, "HJ 🐥 [rsk]"),
  ...vField(8, 376059917683),
  ...vField(10, 17235),
  ...vField(12, 67000),
  ...vField(14, 974),
];
const negative = [...vField(2, 3293825), ...vField(4, BigInt("-9223372035804541048")), ...vField(5, 7354711), ...vField(10, 5000)];

describe("decodeSegmentResults", () => {
  const payload = new Uint8Array([...vField(1, 1), ...bField(4, result), ...bField(4, negative)]);

  it("decodeert de velden zoals Sauce ze toonde", () => {
    const [first] = decodeSegmentResults(payload);
    expect(first).toMatchObject({
      id: "2144228805324128288",
      athleteId: 745097,
      segmentId: "1059797545",
      eventSubgroupId: null,
      firstName: "♡",
      lastName: "HJ 🐥 [rsk]",
      elapsed: 17.235,
      avgPower: 974,
      weightKg: 67,
    });
    expect(first.ts).toBe(1790075992083);
    expect(first.ts - first.worldTime).toBe(ZWIFT_WORLD_TIME_EPOCH_MS);
  });

  it("houdt negatieve segment-ID's en de eventsubgroep", () => {
    const [, second] = decodeSegmentResults(payload);
    expect(second.segmentId).toBe("-9223372035804541048");
    expect(second.eventSubgroupId).toBe(7354711);
    expect(second.elapsed).toBe(5);
  });

  it("weigert een afgekapt bericht", () => {
    expect(() => decodeSegmentResults(payload.subarray(0, payload.length - 3))).toThrow(/einde/);
  });

  it("beschrijft ruwe velden voor de diagnose", () => {
    const lines = describeProtobuf(new Uint8Array(result));
    expect(lines).toContain("2: 745097");
    expect(lines).toContain('7: "HJ 🐥 [rsk]"');
  });
});
