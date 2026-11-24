import { describe, expect, it } from "vitest";
import {
  canvasFor,
  OVERLAY_SIZES,
  overlayHole,
  overlayLayout,
  overlayScale,
  overlaySize,
  zwiftWindowFor,
} from "@/lib/youtube-live/overlay-size";

// De maat van de OBS-overlay per stream (0348, 0350, 0359): het canvas volgt de
// grootte van het Zwift-beeld.

describe("overlaySize", () => {
  it("kent vijf kadermaten en twee ultrawide, allemaal 16:9, en valt anders terug op 1920x1080", () => {
    expect(OVERLAY_SIZES.map((s) => s.key)).toEqual([
      "1600x900",
      "1920x1080",
      "2400x1350",
      "3200x1800",
      "4800x2700",
      "2560x1440",
      "3440x1935",
    ]);
    for (const s of OVERLAY_SIZES) expect(s.width * 9).toBe(s.height * 16);
    expect(overlaySize("2400x1350")).toBe("2400x1350");
    expect(overlaySize("3440x1935")).toBe("3440x1935");
    expect(overlaySize("3440x1440")).toBe("1920x1080");
    expect(overlaySize(null)).toBe("1920x1080");
  });

  it("schaalt van 1920 breed", () => {
    expect(overlayScale("1920x1080")).toBe(1);
    expect(overlayScale("2400x1350")).toBe(1.25);
    expect(overlayScale("4800x2700")).toBe(2.5);
    expect(overlayScale("3440x1935")).toBeCloseTo(1.7917, 4);
  });

  it("zet het Zwift-beeld bij het kader op ware grootte rechtsonder, het canvas eromheen", () => {
    expect(zwiftWindowFor("1920x1080")).toEqual({ x: 384, y: 216, width: 1536, height: 864 });
    expect(zwiftWindowFor("2400x1350")).toEqual({ x: 480, y: 270, width: 1920, height: 1080 });
    expect(zwiftWindowFor("1600x900")).toEqual({ x: 320, y: 180, width: 1280, height: 720 });
    expect(zwiftWindowFor("3200x1800")).toEqual({ x: 640, y: 360, width: 2560, height: 1440 });
    expect(zwiftWindowFor("4800x2700")).toEqual({ x: 960, y: 540, width: 3840, height: 2160 });
    expect(canvasFor("2400x1350")).toEqual({ width: 2400, height: 1350 });
    for (const s of OVERLAY_SIZES.filter((o) => o.layout === "frame")) {
      const w = zwiftWindowFor(s.key);
      // Precies het gat van het ontwerp: een vijfde links en boven.
      expect(w.x / s.width).toBe(0.2);
      expect(w.y / s.height).toBe(0.2);
      expect(overlayHole(s.key)).toEqual({ top: 216, height: 864 });
    }
  });

  it("zet een ultrawide Zwift-beeld over de volle breedte, met een balk boven en onder", () => {
    expect(overlayLayout("1920x1080")).toBe("frame");
    expect(overlayLayout("3440x1935")).toBe("wide");
    expect(zwiftWindowFor("3440x1935")).toEqual({ x: 0, y: 270, width: 3440, height: 1440 });
    expect(canvasFor("3440x1935")).toEqual({ width: 3440, height: 1935 });
    expect(zwiftWindowFor("2560x1440")).toEqual({ x: 0, y: 200, width: 2560, height: 1080 });
    expect(overlayHole("2560x1440")).toEqual({ top: 150, height: 810 });
    for (const s of OVERLAY_SIZES.filter((o) => o.layout === "wide")) {
      const w = zwiftWindowFor(s.key);
      const hole = overlayHole(s.key);
      expect(w.width).toBe(s.width);
      // Allebei de balken hebben ruimte: boven rond 150, onder minstens 120 in de maat van het ontwerp.
      expect(hole.top).toBeGreaterThanOrEqual(150);
      expect(1080 - hole.top - hole.height).toBeGreaterThanOrEqual(120);
    }
  });
});
