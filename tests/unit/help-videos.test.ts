import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HELP_VIDEOS, helpVideoDuration, helpVideoHref } from "@/lib/help-videos";

const DIR = join("public", "hulp-video");

describe("hulpvideo's", () => {
  it("heeft voor elke video in de lijst een bestand", () => {
    for (const video of HELP_VIDEOS) {
      expect(existsSync(join("public", helpVideoHref(video.id))), video.id).toBe(true);
    }
  });

  it("heeft geen bestand dat niet in de lijst staat", () => {
    const ids = new Set<string>(HELP_VIDEOS.map((video) => video.id));
    const files = readdirSync(DIR).filter((name) => name.endsWith(".mp4"));
    expect(files.filter((name) => !ids.has(name.replace(/\.mp4$/, "")))).toEqual([]);
  });

  it("schrijft de duur als minuten en seconden", () => {
    expect(helpVideoDuration(17)).toBe("0:17");
    expect(helpVideoDuration(65)).toBe("1:05");
  });
});
