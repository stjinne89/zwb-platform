// Huisstijl van de club uit vijf kleuren (0314, fase 2 van de generieke versie,
// docs/multi-club-ontwerp.md).
//
// globals.css bevat de standaard huisstijl: de ZWB-kleuren, met de hand
// afgesteld. Kiest een club eigen kleuren, dan leidt deze module daaruit alle
// tokens af en zet de root layout ze in een <style> die de standaard
// overschrijft. Zonder eigen kleuren komt er geen <style>, dus ZWB ziet er
// precies uit zoals voorheen; de afgeleide waarden benaderen de handmatige maar
// zijn niet gelijk.
//
// Geen server-only: de editor op /beheer/huisstijl rekent hiermee het voorbeeld
// en de contrastcontrole uit in de browser.

export type PaletteKey = "primary" | "secondary" | "neutral" | "accent" | "ink";
export type ClubPalette = Record<PaletteKey, string>;
export type PaletteInput = Partial<Record<PaletteKey, string | null | undefined>>;

export const PALETTE_KEYS: readonly PaletteKey[] = ["primary", "secondary", "neutral", "accent", "ink"];

/** De standaard huisstijl in globals.css: petrol, teal, sage, goud en donker petrol. */
export const DEFAULT_PALETTE: ClubPalette = {
  primary: "#004653",
  secondary: "#1f6068",
  neutral: "#7f9590",
  accent: "#b8873d",
  ink: "#0a2b34",
};

// ---------- Lettertype (0315) ----------

export type ClubFont = "barlow" | "archivo" | "inter" | "schibsted";

/**
 * De letters waaruit een club kiest. family is de naam die next/font/local de
 * familie geeft: de naam van de variabele in src/components/tegels/font.ts.
 */
export const CLUB_FONTS: readonly { key: ClubFont; label: string; family: string }[] = [
  { key: "barlow", label: "Barlow Semi Condensed", family: "tegelsFont" },
  { key: "archivo", label: "Archivo", family: "tegelsArchivo" },
  { key: "inter", label: "Inter", family: "tegelsInter" },
  { key: "schibsted", label: "Schibsted Grotesk", family: "tegelsSchibsted" },
];

export const DEFAULT_FONT: ClubFont = "barlow";

/** Een bekende letter, of null (de standaard). */
export function resolveFont(value: string | null | undefined): ClubFont | null {
  const font = CLUB_FONTS.find((f) => f.key === value);
  return font && font.key !== DEFAULT_FONT ? font.key : null;
}

/** De CSS die de letter van de club op de schil en in dialogen zet. */
export function clubFontCss(font: ClubFont): string {
  const family = CLUB_FONTS.find((f) => f.key === font)?.family ?? "tegelsFont";
  return [
    `html [data-design="tegels"]{--font-tegels:var(--font-tegels-${font})}`,
    `html:root:has([data-design="tegels"]){--tg-display:"${family}", var(--font-geist-sans), system-ui, sans-serif}`,
  ].join("\n");
}

/**
 * Alle CSS van de huisstijl van de club, of null als alles de standaard is:
 * dan zet de root layout geen <style> neer.
 */
export function clubStyleCss(
  palette: ClubPalette | null,
  font: ClubFont | null,
): string | null {
  const parts = [palette ? clubThemeCss(palette) : null, font ? clubFontCss(font) : null].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length ? parts.join("\n") : null;
}

// ---------- Kleurrekenen (sRGB, OKLab/OKLCH, WCAG-contrast) ----------

type Rgb = [number, number, number]; // 0..1
type Oklch = { l: number; c: number; h: number };

/** "#abc", "abc", "#AABBCC" → "#aabbcc"; al het andere → null. */
export function normalizeHex(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  let v = value.trim().toLowerCase();
  if (v.startsWith("#")) v = v.slice(1);
  if (/^[0-9a-f]{3}$/.test(v)) v = v.split("").map((ch) => ch + ch).join("");
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
}

function hexToRgb(hex: string): Rgb {
  const v = normalizeHex(hex) ?? "#000000";
  return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as Rgb;
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch([r0, g0, b0]: Rgb): Oklch {
  const [r, g, b] = [toLinear(r0), toLinear(g0), toLinear(b0)];
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return { l: L, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h };
}

function oklchToLinear({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const A = c * Math.cos(rad);
  const B = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (rgb: Rgb) => rgb.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

/** OKLCH naar hex; buiten sRGB gaat de chroma omlaag tot de kleur past. */
function oklchToHex(color: Oklch): string {
  const l = Math.min(1, Math.max(0, color.l));
  let lo = 0;
  let hi = Math.max(0, color.c);
  if (!inGamut(oklchToLinear({ l, c: hi, h: color.h }))) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ l, c: mid, h: color.h }))) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  const lin = oklchToLinear({ l, c: hi, h: color.h });
  return rgbToHex(lin.map(fromLinear) as Rgb);
}

const lch = (hex: string) => rgbToOklch(hexToRgb(hex));

/** Dezelfde tint en verzadiging (hooguit maxC), met een vaste helderheid. */
function tone(hex: string, l: number, maxC = Infinity): string {
  const { c, h } = lch(hex);
  return oklchToHex({ l, c: Math.min(c, maxC), h });
}

/** Mengen in OKLab; t = 0 geeft a, t = 1 geeft b. */
function mix(a: string, b: string, t: number): string {
  const ca = lch(a);
  const cb = lch(b);
  const rad = (d: number) => (d * Math.PI) / 180;
  const A = (1 - t) * ca.c * Math.cos(rad(ca.h)) + t * cb.c * Math.cos(rad(cb.h));
  const B = (1 - t) * ca.c * Math.sin(rad(ca.h)) + t * cb.c * Math.sin(rad(cb.h));
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return oklchToHex({ l: (1 - t) * ca.l + t * cb.l, c: Math.hypot(A, B), h: h < 0 ? h + 360 : h });
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG-contrast tussen twee kleuren, 1 tot 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Schuift de helderheid van color weg van bg tot het contrast min haalt. */
function ensureContrast(color: string, bg: string, min: number): string {
  if (contrastRatio(color, bg) >= min) return color;
  const base = lch(color);
  const darker = luminance(bg) > 0.18;
  for (let step = 1; step <= 100; step++) {
    const l = darker ? base.l - step * 0.01 : base.l + step * 0.01;
    if (l < 0 || l > 1) break;
    const candidate = oklchToHex({ l, c: base.c, h: base.h });
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  return darker ? "#000000" : "#ffffff";
}

/** Inkt of papier, wat het beste leest op bg. */
function textOn(bg: string, ink: string, paper: string): string {
  return contrastRatio(ink, bg) >= contrastRatio(paper, bg) ? ink : paper;
}

const triplet = (hex: string) => hexToRgb(hex).map((c) => Math.round(c * 255)).join(" ");
const rgba = (hex: string, alpha: number) => `rgb(${triplet(hex)} / ${alpha})`;

// ---------- Palet ----------

/**
 * Het palet van de club, of null als er geen eigen kleuren zijn: dan geldt de
 * standaard uit globals.css. Ontbrekende kleuren vult de standaard aan.
 */
export function resolvePalette(input: PaletteInput | null | undefined): ClubPalette | null {
  if (!input) return null;
  const chosen = PALETTE_KEYS.map((key) => [key, normalizeHex(input[key])] as const);
  if (chosen.every(([, value]) => value === null)) return null;
  return Object.fromEntries(
    chosen.map(([key, value]) => [key, value ?? DEFAULT_PALETTE[key]]),
  ) as ClubPalette;
}

export type TileKey = "vandaag" | "kalender" | "zwbeter" | "club" | "meer";

export type ClubTheme = {
  /** Tokens op :root (licht). */
  light: Record<string, string>;
  /** Tokens op .dark. */
  dark: Record<string, string>;
  /** Tokens binnen het design tegels, licht en donker. */
  tegelsLight: Record<string, string>;
  tegelsDark: Record<string, string>;
  /** Achtergrond en tekst per tegelsoort, licht en donker. */
  tiles: Record<"light" | "dark", Record<TileKey, { bg: string; fg: string }>>;
  /** De tenuebanen achter de app-schil. */
  stripes: Record<"light" | "dark", string>;
};

/** Alle tokens van de huisstijl, afgeleid uit vijf kleuren. */
export function deriveTheme(p: ClubPalette): ClubTheme {
  const n = lch(p.neutral);

  // Licht.
  const paper = oklchToHex({ l: 0.985, c: Math.min(n.c, 0.008), h: n.h });
  const cream = oklchToHex({ l: 0.965, c: Math.min(n.c, 0.012), h: n.h });
  const foreground = ensureContrast(p.ink, cream, 7);
  const muted = tone(p.neutral, 0.935, 0.015);
  const secondary = tone(p.neutral, 0.9, 0.03);
  const border = tone(p.neutral, 0.86, 0.022);
  const mutedForeground = ensureContrast(tone(p.primary, 0.43, 0.04), muted, 4.5);
  const secondaryForeground = ensureContrast(mix(p.primary, p.ink, 0.5), secondary, 4.5);
  const accentText = ensureContrast(p.accent, paper, 4.5);

  const light: Record<string, string> = {
    "--zwb-cream": cream,
    "--zwb-paper": paper,
    "--zwb-petrol": p.primary,
    "--zwb-petrol-dark": p.ink,
    "--zwb-teal": p.secondary,
    "--zwb-sage": p.neutral,
    "--zwb-gold": p.accent,
    "--zwb-meter": p.secondary,
    "--zwb-meter-over": p.accent,
    "--zwb-stage-5": p.accent,
    "--zwb-stage-4": p.secondary,
    "--zwb-stage-3": p.primary,
    "--zwb-stage-2": p.neutral,
    "--zwb-stage-1": mix(p.neutral, "#ffffff", 0.45),
    "--zwblok-club": triplet(p.secondary),
    "--zwblok-club-busy": triplet(p.primary),
    "--zwblok-own": triplet(p.accent),
    "--zwblok-own-text": triplet(accentText),
    "--background": cream,
    "--foreground": foreground,
    "--card": paper,
    "--card-foreground": foreground,
    "--popover": paper,
    "--popover-foreground": foreground,
    "--primary": p.primary,
    "--primary-foreground": textOn(p.primary, foreground, paper),
    "--secondary": secondary,
    "--secondary-foreground": secondaryForeground,
    "--muted": muted,
    "--muted-foreground": mutedForeground,
    "--accent": p.accent,
    "--accent-foreground": textOn(p.accent, foreground, paper),
    "--border": border,
    "--input": border,
    "--ring": p.accent,
    "--chart-1": p.primary,
    "--chart-2": p.secondary,
    "--chart-3": p.accent,
    "--chart-4": p.neutral,
    "--chart-5": mix(p.primary, p.neutral, 0.5),
    "--sidebar": paper,
    "--sidebar-foreground": foreground,
    "--sidebar-primary": p.primary,
    "--sidebar-primary-foreground": textOn(p.primary, foreground, paper),
    "--sidebar-accent": secondary,
    "--sidebar-accent-foreground": secondaryForeground,
    "--sidebar-border": border,
    "--sidebar-ring": p.accent,
  };

  // Donker: een nachtversie van de inkt als ondergrond, de rest lichter.
  const i = lch(p.ink);
  const night = (l: number) => oklchToHex({ l, c: Math.min(i.c, 0.035), h: i.h });
  const darkBg = night(0.17);
  const darkCard = night(0.23);
  const darkMuted = night(0.27);
  const darkSecondary = night(0.31);
  const darkForeground = oklchToHex({ l: 0.97, c: Math.min(n.c, 0.006), h: n.h });
  const a = lch(p.accent);
  const darkGold = oklchToHex({ l: Math.max(a.l, 0.74), c: a.c, h: a.h });
  const darkSecondaryTone = ensureContrast(tone(p.secondary, 0.58), darkBg, 3);
  const darkPrimaryTone = ensureContrast(tone(p.primary, 0.78), darkBg, 4.5);
  const darkAccent = tone(p.neutral, 0.55, 0.04);
  const darkMutedForeground = ensureContrast(night(0.72), darkCard, 4.5);

  const dark: Record<string, string> = {
    "--zwblok-club": triplet(darkSecondaryTone),
    "--zwblok-club-busy": triplet(darkPrimaryTone),
    "--zwblok-own": triplet(darkGold),
    "--zwblok-own-text": triplet(darkGold),
    "--zwb-meter": darkSecondaryTone,
    "--zwb-meter-over": darkGold,
    "--zwb-stage-5": darkGold,
    "--zwb-stage-4": darkPrimaryTone,
    "--zwb-stage-3": darkSecondaryTone,
    "--zwb-stage-2": tone(p.neutral, 0.75),
    "--zwb-stage-1": tone(p.neutral, 0.55),
    "--background": darkBg,
    "--foreground": darkForeground,
    "--card": darkCard,
    "--card-foreground": darkForeground,
    "--popover": darkCard,
    "--popover-foreground": darkForeground,
    "--primary": darkGold,
    "--primary-foreground": darkBg,
    "--secondary": darkSecondary,
    "--secondary-foreground": darkForeground,
    "--muted": darkMuted,
    "--muted-foreground": darkMutedForeground,
    "--accent": darkAccent,
    "--accent-foreground": darkForeground,
    "--ring": darkGold,
    "--chart-1": darkGold,
    "--chart-2": darkAccent,
    "--chart-3": darkPrimaryTone,
    "--chart-4": tone(p.accent, 0.45),
    "--chart-5": darkSecondaryTone,
    "--sidebar": darkCard,
    "--sidebar-foreground": darkForeground,
    "--sidebar-primary": darkGold,
    "--sidebar-primary-foreground": darkBg,
    "--sidebar-accent": darkSecondary,
    "--sidebar-accent-foreground": darkForeground,
    "--sidebar-ring": darkGold,
  };

  // Tegels: de vijf kleuren zijn de vijf plekken.
  const lift = (hex: string, by: number) => {
    const c = lch(hex);
    return oklchToHex({ l: c.l + by, c: c.c, h: c.h });
  };
  const tileLight: Record<TileKey, string> = {
    vandaag: p.accent,
    kalender: p.primary,
    zwbeter: p.secondary,
    club: p.neutral,
    meer: p.ink,
  };
  const tileDark: Record<TileKey, string> = {
    vandaag: lift(p.accent, 0.04),
    kalender: lift(p.primary, 0.03),
    zwbeter: p.secondary,
    club: lift(p.neutral, 0.05),
    meer: darkMuted,
  };
  const darkPaper = cream;
  const tiles = {
    light: Object.fromEntries(
      Object.entries(tileLight).map(([k, bg]) => [k, { bg, fg: textOn(bg, p.ink, paper) }]),
    ) as ClubTheme["tiles"]["light"],
    dark: Object.fromEntries(
      Object.entries(tileDark).map(([k, bg]) => [k, { bg, fg: textOn(bg, darkBg, darkPaper) }]),
    ) as ClubTheme["tiles"]["dark"],
  };

  const tegelsLight: Record<string, string> = {
    "--tg-vandaag": tileLight.vandaag,
    "--tg-kalender": tileLight.kalender,
    "--tg-zwbeter": tileLight.zwbeter,
    "--tg-club": tileLight.club,
    "--tg-meer": tileLight.meer,
    "--tg-ink": p.ink,
    "--tg-paper": paper,
    "--tg-panel": rgba(p.primary, 0.07),
  };
  const tegelsDark: Record<string, string> = {
    "--background": darkBg,
    "--card": darkCard,
    "--popover": darkCard,
    "--muted": darkMuted,
    "--secondary": darkSecondary,
    "--tg-vandaag": tileDark.vandaag,
    "--tg-kalender": tileDark.kalender,
    "--tg-zwbeter": tileDark.zwbeter,
    "--tg-club": tileDark.club,
    "--tg-meer": tileDark.meer,
    "--tg-ink": darkBg,
    "--tg-paper": darkPaper,
    "--tg-panel": "rgb(255 255 255 / 0.055)",
  };

  const band = (deg: number, from: number, to: number, color: string) =>
    `linear-gradient(${deg}deg, transparent 0 ${from}%, ${color} ${from}% ${to}%, transparent ${to}%)`;
  const stripes = {
    light: [
      band(132, 18, 32, rgba(p.primary, 0.1)),
      band(149, 34, 49, rgba(p.secondary, 0.12)),
      band(28, 45, 61, rgba(p.neutral, 0.16)),
      band(156, 62, 66, rgba(p.accent, 0.26)),
    ].join(", "),
    dark: [
      band(132, 18, 32, rgba(p.secondary, 0.3)),
      band(149, 34, 49, rgba(p.neutral, 0.13)),
      band(28, 45, 61, "rgb(255 255 255 / 0.05)"),
      band(156, 62, 66, rgba(tileDark.vandaag, 0.34)),
    ].join(", "),
  };

  return { light, dark, tegelsLight, tegelsDark, tiles, stripes };
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";")}}`;

/**
 * De CSS die de standaard huisstijl overschrijft. Elke selector begint met
 * html, zodat hij zwaarder weegt dan dezelfde regel in globals.css, ongeacht
 * de volgorde in de pagina.
 */
export function clubThemeCss(p: ClubPalette): string {
  const t = deriveTheme(p);
  const tileRules = (mode: "light" | "dark", prefix: string) =>
    (Object.keys(t.tiles[mode]) as TileKey[])
      .map((k) => `${prefix} .tg-${k}{--tg-fg:${t.tiles[mode][k].fg}}`)
      .join("");
  return [
    block("html:root", t.light),
    block("html.dark", t.dark),
    block('html [data-design="tegels"],html:root:has([data-design="tegels"])', t.tegelsLight),
    block('html.dark [data-design="tegels"],html.dark:has([data-design="tegels"])', t.tegelsDark),
    tileRules("light", "html"),
    tileRules("dark", "html.dark"),
    `html:not(.dark) .app-shell[data-design="tegels"]::before{background:${t.stripes.light}}`,
    `html.dark .app-shell[data-design="tegels"]::before{background:${t.stripes.dark}}`,
  ].join("\n");
}

export type ContrastCheck = { label: string; ratio: number; ok: boolean };

/** Leesbaarheid van tekst op de vlakken van de huisstijl (4,5:1, WCAG AA). */
export function paletteChecks(p: ClubPalette): ContrastCheck[] {
  const t = deriveTheme(p);
  const names: Record<TileKey, string> = {
    vandaag: "accent",
    kalender: "primair",
    zwbeter: "secundair",
    club: "neutraal",
    meer: "inkt",
  };
  const checks: ContrastCheck[] = [];
  for (const mode of ["light", "dark"] as const) {
    for (const key of Object.keys(names) as TileKey[]) {
      const { bg, fg } = t.tiles[mode][key];
      const ratio = contrastRatio(fg, bg);
      checks.push({
        label: `Tekst op ${names[key]}${mode === "dark" ? " (donker)" : ""}`,
        ratio,
        ok: ratio >= 4.5,
      });
    }
  }
  const button = contrastRatio(t.light["--primary-foreground"], t.light["--primary"]);
  checks.push({ label: "Knoptekst", ratio: button, ok: button >= 4.5 });
  return checks;
}

/** Kleur voor de browserbalk en het app-icoon, licht en donker. */
export function themeColors(p: ClubPalette | null): { light: string; dark: string; background: string } {
  if (!p) return { light: DEFAULT_PALETTE.primary, dark: DEFAULT_PALETTE.ink, background: "#1f3a47" };
  return { light: p.primary, dark: p.ink, background: p.ink };
}
