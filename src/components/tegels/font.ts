import { Barlow_Semi_Condensed } from "next/font/google";

// Alleen het design "tegels" gebruikt dit lettertype; zonder preload laadt het
// pas als dat design aanstaat. Door de eigenaar gekozen uit een proef van vijf.
// Eén module, zodat de app-schil en de inlogschermen dezelfde letter delen.
export const tegelsFont = Barlow_Semi_Condensed({
  variable: "--font-tegels",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  preload: false,
});
