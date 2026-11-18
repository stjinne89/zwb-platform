import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE } from "@/lib/club-theme";
import { overlayColors, overlayColorVars } from "@/lib/youtube-live/overlay-theme";

// De kleuren van de OBS-overlay (0341): de nachtversie van de huisstijl.

describe("overlayColors", () => {
  it("geeft zonder eigen kleuren de handmatige ZWB-nachtwaarden", () => {
    const colors = overlayColors(null);
    expect(colors.head).toBe("#00505f");
    expect(colors.paper).toBe("#f5f6f0");
    expect(colors.gold).toBe("oklch(0.72 0.08 80)");
  });

  it("leidt eigen kleuren af zoals de rest van de app, met een doorzichtige ondergrond", () => {
    const colors = overlayColors({ ...DEFAULT_PALETTE, primary: "#7a1f2b", accent: "#d4a017" });
    expect(colors.ground).toMatch(/^rgb\(\d+ \d+ \d+ \/ 0\.92\)$/);
    expect(colors.head).toMatch(/^#[0-9a-f]{6}$/i);
    expect(colors.head).not.toBe("#00505f");
    expect(colors.ink).toBe(DEFAULT_PALETTE.ink);
  });

  it("zet alle kleuren als CSS-variabelen", () => {
    const vars = overlayColorVars(overlayColors(null));
    expect(Object.keys(vars)).toHaveLength(9);
    expect(Object.keys(vars).every((key) => key.startsWith("--ov-"))).toBe(true);
  });
});
