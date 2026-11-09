import localFont from "next/font/local";

// Alleen voorZpWelBokaal gebruikt deze letters: het emaille bord (Alfa Slab
// One), krijt op de lei (Cabin Sketch voor koppen, Kalam voor namen en
// quoteringen) en de typemachine van het wedbriefje (Courier Prime). Gekozen in
// het voorstel van 2026-10-19. Zonder preload, zodat ze pas laden op deze pagina's.
// De bestanden staan in src/fonts (zie de README daar).
export const signFont = localFont({
  variable: "--font-bk-sign",
  src: "../../fonts/alfa-slab-one-400.woff2",
  weight: "400",
  preload: false,
});
export const chalkHeadFont = localFont({
  variable: "--font-bk-chalk-head",
  src: "../../fonts/cabin-sketch-700.woff2",
  weight: "700",
  preload: false,
});
export const chalkFont = localFont({
  variable: "--font-bk-chalk",
  src: [
    { path: "../../fonts/kalam-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/kalam-700.woff2", weight: "700", style: "normal" },
  ],
  preload: false,
});
export const slipFont = localFont({
  variable: "--font-bk-slip",
  src: [
    { path: "../../fonts/courier-prime-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/courier-prime-700.woff2", weight: "700", style: "normal" },
  ],
  preload: false,
});

export const bokaalFontVariables = [signFont, chalkHeadFont, chalkFont, slipFont].map((f) => f.variable).join(" ");
