import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { CHAPTERS, CHAPTER_IDS, chapterById, isChapterId } from "@/lib/clubverhaal/chapters";
import { SCENES_MAX, SCENE_TEXT_MAX, defaultSpec, describeScene, readScenes, sameSpec } from "@/lib/clubverhaal/scenes";
import {
  BODY_MAX,
  CAPTION_MAX,
  PHOTOS_MAX,
  StoryError,
  bodyParagraphs,
  canEdit,
  cleanCaption,
  cleanNote,
  excerpt,
  isPhotoPathFor,
  parseStory,
  photoPath,
} from "@/lib/clubverhaal/story";

const STORY = "11111111-1111-4111-8111-111111111111";
const ME = "22222222-2222-4222-8222-222222222222";
const PHOTO = "33333333-3333-4333-8333-333333333333";

const scene = (text: string, extra: Record<string, unknown> = {}) => ({ kit: "anders", pose: "rijden", riders: 2, light: "zon", text, ...extra });
const valid = {
  title: "  De eerste   ZRL-race ",
  scenes: [scene("We stonden met zes man aan de start.\r\n\r\n\r\n\r\nNiemand wist   wat een powerup was.")],
  happenedYear: 2021,
  bekerId: null,
  photos: [],
};

describe("parseStory", () => {
  it("maakt titel en tekst schoon", () => {
    const story = parseStory(valid, 2026);
    expect(story.title).toBe("De eerste ZRL-race");
    expect(story.body).toBe("We stonden met zes man aan de start.\n\nNiemand wist wat een powerup was.");
    expect(story.happenedYear).toBe(2021);
  });

  it("weigert een te korte tekst of titel", () => {
    expect(() => parseStory({ ...valid, title: "Hi" }, 2026)).toThrow(StoryError);
    expect(() => parseStory({ ...valid, scenes: [scene("Kort.")] }, 2026)).toThrow(StoryError);
  });

  it("weigert een te lange tekst, ook over de hoofdstukken samen", () => {
    expect(() => parseStory({ ...valid, scenes: [scene("a".repeat(SCENE_TEXT_MAX + 1))] }, 2026)).toThrow(StoryError);
    const four = Array.from({ length: 4 }, () => scene("a".repeat(SCENE_TEXT_MAX)));
    expect(BODY_MAX).toBeLessThan(4 * SCENE_TEXT_MAX);
    expect(() => parseStory({ ...valid, scenes: four }, 2026)).toThrow(StoryError);
  });

  it("zonder hoofdstuk of met een leeg hoofdstuk gaat het niet", () => {
    expect(() => parseStory({ ...valid, scenes: [] }, 2026)).toThrow(StoryError);
    expect(() => parseStory({ ...valid, scenes: [...valid.scenes, scene("   ")] }, 2026)).toThrow(StoryError);
    const many = Array.from({ length: SCENES_MAX + 1 }, () => scene("Een hoofdstuk."));
    expect(() => parseStory({ ...valid, scenes: many }, 2026)).toThrow(ZodError);
  });

  it("de periode is het shirt van het eerste hoofdstuk; de tekst is alles samen", () => {
    const story = parseStory(
      { ...valid, scenes: [scene("Eerst in het blauw.", { kit: "anders" }), scene("Later in Hage.", { kit: "nu", pose: "juichen" })] },
      2026,
    );
    expect(story.chapter).toBe("anders");
    expect(story.body).toBe("Eerst in het blauw.\n\nLater in Hage.");
    expect(story.scenes[1].pose).toBe("juichen");
  });

  it("kent alleen de vaste keuzes per hoofdstuk", () => {
    const text = "Een verhaal van genoeg tekens.";
    expect(() => parseStory({ ...valid, scenes: [scene(text, { pose: "vallen" })] }, 2026)).toThrow(ZodError);
    expect(() => parseStory({ ...valid, scenes: [scene(text, { riders: 8 })] }, 2026)).toThrow(ZodError);
    expect(() => parseStory({ ...valid, scenes: [scene(text, { kit: "later" })] }, 2026)).toThrow(ZodError);
  });

  it("weigert een jaar in de toekomst of voor 2000", () => {
    expect(() => parseStory({ ...valid, happenedYear: 2027 }, 2026)).toThrow(StoryError);
    expect(() => parseStory({ ...valid, happenedYear: 1999 }, 2026)).toThrow(StoryError);
    expect(parseStory({ ...valid, happenedYear: null }, 2026).happenedYear).toBeNull();
  });

  it("houdt de volgorde van de foto's aan en maakt onderschriften schoon", () => {
    const story = parseStory({ ...valid, photos: [{ id: PHOTO, caption: "  Start  in Watopia " }] }, 2026);
    expect(story.photos).toEqual([{ id: PHOTO, caption: "Start in Watopia" }]);
  });

  it("weigert dezelfde foto twee keer en meer dan zes foto's", () => {
    expect(() => parseStory({ ...valid, photos: [{ id: PHOTO }, { id: PHOTO }] }, 2026)).toThrow(StoryError);
    const many = Array.from({ length: PHOTOS_MAX + 1 }, (_, i) => ({ id: `33333333-3333-4333-8333-33333333333${i}` }));
    expect(() => parseStory({ ...valid, photos: many }, 2026)).toThrow(ZodError);
  });
});

describe("onderschrift en notitie", () => {
  it("leeg wordt null", () => {
    expect(cleanCaption("   ")).toBeNull();
    expect(cleanNote("  \n ")).toBeNull();
  });

  it("weigert een te lang onderschrift", () => {
    expect(() => cleanCaption("a".repeat(CAPTION_MAX + 1))).toThrow(StoryError);
  });
});

describe("rechten en paden", () => {
  it("alleen wie schreef past aan, en niet meer na plaatsen", () => {
    expect(canEdit({ status: "ingestuurd", profileId: ME }, ME)).toBe(true);
    expect(canEdit({ status: "teruggestuurd", profileId: ME }, ME)).toBe(true);
    expect(canEdit({ status: "geplaatst", profileId: ME }, ME)).toBe(false);
    expect(canEdit({ status: "ingestuurd", profileId: STORY }, ME)).toBe(false);
  });

  it("een fotopad hoort bij één verhaal en één uploader", () => {
    const path = photoPath(STORY, ME, 1761600000000);
    expect(isPhotoPathFor(path, STORY, ME)).toBe(true);
    expect(isPhotoPathFor(path, STORY, PHOTO)).toBe(false);
    expect(isPhotoPathFor(`${STORY}/${ME}/../x.jpg`, STORY, ME)).toBe(false);
  });
});

describe("weergave", () => {
  it("knipt een lang verhaal af op een woord", () => {
    const text = "woord ".repeat(80);
    const short = excerpt(text, 50);
    expect(short.endsWith("…")).toBe(true);
    expect(short.length).toBeLessThanOrEqual(51);
    expect(excerpt("Kort verhaal.")).toBe("Kort verhaal.");
  });

  it("splitst de tekst in alinea's", () => {
    expect(bodyParagraphs("Een.\n\nTwee.\n\n")).toEqual(["Een.", "Twee."]);
  });
});

describe("scènes", () => {
  it("leest opgeslagen hoofdstukken terug en laat kapotte weg", () => {
    const scenes = readScenes([scene("Goed."), { kit: "anders", pose: "zweven" }, "rommel"], { chapter: "nu", body: "x" });
    expect(scenes).toHaveLength(1);
    expect(scenes[0].text).toBe("Goed.");
  });

  it("zonder hoofdstukken wordt de tekst één hoofdstuk in het shirt van de periode", () => {
    expect(readScenes([], { chapter: "team", body: "Oud verhaal." })).toEqual([{ ...defaultSpec("team"), text: "Oud verhaal." }]);
    expect(readScenes(null, { chapter: "basis", body: "Ook." })[0].riders).toBe(1);
  });

  it("beschrijft een scène kort", () => {
    expect(describeScene({ kit: "anders", pose: "juichen", riders: 1, light: "avond" })).toBe("Net effe anders · Juichen · solo · Avond");
    expect(describeScene(defaultSpec("nu"))).toBe("Hage · Rijden · 7 renners");
    expect(sameSpec(defaultSpec("nu"), { ...defaultSpec("nu") })).toBe(true);
    expect(sameSpec(defaultSpec("nu"), { ...defaultSpec("nu"), light: "grijs" })).toBe(false);
  });
});

describe("hoofdstukken", () => {
  it("zijn dezelfde als in de check-constraint van 0288", () => {
    expect(CHAPTERS.map((chapter) => chapter.id)).toEqual([...CHAPTER_IDS]);
    expect(CHAPTER_IDS).toEqual(["basis", "anders", "team", "nu"]);
  });

  it("de groep groeit met de club en past in de formatie van de scène", () => {
    const riders = CHAPTERS.map((chapter) => chapter.riders);
    expect(riders).toEqual([...riders].sort((a, b) => a - b));
    expect(Math.max(...riders)).toBeLessThanOrEqual(7);
  });

  it("valt terug op het eerste hoofdstuk", () => {
    expect(isChapterId("team")).toBe(true);
    expect(isChapterId("later")).toBe(false);
    expect(chapterById("later").id).toBe("basis");
  });
});
