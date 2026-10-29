import { Cormorant_Garamond, Jost } from "next/font/google";

// Alleen ZWBriljant en de prijzenkast van ZWBekers (sinds 2026-10-28) gebruiken
// deze letters: Cormorant Garamond voor de score en de
// klasse, Jost in spatiekapitalen voor de rest. Gekozen door de eigenaar in de
// ontwerpronde van 2026-10-21 ("veel chiquer"). Zonder preload, zodat ze pas laden
// als de pagina opent.
export const briljantSerif = Cormorant_Garamond({
  variable: "--font-briljant-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  preload: false,
});

export const briljantSans = Jost({
  variable: "--font-briljant-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});
