// De kleuren van de OBS-overlay (0341) en de thumbnail. Sinds 2026-11-19 een
// kader om het Zwift-beeld met de vier tenuebanen van de app
// (.app-shell[data-design="tegels"]::before); sinds 2026-11-20 per stream in
// donker (nachtpetrol, standaard) of licht (crème), net als de website (0345). Zonder eigen kleuren de handmatige ZWB-waarden uit
// DESIGN.md; met eigen kleuren afgeleid zoals de rest van de app
// (lib/club-theme.ts). Puur, voor de tests.

import { deriveTheme, oklchToHex, type ClubPalette } from "@/lib/club-theme";

export type OverlayMode = "dark" | "light";

export const OVERLAY_MODES: readonly OverlayMode[] = ["dark", "light"];

export function overlayMode(value: unknown): OverlayMode {
  return value === "light" ? "light" : "dark";
}

export type OverlayColors = {
  /** De dekkende ondergrond van het kader: nachtpetrol. */
  ground: string;
  /** De vier tenuebanen over het kader (132°, 149°, 28°, 156°), als rgba. */
  band1: string;
  band2: string;
  band3: string;
  band4: string;
  /** Een rij in de stand: het doorzichtige paneel van het design. */
  row: string;
  text: string;
  muted: string;
  /** De kop: de tegelkleur van wedstrijden (kalender), met de tekst erop. */
  head: string;
  headText: string;
  /** Goud voor lijnen en voor tekst op de titeltegel: rand van logo en Zwift, onderlijn. */
  gold: string;
  /** Goud als tekst op de ondergrond; bij licht de diepere tint (Goudregel). */
  goldText: string;
  /** Papier onder logo's, met inkt erop. */
  paper: string;
  ink: string;
};

const ZWB_NIGHT: OverlayColors = {
  ground: "#061c22",
  band1: "rgba(31, 96, 104, 0.3)",
  band2: "rgba(127, 149, 144, 0.13)",
  band3: "rgba(255, 255, 255, 0.05)",
  band4: "rgba(196, 146, 63, 0.34)",
  row: "rgb(255 255 255 / 0.055)",
  text: "oklch(0.97 0.005 80)",
  muted: "oklch(0.7 0.015 220)",
  head: "#00505f",
  headText: "#f5f6f0",
  gold: "oklch(0.72 0.08 80)",
  goldText: "oklch(0.72 0.08 80)",
  paper: "#f5f6f0",
  ink: "#0a2b34",
};

/** Licht, met de handmatige ZWB-waarden uit DESIGN.md en globals.css. */
const ZWB_DAY: OverlayColors = {
  ground: "oklch(0.965 0.011 103)",
  band1: "rgba(0, 70, 83, 0.1)",
  band2: "rgba(31, 96, 104, 0.12)",
  band3: "rgba(127, 149, 144, 0.16)",
  band4: "rgba(184, 135, 61, 0.26)",
  row: "rgba(0, 70, 83, 0.07)",
  text: "oklch(0.22 0.034 215)",
  muted: "oklch(0.43 0.036 205)",
  head: "#004653",
  headText: "#fbfbf7",
  gold: "#b8873d",
  goldText: "rgb(143, 102, 38)",
  paper: "#fbfbf7",
  ink: "#0a2b34",
};

/** Met komma's: Satori (de thumbnail) leest de notatie met / niet overal. */
function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const tripletRgb = (triplet: string) => `rgb(${triplet.trim().split(/\s+/).join(", ")})`;

export function overlayColors(palette: ClubPalette | null, mode: OverlayMode = "dark"): OverlayColors {
  if (mode === "light") {
    if (!palette) return ZWB_DAY;
    const p = palette;
    const theme = deriveTheme(p);
    return {
      ground: theme.light["--background"],
      // De banen van de app in licht: petrol, teal, salie en goud.
      band1: withAlpha(p.primary, 0.1),
      band2: withAlpha(p.secondary, 0.12),
      band3: withAlpha(p.neutral, 0.16),
      band4: withAlpha(p.accent, 0.26),
      row: withAlpha(p.primary, 0.07),
      text: theme.light["--foreground"],
      muted: theme.light["--muted-foreground"],
      head: theme.tiles.light.kalender.bg,
      headText: theme.tiles.light.kalender.fg,
      gold: p.accent,
      goldText: tripletRgb(theme.light["--zwblok-own-text"]),
      paper: theme.tegelsLight["--tg-paper"],
      ink: p.ink,
    };
  }
  if (!palette) return ZWB_NIGHT;
  const theme = deriveTheme(palette);
  return {
    ground: theme.dark["--background"],
    // Zoals de banen van de app in donker: teal, salie, wit en goud.
    band1: withAlpha(palette.secondary, 0.3),
    band2: withAlpha(palette.neutral, 0.13),
    band3: "rgba(255, 255, 255, 0.05)",
    band4: withAlpha(theme.tiles.dark.vandaag.bg, 0.34),
    row: "rgb(255 255 255 / 0.055)",
    text: theme.dark["--foreground"],
    muted: theme.dark["--muted-foreground"],
    head: theme.tiles.dark.kalender.bg,
    headText: theme.tiles.dark.kalender.fg,
    gold: theme.dark["--primary"],
    goldText: theme.dark["--primary"],
    paper: theme.tegelsDark["--tg-paper"],
    ink: palette.ink,
  };
}

/** Als CSS-variabelen op de overlay. */
export function overlayColorVars(colors: OverlayColors): Record<string, string> {
  return {
    "--ov-ground": colors.ground,
    "--ov-band-1": colors.band1,
    "--ov-band-2": colors.band2,
    "--ov-band-3": colors.band3,
    "--ov-band-4": colors.band4,
    "--ov-row": colors.row,
    "--ov-text": colors.text,
    "--ov-muted": colors.muted,
    "--ov-head": colors.head,
    "--ov-head-text": colors.headText,
    "--ov-gold": colors.gold,
    "--ov-gold-text": colors.goldText,
    "--ov-paper": colors.paper,
    "--ov-ink": colors.ink,
  };
}

/**
 * De vier banen als achtergrond over het hele 1920×1080-vlak (of de thumbnail),
 * met dubbele stops zodat ook Satori ze leest.
 */
export function tenueBands(colors: Pick<OverlayColors, "band1" | "band2" | "band3" | "band4">): string {
  const band = (angle: number, from: number, to: number, color: string) =>
    `linear-gradient(${angle}deg, transparent 0%, transparent ${from}%, ${color} ${from}%, ${color} ${to}%, transparent ${to}%)`;
  return [
    band(132, 18, 32, colors.band1),
    band(149, 34, 49, colors.band2),
    band(28, 45, 61, colors.band3),
    band(156, 62, 66, colors.band4),
  ].join(", ");
}

/**
 * Dezelfde kleuren zonder oklch: Satori (de thumbnail, next/og) leest alleen
 * hex en rgb. `oklch(l c h)` wordt hex; de rest blijft staan.
 */
export function plainColors(colors: OverlayColors): OverlayColors {
  const plain = (value: string) => {
    const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim());
    return m ? oklchToHex({ l: Number(m[1]), c: Number(m[2]), h: Number(m[3]) }) : value;
  };
  return Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, plain(v)])) as OverlayColors;
}
