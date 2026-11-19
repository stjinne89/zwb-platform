// Puur en zonder serverafhankelijkheden: welke race een stream kan krijgen, en
// de titel en beschrijving van de uitzending op YouTube (livestreams, fase 1).

/** Online races. Een buitenrit streamen hoort hier niet bij. */
export const STREAMABLE_EVENT_TYPES = [
  "zrl",
  "ladder",
  "zwift",
  "flamme_rouge",
  "mywhoosh",
  "omnium",
  "src",
] as const;

const PREPARE_BEFORE_MS = 14 * 24 * 60 * 60 * 1000;
const PREPARE_AFTER_MS = 2 * 60 * 60 * 1000;
/** De uitzending staat iets voor de start gepland: inrijden mag in beeld. */
const SCHEDULE_LEAD_MS = 10 * 60 * 1000;
const SCHEDULE_MIN_AHEAD_MS = 2 * 60 * 1000;
/** Zo lang na de start heet het blok nog "Live", daarna "Terugkijken". */
const LIVE_LABEL_MS = 3 * 60 * 60 * 1000;

export type StreamableEvent = {
  type: string;
  team_id: string | null;
  parent_event_id: string | null;
  start_at: string;
};

/**
 * Kan deze race een stream krijgen? Een raceweek of hoofdevent niet: daar rijdt
 * niemand, de streams horen bij de teamrace eronder.
 */
export function eventTakesStreams(event: StreamableEvent, hasSubEvents: boolean): boolean {
  if (!(STREAMABLE_EVENT_TYPES as readonly string[]).includes(event.type)) return false;
  if (hasSubEvents) return false;
  if (event.type === "zrl" && !event.team_id) return false;
  return true;
}

/** Klaarzetten kan van twee weken voor tot twee uur na de start. */
export function inPrepareWindow(startAt: string, now: Date): boolean {
  const start = Date.parse(startAt);
  if (!Number.isFinite(start)) return false;
  const t = now.getTime();
  return t >= start - PREPARE_BEFORE_MS && t <= start + PREPARE_AFTER_MS;
}

export function scheduledStartFor(startAt: string, now: Date): Date {
  const wanted = Date.parse(startAt) - SCHEDULE_LEAD_MS;
  return new Date(Math.max(wanted, now.getTime() + SCHEDULE_MIN_AHEAD_MS));
}

export function streamsAreLive(startAt: string, now: Date): boolean {
  return now.getTime() <= Date.parse(startAt) + LIVE_LABEL_MS;
}

/** YouTube weigert < en > in titel en beschrijving. */
function clean(text: string): string {
  return text.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function broadcastTitle(input: {
  eventTitle: string;
  clubShortName: string;
  routeName?: string | null;
}): string {
  const parts = [clean(input.eventTitle)];
  const club = clean(input.clubShortName);
  if (club && !parts[0].toLowerCase().includes(club.toLowerCase())) parts.push(club);
  const route = input.routeName ? clean(input.routeName) : "";
  if (route) parts.push(route);
  return clip(parts.filter(Boolean).join(" · "), 100);
}

const START_FORMAT = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

export function broadcastDescription(input: {
  eventTitle: string;
  startAt: string;
  routeName?: string | null;
  laps?: number | null;
  clubName: string;
  liveStandUrl?: string | null;
}): string {
  const lines = [clean(input.eventTitle), `Start: ${START_FORMAT.format(new Date(input.startAt))}`];
  if (input.routeName) {
    const laps = input.laps && input.laps > 1 ? ` (${input.laps} rondes)` : "";
    lines.push(`Route: ${clean(input.routeName)}${laps}`);
  }
  if (input.liveStandUrl) lines.push(`Live stand: ${input.liveStandUrl}`);
  lines.push("", clean(input.clubName));
  return clip(lines.join("\n"), 4500);
}

/** Het soort race, klein boven de titel van thumbnail en overlay. */
const STREAM_TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Club Ladder",
  zwift: "Zwift-race",
  flamme_rouge: "Flamme Rouge",
  mywhoosh: "MyWhoosh",
  src: "Sunday Race Club",
};

export function streamTypeLabel(type: string | null | undefined): string | null {
  return (type && STREAM_TYPE_LABELS[type]) || null;
}

/** De twee ploegen uit de titel van een ladderrace ("Club Ladder: thuis – uit"). */
export function ladderMatchup(title: string): { home: string; away: string } | null {
  const match = clean(title).match(/^Club Ladder: (.+?) [–-] (.+)$/);
  return match ? { home: match[1].trim(), away: match[2].trim() } : null;
}

/** De titel in de overlay: bij de ladder "thuis vs uit", het soort staat erboven. */
export function overlayTitle(title: string): string {
  const matchup = ladderMatchup(title);
  return matchup ? `${matchup.home} vs ${matchup.away}` : clean(title);
}

const KM = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

/** Route, rondes en afstand, voor de kolom links in de overlay. */
export function overlayInfo(input: {
  routeName?: string | null;
  laps?: number | null;
  distanceKm?: number | null;
}): string[] {
  const lines: string[] = [];
  if (input.routeName) lines.push(clean(input.routeName));
  const parts: string[] = [];
  if (input.laps && input.laps > 1) parts.push(`${input.laps} rondes`);
  if (input.distanceKm && input.distanceKm > 0) parts.push(`${KM.format(input.distanceKm)} km`);
  if (parts.length > 0) lines.push(parts.join(" · "));
  return lines;
}

/** Aangenomen racetempo voor het einde zonder eindtijd: liever te laat "Afgelopen" dan te vroeg. */
const ASSUMED_KMH = 38;
const FALLBACK_DURATION_MS = 2 * 60 * 60 * 1000;

/** Wanneer de race ongeveer klaar is: de eindtijd, anders een schatting uit de afstand. */
export function expectedRaceEnd(input: {
  startAt: string;
  endAt?: string | null;
  distanceKm?: number | null;
}): Date {
  const start = Date.parse(input.startAt);
  const end = input.endAt ? Date.parse(input.endAt) : NaN;
  if (Number.isFinite(end) && end > start) return new Date(end);
  const km = Number(input.distanceKm);
  const ms = km > 0 ? (km / ASSUMED_KMH) * 60 * 60 * 1000 : FALLBACK_DURATION_MS;
  return new Date(start + ms);
}

/** De kleine regel boven de titel in de overlay, buiten ZRL (zie zrlStatus). */
export function overlayStatus(input: {
  type: string;
  startAt: string;
  endAt?: string | null;
  distanceKm?: number | null;
  now: Date;
}): string {
  const label = streamTypeLabel(input.type);
  if (input.now.getTime() < Date.parse(input.startAt)) return label ? `Begint zo · ${label}` : "Begint zo";
  if (input.now >= expectedRaceEnd(input)) return "Afgelopen";
  return label ? `Live · ${label}` : "Live";
}

/**
 * De tekst op de thumbnail (lib/youtube-live/thumbnail.tsx): soort en wanneer,
 * de titel (bij de ladder de twee ploegen), en route of club. Geen "Live": de
 * thumbnail blijft staan als de stream voorbij is, en YouTube zet zelf een label.
 */
export function thumbnailLines(input: {
  eventTitle: string;
  eventType?: string | null;
  startAt: string;
  routeName?: string | null;
  laps?: number | null;
  clubName: string;
}): { status: string; title: string; matchup: { home: string; away: string } | null; detail: string } {
  const laps = input.laps && input.laps > 1 ? ` · ${input.laps} rondes` : "";
  const label = streamTypeLabel(input.eventType);
  const matchup = ladderMatchup(input.eventTitle);
  return {
    status: [matchup ? "Club Ladder" : label, START_FORMAT.format(new Date(input.startAt))].filter(Boolean).join(" · "),
    title: clip(clean(input.eventTitle), 90),
    matchup: matchup ? { home: clip(matchup.home, 40), away: clip(matchup.away, 40) } : null,
    detail: input.routeName ? `${clean(input.routeName)}${laps}` : clean(input.clubName),
  };
}

const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function isVideoId(value: string): boolean {
  return VIDEO_ID.test(value);
}

/** youtube-nocookie: YouTube zet pas cookies als iemand op afspelen tikt. */
export function streamEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0`;
}

export function streamWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
