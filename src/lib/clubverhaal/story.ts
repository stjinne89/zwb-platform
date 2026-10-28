// Een ingestuurd clubverhaal controleren, zonder database (0288). De
// server-acties gebruiken dit; de tests ook.

import { z } from "zod";
import type { ChapterId } from "./chapters";
import { SceneError, parseScenes, scenesBody, type Scene } from "./scenes";

export const TITLE_MIN = 3;
export const TITLE_MAX = 80;
export const BODY_MIN = 20;
export const BODY_MAX = 5000;
export const CAPTION_MAX = 140;
export const NOTE_MAX = 500;
export const PHOTOS_MAX = 6;
export const EARLIEST_YEAR = 2000;
/** Zoveel inzendingen per lid per uur. */
export const SUBMITS_PER_HOUR = 10;
/** Tot zoveel tekens staat een anekdote helemaal op /verhaal; langer krijgt een eigen pagina. */
export const SHORT_BODY = 420;

export const STATUSES = ["ingestuurd", "geplaatst", "teruggestuurd"] as const;
export type StoryStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<StoryStatus, string> = {
  ingestuurd: "Wacht op het bestuur",
  geplaatst: "Geplaatst",
  teruggestuurd: "Teruggestuurd",
};

const uuid = z.string().uuid();

/** Eén regel: geen enters of dubbele spaties. */
const singleLine = (text: string) => text.replace(/\s+/g, " ").trim();
/** Alinea's mogen, maar niet meer dan één lege regel achter elkaar. */
const paragraphs = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export type StoryInput = {
  /** De periode op /verhaal: het shirt van het eerste hoofdstuk. */
  chapter: ChapterId;
  title: string;
  /** Alle hoofdstukteksten samen (club_stories.body). */
  body: string;
  scenes: Scene[];
  happenedYear: number | null;
  bekerId: string | null;
  /** Bestaande foto's in de gewenste volgorde, met hun onderschrift. */
  photos: Array<{ id: string; caption: string | null }>;
};

export class StoryError extends Error {}

/**
 * Leest wat het formulier instuurt. `year` is het huidige jaar: een verhaal ligt
 * niet in de toekomst. Gooit StoryError met een zin voor het lid, of een ZodError
 * bij iets wat het formulier niet kan sturen.
 */
export function parseStory(input: unknown, year: number): StoryInput {
  const raw = z
    .object({
      title: z.string().max(400),
      scenes: z.unknown(),
      happenedYear: z.number().int().nullish(),
      bekerId: uuid.nullish(),
      photos: z.array(z.object({ id: uuid, caption: z.string().max(1000).nullish() })).max(PHOTOS_MAX).default([]),
    })
    .parse(input);

  const title = singleLine(raw.title);
  if (title.length < TITLE_MIN) throw new StoryError("Geef het verhaal een titel.");
  if (title.length > TITLE_MAX) throw new StoryError(`De titel is hooguit ${TITLE_MAX} tekens.`);

  let scenes: Scene[];
  try {
    scenes = parseScenes(raw.scenes);
  } catch (error) {
    if (error instanceof SceneError) throw new StoryError(error.message);
    throw error;
  }
  const body = scenesBody(scenes);
  if (body.length < BODY_MIN) throw new StoryError("Vertel iets meer.");
  if (body.length > BODY_MAX) throw new StoryError(`Het verhaal is hooguit ${BODY_MAX} tekens.`);

  const happenedYear = raw.happenedYear ?? null;
  if (happenedYear !== null && (happenedYear < EARLIEST_YEAR || happenedYear > year)) {
    throw new StoryError(`Kies een jaar tussen ${EARLIEST_YEAR} en ${year}.`);
  }

  const ids = raw.photos.map((photo) => photo.id);
  if (new Set(ids).size !== ids.length) throw new StoryError("Een foto staat er twee keer in.");

  return {
    chapter: scenes[0].kit,
    title,
    body,
    scenes,
    happenedYear,
    bekerId: raw.bekerId ?? null,
    photos: raw.photos.map((photo) => ({ id: photo.id, caption: cleanCaption(photo.caption ?? null) })),
  };
}

/** Een onderschrift: één regel, leeg wordt null. */
export function cleanCaption(text: string | null): string | null {
  const clean = singleLine(text ?? "");
  if (!clean) return null;
  if (clean.length > CAPTION_MAX) throw new StoryError(`Een onderschrift is hooguit ${CAPTION_MAX} tekens.`);
  return clean;
}

/** Een notitie van het bestuur bij terugsturen: tekst met alinea's. */
export function cleanNote(text: string): string | null {
  const clean = paragraphs(text);
  if (clean.length > NOTE_MAX) throw new StoryError(`Hooguit ${NOTE_MAX} tekens.`);
  return clean || null;
}

/** Wie een verhaal nog mag aanpassen: wie het schreef, zolang het niet geplaatst is. */
export function canEdit(story: { status: StoryStatus; profileId: string | null }, viewerId: string): boolean {
  return story.profileId === viewerId && story.status !== "geplaatst";
}

/** Waar een foto van een verhaal staat: <verhaal>/<uploader>/<tijd>.jpg. */
export function photoPath(storyId: string, uploaderId: string, now: number): string {
  return `${storyId}/${uploaderId}/${now}.jpg`;
}

/** Of een pad bij dit verhaal en deze uploader hoort (en nergens anders heen wijst). */
export function isPhotoPathFor(path: string, storyId: string, uploaderId: string): boolean {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === storyId && parts[1] === uploaderId && /^\d{10,16}\.jpg$/.test(parts[2]);
}

/** De tekst in alinea's, voor de weergave. */
export function bodyParagraphs(body: string): string[] {
  return body.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
}

/** Het begin van een lang verhaal, afgebroken op een woord. */
export function excerpt(body: string, max = 220): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).replace(/[,.;:!?-]+$/, "")}…`;
}
