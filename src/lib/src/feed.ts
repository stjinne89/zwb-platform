// Leest de Sunday Race Club uit de agenda-feed van MyWhoosh (migr. 0200).
//
// De feed (GET https://event.mywhoosh.com/whoosh/events) is openbaar maar niet
// gedocumenteerd. Alle tijden erin staan in GMT+4, de tijd van MyWhoosh in Abu
// Dhabi, zonder zomertijd: de herenrace van cat 6 staat er als "01:45 PM", en
// start om 09:45 GMT, zoals het roadbook zegt. De inschrijving sluit er om
// "07:00", dus donderdag 03:00 GMT.
//
// Puur: geen netwerk, geen database. De import zet het resultaat in de kalender.

export const SRC_EVENTS_FEED_URL = "https://event.mywhoosh.com/whoosh/events";
export const SRC_INFO_URL = "https://mywhoosh.com/sunday-race-club/";

/** Offset van de tijden in de feed. */
const FEED_OFFSET = "+04:00";

export type SrcFeedCategory = {
  time?: string | null;
  distance?: number | string | null;
  elevation?: number | string | null;
};

export type SrcFeedRow = {
  id?: string | null;
  name?: string | null;
  gender?: number | null;
  date?: string | null;
  time?: string | null;
  closing_date?: string | null;
  closing_time?: string | null;
  categories?: Record<string, SrcFeedCategory[] | null> | unknown[] | null;
  category_pre_weight?: string[] | null;
  pre_weight?: boolean | null;
  pre_weight_start_datetime_epoc?: number | null;
  pre_weight_closing_datetime_epoc?: number | null;
  course_details?: string | null;
  distance?: string | null;
  elevation?: string | null;
  participants?: { capacity?: number | null; booked?: number | null } | null;
};

export type SrcGender = "men" | "women";

export type SrcRace = {
  mywhooshEventId: string;
  /** De zondag, YYYY-MM-DD. */
  sunday: string;
  gender: SrcGender;
  /** Kwalificatie 1..4; null bij de finale. */
  round: number | null;
  isFinal: boolean;
  /** Vroegste start (de laagste categorie begint eerst). */
  startAt: string;
  /** Categorie → starttijd in UTC. */
  categoryStarts: Record<string, string>;
  registrationClosesAt: string | null;
  preWeightCategories: number[];
  preWeightOpensAt: string | null;
  preWeightClosesAt: string | null;
  courseUrl: string | null;
  participants: number | null;
  distanceKm: number | null;
  elevationM: number | null;
  externalUrl: string;
};

export type SrcSunday = {
  sunday: string;
  round: number | null;
  isFinal: boolean;
  races: SrcRace[];
};

const NAME_PATTERN =
  /^sunday race club\s*-\s*(men|women)\s+(?:qualifier(?:\s+race)?\s*(\d+)|(finals?))\b/i;

/** "Sunday Race Club - Men Qualifier Race 1" → heren, kwalificatie 1. */
export function parseSrcName(
  name: string,
): { gender: SrcGender; round: number | null; isFinal: boolean } | null {
  const match = NAME_PATTERN.exec(name.trim());
  if (!match) return null;
  const gender: SrcGender = match[1].toLowerCase() === "men" ? "men" : "women";
  if (match[3]) return { gender, round: null, isFinal: true };
  const round = Number(match[2]);
  if (!Number.isInteger(round) || round < 1 || round > 5) return null;
  return { gender, round, isFinal: false };
}

export function isSrcName(name: string | null | undefined) {
  return /^sunday race club\b/i.test((name ?? "").trim());
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "Sunday, 04th Oct 2026" of "2026-10-01" → "2026-10-04". */
export function parseFeedDate(value: string | null | undefined): string | null {
  const text = (value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return text;
  const match = /(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/i.exec(text);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

/** "01:57:30 PM" of "07:00" → "13:57:30". */
export function parseFeedTime(value: string | null | undefined): string | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?$/i.exec((value ?? "").trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const meridiem = match[4]?.toLowerCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === "am" && hours === 12) hours = 0;
    if (meridiem === "pm" && hours !== 12) hours += 12;
  }
  if (hours > 23 || Number(match[2]) > 59) return null;
  return `${String(hours).padStart(2, "0")}:${match[2]}:${match[3] ?? "00"}`;
}

/** Datum en tijd uit de feed (GMT+4) → ISO in UTC. */
export function feedInstant(date: string | null | undefined, time: string | null | undefined) {
  const day = parseFeedDate(date);
  const clock = parseFeedTime(time);
  if (!day || !clock) return null;
  const ms = Date.parse(`${day}T${clock}${FEED_OFFSET}`);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function epochIso(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

function number(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = /-?\d+(?:\.\d+)?/.exec(String(value ?? ""));
  return match ? Number(match[0]) : null;
}

/** "Category 3" → 3. */
function categoryNumber(label: string) {
  const match = /(\d+)/.exec(label);
  const value = match ? Number(match[1]) : NaN;
  return Number.isInteger(value) && value >= 1 && value <= 9 ? value : null;
}

export function myWhooshEventUrl(id: string) {
  return `https://event.mywhoosh.com/event/detail/${encodeURIComponent(id)}`;
}

/** Eén race uit de feed, of null als het geen (leesbare) SRC-race is. */
export function parseSrcRace(row: SrcFeedRow): SrcRace | null {
  const id = row.id?.trim();
  const name = parseSrcName(row.name ?? "");
  const sunday = parseFeedDate(row.date);
  if (!id || !name || !sunday) return null;

  const categoryStarts: Record<string, string> = {};
  let distanceKm: number | null = null;
  let elevationM: number | null = null;
  if (row.categories && !Array.isArray(row.categories)) {
    for (const [label, entries] of Object.entries(row.categories)) {
      const category = categoryNumber(label);
      const entry = Array.isArray(entries) ? entries[0] : null;
      if (!category || !entry) continue;
      const start = feedInstant(row.date, entry.time);
      if (start) categoryStarts[String(category)] = start;
      distanceKm ??= number(entry.distance);
      elevationM ??= number(entry.elevation);
    }
  }
  const starts = Object.values(categoryStarts).sort();
  const startAt = starts[0] ?? feedInstant(row.date, row.time);
  if (!startAt) return null;

  const preWeightCategories = (row.pre_weight ? row.category_pre_weight ?? [] : [])
    .map(categoryNumber)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  return {
    mywhooshEventId: id,
    sunday,
    gender: name.gender,
    round: name.round,
    isFinal: name.isFinal,
    startAt,
    categoryStarts,
    registrationClosesAt: feedInstant(row.closing_date, row.closing_time),
    preWeightCategories,
    preWeightOpensAt: row.pre_weight ? epochIso(row.pre_weight_start_datetime_epoc) : null,
    preWeightClosesAt: row.pre_weight ? epochIso(row.pre_weight_closing_datetime_epoc) : null,
    courseUrl: row.course_details?.trim() || null,
    participants: number(row.participants?.booked),
    distanceKm: distanceKm ?? number(row.distance),
    elevationM: elevationM ?? number(row.elevation),
    externalUrl: myWhooshEventUrl(id),
  };
}

/** Alle SRC-races uit de feed, per zondag. Andere MyWhoosh-events vallen weg. */
export function groupSrcFeed(rows: SrcFeedRow[]): {
  sundays: SrcSunday[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const bySunday = new Map<string, SrcSunday>();
  for (const row of rows) {
    if (!isSrcName(row.name)) continue;
    const race = parseSrcRace(row);
    if (!race) {
      warnings.push(`Niet gelezen: ${row.name}.`);
      continue;
    }
    const sunday = bySunday.get(race.sunday) ?? {
      sunday: race.sunday,
      round: race.round,
      isFinal: race.isFinal,
      races: [],
    };
    if (sunday.races.some((known) => known.gender === race.gender)) {
      warnings.push(`Dubbele ${genderLabel(race.gender).toLowerCase()}race op ${race.sunday}.`);
      continue;
    }
    sunday.races.push(race);
    bySunday.set(race.sunday, sunday);
  }
  const sundays = [...bySunday.values()].sort((a, b) => a.sunday.localeCompare(b.sunday));
  // Dames eerst: die starten ruim twee uur eerder.
  for (const sunday of sundays) sunday.races.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return { sundays, warnings };
}

export function genderLabel(gender: SrcGender) {
  return gender === "men" ? "Heren" : "Dames";
}

const MONTH_NAME = new Intl.DateTimeFormat("nl-NL", { month: "long", timeZone: "UTC" });

/** "SRC oktober · Kwalificatie 1" of "SRC oktober · Finale". */
export function srcSundayTitle(sunday: Pick<SrcSunday, "sunday" | "round" | "isFinal">) {
  const month = MONTH_NAME.format(new Date(`${sunday.sunday}T12:00:00Z`));
  const round = sunday.isFinal ? "Finale" : `Kwalificatie ${sunday.round}`;
  return `SRC ${month} · ${round}`;
}

export function srcRaceTitle(
  sunday: Pick<SrcSunday, "sunday" | "round" | "isFinal">,
  gender: SrcGender,
) {
  return `${srcSundayTitle(sunday)} · ${genderLabel(gender)}`;
}

/** Door de import gemaakte titels; een met de hand hernoemd event blijft staan. */
export function isGeneratedSrcTitle(title: string) {
  return /^SRC [a-z]+ · (Kwalificatie \d|Finale)( · (Heren|Dames))?$/.test(title);
}
