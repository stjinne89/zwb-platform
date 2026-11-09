import localFont from "next/font/local";

// Alleen ZWBriljant en de prijzenkast van ZWBekers (sinds 2026-10-28) gebruiken
// deze letters: Cormorant Garamond voor de score en de
// klasse, Jost in spatiekapitalen voor de rest. Gekozen door de eigenaar in de
// ontwerpronde van 2026-10-21 ("veel chiquer"). Zonder preload, zodat ze pas laden
// als de pagina opent. De bestanden staan in src/fonts (zie de README daar).
export const briljantSerif = localFont({
  variable: "--font-briljant-serif",
  src: [
    { path: "../../fonts/cormorant-garamond-300-500.woff2", weight: "300 500", style: "normal" },
    { path: "../../fonts/cormorant-garamond-300-500-italic.woff2", weight: "300 500", style: "italic" },
  ],
  adjustFontFallback: "Times New Roman",
  preload: false,
});

export const briljantSans = localFont({
  variable: "--font-briljant-sans",
  src: "../../fonts/jost-400-500.woff2",
  weight: "400 500",
  preload: false,
});
