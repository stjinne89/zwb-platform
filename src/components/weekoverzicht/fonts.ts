import localFont from "next/font/local";

// Alleen het weekoverzicht gebruikt deze letters: stencilkapitalen voor de
// grote cijfers, Karla voor de zinnen. Gekozen door de eigenaar in de
// ontwerpronde van 2026-10-18 ("weekstories in zeefdruk"). Zonder preload, zodat
// ze pas laden als de pop-up opent. De bestanden staan in src/fonts (zie de
// README daar); de stencilletter heeft ook de as opsz.
export const stencilFont = localFont({
  variable: "--font-wr-stencil",
  src: "../../fonts/big-shoulders-stencil-100-900.woff2",
  weight: "100 900",
  preload: false,
});

export const karlaFont = localFont({
  variable: "--font-wr-text",
  src: "../../fonts/karla-200-800.woff2",
  weight: "200 800",
  preload: false,
});
