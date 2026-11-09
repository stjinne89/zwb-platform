// De iconen van de app (0315). Met een beeldmerk maakt /club-icon/[file] ze uit
// dat beeldmerk. Zonder beeldmerk gelden de vaste ZWB-bestanden in public/, op
// hun oude adres, maar alleen bij ZWB (static_brand, 0322); bij een andere club
// blijft de plek dan leeg.

export type IconVariant = { size: [number, number]; padding: number; source: string };

export const ICON_VARIANTS = {
  "favicon-16.png": { size: [16, 16], padding: 0, source: "/favicon-16.png" },
  "favicon-32.png": { size: [32, 32], padding: 0, source: "/favicon-32.png" },
  "apple-touch-icon.png": { size: [180, 180], padding: 0.12, source: "/apple-touch-icon.png" },
  "icon-192.png": { size: [192, 192], padding: 0.08, source: "/icon-192.png" },
  "icon-512.png": { size: [512, 512], padding: 0.08, source: "/icon-512.png" },
  // Maskeerbaar: Android snijdt tot een cirkel, dus het beeldmerk binnen de
  // veilige zone (80%).
  "icon-192-maskable.png": { size: [192, 192], padding: 0.2, source: "/icon-192-maskable.png" },
  "icon-512-maskable.png": { size: [512, 512], padding: 0.2, source: "/icon-512-maskable.png" },
  "og.png": { size: [1200, 630], padding: 0.22, source: "/og-default.png" },
} as const satisfies Record<string, IconVariant>;

export type IconFile = keyof typeof ICON_VARIANTS;

/** De vaste ZWB-bestanden buiten de iconen. */
export const STATIC_LOGO = "/zwb-logo.png";
export const STATIC_PUSH_BADGE = "/badge-96.png";
export const STATIC_FAVICON = "/zwb-favicon.ico";

/** Wat bepaalt welk logo en welke iconen de app toont (ClubSettings). */
export type ClubBrand = {
  logoUrl: string | null;
  markUrl: string | null;
  /** De vaste bestanden in public/ als terugval (0322); alleen ZWB. */
  staticBrand: boolean;
};

export function isIconFile(value: string): value is IconFile {
  return Object.hasOwn(ICON_VARIANTS, value);
}

/** Heeft de club iconen: een eigen beeldmerk of de vaste bestanden. */
export function hasClubIcons(brand: ClubBrand): boolean {
  return Boolean(brand.markUrl) || brand.staticBrand;
}

/** Het adres van een icoon, of null als de club er geen heeft. */
export function clubIconUrl(brand: ClubBrand, file: IconFile): string | null {
  if (brand.markUrl) return `/club-icon/${file}`;
  return brand.staticBrand ? ICON_VARIANTS[file].source : null;
}

/** Het logo in de kop en op het inlogscherm, of null. */
export function clubLogoUrl(brand: ClubBrand): string | null {
  return brand.logoUrl ?? (brand.staticBrand ? STATIC_LOGO : null);
}

/** Icoon en badge van een pushmelding; null betekent: geen. */
export function clubPushIcons(brand: ClubBrand): { icon: string | null; badge: string | null } {
  return {
    icon: clubIconUrl(brand, "icon-192.png"),
    // De badge is een wit silhouet; uit een beeldmerk is dat niet te maken.
    badge: brand.staticBrand ? STATIC_PUSH_BADGE : null,
  };
}
