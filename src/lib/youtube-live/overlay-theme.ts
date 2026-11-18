// De kleuren van de OBS-overlay (0341): de nachtversie van de huisstijl, omdat
// er video achter zit. Zonder eigen kleuren de handmatige ZWB-waarden uit
// DESIGN.md; met eigen kleuren afgeleid zoals de rest van de app
// (lib/club-theme.ts). Puur, voor de tests.

import { deriveTheme, type ClubPalette } from "@/lib/club-theme";

export type OverlayColors = {
  /** Ondergrond van paneel en sponsorvak, dekkend genoeg boven video. */
  ground: string;
  /** Een rij in de stand: het doorzichtige paneel van het design. */
  row: string;
  text: string;
  muted: string;
  /** De kop: de tegelkleur van wedstrijden (kalender), met de tekst erop. */
  head: string;
  headText: string;
  /** Goud: de eigen ploeg en de rand van het logoplaatje. */
  gold: string;
  /** Papier onder logo's, met inkt erop. */
  paper: string;
  ink: string;
};

const ZWB_NIGHT: OverlayColors = {
  ground: "rgb(6 28 34 / 0.92)",
  row: "rgb(255 255 255 / 0.055)",
  text: "oklch(0.97 0.005 80)",
  muted: "oklch(0.7 0.015 220)",
  head: "#00505f",
  headText: "#f5f6f0",
  gold: "oklch(0.72 0.08 80)",
  paper: "#f5f6f0",
  ink: "#0a2b34",
};

function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function overlayColors(palette: ClubPalette | null): OverlayColors {
  if (!palette) return ZWB_NIGHT;
  const theme = deriveTheme(palette);
  return {
    ground: withAlpha(theme.dark["--background"], 0.92),
    row: "rgb(255 255 255 / 0.055)",
    text: theme.dark["--foreground"],
    muted: theme.dark["--muted-foreground"],
    head: theme.tiles.dark.kalender.bg,
    headText: theme.tiles.dark.kalender.fg,
    gold: theme.dark["--primary"],
    paper: theme.tegelsDark["--tg-paper"],
    ink: palette.ink,
  };
}

/** Als CSS-variabelen op de overlay. */
export function overlayColorVars(colors: OverlayColors): Record<string, string> {
  return {
    "--ov-ground": colors.ground,
    "--ov-row": colors.row,
    "--ov-text": colors.text,
    "--ov-muted": colors.muted,
    "--ov-head": colors.head,
    "--ov-head-text": colors.headText,
    "--ov-gold": colors.gold,
    "--ov-paper": colors.paper,
    "--ov-ink": colors.ink,
  };
}
