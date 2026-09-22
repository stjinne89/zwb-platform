// Decoder voor Zwifts segmentresultaten (`/api/segment-results`, protobuf).
//
// Zwift geeft per segment de passages van iedereen in een tijdvenster, niet alleen
// van renners in de buurt. Dat maakt de live ZRL-puntentelling mogelijk (FAL en
// FTS voor de hele divisie). Gemeten 2026-09-22 via Sauce for Zwift, zie
// docs/live-zrl-dashboard.md.
//
// Bewust zonder protobuf-dependency: we hebben één bericht met een handvol
// velden nodig. De veldnummers komen uit `SegmentResult` in Sauce' zwift.proto
// (src/zwift.proto, main, gelezen 2026-09-22); `describeProtobuf` toont de ruwe
// velden, zodat de indeling op productie te controleren is (diagnose op
// /beheer/event-scan).

/** Zwift-wereldtijd telt in ms vanaf dit moment (Unix-ms). */
export const ZWIFT_WORLD_TIME_EPOCH_MS = 1_414_016_074_400;

export type SegmentResult = {
  id: string;
  athleteId: number;
  segmentId: string;
  eventSubgroupId: number | null;
  firstName: string;
  lastName: string;
  worldTime: number;
  /** Unix-ms van de passage (einde segment). */
  ts: number;
  /** Tijd over het segment in seconden. */
  elapsed: number;
  avgPower: number | null;
  weightKg: number | null;
};

type Field = { wire: number; varint?: bigint; bytes?: Uint8Array };
type Message = Map<number, Field[]>;

function readVarint(buf: Uint8Array, pos: number): [bigint, number] {
  let result = BigInt(0);
  let shift = BigInt(0);
  for (;;) {
    if (pos >= buf.length) throw new Error("Protobuf: varint loopt over het einde.");
    const byte = buf[pos++];
    result |= BigInt(byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += BigInt(7);
    if (shift > BigInt(70)) throw new Error("Protobuf: varint te lang.");
  }
}

export function parseMessage(buf: Uint8Array): Message {
  const fields: Message = new Map();
  let pos = 0;
  while (pos < buf.length) {
    const [key, afterKey] = readVarint(buf, pos);
    pos = afterKey;
    const fieldNo = Number(key >> BigInt(3));
    const wire = Number(key & BigInt(7));
    let field: Field;
    if (wire === 0) {
      const [value, next] = readVarint(buf, pos);
      pos = next;
      field = { wire, varint: value };
    } else if (wire === 2) {
      const [len, next] = readVarint(buf, pos);
      const end = next + Number(len);
      if (end > buf.length) throw new Error("Protobuf: veld loopt over het einde.");
      field = { wire, bytes: buf.subarray(next, end) };
      pos = end;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (pos + size > buf.length) throw new Error("Protobuf: veld loopt over het einde.");
      field = { wire, bytes: buf.subarray(pos, pos + size) };
      pos += size;
    } else {
      throw new Error(`Protobuf: onbekend wiretype ${wire}.`);
    }
    const list = fields.get(fieldNo) ?? [];
    list.push(field);
    fields.set(fieldNo, list);
  }
  return fields;
}

const text = new TextDecoder();

function num(msg: Message, no: number): number | null {
  const value = msg.get(no)?.[0]?.varint;
  return value === undefined ? null : Number(value);
}

function str(msg: Message, no: number): string {
  const bytes = msg.get(no)?.[0]?.bytes;
  return bytes ? text.decode(bytes) : "";
}

export function decodeSegmentResult(buf: Uint8Array): SegmentResult {
  const msg = parseMessage(buf);
  // 3 = realm, 4 = worldId, 10 = finishTime (tekst), 12 = powerType.
  const worldTime = num(msg, 9) ?? 0;
  const weightGrams = num(msg, 13);
  return {
    id: String(msg.get(1)?.[0]?.varint ?? ""),
    athleteId: num(msg, 2) ?? 0,
    // uint64 op de lijn; Zwift bedoelt int64 (Tchou Tchou Sprint is negatief).
    segmentId: BigInt.asIntN(64, msg.get(5)?.[0]?.varint ?? BigInt(0)).toString(),
    eventSubgroupId: num(msg, 6) || null,
    firstName: str(msg, 7).trim(),
    lastName: str(msg, 8).trim(),
    worldTime,
    ts: worldTime + ZWIFT_WORLD_TIME_EPOCH_MS,
    elapsed: (num(msg, 11) ?? 0) / 1000,
    avgPower: num(msg, 15),
    weightKg: weightGrams ? weightGrams / 1000 : null,
  };
}

/** `SegmentResults`: veld 4 bevat de herhaalde `SegmentResult`-berichten. */
export function decodeSegmentResults(buf: Uint8Array): SegmentResult[] {
  const msg = parseMessage(buf);
  return (msg.get(4) ?? [])
    .filter((field) => field.wire === 2 && field.bytes)
    .map((field) => decodeSegmentResult(field.bytes as Uint8Array));
}

/** Ruwe velden van een bericht, voor de diagnose. Tekst ingekort. */
export function describeProtobuf(buf: Uint8Array): string[] {
  const lines: string[] = [];
  for (const [no, list] of [...parseMessage(buf)].sort((a, b) => a[0] - b[0])) {
    for (const field of list) {
      if (field.varint !== undefined) lines.push(`${no}: ${field.varint}`);
      else if (field.wire === 2 && field.bytes) {
        const asText = text.decode(field.bytes);
        const printable = /^[\p{L}\p{N}\p{P}\p{S}\p{Zs}]*$/u.test(asText);
        lines.push(`${no}: ${printable ? JSON.stringify(asText.slice(0, 24)) : `${field.bytes.length} bytes`}`);
      } else lines.push(`${no}: vast (${field.bytes?.length ?? 0} bytes)`);
    }
  }
  return lines;
}
