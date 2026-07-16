import { weekStartDate } from "@/lib/strava/client";
import { haversineKm } from "@/lib/gpx";

export type ImportedStravaActivity = {
  id: number | string;
  profile_id: string;
  strava_athlete_id: number | string;
  name: string;
  sport_type: string;
  start_date: string;
  achievement_week: string;
  distance_m: number;
  total_elevation_gain_m: number;
  kudos_count: number;
  moving_time_seconds: number;
  elapsed_time_seconds: number;
  trainer: boolean;
  commute: boolean;
  raw: Record<string, unknown>;
  synced_at: string;
};

export type StravaCsvImportResult = {
  rows: ImportedStravaActivity[];
  totalRows: number;
  skippedRows: number;
  skippedNonCycling: number;
};

export type StravaGpxImportResult =
  | { ok: true; row: ImportedStravaActivity }
  | { ok: false; error: string };

type CsvRecord = {
  values: Record<string, string>;
  ordered: string[];
  normalized: Map<string, string[]>;
};

// Strava exporteert activities.csv in de taal van het account. De aliassen
// dekken Engels, Nederlands, Frans en Duits; voor overige talen valt de
// import terug op de vaste kolomvolgorde van de Strava bulk-export.
const ID_ALIASES = [
  "activity id",
  "activityid",
  "id",
  "activiteits-id",
  "id van activiteit",
  "id de l'activité",
  "aktivitäts-id",
];
const DATE_ALIASES = [
  "activity date",
  "start date",
  "date",
  "datum van activiteit",
  "startdatum",
  "datum",
  "date de l'activité",
  "datum der aktivität",
];
const NAME_ALIASES = [
  "activity name",
  "name",
  "title",
  "naam van activiteit",
  "naam",
  "titel",
  "nom de l'activité",
  "name der aktivität",
];
const TYPE_ALIASES = [
  "activity type",
  "sport type",
  "type",
  "activiteitstype",
  "type activiteit",
  "type d'activité",
  "aktivitätstyp",
  "art der aktivität",
];
const DISTANCE_ALIASES = [
  "distance",
  "distance km",
  "distance kilometers",
  "afstand",
  "distanz",
];
const ELEVATION_ALIASES = [
  "elevation gain",
  "total elevation gain",
  "elev gain",
  "elevation",
  "hoogtewinst",
  "hoogteverschil",
  "hoogtetoename",
  "gain d'altitude",
  "dénivelé positif",
  "höhengewinn",
  "positiver höhenunterschied",
];
const MOVING_TIME_ALIASES = [
  "moving time",
  "movingtime",
  "beweegtijd",
  "tijd in beweging",
  "temps de déplacement",
  "bewegungszeit",
  "zeit in bewegung",
];
const ELAPSED_TIME_ALIASES = [
  "elapsed time",
  "elapsedtime",
  "verstreken tijd",
  "totale tijd",
  "temps écoulé",
  "verstrichene zeit",
];
const COMMUTE_ALIASES = [
  "commute",
  "woon-werkverkeer",
  "woon-werk",
  "forens",
  "trajet domicile-travail",
  "arbeitsweg",
  "pendelfahrt",
];
const GEAR_ALIASES = [
  "activity gear",
  "gear",
  "bike",
  "materiaal voor activiteit",
  "uitrusting voor activiteit",
  "matériel pour l'activité",
  "ausrüstung für aktivität",
];
const FILENAME_ALIASES = [
  "filename",
  "file name",
  "bestandsnaam",
  "nom du fichier",
  "dateiname",
];

// Vaste kolomvolgorde van Strava's bulk-export (sinds 2018 stabiel voor de
// eerste kolommen). Alleen gebruikt als geen enkele kolomnaam herkend wordt.
const POSITIONS = {
  id: 0,
  date: 1,
  name: 2,
  type: 3,
  elapsed: 5,
  distance: 6,
  commute: 9,
  gear: 11,
  filename: 12,
  moving: 16,
  elevation: 20,
} as const;

function stripDiacritics(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeader(value: string) {
  return stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function uniqueHeaders(headers: string[]) {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const name = header.trim();
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    return count === 0 ? name : `${name}#${count + 1}`;
  });
}

function delimiterFor(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: firstLine.split(delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ",";
}

export function parseCsv(text: string): CsvRecord[] {
  const delimiter = delimiterFor(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(field);
      field = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (rows.length < 2) return [];

  const headers = uniqueHeaders(rows[0]);
  return rows.slice(1).map((values) => {
    const record: CsvRecord = { values: {}, ordered: [], normalized: new Map() };
    headers.forEach((header, index) => {
      const value = values[index]?.trim() ?? "";
      record.values[header] = value;
      record.ordered.push(value);
      const normalized = normalizeHeader(header.replace(/#\d+$/, ""));
      const current = record.normalized.get(normalized) ?? [];
      current.push(value);
      record.normalized.set(normalized, current);
    });
    return record;
  });
}

function field(record: CsvRecord, aliases: string[]) {
  for (const alias of aliases) {
    const values = record.normalized.get(normalizeHeader(alias)) ?? [];
    const value = values.find((item) => item.trim() !== "");
    if (value) return value.trim();
  }
  return "";
}

function hasHeader(record: CsvRecord, aliases: string[]) {
  return aliases.some((alias) => record.normalized.has(normalizeHeader(alias)));
}

function positionalField(record: CsvRecord, index: number) {
  return record.ordered[index]?.trim() ?? "";
}

function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  let cleaned = trimmed.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  const comma = cleaned.lastIndexOf(",");
  const dot = cleaned.lastIndexOf(".");

  if (comma >= 0 && dot >= 0) {
    cleaned =
      comma > dot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (comma >= 0) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseBoolean(value: string): boolean {
  return /^(1|true|yes|y|ja|waar|oui|vrai)$/i.test(value.trim());
}

function parseDurationSeconds(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) return Math.round(parseNumber(trimmed));

  const timeParts = trimmed.split(":").map((part) => Number.parseInt(part, 10));
  if (timeParts.length >= 2 && timeParts.every((part) => Number.isFinite(part))) {
    return timeParts.reduce((total, part) => total * 60 + part, 0);
  }

  const hours = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:h|uur|u)\b/i);
  const minutes = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:m|min)\b/i);
  const seconds = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:s|sec)\b/i);
  return Math.round(
    parseNumber(hours?.[1] ?? "") * 3600 +
      parseNumber(minutes?.[1] ?? "") * 60 +
      parseNumber(seconds?.[1] ?? ""),
  );
}

// Activiteitstypes staan in de CSV in de accounttaal ("Ride", "Fietsrit",
// "Vélo", "Radfahrt", ...).
function isCyclingType(value: string) {
  return /ride|cycl|bike|gravel|mtb|fiets|wielren|velo|vtt|radfahr|rennrad|bici/i.test(
    stripDiacritics(value),
  );
}

function sportType(value: string) {
  const normalized = stripDiacritics(value.trim().toLowerCase());
  if (normalized.includes("virtu")) return "VirtualRide";
  if (normalized.includes("gravel")) return "GravelRide";
  if (
    normalized.includes("mountain") ||
    normalized.includes("mtb") ||
    normalized.includes("vtt")
  ) {
    return "MountainBikeRide";
  }
  if (/e[- ]?bike|e[- ]?fiets|elektri|electri/.test(normalized)) {
    return "EBikeRide";
  }
  return "Ride";
}

const MONTH_PREFIXES: Record<string, number> = {
  jan: 1,
  feb: 2,
  fev: 2,
  mrt: 3,
  mar: 3,
  maa: 3,
  apr: 4,
  avr: 4,
  mei: 5,
  may: 5,
  mai: 5,
  maj: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  aou: 8,
  sep: 9,
  okt: 10,
  oct: 10,
  nov: 11,
  dec: 12,
  dez: 12,
};

function monthFromName(value: string): number | null {
  const cleaned = stripDiacritics(value.toLowerCase()).replace(/[^a-z]/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("juil")) return 7; // Frans: juil(let) vs jui(n)
  return MONTH_PREFIXES[cleaned.slice(0, 3)] ?? null;
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const numeric = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
  if (numeric) {
    const [, d, m, y, rest] = numeric;
    const fallback = new Date(
      `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}${rest}`,
    );
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }

  // Gelokaliseerde datum met maandnaam: "6 mrt. 2024 14:23:15",
  // "6. März 2024, 14:23" of "6 févr. 2024 14:23:15".
  const named = trimmed.match(
    /^(\d{1,2})\.?\s+([\p{L}.]+)\s+(\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/u,
  );
  if (named) {
    const month = monthFromName(named[2]);
    if (month) {
      const date = new Date(
        Number(named[3]),
        month - 1,
        Number(named[1]),
        Number(named[4] ?? 0),
        Number(named[5] ?? 0),
        Number(named[6] ?? 0),
      );
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  return null;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function hashDigits(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function syntheticAthleteId(profileId: string) {
  return -hashDigits(profileId);
}

type ExtractedRow = {
  id: string;
  date: string;
  name: string;
  type: string;
  distance: string;
  elevation: string;
  moving: string;
  elapsed: string;
  commute: string;
  gear: string;
  filename: string;
};

function extractByAliases(record: CsvRecord): ExtractedRow {
  return {
    id: field(record, ID_ALIASES),
    date: field(record, DATE_ALIASES),
    name: field(record, NAME_ALIASES),
    type: field(record, TYPE_ALIASES),
    distance: field(record, DISTANCE_ALIASES),
    elevation: field(record, ELEVATION_ALIASES),
    moving: field(record, MOVING_TIME_ALIASES),
    elapsed: field(record, ELAPSED_TIME_ALIASES),
    commute: field(record, COMMUTE_ALIASES),
    gear: field(record, GEAR_ALIASES),
    filename: field(record, FILENAME_ALIASES),
  };
}

function extractByPosition(record: CsvRecord): ExtractedRow {
  return {
    id: positionalField(record, POSITIONS.id),
    date: positionalField(record, POSITIONS.date),
    name: positionalField(record, POSITIONS.name),
    type: positionalField(record, POSITIONS.type),
    distance: positionalField(record, POSITIONS.distance),
    elevation: positionalField(record, POSITIONS.elevation),
    moving: positionalField(record, POSITIONS.moving),
    elapsed: positionalField(record, POSITIONS.elapsed),
    commute: positionalField(record, POSITIONS.commute),
    gear: positionalField(record, POSITIONS.gear),
    filename: positionalField(record, POSITIONS.filename),
  };
}

function detectPositionalLayout(records: CsvRecord[]) {
  const first = records[0];
  if (!first) return false;
  if (hasHeader(first, TYPE_ALIASES) || hasHeader(first, DATE_ALIASES)) {
    return false;
  }
  // Ziet dit eruit als een Strava bulk-export in een onbekende taal?
  if (first.ordered.length <= POSITIONS.filename) return false;
  return records
    .slice(0, 5)
    .every((record) => /^\d+$/.test(positionalField(record, POSITIONS.id)));
}

function activityId(extracted: ExtractedRow, profileId: string) {
  if (/^\d+$/.test(extracted.id)) return extracted.id;

  const key = [profileId, extracted.date, extracted.name, extracted.distance].join(
    "|",
  );
  return -hashDigits(key);
}

export function stravaActivitiesFromCsv(
  text: string,
  profileId: string,
  athleteId: number | string = syntheticAthleteId(profileId),
): StravaCsvImportResult {
  const records = parseCsv(text);
  const positional = detectPositionalLayout(records);
  const rows: ImportedStravaActivity[] = [];
  let skippedRows = 0;
  let skippedNonCycling = 0;
  const syncedAt = new Date().toISOString();

  for (const record of records) {
    const extracted = positional
      ? extractByPosition(record)
      : extractByAliases(record);

    if (!isCyclingType(extracted.type)) {
      skippedNonCycling++;
      continue;
    }

    const start = parseDate(extracted.date);
    if (!start) {
      skippedRows++;
      continue;
    }

    const distanceM = Math.round(parseNumber(extracted.distance) * 1000);
    let movingTime = parseDurationSeconds(extracted.moving);
    const elapsedTime = parseDurationSeconds(extracted.elapsed) || movingTime;
    // Bij positionele mapping is de Moving Time-kolom minder zeker: negeer
    // onwaarschijnlijke waarden in plaats van fout te importeren.
    if (positional && (movingTime <= 0 || movingTime > elapsedTime)) {
      movingTime = elapsedTime;
    }
    const name = extracted.name || "Strava activiteit";
    const mappedSportType = sportType(extracted.type);

    rows.push({
      id: activityId(extracted, profileId),
      profile_id: profileId,
      strava_athlete_id: athleteId,
      name,
      sport_type: mappedSportType,
      start_date: start.toISOString(),
      achievement_week: dateOnly(weekStartDate(start)),
      distance_m: distanceM,
      total_elevation_gain_m: Math.round(parseNumber(extracted.elevation)),
      kudos_count: 0,
      moving_time_seconds: movingTime,
      elapsed_time_seconds: elapsedTime,
      trainer: mappedSportType === "VirtualRide" || /indoor/i.test(extracted.type),
      commute: parseBoolean(extracted.commute),
      raw: {
        import_source: "strava_csv",
        name,
        sport_type: mappedSportType,
        type: mappedSportType,
        start_date_local: start.toISOString(),
        source_activity_id: extracted.id || null,
        gear: extracted.gear || null,
        filename: extracted.filename || null,
      },
      synced_at: syncedAt,
    });
  }

  return {
    rows,
    totalRows: records.length,
    skippedRows,
    skippedNonCycling,
  };
}

// --- GPX: één rit importeren (Exporteer GPX op de ritpagina van Strava) ---

type GpxTrackPoint = { lat: number; lon: number; ele?: number; timeMs?: number };

function trackPointsFromGpx(xml: string): GpxTrackPoint[] {
  const re = /<trkpt\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/g;
  const points: GpxTrackPoint[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const inner = m[2] ?? "";
    const latMatch = attrs.match(/lat="([^"]+)"/);
    const lonMatch = attrs.match(/lon="([^"]+)"/);
    if (!latMatch || !lonMatch) continue;
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const point: GpxTrackPoint = { lat, lon };
    const eleMatch = inner.match(/<ele>\s*([^<]+?)\s*<\/ele>/);
    if (eleMatch) {
      const ele = parseFloat(eleMatch[1]);
      if (Number.isFinite(ele)) point.ele = ele;
    }
    const timeMatch = inner.match(/<time>\s*([^<]+?)\s*<\/time>/);
    if (timeMatch) {
      const time = Date.parse(timeMatch[1]);
      if (Number.isFinite(time)) point.timeMs = time;
    }
    points.push(point);
  }
  return points;
}

function gpxTrackTag(xml: string, tag: string): string {
  const trkIndex = xml.search(/<trk[\s>]/);
  const scope = trkIndex >= 0 ? xml.slice(trkIndex) : xml;
  const match = scope.match(new RegExp(`<${tag}>\\s*([\\s\\S]*?)\\s*</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

const NON_CYCLING_GPX = /run|hardloop|jog|course|lauf|walk|wandel|march|hike|hiking|swim|zwem|natation|schwimm|row|roei|ski|skat|voetbal|foot/i;

// Bewegingsonderbrekingen (gaten > 15s tussen trackpunten) tellen niet mee
// als beweegtijd.
const GPX_MOVING_GAP_MS = 15_000;

export function stravaActivityFromGpx(
  xml: string,
  profileId: string,
  athleteId: number | string = syntheticAthleteId(profileId),
): StravaGpxImportResult {
  const points = trackPointsFromGpx(xml);
  if (points.length < 2) {
    return {
      ok: false,
      error: "Geen trackpunten gevonden. Is dit een GPX van een rit?",
    };
  }

  const typeText = gpxTrackTag(xml, "type");
  const isLegacyNumericType = /^\d+$/.test(typeText);
  if (
    typeText &&
    ((isLegacyNumericType && typeText !== "1") ||
      (!isLegacyNumericType &&
        !isCyclingType(typeText) &&
        NON_CYCLING_GPX.test(stripDiacritics(typeText))))
  ) {
    return {
      ok: false,
      error: `Dit GPX-bestand lijkt geen fietsrit (type: ${typeText}).`,
    };
  }

  const timedPoints = points.filter((point) => point.timeMs !== undefined);
  if (timedPoints.length < 2) {
    return {
      ok: false,
      error:
        "Geen tijdstempels in dit GPX-bestand. Exporteer de GPX vanaf de ritpagina op Strava (dus geen route-GPX).",
    };
  }

  const start = new Date(timedPoints[0].timeMs!);
  const elapsedTime = Math.round(
    (timedPoints[timedPoints.length - 1].timeMs! - timedPoints[0].timeMs!) /
      1000,
  );
  if (elapsedTime <= 0) {
    return { ok: false, error: "De tijdstempels in dit GPX-bestand kloppen niet." };
  }

  let distanceKm = 0;
  let elevationGain = 0;
  let movingMs = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const point = points[i];
    distanceKm += haversineKm(prev, point);
    if (
      prev.ele !== undefined &&
      point.ele !== undefined &&
      point.ele > prev.ele
    ) {
      elevationGain += point.ele - prev.ele;
    }
    if (prev.timeMs !== undefined && point.timeMs !== undefined) {
      const delta = point.timeMs - prev.timeMs;
      if (delta > 0 && delta <= GPX_MOVING_GAP_MS) movingMs += delta;
    }
  }

  const distanceM = Math.round(distanceKm * 1000);
  const movingTime = Math.min(Math.round(movingMs / 1000), elapsedTime) || elapsedTime;
  const name = decodeXmlEntities(gpxTrackTag(xml, "name")) || "Strava rit";
  const mappedSportType =
    typeText && !isLegacyNumericType && isCyclingType(typeText)
      ? sportType(typeText)
      : "Ride";
  const startIso = start.toISOString();

  return {
    ok: true,
    row: {
      id: -hashDigits([profileId, startIso, String(distanceM)].join("|")),
      profile_id: profileId,
      strava_athlete_id: athleteId,
      name,
      sport_type: mappedSportType,
      start_date: startIso,
      achievement_week: dateOnly(weekStartDate(start)),
      distance_m: distanceM,
      total_elevation_gain_m: Math.round(elevationGain),
      kudos_count: 0,
      moving_time_seconds: movingTime,
      elapsed_time_seconds: elapsedTime,
      trainer: mappedSportType === "VirtualRide",
      commute: false,
      raw: {
        import_source: "strava_gpx",
        name,
        sport_type: mappedSportType,
        type: mappedSportType,
        start_date_local: startIso,
        source_activity_id: null,
        gear: null,
        filename: null,
      },
      synced_at: new Date().toISOString(),
    },
  };
}
