import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE } from "@/lib/club-theme";
import { overlayColors, overlayColorVars, plainColors, tenueBands } from "@/lib/youtube-live/overlay-theme";

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
    expect(colors.band4).toBe("rgba(212, 160, 23, 0.34)");
    expect(colors.head).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.head).not.toBe("#00505f");
    expect(colors.ink).toBe(DEFAULT_PALETTE.ink);
  });

  it("zet alle kleuren als CSS-variabelen", () => {
    const vars = overlayColorVars(overlayColors(null));
    expect(Object.keys(vars)).toHaveLength(13);
    expect(Object.keys(vars).every((key) => key.startsWith("--ov-"))).toBe(true);
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
