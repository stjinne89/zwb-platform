import localFont from "next/font/local";

// Alleen het design "tegels" gebruikt dit lettertype; zonder preload laadt het
// pas als dat design aanstaat. Door de eigenaar gekozen uit een proef van vijf.
// Eén module, zodat de app-schil en de inlogschermen dezelfde letter delen.
// De bestanden staan in src/fonts (zie de README daar).
export const tegelsFont = localFont({
  variable: "--font-tegels",
  src: [
    { path: "../../fonts/barlow-semi-condensed-300.woff2", weight: "300", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/barlow-semi-condensed-600.woff2", weight: "600", style: "normal" },
  ],
  preload: false,
});
