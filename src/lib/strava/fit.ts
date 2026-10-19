// Leest een FIT-bestand: het formaat waarin Zwift, Garmin en Wahoo een rit
// opslaan, en waarin de Strava-export de meeste ritten bewaart (.fit.gz).
//
// Een eigen lezer in plaats van een pakket: we hebben alleen de punten van het
// spoor, vermogen, hartslag en cadans, en de kengetallen van de sessie nodig.
// Al het andere (ronden, ontwikkelaarsvelden) slaan we over aan de hand van de
// veldgroottes uit de definitie, zonder het te ontcijferen.
//
// Puur: geen database, geen zlib. Uitpakken doet de aanroeper.
//
// Er is een tweede, oudere lezer in lib/live/fit-records.ts: die leest alleen
// records met sensorwaarden voor Wahoo's live-pagina, zonder sessie of sport.

/** Seconden in een FIT-tijdstempel tellen vanaf 31 december 1989, UTC. */
const FIT_EPOCH_MS = Date.UTC(1989, 11, 31);
/** Posities staan in "semicircles": 2^31 is 180 graden. */
const SEMICIRCLE_DEG = 180 / 2 ** 31;

const MESSAGE_FILE_ID = 0;
const MESSAGE_SPORT = 12;
const MESSAGE_SESSION = 18;
const MESSAGE_RECORD = 20;
const FIELD_TIMESTAMP = 253;

export const FIT_FILE_TYPE_ACTIVITY = 4;
export const FIT_SPORT_CYCLING = 2;
export const FIT_SPORT_E_BIKING = 21;
export const FIT_SUB_SPORT_MOUNTAIN = 8;
export const FIT_SUB_SPORT_GRAVEL = 46;
export const FIT_SUB_SPORT_VIRTUAL = 58;
export const FIT_MANUFACTURER_ZWIFT = 260;

export type FitPoint = { lat: number; lon: number; ele?: number; timeMs?: number };

export type FitActivity = {
  /** file_id.type; 4 is een activiteit, al het andere een route, workout enz. */
  fileType: number | null;
  manufacturer: number | null;
  sport: number | null;
  subSport: number | null;
  /** Alleen de records met een positie. */
  points: FitPoint[];
  /** Eerste en laatste record, ook zonder positie (GPS zoekt nog, of indoor). */
  firstRecordMs: number | null;
  lastRecordMs: number | null;
  /** De afstand in het laatste record, zoals het toestel die telde. */
  recordDistanceM: number | null;
  session: {
    startMs: number | null;
    elapsedSeconds: number | null;
    timerSeconds: number | null;
    distanceM: number | null;
    ascentM: number | null;
  } | null;
  /** Vermogen, hartslag en cadans; uit de sessie, anders uit de records. */
  effort: FitEffort;
};

export type FitEffort = {
  averageWatts: number | null;
  maxWatts: number | null;
  normalizedWatts: number | null;
  kilojoules: number | null;
  averageHr: number | null;
  maxHr: number | null;
  averageCadence: number | null;
};

/** Een gat tot zo lang tussen twee vermogensmetingen houdt de vorige waarde vast. */
const POWER_HOLD_SECONDS = 10;
const NP_WINDOW_SECONDS = 30;

/**
 * Genormaliseerd vermogen: het voortschrijdend gemiddelde over 30 s, tot de
 * vierde macht, gemiddeld, en daar de vierdemachtswortel van. De metingen komen
 * per seconde terug; een kort gat houdt de vorige waarde vast, een lang gat
 * (pauze) telt niet mee.
 */
export function normalizedPower(samples: Array<{ timeMs: number; watts: number }>): number | null {
  const sorted = [...samples].sort((a, b) => a.timeMs - b.timeMs);
  const perSecond: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    perSecond.push(sorted[i].watts);
    const next = sorted[i + 1];
    if (!next) break;
    const gap = Math.round((next.timeMs - sorted[i].timeMs) / 1000);
    if (gap > 1 && gap <= POWER_HOLD_SECONDS) {
      for (let s = 1; s < gap; s++) perSecond.push(sorted[i].watts);
    }
  }
  if (perSecond.length < NP_WINDOW_SECONDS) return null;
  let windowSum = 0;
  let fourthSum = 0;
  let count = 0;
  for (let i = 0; i < perSecond.length; i++) {
    windowSum += perSecond[i];
    if (i >= NP_WINDOW_SECONDS) windowSum -= perSecond[i - NP_WINDOW_SECONDS];
    if (i >= NP_WINDOW_SECONDS - 1) {
      fourthSum += (windowSum / NP_WINDOW_SECONDS) ** 4;
      count += 1;
    }
  }
  const np = (fourthSum / count) ** 0.25;
  return np > 0 ? Math.round(np) : null;
}

type Field = { num: number; size: number; offset: number };
type Definition = { global: number; littleEndian: boolean; fields: Field[]; size: number };

/** Begint dit bestand als een FIT-bestand? */
export function looksLikeFit(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    bytes[0] >= 12 &&
    bytes[8] === 0x2e && // "."
    bytes[9] === 0x46 && // "F"
    bytes[10] === 0x49 && // "I"
    bytes[11] === 0x54 // "T"
  );
}

/** Null bij een bestand dat geen FIT is of waarvan de inhoud niet klopt. */
export function parseFit(bytes: Uint8Array): FitActivity | null {
  try {
    return decode(bytes);
  } catch {
    return null;
  }
}

function decode(bytes: Uint8Array): FitActivity | null {
  if (!looksLikeFit(bytes)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const activity: FitActivity = {
    fileType: null,
    manufacturer: null,
    sport: null,
    subSport: null,
    points: [],
    firstRecordMs: null,
    lastRecordMs: null,
    recordDistanceM: null,
    session: null,
    effort: emptyEffort(),
  };
  let fallbackSport: { sport: number | null; subSport: number | null } | null = null;
  // Wat de sessie zelf zegt; ontbreekt een waarde, dan rekenen we hem uit de records.
  let sessionEffort: FitEffort | null = null;
  const powerSamples: Array<{ timeMs: number; watts: number }> = [];
  let hrSum = 0;
  let hrCount = 0;
  let hrMax = 0;
  let cadenceSum = 0;
  let cadenceCount = 0;

  /** Eén veld uit een bericht, of null als het ontbreekt of "ongeldig" is. */
  function read(def: Definition, at: number, num: number, signed = false): number | null {
    const field = def.fields.find((f) => f.num === num);
    if (!field) return null;
    const pos = at + field.offset;
    if (field.size === 1) {
      const value = view.getUint8(pos);
      return value === 0xff ? null : value;
    }
    if (field.size === 2) {
      const value = view.getUint16(pos, def.littleEndian);
      return value === 0xffff ? null : value;
    }
    if (field.size === 4) {
      if (signed) {
        const value = view.getInt32(pos, def.littleEndian);
        return value === 0x7fffffff ? null : value;
      }
      const value = view.getUint32(pos, def.littleEndian);
      return value === 0xffffffff ? null : value;
    }
    return null;
  }

  // Een bestand kan uit meerdere aaneengeplakte FIT-bestanden bestaan.
  let offset = 0;
  while (looksLikeFit(bytes.subarray(offset))) {
    const headerSize = bytes[offset];
    const dataSize = view.getUint32(offset + 4, true);
    let pos = offset + headerSize;
    const end = Math.min(pos + dataSize, bytes.length);
    const definitions = new Map<number, Definition>();
    let lastTimestamp = 0;

    while (pos < end) {
      const header = bytes[pos++];
      const compressed = (header & 0x80) !== 0;

      if (!compressed && (header & 0x40) !== 0) {
        // Definitie: welke velden de volgende berichten met dit nummer hebben.
        if (pos + 5 > end) throw new Error("afgekapte definitie");
        const littleEndian = bytes[pos + 1] === 0;
        const global = view.getUint16(pos + 2, littleEndian);
        const fieldCount = bytes[pos + 4];
        pos += 5;
        const fields: Field[] = [];
        let size = 0;
        for (let i = 0; i < fieldCount; i++) {
          fields.push({ num: bytes[pos], size: bytes[pos + 1], offset: size });
          size += bytes[pos + 1];
          pos += 3;
        }
        if ((header & 0x20) !== 0) {
          const developerCount = bytes[pos++];
          for (let i = 0; i < developerCount; i++) {
            size += bytes[pos + 1];
            pos += 3;
          }
        }
        if (pos > end) throw new Error("afgekapte definitie");
        definitions.set(header & 0x0f, { global, littleEndian, fields, size });
        continue;
      }

      const def = definitions.get(compressed ? (header >> 5) & 0x03 : header & 0x0f);
      if (!def) throw new Error("bericht zonder definitie");
      // Een opname die halverwege is afgebroken: wat ervoor staat is bruikbaar.
      if (pos + def.size > end) break;

      let timestamp = read(def, pos, FIELD_TIMESTAMP);
      if (timestamp !== null) {
        lastTimestamp = timestamp;
      } else if (compressed) {
        // Alleen de laatste vijf bits staan in de kop; de rest komt van het
        // vorige volledige tijdstempel.
        const low = header & 0x1f;
        const base = lastTimestamp - (lastTimestamp % 32);
        lastTimestamp = low >= lastTimestamp % 32 ? base + low : base + 32 + low;
        timestamp = lastTimestamp;
      }

      if (def.global === MESSAGE_RECORD) {
        const timeMs = timestamp !== null ? FIT_EPOCH_MS + timestamp * 1000 : undefined;
        if (timeMs !== undefined) {
          activity.firstRecordMs ??= timeMs;
          activity.lastRecordMs = timeMs;
        }
        const distance = read(def, pos, 5);
        if (distance !== null) activity.recordDistanceM = distance / 100;
        const watts = read(def, pos, 7);
        if (watts !== null && timeMs !== undefined) powerSamples.push({ timeMs, watts });
        const heartRate = read(def, pos, 3);
        if (heartRate !== null && heartRate > 0) {
          hrSum += heartRate;
          hrCount += 1;
          hrMax = Math.max(hrMax, heartRate);
        }
        // Cadans 0 is freewheelen; Strava telt die niet mee in het gemiddelde.
        const cadence = read(def, pos, 4);
        if (cadence !== null && cadence > 0) {
          cadenceSum += cadence;
          cadenceCount += 1;
        }
        const lat = read(def, pos, 0, true);
        const lon = read(def, pos, 1, true);
        // Precies 0,0 is een toestel zonder fix, geen plek waar iemand fietst.
        if (lat !== null && lon !== null && !(lat === 0 && lon === 0)) {
          const point: FitPoint = { lat: lat * SEMICIRCLE_DEG, lon: lon * SEMICIRCLE_DEG };
          const altitude = read(def, pos, 78) ?? read(def, pos, 2);
          if (altitude !== null) point.ele = altitude / 5 - 500;
          if (timeMs !== undefined) point.timeMs = timeMs;
          activity.points.push(point);
        }
      } else if (def.global === MESSAGE_SESSION && !activity.session) {
        activity.sport = read(def, pos, 5);
        activity.subSport = read(def, pos, 6);
        const start = read(def, pos, 2);
        const elapsed = read(def, pos, 7);
        const timer = read(def, pos, 8);
        const distance = read(def, pos, 9);
        activity.session = {
          startMs: start !== null ? FIT_EPOCH_MS + start * 1000 : null,
          elapsedSeconds: elapsed !== null ? elapsed / 1000 : null,
          timerSeconds: timer !== null ? timer / 1000 : null,
          distanceM: distance !== null ? distance / 100 : null,
          ascentM: read(def, pos, 22),
        };
        const work = read(def, pos, 48);
        sessionEffort = {
          averageWatts: read(def, pos, 20),
          maxWatts: read(def, pos, 21),
          normalizedWatts: read(def, pos, 34),
          kilojoules: work !== null ? Math.round(work / 1000) : null,
          averageHr: read(def, pos, 16),
          maxHr: read(def, pos, 17),
          averageCadence: read(def, pos, 18),
        };
      } else if (def.global === MESSAGE_SPORT && !fallbackSport) {
        fallbackSport = { sport: read(def, pos, 0), subSport: read(def, pos, 1) };
      } else if (def.global === MESSAGE_FILE_ID && activity.fileType === null) {
        activity.fileType = read(def, pos, 0);
        activity.manufacturer = read(def, pos, 1);
      }

      pos += def.size;
    }

    // Na de data volgt een controlegetal van twee bytes.
    offset = end + 2;
  }

  if (activity.sport === null && fallbackSport) {
    activity.sport = fallbackSport.sport;
    activity.subSport = fallbackSport.subSport;
  }

  // Uit de records, voor wat de sessie niet zegt. Het gemiddelde vermogen telt
  // de nullen mee, net als Zwift en Strava. De arbeid is het gemiddelde maal de
  // rijtijd, zoals Strava de kJ rekent.
  let wattsTotal = 0;
  let wattsMax = 0;
  for (const sample of powerSamples) {
    wattsTotal += sample.watts;
    wattsMax = Math.max(wattsMax, sample.watts);
  }
  const averageWatts = powerSamples.length > 0 ? wattsTotal / powerSamples.length : null;
  const rideSeconds = activity.session?.timerSeconds ?? powerSamples.length;
  const fromRecords: FitEffort = {
    averageWatts: averageWatts !== null ? Math.round(averageWatts) : null,
    maxWatts: wattsMax,
    normalizedWatts: normalizedPower(powerSamples),
    kilojoules: averageWatts !== null ? Math.round((averageWatts * rideSeconds) / 1000) : null,
    averageHr: hrCount > 0 ? Math.round(hrSum / hrCount) : null,
    maxHr: hrMax,
    averageCadence: cadenceCount > 0 ? Math.round(cadenceSum / cadenceCount) : null,
  };
  const effort = emptyEffort();
  for (const key of Object.keys(effort) as Array<keyof FitEffort>) {
    effort[key] = positiveOrNull(sessionEffort?.[key]) ?? positiveOrNull(fromRecords[key]);
  }
  activity.effort = effort;
  return activity;
}

function positiveOrNull(value: number | null | undefined): number | null {
  return value != null && value > 0 ? value : null;
}

function emptyEffort(): FitEffort {
  return {
    averageWatts: null,
    maxWatts: null,
    normalizedWatts: null,
    kilojoules: null,
    averageHr: null,
    maxHr: null,
    averageCadence: null,
  };
}
