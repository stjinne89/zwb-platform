// De stijlen van overlay en thumbnail per stream (0346, 2026-11-20). Een lid
// kiest er een, zodat streams van verschillende leden er anders uitzien, maar
// altijd in de clubkleuren. Tegels is het kader van 2026-11-19; rugnummer,
// zeefdruk en strip zijn door de eigenaar gekozen uit schetsen. Donker of licht
// (0345) geldt alleen bij tegels en zeefdruk. Puur, voor de tests.

import { deriveTheme, oklchToHex, type ClubPalette } from "@/lib/club-theme";
import type { OverlayMode } from "./overlay-theme";
import type { StreamRoute } from "./route-facts";

export type OverlayStyle = "tegels" | "rugnummer" | "zeefdruk" | "strip";

export const OVERLAY_STYLES: readonly { key: OverlayStyle; label: string; modes: boolean }[] = [
  { key: "tegels", label: "Tegels", modes: true },
  { key: "rugnummer", label: "Rugnummer", modes: false },
  { key: "zeefdruk", label: "Zeefdruk", modes: true },
  { key: "strip", label: "Strip", modes: false },
];

export function overlayStyle(value: unknown): OverlayStyle {
  return OVERLAY_STYLES.some((s) => s.key === value) ? (value as OverlayStyle) : "tegels";
}

/** Of de stijl een donkere en een lichte versie heeft. */
export function styleHasModes(style: OverlayStyle): boolean {
  return OVERLAY_STYLES.find((s) => s.key === style)?.modes ?? false;
}

/**
 * De tenue-inkten van rugnummer en strip, als hex (ook voor Satori). Zonder
 * eigen kleuren de ZWB-waarden; met eigen kleuren uit het palet, zoals de app.
 */
export type TenueInks = {
  petrol: string;
  teal: string;
  sage: string;
  /** Goud op een donkere ondergrond: het opgelichte goud van de tegel Vandaag. */
  gold: string;
  /** Papier van rugnummer en stuurbordje. */
  paper: string;
  /** De bladzijde van de strip, tussen de plaatjes. */
  page: string;
  ink: string;
};

const ZWB_TENUE: TenueInks = {
  petrol: "#004653",
  teal: "#1f6068",
  sage: "#7f9590",
  gold: "#c4923f",
  paper: "#f6f3ea",
  page: "#f4eedf",
  ink: "#0a2b34",
};

export function tenueInks(palette: ClubPalette | null): TenueInks {
  if (!palette) return ZWB_TENUE;
  return {
    petrol: palette.primary,
    teal: palette.secondary,
    sage: palette.neutral,
    gold: deriveTheme(palette).tiles.dark.vandaag.bg,
    paper: ZWB_TENUE.paper,
    page: ZWB_TENUE.page,
    ink: palette.ink,
  };
}

/**
 * De inkten van zeefdruk: die van het weekoverzicht (DESIGN.md, eigen
 * register), per thema, als hex. Vast, net als in het weekoverzicht.
 */
export type PrintInks = { paper: string; ink: string; soft: string; cyan: string; gold: string; sage: string };

const ok = (l: number, c: number, h: number) => oklchToHex({ l, c, h });

const PRINT_DAY: PrintInks = {
  paper: ok(0.945, 0.016, 95),
  ink: ok(0.27, 0.025, 215),
  soft: ok(0.47, 0.022, 210),
  cyan: ok(0.47, 0.085, 210),
  gold: ok(0.76, 0.135, 75),
  sage: ok(0.7, 0.04, 165),
};

const PRINT_NIGHT: PrintInks = {
  paper: ok(0.24, 0.03, 215),
  ink: ok(0.94, 0.014, 90),
  soft: ok(0.77, 0.018, 190),
  cyan: ok(0.6, 0.085, 205),
  gold: ok(0.72, 0.13, 72),
  sage: ok(0.6, 0.045, 165),
};

export function printInks(mode: OverlayMode): PrintInks {
  return mode === "dark" ? PRINT_NIGHT : PRINT_DAY;
}

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/**
 * Twee inkten over elkaar, voor de thumbnail (Satori kent geen
 * mix-blend-mode): multiply op licht papier, screen op donker.
 */
export function overprint(a: string, b: string, mode: OverlayMode): string {
  const [x, y] = [channels(a), channels(b)];
  return toHex(
    x.map((v, i) => (mode === "dark" ? 255 - ((255 - v) * (255 - y[i])) / 255 : (v * y[i]) / 255)),
  );
}

const KM = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

/** De cijfers van het parcours zoals de stijlen ze los tonen. */
export function routeFigures(route: StreamRoute | null): {
  routeName: string | null;
  km: string | null;
  hm: string | null;
  laps: string | null;
} {
  return {
    routeName: route?.routeName?.trim() || null,
    km: route?.distanceKm ? KM.format(route.distanceKm) : null,
    hm: route?.elevationM ? String(Math.round(route.elevationM)) : null,
    laps: route?.laps && route.laps > 1 ? `${route.laps} rondes` : null,
  };
}
