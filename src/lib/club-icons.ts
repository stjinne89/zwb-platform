// De iconen van de app (0315). Met een beeldmerk maakt /club-icon/[file] ze uit
// dat beeldmerk; zonder beeldmerk gelden de vaste ZWB-bestanden in public/, op
// hun oude adres, zodat er voor ZWB niets verandert.

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

export function isIconFile(value: string): value is IconFile {
  return Object.hasOwn(ICON_VARIANTS, value);
}

/** Het adres van een icoon: het gegenereerde als de club een beeldmerk heeft. */
export function clubIconUrl(markUrl: string | null, file: IconFile): string {
  return markUrl ? `/club-icon/${file}` : ICON_VARIANTS[file].source;
}

/** Het logo in de kop en op het inlogscherm. */
export function clubLogoUrl(logoUrl: string | null): string {
  return logoUrl ?? "/zwb-logo.png";
}
