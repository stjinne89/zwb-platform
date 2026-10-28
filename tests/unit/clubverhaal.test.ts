import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { CHAPTERS, CHAPTER_IDS, chapterById, isChapterId } from "@/lib/clubverhaal/chapters";
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

const valid = {
  chapter: "anders",
  title: "  De eerste   ZRL-race ",
  body: "We stonden met zes man aan de start.\r\n\r\n\r\n\r\nNiemand wist   wat een powerup was.",
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
    expect(() => parseStory({ ...valid, body: "Kort." }, 2026)).toThrow(StoryError);
  });

  it("weigert een te lange tekst", () => {
    expect(() => parseStory({ ...valid, body: "a".repeat(BODY_MAX + 1) }, 2026)).toThrow(StoryError);
  });

  it("weigert een jaar in de toekomst of voor 2000", () => {
    expect(() => parseStory({ ...valid, happenedYear: 2027 }, 2026)).toThrow(StoryError);
    expect(() => parseStory({ ...valid, happenedYear: 1999 }, 2026)).toThrow(StoryError);
    expect(parseStory({ ...valid, happenedYear: null }, 2026).happenedYear).toBeNull();
  });

  it("kent alleen de vaste hoofdstukken", () => {
    expect(() => parseStory({ ...valid, chapter: "later" }, 2026)).toThrow(ZodError);
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
