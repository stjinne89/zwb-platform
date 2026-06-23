import { weekStartDate } from "@/lib/strava/client";

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

type CsvRecord = {
  values: Record<string, string>;
  normalized: Map<string, string[]>;
};

const ID_ALIASES = ["activity id", "activityid", "id"];
const DATE_ALIASES = ["activity date", "start date", "date"];
const NAME_ALIASES = ["activity name", "name", "title"];
const TYPE_ALIASES = ["activity type", "sport type", "type"];
const DISTANCE_ALIASES = ["distance", "distance km", "distance kilometers"];
const ELEVATION_ALIASES = [
  "elevation gain",
  "total elevation gain",
  "elev gain",
  "elevation",
];
const MOVING_TIME_ALIASES = ["moving time", "movingtime"];
const ELAPSED_TIME_ALIASES = ["elapsed time", "elapsedtime"];
const COMMUTE_ALIASES = ["commute"];
const GEAR_ALIASES = ["activity gear", "gear", "bike"];
const FILENAME_ALIASES = ["filename", "file name"];

function normalizeHeader(value: string) {
  return value
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
    const record: CsvRecord = { values: {}, normalized: new Map() };
    headers.forEach((header, index) => {
      const value = values[index]?.trim() ?? "";
      record.values[header] = value;
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
  return /^(1|true|yes|y|ja|waar)$/i.test(value.trim());
}

function parseDurationSeconds(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);

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

function isCyclingType(value: string) {
  return /ride|cycling|bike|bicycle|gravel|mtb/i.test(value);
}

function sportType(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("virtual")) return "VirtualRide";
  if (normalized.includes("gravel")) return "GravelRide";
  if (normalized.includes("mountain") || normalized.includes("mtb")) {
    return "MountainBikeRide";
  }
  if (normalized.includes("e-bike") || normalized.includes("ebike")) {
    return "EBikeRide";
  }
  return "Ride";
}

function parseDate(value: string): Date | null {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const match = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
  if (!match) return null;
  const [, d, m, y, rest] = match;
  const fallback = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}${rest}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
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

function activityId(record: CsvRecord, profileId: string) {
  const rawId = field(record, ID_ALIASES);
  if (/^\d+$/.test(rawId)) return rawId;

  const key = [
    profileId,
    field(record, DATE_ALIASES),
    field(record, NAME_ALIASES),
    field(record, DISTANCE_ALIASES),
  ].join("|");
  return -hashDigits(key);
}

export function syntheticAthleteId(profileId: string) {
  return -hashDigits(profileId);
}

export function stravaActivitiesFromCsv(
  text: string,
  profileId: string,
  athleteId: number | string = syntheticAthleteId(profileId),
): StravaCsvImportResult {
  const records = parseCsv(text);
  const rows: ImportedStravaActivity[] = [];
  let skippedRows = 0;
  let skippedNonCycling = 0;
  const syncedAt = new Date().toISOString();

  for (const record of records) {
    const type = field(record, TYPE_ALIASES);
    if (!isCyclingType(type)) {
      skippedNonCycling++;
      continue;
    }

    const start = parseDate(field(record, DATE_ALIASES));
    if (!start) {
      skippedRows++;
      continue;
    }

    const distanceM = Math.round(parseNumber(field(record, DISTANCE_ALIASES)) * 1000);
    const movingTime = parseDurationSeconds(field(record, MOVING_TIME_ALIASES));
    const elapsedTime =
      parseDurationSeconds(field(record, ELAPSED_TIME_ALIASES)) || movingTime;
    const name = field(record, NAME_ALIASES) || "Strava activiteit";
    const mappedSportType = sportType(type);

    rows.push({
      id: activityId(record, profileId),
      profile_id: profileId,
      strava_athlete_id: athleteId,
      name,
      sport_type: mappedSportType,
      start_date: start.toISOString(),
      achievement_week: dateOnly(weekStartDate(start)),
      distance_m: distanceM,
      total_elevation_gain_m: Math.round(
        parseNumber(field(record, ELEVATION_ALIASES)),
      ),
      kudos_count: 0,
      moving_time_seconds: movingTime,
      elapsed_time_seconds: elapsedTime,
      trainer: mappedSportType === "VirtualRide" || /indoor/i.test(type),
      commute: parseBoolean(field(record, COMMUTE_ALIASES)),
      raw: {
        import_source: "strava_csv",
        name,
        sport_type: mappedSportType,
        type: mappedSportType,
        start_date_local: start.toISOString(),
        source_activity_id: field(record, ID_ALIASES) || null,
        gear: field(record, GEAR_ALIASES) || null,
        filename: field(record, FILENAME_ALIASES) || null,
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
