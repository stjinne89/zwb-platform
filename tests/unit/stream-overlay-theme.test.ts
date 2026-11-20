import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE } from "@/lib/club-theme";
import { overlayColors, overlayColorVars, overlayMode, plainColors, tenueBands } from "@/lib/youtube-live/overlay-theme";

// De kleuren van de OBS-overlay (0341): de nachtversie van de huisstijl.

describe("overlayColors", () => {
  it("geeft zonder eigen kleuren de handmatige ZWB-nachtwaarden", () => {
    const colors = overlayColors(null);
    expect(colors.head).toBe("#00505f");
    expect(colors.paper).toBe("#f5f6f0");
    expect(colors.gold).toBe("oklch(0.72 0.08 80)");
  });

  it("leidt eigen kleuren af zoals de rest van de app, met een dekkende ondergrond", () => {
    const colors = overlayColors({ ...DEFAULT_PALETTE, primary: "#7a1f2b", accent: "#d4a017" });
    expect(colors.ground).not.toMatch(/\/|rgba/);
    // Het opgelichte goud van de tegel Vandaag, zoals de banen van de app in donker.
    expect(colors.band4).toBe("rgba(225, 173, 46, 0.34)");
    expect(colors.head).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.head).not.toBe("#00505f");
    expect(colors.ink).toBe(DEFAULT_PALETTE.ink);
  });

  it("zet alle kleuren als CSS-variabelen", () => {
    const vars = overlayColorVars(overlayColors(null));
    expect(Object.keys(vars)).toHaveLength(14);
    expect(Object.keys(vars).every((key) => key.startsWith("--ov-"))).toBe(true);
  });
});

describe("overlayColors in licht (0345)", () => {
  it("geeft zonder eigen kleuren de crème en banen van de website", () => {
    const colors = overlayColors(null, "light");
    expect(colors.ground).toBe("oklch(0.965 0.011 103)");
    expect(colors.band1).toBe("rgba(0, 70, 83, 0.1)");
    expect(colors.band4).toBe("rgba(184, 135, 61, 0.26)");
    expect(colors.head).toBe("#004653");
  });

  it("zet goud als tekst op crème in de diepere tint (Goudregel)", () => {
    expect(overlayColors(null, "light").goldText).toBe("rgb(143, 102, 38)");
    const own = overlayColors({ ...DEFAULT_PALETTE, accent: "#d4a017" }, "light");
    expect(own.goldText).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    expect(own.gold).toBe("#d4a017");
  });

  it("valt terug op donker bij een onbekende stand", () => {
    expect(overlayMode("light")).toBe("light");
    expect(overlayMode("paars")).toBe("dark");
    expect(overlayMode(null)).toBe("dark");
  });
});

describe("tenueBands (kader en thumbnail)", () => {
  it("geeft de vier banen van de app in donker, met dubbele stops voor Satori", () => {
    const bands = tenueBands(overlayColors(null));
    expect(bands.match(/linear-gradient/g)).toHaveLength(4);
    expect(bands).toContain("linear-gradient(132deg, transparent 0%, transparent 18%, rgba(31, 96, 104, 0.3) 18%");
    expect(bands).toContain("156deg");
    expect(bands).not.toContain("/");
  });
});

describe("plainColors (thumbnail)", () => {
  it("zet oklch om naar hex en laat hex en rgb staan", () => {
    const colors = plainColors(overlayColors(null));
    expect(colors.gold).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.text).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.head).toBe("#00505f");
    expect(colors.row).toBe("rgb(255 255 255 / 0.055)");
  });

  it("geeft goud een warme kleur, geen grijs", () => {
    const hex = plainColors(overlayColors(null)).gold;
    const [r, , b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b + 30);
  });
});
