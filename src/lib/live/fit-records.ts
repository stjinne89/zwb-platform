// Minimale FIT-lezer voor Wahoo's live-pagina.
//
// De pagina zet het spoor van de huidige (of laatste) rit in
// `window.livetrack_fit`: een lijst base64-strings, elk 4 bytes lengte (LE)
// plus een gzip'te, complete FIT-file van een paar seconden. Wij lezen alleen
// record-berichten (global 20): tijd, positie, hoogte, snelheid, afstand,
// vermogen, cadans en hartslag.
// Formaat: FIT SDK, "Flexible and Interoperable Data Transfer Protocol".

import { gunzipSync } from "node:zlib";
import { sensorValue, type LiveSample } from "./external-livetrack";

const FIT_EPOCH_S = 631065600; // 1989-12-31T00:00:00Z
const SEMICIRCLE_TO_DEG = 180 / 2 ** 31;
const RECORD_MSG = 20;

type FieldDef = { num: number; size: number };
type Definition = { global: number; littleEndian: boolean; fields: FieldDef[]; devSize: number };

function readUint(view: DataView, offset: number, size: number, le: boolean): number | null {
  if (size === 1) return view.getUint8(offset);
  if (size === 2) return view.getUint16(offset, le);
  if (size === 4) return view.getUint32(offset, le);
  return null;
}

/** Records uit één FIT-file. Ongeldige of afgekapte data geeft wat er tot dan was. */
export function parseFitRecords(buf: Uint8Array): LiveSample[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const points: LiveSample[] = [];
  if (buf.length < 12) return points;
  const headerSize = buf[0];
  const dataSize = view.getUint32(4, true);
  if (String.fromCharCode(buf[8], buf[9], buf[10], buf[11]) !== ".FIT") return points;

  const end = Math.min(buf.length, headerSize + dataSize);
  const defs = new Map<number, Definition>();
  let lastTimestamp: number | null = null;
  let pos = headerSize;

  try {
    while (pos < end) {
      const header = buf[pos++];
      let local: number;
      let compressedOffset: number | null = null;

      if (header & 0x80) {
        local = (header >> 5) & 0x03;
        compressedOffset = header & 0x1f;
      } else if (header & 0x40) {
        local = header & 0x0f;
        const hasDev = (header & 0x20) !== 0;
        const littleEndian = buf[pos + 1] === 0;
        const global = view.getUint16(pos + 2, littleEndian);
        const count = buf[pos + 4];
        pos += 5;
        const fields: FieldDef[] = [];
        for (let i = 0; i < count; i++) {
          fields.push({ num: buf[pos], size: buf[pos + 1] });
          pos += 3;
        }
        let devSize = 0;
        if (hasDev) {
          const devCount = buf[pos++];
          for (let i = 0; i < devCount; i++) {
            devSize += buf[pos + 1];
            pos += 3;
          }
        }
        defs.set(local, { global, littleEndian, fields, devSize });
        continue;
      } else {
        local = header & 0x0f;
      }

      const def = defs.get(local);
      if (!def) break;

      const values = new Map<number, number | null>();
      for (const field of def.fields) {
        values.set(field.num, readUint(view, pos, field.size, def.littleEndian));
        pos += field.size;
      }
      pos += def.devSize;

      let timestamp = values.get(253) ?? null;
      if (timestamp === 0xffffffff) timestamp = null;
      if (timestamp === null && compressedOffset !== null && lastTimestamp !== null) {
        timestamp = (lastTimestamp & ~0x1f) + compressedOffset;
        if (compressedOffset < (lastTimestamp & 0x1f)) timestamp += 0x20;
      }
      if (timestamp !== null) lastTimestamp = timestamp;
      if (def.global !== RECORD_MSG || timestamp === null) continue;

      // Ook records zonder positie tellen: hartslag en vermogen komen elke
      // seconde, een positie minder vaak.
      const rawLat = values.get(0);
      const rawLng = values.get(1);
      let lat: number | null = null;
      let lng: number | null = null;
      if (rawLat != null && rawLng != null && rawLat !== 0x7fffffff && rawLng !== 0x7fffffff) {
        const la = (rawLat | 0) * SEMICIRCLE_TO_DEG;
        const lo = (rawLng | 0) * SEMICIRCLE_TO_DEG;
        if (Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0)) {
          lat = Math.round(la * 1e6) / 1e6;
          lng = Math.round(lo * 1e6) / 1e6;
        }
      }

      const enhancedAlt = values.get(78);
      const alt16 = values.get(2);
      const altitude =
        enhancedAlt != null && enhancedAlt !== 0xffffffff
          ? enhancedAlt / 5 - 500
          : alt16 != null && alt16 !== 0xffff
            ? alt16 / 5 - 500
            : null;
      const enhancedSpeed = values.get(73);
      const speed16 = values.get(6);
      const speedMs =
        enhancedSpeed != null && enhancedSpeed !== 0xffffffff
          ? enhancedSpeed / 1000
          : speed16 != null && speed16 !== 0xffff
            ? speed16 / 1000
            : null;

      const valid = (num: number, invalid: number) => {
        const v = values.get(num);
        return v == null || v === invalid ? null : v;
      };
      const distance = valid(5, 0xffffffff);

      points.push({
        lat,
        lng,
        altitude: altitude === null ? null : Math.round(altitude * 100) / 100,
        speedKmh: speedMs === null ? null : Math.min(9999, Math.round(speedMs * 36) / 10),
        recordedAt: new Date((timestamp + FIT_EPOCH_S) * 1000).toISOString(),
        powerW: sensorValue(valid(7, 0xffff), 0, 3000),
        cadenceRpm: sensorValue(valid(4, 0xff), 0, 254),
        heartRate: sensorValue(valid(3, 0xff), 20, 254),
        distanceM: distance === null ? null : sensorValue(distance / 100, 0, 10_000_000),
      });
    }
  } catch {
    // Afgekapte file: houd wat er al gelezen is.
  }
  return points;
}

/** Eén `livetrack_fit`-chunk: 4 bytes lengte, dan gzip. */
export function decodeWahooFitChunk(chunk: string): LiveSample[] {
  try {
    const raw = Buffer.from(chunk, "base64");
    return parseFitRecords(new Uint8Array(gunzipSync(raw.subarray(4))));
  } catch {
    return [];
  }
}

/** Alle metingen uit de `window.livetrack_fit`-lijst van een Wahoo-pagina, oplopend. */
export function wahooPagePoints(html: string): LiveSample[] {
  const match = html.match(/window\.livetrack_fit\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  let chunks: unknown;
  try {
    chunks = JSON.parse(match[1]);
  } catch {
    return [];
  }
  if (!Array.isArray(chunks)) return [];
  const byTime = new Map<string, LiveSample>();
  for (const chunk of chunks) {
    if (typeof chunk !== "string") continue;
    for (const point of decodeWahooFitChunk(chunk)) byTime.set(point.recordedAt, point);
  }
  return [...byTime.values()].sort(
    (a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt),
  );
}
