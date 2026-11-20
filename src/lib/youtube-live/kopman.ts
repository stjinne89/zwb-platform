// De eigen kopman van een lid bij de streamstijl Strip (0347, 2026-11-20): een
// getekende renner in de stijl van de renners uit Kopman, als man of vrouw, in
// het clubtenue. Het lid kiest alleen wat hieronder staat; de rest van het
// gezicht ligt vast per soort. Puur, voor de tests. De tekening zelf staat in
// components/livestream/kopman-figure.tsx.

import type { TenueInks } from "./overlay-styles";

export type KopmanMood = "rust" | "aanval" | "limiet" | "zege";

export type KopmanLook = {
  body: "man" | "vrouw";
  skin: number;
  /** Kapsel: bij een man kort, krullen, lang of kaal; bij een vrouw paardenstaart, lang, vlecht of kort. */
  hair: number;
  hairColor: number;
  /** Alleen bij een man: geen, stoppels, snor of baard. */
  facial: number;
  /** Geen, bril of zonnebril. */
  glasses: number;
  /** De kleur van de helm, zie kopmanHelmets (sinds 2026-11-20, wens eigenaar). */
  helmet: number;
  /** Het shirt, zie KOPMAN_SHIRTS: het winter- of het zomertenue (2026-11-20, wens eigenaar). */
  shirt: number;
};

export const KOPMAN_SKINS = ["#f7dcc4", "#efc6a2", "#e2ac82", "#cc8f62", "#a96d45", "#7c4c2f"] as const;

export const KOPMAN_HAIR_COLORS: readonly { hex: string; label: string }[] = [
  { hex: "#2a1d14", label: "Zwart" },
  { hex: "#3d2717", label: "Donkerbruin" },
  { hex: "#5c3a1f", label: "Bruin" },
  { hex: "#8a5a2b", label: "Lichtbruin" },
  { hex: "#c8994f", label: "Donkerblond" },
  { hex: "#e3c47e", label: "Blond" },
  { hex: "#a8452a", label: "Rood" },
  { hex: "#7d7d7a", label: "Grijs" },
];

export const KOPMAN_HAIR: Record<KopmanLook["body"], readonly string[]> = {
  man: ["Kort", "Krullen", "Lang", "Kaal"],
  vrouw: ["Paardenstaart", "Lang", "Vlecht", "Kort"],
};

export const KOPMAN_FACIAL = ["Geen", "Stoppels", "Snor", "Baard"] as const;
export const KOPMAN_GLASSES = ["Geen", "Bril", "Zonnebril"] as const;
/** Winter: het donkere shirt in de clubkleur. Zomer: het witte shirt met een donkere onderkant. */
export const KOPMAN_SHIRTS = ["Winter", "Zomer"] as const;

export const DEFAULT_KOPMAN: KopmanLook = { body: "man", skin: 1, hair: 0, hairColor: 1, facial: 0, glasses: 0, helmet: 0, shirt: 0 };

/**
 * De kopman van een lid dat er zelf (nog) geen heeft gemaakt: een vrouw als
 * het opgegeven geslacht vrouw is, anders een man (0349, wens eigenaar).
 */
export function defaultKopman(sex: string | null | undefined): KopmanLook {
  return sex === "vrouw" ? { ...DEFAULT_KOPMAN, body: "vrouw" } : DEFAULT_KOPMAN;
}

/**
 * De helmkleuren: eerst de clubkleuren (de eerste is de standaard), dan vier
 * gewone helmkleuren. Het shirt blijft altijd het clubtenue (winter of zomer).
 */
export function kopmanHelmets(t: TenueInks): readonly { hex: string; label: string }[] {
  return [
    { hex: t.ink, label: "Clubdonker" },
    { hex: t.petrol, label: "Clubkleur" },
    { hex: t.teal, label: "Tweede clubkleur" },
    { hex: t.sage, label: "Derde clubkleur" },
    { hex: t.gold, label: "Goud" },
    { hex: "#f2efe6", label: "Wit" },
    { hex: "#17191b", label: "Zwart" },
    { hex: "#c3382e", label: "Rood" },
  ];
}

export const KOPMAN_HELMET_COUNT = 8;

const index = (value: unknown, size: number, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < size ? value : fallback;

/** Een opgeslagen of ingestuurde figuur, of null als het geen figuur is. */
export function parseKopman(value: unknown): KopmanLook | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.body !== "man" && v.body !== "vrouw") return null;
  const body = v.body;
  return {
    body,
    skin: index(v.skin, KOPMAN_SKINS.length, DEFAULT_KOPMAN.skin),
    hair: index(v.hair, KOPMAN_HAIR[body].length, 0),
    hairColor: index(v.hairColor, KOPMAN_HAIR_COLORS.length, DEFAULT_KOPMAN.hairColor),
    facial: body === "man" ? index(v.facial, KOPMAN_FACIAL.length, 0) : 0,
    glasses: index(v.glasses, KOPMAN_GLASSES.length, 0),
    helmet: index(v.helmet, KOPMAN_HELMET_COUNT, 0),
    shirt: index(v.shirt, KOPMAN_SHIRTS.length, 0),
  };
}

/** De stemming bij de kleine regel van de overlay: rust voor de start, aanval live, zege na afloop. */
export function kopmanMood(status: string): KopmanMood {
  if (status.startsWith("Begint zo")) return "rust";
  if (status.startsWith("Uitslag") || status.startsWith("Afgelopen")) return "zege";
  return "aanval";
}

/** De vaste maten van het gezicht, per soort; de keuzes van het lid erover. */
export type KopmanFace = {
  skin: string;
  hair: string;
  brow: string;
  w: number;
  jaw: number;
  chin: number;
  neck: number;
  shoulders: number;
  ex: number;
  eyeY: number;
  eyeR: number;
  browThick: number;
  mouthW: number;
  woman: boolean;
  /** 0 tot 3, zie KOPMAN_HAIR. */
  hairStyle: number;
  facial: number;
  glasses: number;
  lens: string;
};

const MAN = { w: 16.4, jaw: 13, chin: 72, neck: 8.4, shoulders: 39, ex: 7.2, eyeY: 50.6, eyeR: 3.9, browThick: 2.4, mouthW: 6.4 };
const VROUW = { w: 15.2, jaw: 10.8, chin: 71.2, neck: 6.6, shoulders: 34, ex: 6.9, eyeY: 50.6, eyeR: 4.1, browThick: 1.7, mouthW: 5.6 };

export const KOPMAN_INK = "#1b1712";

/** `hex` een deel `t` richting de inkt: de donkerdere tint van de rasterpunten. */
export function shade(hex: string, t = 0.3): string {
  const a = parseInt(hex.slice(1, 7), 16);
  const b = parseInt(KOPMAN_INK.slice(1), 16);
  const mix = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
}

export function kopmanFace(look: KopmanLook): KopmanFace {
  const hair = KOPMAN_HAIR_COLORS[look.hairColor]?.hex ?? KOPMAN_HAIR_COLORS[1].hex;
  // Donker haar krijgt inktzwarte wenkbrauwen, licht haar een donkerdere tint.
  const brow = look.hairColor <= 2 ? KOPMAN_INK : shade(hair, 0.45);
  return {
    ...(look.body === "vrouw" ? VROUW : MAN),
    skin: KOPMAN_SKINS[look.skin] ?? KOPMAN_SKINS[1],
    hair,
    brow,
    woman: look.body === "vrouw",
    hairStyle: look.hair,
    facial: look.body === "man" ? look.facial : 0,
    glasses: look.glasses,
    lens: "#23313f",
  };
}

/** Het witte shirt van het zomertenue, als in de materiaalrekenaar. */
export const KOPMAN_WHITE = "#f6f7f6";

/** De kleuren van de tekening: het tenue van rugnummer en strip. */
export type KopmanColors = {
  /** Zomer: wit boven, de onderkant in de clubkleur. */
  summer: boolean;
  jersey: string;
  /** De zijpanelen. */
  trim: string;
  /** De baan over de buik; bij zomer de hele onderkant. */
  band: string;
  gold: string;
  helmet: string;
  /** De bies over de helm: goud, op een gouden helm de clubkleur. */
  helmetBand: string;
  sky: string;
  dots: string;
};

export function kopmanColors(t: TenueInks, look?: Partial<Pick<KopmanLook, "helmet" | "shirt">> | null): KopmanColors {
  const helmets = kopmanHelmets(t);
  const helmet = helmets[look?.helmet ?? 0]?.hex ?? helmets[0].hex;
  const summer = look?.shirt === 1;
  return {
    summer,
    jersey: summer ? KOPMAN_WHITE : t.petrol,
    trim: summer ? t.petrol : t.teal,
    band: summer ? t.petrol : t.sage,
    gold: t.gold,
    helmet,
    helmetBand: helmet === t.gold ? t.petrol : t.gold,
    sky: t.page,
    dots: shade(t.page, 0.08),
  };
}
