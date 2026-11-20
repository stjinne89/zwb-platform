import { describe, expect, it } from "vitest";
import { OVERLAY_SIZES, overlayScale, overlaySize, zwiftWindowFor } from "@/lib/youtube-live/overlay-size";

// De resolutie van de OBS-overlay per stream (0348).

describe("overlaySize", () => {
  it("kent vijf 16:9-formaten en valt anders terug op 1920x1080", () => {
    expect(OVERLAY_SIZES.map((s) => s.key)).toEqual(["1280x720", "1600x900", "1920x1080", "2560x1440", "3840x2160"]);
    for (const s of OVERLAY_SIZES) expect(s.width * 9).toBe(s.height * 16);
    expect(overlaySize("2560x1440")).toBe("2560x1440");
    expect(overlaySize("3440x1440")).toBe("1920x1080");
    expect(overlaySize(null)).toBe("1920x1080");
  });

  it("schaalt van 1920 breed", () => {
    expect(overlayScale("1920x1080")).toBe(1);
    expect(overlayScale("1280x720")).toBeCloseTo(2 / 3);
    expect(overlayScale("3840x2160")).toBe(2);
  });

  it("zet het Zwift-beeld op dezelfde plek in het kader", () => {
    expect(zwiftWindowFor("1920x1080")).toEqual({ x: 384, y: 216, width: 1536, height: 864 });
    expect(zwiftWindowFor("2560x1440")).toEqual({ x: 512, y: 288, width: 2048, height: 1152 });
    expect(zwiftWindowFor("1280x720")).toEqual({ x: 256, y: 144, width: 1024, height: 576 });
    expect(zwiftWindowFor("1600x900")).toEqual({ x: 320, y: 180, width: 1280, height: 720 });
    expect(zwiftWindowFor("3840x2160")).toEqual({ x: 768, y: 432, width: 3072, height: 1728 });
  });
});
