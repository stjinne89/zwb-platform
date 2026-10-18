// Decoder voor Zwifts spelersstatus (`/relay/worlds/1/players/{id}`, protobuf).
//
// Eén renner per verzoek, met vermogen, snelheid en afstand in het event. Zwift
// geeft hem aan een gewoon account, 2 à 3 s oud, en staat ongeveer 45 verzoeken
// per minuut per account toe (gemeten 2026-10-17, docs/zwb-ds-spike.md).
//
// Veldnummers uit `PlayerState` in Sauce' src/zwift.proto, omrekeningen uit
// `processPlayerStateMessage` in Sauce' src/zwift.mjs (main, gelezen
// 2026-10-17). Hartslag lezen we bewust niet: ZWB DS toont die van niemand.

import { parseMessage, ZWIFT_WORLD_TIME_EPOCH_MS } from "@/lib/zwift/segment-results-pb";

export type PlayerState = {
  athleteId: number;
  /** Unix-ms van de status volgens Zwift. */
  ts: number | null;
  power: number | null;
  speedKmh: number | null;
  /** Afgelegd in het event, in meters. */
  eventDistanceM: number | null;
  eventSubgroupId: number | null;
  cadenceRpm: number | null;
  /** Draftvoordeel zoals Zwift het geeft; Sauce toont het als watt. */
  draft: number | null;
  /** Geklommen hoogtemeters in deze rit. */
  climbingM: number | null;
  /** Rijtijd in seconden. */
  elapsedS: number | null;
  /** Arbeid in deze rit, kJ. */
  kj: number | null;
};

type Field = ReturnType<typeof parseMessage> extends Map<number, Array<infer F>> ? F : never;

function last(fields: ReturnType<typeof parseMessage>, no: number): Field | undefined {
  const list = fields.get(no);
  return list?.[list.length - 1];
}

function int32(fields: ReturnType<typeof parseMessage>, no: number): number | null {
  const field = last(fields, no);
  return field?.wire === 0 && field.varint !== undefined ? Number(BigInt.asIntN(32, field.varint)) : null;
}

function uint(fields: ReturnType<typeof parseMessage>, no: number): number | null {
  const field = last(fields, no);
  return field?.wire === 0 && field.varint !== undefined ? Number(field.varint) : null;
}

function float32(fields: ReturnType<typeof parseMessage>, no: number): number | null {
  const field = last(fields, no);
  if (field?.wire !== 5 || !field.bytes) return null;
  return new DataView(field.bytes.buffer, field.bytes.byteOffset, 4).getFloat32(0, true);
}

/** Null als het antwoord geen renner bevat. */
export function decodePlayerState(buf: Uint8Array): PlayerState | null {
  const fields = parseMessage(buf);
  const athleteId = int32(fields, 1);
  if (!athleteId) return null;
  const worldTime = uint(fields, 2);
  const speed = int32(fields, 6); // mm/u
  const eventDistance = float32(fields, 34); // cm
  const cadence = int32(fields, 9); // µHz
  const mwHours = int32(fields, 24);
  return {
    athleteId,
    ts: worldTime ? worldTime + ZWIFT_WORLD_TIME_EPOCH_MS : null,
    power: int32(fields, 12),
    speedKmh: speed === null ? null : speed / 1e6,
    eventDistanceM: eventDistance === null ? null : eventDistance / 100,
    eventSubgroupId: int32(fields, 29),
    cadenceRpm: cadence === null ? null : Math.round(cadence * 6e-5),
    draft: int32(fields, 10),
    climbingM: int32(fields, 15),
    elapsedS: int32(fields, 16),
    kj: mwHours === null ? null : mwHours * 0.0036,
  };
}
