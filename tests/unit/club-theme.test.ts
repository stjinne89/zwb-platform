import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_PALETTE,
  PALETTE_KEYS,
  clubThemeCss,
  contrastRatio,
  deriveTheme,
  normalizeHex,
  paletteChecks,
  resolvePalette,
  themeColors,
  type ClubPalette,
} from "@/lib/club-theme";

// De huisstijl uit vijf kleuren (0314, fase 2 van docs/multi-club-ontwerp.md).

const ROOT = join(__dirname, "..", "..");
const HEX = /^#[0-9a-f]{6}$/;

const PALETTES: Record<string, ClubPalette> = {
  zwb: DEFAULT_PALETTE,
  rood: { primary: "#b3001b", secondary: "#262626", neutral: "#8a8a8a", accent: "#f2c200", ink: "#1a1a1a" },
  licht: { primary: "#ffd400", secondary: "#9fd8ff", neutral: "#e0e0e0", accent: "#ff6b00", ink: "#222222" },
  oranje: { primary: "#ff6600", secondary: "#003399", neutral: "#999999", accent: "#00a651", ink: "#001433" },
};

describe("normalizeHex", () => {
  it("maakt van elke schrijfwijze #rrggbb", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("004653")).toBe("#004653");
    expect(normalizeHex(" #B8873D ")).toBe("#b8873d");
  });

  it("weigert wat geen kleur is", () => {
    for (const value of ["", "red", "#12345", "#gggggg", null, undefined]) {
      expect(normalizeHex(value)).toBeNull();
    }
  });
});

describe("resolvePalette", () => {
  it("geeft null zonder eigen kleuren: dan geldt de standaard uit globals.css", () => {
    expect(resolvePalette(null)).toBeNull();
    expect(resolvePalette({})).toBeNull();
    expect(resolvePalette({ primary: null, accent: "geen kleur" })).toBeNull();
  });

  it("vult ontbrekende kleuren aan met de standaard", () => {
    expect(resolvePalette({ primary: "#B3001B" })).toEqual({ ...DEFAULT_PALETTE, primary: "#b3001b" });
  });
});

describe("contrastRatio", () => {
  it("rekent volgens WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    // De Goudregel (DESIGN.md): tenuegoud op licht is 3,1:1.
    expect(contrastRatio("#b8873d", "#fbfbf7")).toBeCloseTo(3.1, 1);
  });
});

describe("deriveTheme", () => {
  for (const [name, palette] of Object.entries(PALETTES)) {
    describe(name, () => {
      const theme = deriveTheme(palette);

      it("geeft geldige kleuren", () => {
        for (const set of [theme.light, theme.dark, theme.tegelsLight, theme.tegelsDark]) {
          for (const [token, value] of Object.entries(set)) {
            expect(value, token).toMatch(/^(#[0-9a-f]{6}|rgb\(.+\)|\d+ \d+ \d+)$/);
          }
        }
      });

      it("houdt gewone tekst leesbaar, licht en donker", () => {
        const pairs: [string, string][] = [
          ["--foreground", "--background"],
          ["--card-foreground", "--card"],
          ["--muted-foreground", "--muted"],
          ["--secondary-foreground", "--secondary"],
        ];
        for (const [fg, bg] of pairs) {
          expect(contrastRatio(theme.light[fg], theme.light[bg]), `licht ${fg}`).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(theme.dark[fg], theme.dark[bg]), `donker ${fg}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it("kiest per tegel de tekstkleur die het best leest", () => {
        for (const mode of ["light", "dark"] as const) {
          for (const tile of Object.values(theme.tiles[mode])) {
            expect(tile.bg).toMatch(HEX);
            expect(tile.fg).toMatch(HEX);
            expect(contrastRatio(tile.fg, tile.bg)).toBeGreaterThanOrEqual(2.5);
          }
        }
      });

      it("past de Goudregel toe: accent als tekst haalt 4,5:1 op papier", () => {
        const text = `#${theme.light["--zwblok-own-text"]
          .split(" ")
          .map((v) => Number(v).toString(16).padStart(2, "0"))
          .join("")}`;
        expect(contrastRatio(text, theme.light["--zwb-paper"])).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it("benadert de handmatige standaard van ZWB", () => {
    const theme = deriveTheme(DEFAULT_PALETTE);
    // globals.css: --zwb-cream #f5f6f0, en --primary is petrol.
    expect(contrastRatio(theme.light["--background"], "#f5f6f0")).toBeLessThan(1.05);
    expect(theme.light["--primary"]).toBe("#004653");
    expect(theme.tiles.light.kalender).toEqual({ bg: "#004653", fg: theme.light["--zwb-paper"] });
    expect(theme.tiles.light.vandaag.fg).toBe("#0a2b34");
  });
});

describe("clubThemeCss", () => {
  const css = clubThemeCss(PALETTES.rood);

  it("weegt zwaarder dan globals.css: elke selector begint met html", () => {
    const selectors = css
      .split("}")
      .map((rule) => rule.split("{")[0].trim())
      .filter(Boolean)
      .flatMap((selector) => selector.split(","));
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector.trim()).toMatch(/^html[:.\s]/);
  });

  it("zet de kleuren van de club", () => {
    expect(css).toContain("--primary:#b3001b");
    expect(css).toContain("--tg-vandaag:#f2c200");
  });

  it("kan geen CSS breken: alleen hex, rgb() en tripletten", () => {
    expect(css).not.toMatch(/<|url\(|@import|expression/i);
  });
});

describe("paletteChecks", () => {
  it("vindt niets mis aan de standaard", () => {
    expect(paletteChecks(DEFAULT_PALETTE).filter((check) => !check.ok).map((check) => check.label)).toEqual([]);
  });

  it("meldt tegels die slecht lezen", () => {
    const grey = { ...DEFAULT_PALETTE, neutral: "#8c8c8c" };
    const failing = paletteChecks(grey).filter((check) => !check.ok);
    expect(failing.map((check) => check.label)).toContain("Tekst op neutraal");
  });
});

describe("themeColors", () => {
  it("houdt zonder eigen kleuren de waarden van het oude manifest", () => {
    expect(themeColors(null)).toEqual({ light: "#004653", dark: "#0a2b34", background: "#1f3a47" });
  });

  it("volgt de clubkleuren", () => {
    expect(themeColors(PALETTES.rood)).toEqual({ light: "#b3001b", dark: "#1a1a1a", background: "#1a1a1a" });
  });
});

describe("migratie 0314", () => {
  let db: PGlite;
  const read = (file: string) => readFileSync(join(ROOT, "supabase", "migrations", file), "utf8");

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(
      [
        "create role anon; create role authenticated; create role service_role;",
        "create table public.profiles(id uuid primary key);",
        "grant usage on schema public to anon, authenticated;",
      ].join("\n"),
    );
    await db.exec(read("0313_club_settings.sql"));
    await db.exec(read("0314_club_colors.sql"));
  });

  afterAll(async () => {
    await db.close();
  });

  it("laat ZWB zonder eigen kleuren", async () => {
    const { rows } = await db.query<Record<string, string | null>>(
      `select ${PALETTE_KEYS.map((key) => `color_${key}`).join(", ")} from club_settings`,
    );
    expect(rows).toEqual([Object.fromEntries(PALETTE_KEYS.map((key) => [`color_${key}`, null]))]);
  });

  it("neemt alleen #rrggbb in kleine letters aan", async () => {
    await db.exec("update club_settings set color_primary = '#b3001b'");
    for (const bad of ["#B3001B", "b3001b", "#abc", "red; }"]) {
      await expect(db.exec(`update club_settings set color_accent = '${bad}'`)).rejects.toThrow();
    }
  });

  it("is opnieuw uit te voeren", async () => {
    await db.exec(read("0314_club_colors.sql"));
    const { rows } = await db.query<{ color_primary: string }>("select color_primary from club_settings");
    expect(rows).toEqual([{ color_primary: "#b3001b" }]);
  });
});
