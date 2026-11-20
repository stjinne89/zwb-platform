import { describe, expect, it } from "vitest";
import { DEFAULT_PALETTE } from "@/lib/club-theme";
import {
  OVERLAY_STYLES,
  overlayStyle,
  overprint,
  printInks,
  routeFigures,
  styleHasModes,
  tenueInks,
} from "@/lib/youtube-live/overlay-styles";
import { fitTitle, profileAreaPath, profileTopPath } from "@/lib/youtube-live/route-facts";

// De stijlen van overlay en thumbnail per stream (0346).

describe("overlayStyle", () => {
  it("kent vier stijlen en valt anders terug op tegels", () => {
    expect(OVERLAY_STYLES.map((s) => s.key)).toEqual(["tegels", "rugnummer", "zeefdruk", "strip"]);
    expect(overlayStyle("strip")).toBe("strip");
    expect(overlayStyle("kopman")).toBe("tegels");
    expect(overlayStyle(null)).toBe("tegels");
    expect(overlayStyle(["strip"])).toBe("tegels");
  });

  it("heeft donker en licht alleen bij tegels en zeefdruk", () => {
    expect(styleHasModes("tegels")).toBe(true);
    expect(styleHasModes("zeefdruk")).toBe(true);
    expect(styleHasModes("rugnummer")).toBe(false);
    expect(styleHasModes("strip")).toBe(false);
  });
});

describe("inkten", () => {
  it("geeft zonder eigen kleuren de tenuekleuren, als hex", () => {
    const t = tenueInks(null);
    expect(t.petrol).toBe("#004653");
    expect(t.gold).toBe("#c4923f");
    expect(Object.values(t).every((v) => /^#[0-9a-f]{6}$/i.test(v))).toBe(true);
  });

  it("neemt eigen kleuren uit het palet", () => {
    const t = tenueInks({ ...DEFAULT_PALETTE, primary: "#7a1f2b" });
    expect(t.petrol).toBe("#7a1f2b");
    expect(t.gold).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("geeft de inkten van het weekoverzicht per thema, als hex voor Satori", () => {
    const day = printInks("light");
    const night = printInks("dark");
    expect(Object.values(day).every((v) => /^#[0-9a-f]{6}$/i.test(v))).toBe(true);
    expect(day.paper).not.toBe(night.paper);
  });

  it("drukt over elkaar met multiply op licht en screen op donker", () => {
    expect(overprint("#ffffff", "#336699", "light")).toBe("#336699");
    expect(overprint("#000000", "#336699", "dark")).toBe("#336699");
    expect(overprint("#808080", "#808080", "light")).toBe("#404040");
  });
});

describe("routeFigures", () => {
  it("geeft de cijfers los, in het Nederlands", () => {
    const f = routeFigures({ routeName: " BRAEk-fast ", laps: 3, distanceKm: 22.06, elevationM: 261.4, profile: null });
    expect(f).toEqual({ routeName: "BRAEk-fast", km: "22,1", hm: "261", laps: "3 rondes" });
  });

  it("laat weg wat er niet is", () => {
    expect(routeFigures(null)).toEqual({ routeName: null, km: null, hm: null, laps: null });
  });
});

describe("profileTopPath", () => {
  it("is de bovenrand van het vlak, zonder de voet", () => {
    const points = [
      { km: 0, m: 10 },
      { km: 1, m: 50 },
      { km: 2, m: 20 },
    ];
    const area = profileAreaPath(points, 300, 100);
    const top = profileTopPath(points, 300, 100);
    expect(top.startsWith("M0.0,")).toBe(true);
    expect(top).not.toContain("Z");
    expect(area).toContain(top.slice(1));
  });
});

describe("fitTitle met een eigen bereik", () => {
  it("blijft binnen het bereik van de stijl", () => {
    expect(fitTitle("ZWBeasts", 800, "stencil", { max: 112, min: 72 })).toEqual({ size: 112, lines: 1 });
    const long = fitTitle("Stage 2 - Zwift Epic - Four Foalsmen", 700, "shantell", { max: 80, min: 52 });
    expect(long.size).toBeLessThanOrEqual(80);
    expect(long.size).toBeGreaterThanOrEqual(48);
  });
});
