// Een voordracht voor een ZWBeker controleren, zonder database (wens eigenaar,
// 2026-10-28). De server-acties gebruiken dit; de tests ook.

import { z } from "zod";
import { parseDesign, type BekerDesign } from "./design";

export const KINDS = ["individueel", "team"] as const;
export type BekerKind = (typeof KINDS)[number];

export const TITLE_MIN = 3;
export const TITLE_MAX = 60;
export const STORY_MIN = 10;
export const STORY_MAX = 1000;
export const NOTE_MAX = 500;
export const CONGRATS_MAX = 500;
/** Een ploeg is minstens twee renners; meer dan dit is geen ploeg meer maar de club. */
export const TEAM_MAX = 30;
/** Zoveel felicitaties per lid per uur, over alle bekers samen. */
export const CONGRATS_PER_HOUR = 20;
/** Verder terug dan dit hoort een prestatie in het clubarchief, niet hier. */
export const EARLIEST_DAY = "2000-01-01";

export const STATUSES = ["voorgedragen", "toegekend", "afgewezen"] as const;
export type BekerStatus = (typeof STATUSES)[number];

export const KIND_LABEL: Record<BekerKind, string> = { individueel: "Individueel", team: "Team" };
export const STATUS_LABEL: Record<BekerStatus, string> = {
  voorgedragen: "Wacht op het bestuur",
  toegekend: "Toegekend",
  afgewezen: "Teruggestuurd",
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Een ZRL-ronde zoals de beker hem bewaart: "2026/27 R1" (0287). */
export const ZRL_ROUND = /^\d{4}\/\d{2} R[1-4]$/;
const uuid = z.string().uuid();

/** Eén regel: geen enters of dubbele spaties in een titel. */
const singleLine = (text: string) => text.replace(/\s+/g, " ").trim();
/** Een verhaal mag alinea's hebben, maar niet meer dan één lege regel achter elkaar. */
const paragraphs = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export type Nomination = {
  kind: BekerKind;
  title: string;
  story: string;
  achievedOn: string;
  winners: string[];
  teamId: string | null;
  eventId: string | null;
  zrlRound: string | null;
  resultUrl: string | null;
  design: BekerDesign;
};

export class NominationError extends Error {}

/**
 * Leest wat het formulier instuurt. `today` is de datum in Amsterdam ("YYYY-MM-DD"):
 * een prestatie ligt niet in de toekomst. Gooit NominationError met een zin
 * voor het lid, of een ZodError bij iets wat het formulier niet kan sturen.
 */
export function parseNomination(input: unknown, today: string): Nomination {
  const raw = z
    .object({
      kind: z.enum(KINDS),
      title: z.string().max(400),
      story: z.string().max(5000),
      achievedOn: z.string(),
      winners: z.array(uuid).max(200),
      teamId: uuid.nullish(),
      eventId: uuid.nullish(),
      zrlRound: z.string().max(20).nullish(),
      resultUrl: z.string().max(2000).nullish(),
      design: z.unknown(),
    })
    .parse(input);

  const title = singleLine(raw.title);
  if (title.length < TITLE_MIN) throw new NominationError("Geef de beker een titel.");
  if (title.length > TITLE_MAX) throw new NominationError(`De titel is hooguit ${TITLE_MAX} tekens.`);

  const story = paragraphs(raw.story);
  if (story.length < STORY_MIN) throw new NominationError("Vertel kort waarom deze prestatie een beker verdient.");
  if (story.length > STORY_MAX) throw new NominationError(`Het verhaal is hooguit ${STORY_MAX} tekens.`);

  if (!DAY.test(raw.achievedOn) || Number.isNaN(Date.parse(`${raw.achievedOn}T12:00:00Z`))) {
    throw new NominationError("Kies de datum van de prestatie.");
  }
  if (raw.achievedOn > today) throw new NominationError("Die prestatie moet nog geleverd worden.");
  if (raw.achievedOn < EARLIEST_DAY) throw new NominationError("Kies een datum vanaf 2000.");

  const winners = Array.from(new Set(raw.winners));
  const teamId = raw.teamId ?? null;
  if (raw.kind === "individueel") {
    if (winners.length !== 1) throw new NominationError("Kies wie de beker wint.");
    if (teamId) throw new NominationError("Een individuele beker hoort niet bij een team.");
  } else {
    if (!teamId) throw new NominationError("Kies het team.");
    if (winners.length < 2) throw new NominationError("Kies minstens twee renners die meereden.");
    if (winners.length > TEAM_MAX) throw new NominationError(`Hooguit ${TEAM_MAX} renners per teambeker.`);
  }

  const eventId = raw.eventId ?? null;
  const zrlRound = raw.zrlRound?.trim() || null;
  if (zrlRound && !ZRL_ROUND.test(zrlRound)) throw new NominationError("Kies een ZRL-ronde uit de lijst.");
  if (zrlRound && eventId) throw new NominationError("Kies een event of een ZRL-ronde, niet allebei.");

  return {
    kind: raw.kind,
    title,
    story,
    achievedOn: raw.achievedOn,
    winners,
    teamId,
    eventId,
    zrlRound,
    resultUrl: cleanResultUrl(raw.resultUrl ?? null),
    design: parseDesign(raw.design),
  };
}

/**
 * Een link naar de uitslag: alleen https, zonder inloggegevens, hooguit 500 tekens.
 * Leeg wordt null. Gooit NominationError bij iets anders.
 */
export function cleanResultUrl(value: string | null): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new NominationError("Die link naar de uitslag klopt niet.");
  }
  if (url.protocol !== "https:") throw new NominationError("Een link naar de uitslag begint met https://.");
  if (url.username || url.password) throw new NominationError("Die link naar de uitslag klopt niet.");
  const clean = url.toString();
  if (clean.length > 500) throw new NominationError("Die link is te lang.");
  return clean;
}

/** Een notitie van het bestuur bij terugsturen, of een felicitatie: tekst met alinea's. */
export function cleanText(text: string, max: number): string {
  const clean = paragraphs(text);
  if (clean.length > max) throw new NominationError(`Hooguit ${max} tekens.`);
  return clean;
}

/** Wie een voordracht nog mag aanpassen: wie hem deed, zolang hij niet is toegekend. */
export function canEdit(beker: { status: BekerStatus; profileId: string | null }, viewerId: string): boolean {
  return beker.profileId === viewerId && beker.status !== "toegekend";
}

/** Waar de foto van een beker staat: <beker>/<uploader>/<tijd>.jpg. */
export function photoPath(bekerId: string, uploaderId: string, now: number): string {
  return `${bekerId}/${uploaderId}/${now}.jpg`;
}

/** Of een pad bij deze beker en deze uploader hoort (en nergens anders heen wijst). */
export function isPhotoPathFor(path: string, bekerId: string, uploaderId: string): boolean {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === bekerId && parts[1] === uploaderId && /^\d{10,16}\.jpg$/.test(parts[2]);
}

/** "2026/27 R1" uit een ZRL-titel als "ZRL 2026/27 · R1 · W3"; null bij een andere titel. */
export function zrlRoundOf(title: string): string | null {
  const match = /^ZRL (\d{4}\/\d{2}) · R([1-4]) · W\d+/.exec(title);
  return match ? `${match[1]} R${match[2]}` : null;
}

/** "ZRL 2026/27 · ronde 1" */
export function zrlRoundLabel(round: string): string {
  const [season, r] = round.split(" ");
  return `ZRL ${season} · ronde ${r.slice(1)}`;
}

/** Zo lang staat een toegekende beker op het dashboard, gerekend vanaf de dag van de prestatie. */
export const DASHBOARD_DAYS = 7;

/** De eerste dag die nog meetelt: vandaag en de zes dagen ervoor ("YYYY-MM-DD"). */
export function recentSince(today: string, days = DASHBOARD_DAYS): string {
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - (days - 1));
  return day.toISOString().slice(0, 10);
}

/** "12 oktober 2026" */
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

/** "Anna, Bram en Cees"; met `max` en meer namen: "Anna, Bram, Cees en 3 anderen". */
export function namesLabel(names: string[], max = Infinity): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length > max) {
    const rest = names.length - max;
    return `${names.slice(0, max).join(", ")} en ${rest === 1 ? "1 ander" : `${rest} anderen`}`;
  }
  return `${names.slice(0, -1).join(", ")} en ${names[names.length - 1]}`;
}
