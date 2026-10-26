import { Big_Shoulders_Stencil, Karla } from "next/font/google";

// Alleen het weekoverzicht gebruikt deze letters: stencilkapitalen voor de
// grote cijfers, Karla voor de zinnen. Gekozen door de eigenaar in de
// ontwerpronde van 2026-10-18 ("weekstories in zeefdruk"). Zonder preload, zodat
// ze pas laden als de pop-up opent.
export const stencilFont = Big_Shoulders_Stencil({
  variable: "--font-wr-stencil",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
  // Next kent de maten van deze letter niet om een terugvalletter op af te
  // stemmen; zonder deze regel waarschuwt de build daarover.
  adjustFontFallback: false,
});

export const karlaFont = Karla({
  variable: "--font-wr-text",
  subsets: ["latin"],
  preload: false,
});
