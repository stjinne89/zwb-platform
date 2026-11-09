import localFont from "next/font/local";
import type { ClubFont } from "@/lib/club-theme";

// De letter van het design "tegels". Standaard Barlow Semi Condensed, door de
// eigenaar gekozen uit een proef van vijf; een club kan een van de andere drie
// kiezen op /beheer/inrichting/huisstijl (0315). Alle vier zonder preload: een
// lettertype laadt pas als de pagina het echt gebruikt. Eén module, zodat de
// app-schil en de inlogschermen dezelfde letter delen. De bestanden staan in
// src/fonts (zie de README daar).
//
// next/font/local noemt de familie naar de naam van de variabele hieronder
// (bv. "tegelsArchivo"); globals.css en src/lib/club-theme.ts gebruiken die
// namen voor dialogen buiten de schil.
export const tegelsFont = localFont({
  variable: "--font-tegels-barlow",
  src: [
    { path: "../../fonts/barlow-semi-condensed-300.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-600.woff2", weight: "600", style: "normal" },
  ],
  preload: false,
});

export const tegelsArchivo = localFont({
  variable: "--font-tegels-archivo",
  src: "../../fonts/archivo-300-600.woff2",
  weight: "300 600",
  preload: false,
});

export const tegelsInter = localFont({
  variable: "--font-tegels-inter",
  src: "../../fonts/inter-300-600.woff2",
  weight: "300 600",
  preload: false,
});

export const tegelsSchibsted = localFont({
  variable: "--font-tegels-schibsted",
  src: "../../fonts/schibsted-grotesk-400-600.woff2",
  weight: "400 600",
  preload: false,
});

const FONTS: Record<ClubFont, { variable: string }> = {
  barlow: tegelsFont,
  archivo: tegelsArchivo,
  inter: tegelsInter,
  schibsted: tegelsSchibsted,
};

/** De klassen die de vier lettervariabelen definiëren; zet ze op de schil. */
export const tegelsFontVariables = Object.values(FONTS)
  .map((font) => font.variable)
  .join(" ");
