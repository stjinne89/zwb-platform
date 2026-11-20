import localFont from "next/font/local";

// De letters van de overlaystijlen (0346). Zeefdruk leent de stencil en Karla
// van het weekoverzicht (zelfde register); strip de handletter van het
// spiekbriefje, als variabele. Zonder preload: alleen de gekozen stijl laadt.
export { karlaFont as overlayText, stencilFont as overlayStencil } from "@/components/weekoverzicht/fonts";

export const overlayHand = localFont({
  variable: "--font-ov-hand",
  src: "../../fonts/shantell-sans-300-800.woff2",
  weight: "300 800",
  preload: false,
});
