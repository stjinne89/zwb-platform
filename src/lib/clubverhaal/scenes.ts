// De bouwstenen van een eigen verhaal (0289): een reeks hoofdstukken, elk met
// tekst en een 3D-scène uit vaste keuzes. Het shirt is ook de periode: het
// eerste hoofdstuk bepaalt waar het verhaal op /verhaal staat.

import { z } from "zod";
import { CHAPTER_IDS, chapterById, type ChapterId } from "./chapters";

export const POSES = ["rijden", "juichen", "sprinten", "afzien", "klimmen", "afdalen"] as const;
export type Pose = (typeof POSES)[number];

export const LIGHTS = ["zon", "avond", "grijs"] as const;
export type Light = (typeof LIGHTS)[number];

export const POSE_LABEL: Record<Pose, string> = {
  rijden: "Rijden",
  juichen: "Juichen",
  sprinten: "Sprinten",
  afzien: "Afzien",
  klimmen: "Klimmen",
  afdalen: "Afdalen",
};

export const LIGHT_LABEL: Record<Light, string> = { zon: "Zon", avond: "Avond", grijs: "Grijs" };

export const SCENES_MAX = 8;
export const SCENE_TEXT_MAX = 1500;
export const RIDERS_MAX = 7;

/** Wat de 3D-scène toont: shirt (periode), het poppetje, de groep en het licht. */
export type SceneSpec = { kit: ChapterId; pose: Pose; riders: number; light: Light };

export type Scene = SceneSpec & { text: string };

export class SceneError extends Error {}

/** Een alinea-tekst: niet meer dan één lege regel achter elkaar. */
const paragraphs = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const sceneSchema = z.object({
  kit: z.enum(CHAPTER_IDS),
  pose: z.enum(POSES),
  riders: z.number().int().min(1).max(RIDERS_MAX),
  light: z.enum(LIGHTS),
  text: z.string().max(10000),
});

/** Leest de hoofdstukken uit het formulier. Gooit SceneError met een zin voor het lid. */
export function parseScenes(input: unknown): Scene[] {
  const raw = z.array(sceneSchema).max(SCENES_MAX).parse(input);
  if (raw.length === 0) throw new SceneError("Begin met een eerste hoofdstuk.");
  return raw.map((scene, index) => {
    const text = paragraphs(scene.text);
    if (!text) throw new SceneError(`Schrijf iets bij hoofdstuk ${index + 1}.`);
    if (text.length > SCENE_TEXT_MAX) throw new SceneError(`Hoofdstuk ${index + 1} is hooguit ${SCENE_TEXT_MAX} tekens.`);
    return { ...scene, text };
  });
}

/**
 * Leest opgeslagen hoofdstukken terug; wat niet klopt, valt weg. Zonder
 * hoofdstukken wordt de tekst één hoofdstuk in het shirt van de periode.
 */
export function readScenes(value: unknown, fallback: { chapter: ChapterId; body: string }): Scene[] {
  const parsed = z.array(z.unknown()).safeParse(value);
  const scenes = parsed.success
    ? parsed.data.flatMap((item) => {
        const scene = sceneSchema.safeParse(item);
        return scene.success && scene.data.text.trim() ? [scene.data] : [];
      })
    : [];
  return scenes.length ? scenes.slice(0, SCENES_MAX) : [{ ...defaultSpec(fallback.chapter), text: fallback.body }];
}

/** De tekst van alle hoofdstukken samen: voor de kaart, de zoekfunctie en de export. */
export function scenesBody(scenes: Scene[]): string {
  return scenes.map((scene) => scene.text).join("\n\n");
}

/** Een nieuw hoofdstuk: het shirt en de groep van die periode, gewoon rijden in de zon. */
export function defaultSpec(kit: ChapterId): SceneSpec {
  return { kit, pose: "rijden", riders: Math.min(RIDERS_MAX, chapterById(kit).riders), light: "zon" };
}

/** "Net effe anders · Juichen · 3 renners · Avond" */
export function describeScene(spec: SceneSpec): string {
  const parts = [chapterById(spec.kit).kit.name, POSE_LABEL[spec.pose], spec.riders === 1 ? "solo" : `${spec.riders} renners`];
  if (spec.light !== "zon") parts.push(LIGHT_LABEL[spec.light]);
  return parts.join(" · ");
}

/** Of twee scènes hetzelfde tonen (dan hoeft de 3D-scène niets te doen). */
export function sameSpec(a: SceneSpec, b: SceneSpec): boolean {
  return a.kit === b.kit && a.pose === b.pose && a.riders === b.riders && a.light === b.light;
}
