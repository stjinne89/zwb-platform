import { describe, expect, it } from "vitest";
import { canvasFor, OVERLAY_SIZES, overlayScale, overlaySize, zwiftWindowFor } from "@/lib/youtube-live/overlay-size";

// De maat van de OBS-overlay per stream (0348, 0350): het canvas volgt de
// grootte van het Zwift-beeld.

describe("overlaySize", () => {
  it("kent vijf 16:9-canvassen en valt anders terug op 1920x1080", () => {
    expect(OVERLAY_SIZES.map((s) => s.key)).toEqual(["1600x900", "1920x1080", "2400x1350", "3200x1800", "4800x2700"]);
    for (const s of OVERLAY_SIZES) expect(s.width * 9).toBe(s.height * 16);
    expect(overlaySize("2400x1350")).toBe("2400x1350");
    expect(overlaySize("2560x1440")).toBe("1920x1080");
    expect(overlaySize(null)).toBe("1920x1080");
  });

  it("schaalt van 1920 breed", () => {
    expect(overlayScale("1920x1080")).toBe(1);
    expect(overlayScale("2400x1350")).toBe(1.25);
    expect(overlayScale("4800x2700")).toBe(2.5);
  });

  it("zet het Zwift-beeld op ware grootte rechtsonder, het canvas eromheen", () => {
    expect(zwiftWindowFor("1920x1080")).toEqual({ x: 384, y: 216, width: 1536, height: 864 });
    expect(zwiftWindowFor("2400x1350")).toEqual({ x: 480, y: 270, width: 1920, height: 1080 });
    expect(zwiftWindowFor("1600x900")).toEqual({ x: 320, y: 180, width: 1280, height: 720 });
    expect(zwiftWindowFor("3200x1800")).toEqual({ x: 640, y: 360, width: 2560, height: 1440 });
    expect(zwiftWindowFor("4800x2700")).toEqual({ x: 960, y: 540, width: 3840, height: 2160 });
    expect(canvasFor("2400x1350")).toEqual({ width: 2400, height: 1350 });
    for (const s of OVERLAY_SIZES) {
      const w = zwiftWindowFor(s.key);
      // Precies het gat van het ontwerp: een vijfde links en boven.
      expect(w.x / s.width).toBe(0.2);
      expect(w.y / s.height).toBe(0.2);
    }
  });
});
