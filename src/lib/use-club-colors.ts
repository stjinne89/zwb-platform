"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PALETTE, normalizeHex, type ClubPalette } from "@/lib/club-theme";

// De vijf kleuren van de club als hex, voor plekken waar een CSS-variabele niet
// werkt: Leaflet zet kleuren als SVG-attribuut, een canvas kent geen CSS. Leest
// de variabelen --zwb-* die globals.css zet en de huisstijl van de club (0314)
// overschrijft. Tot de eerste render in de browser de standaard.

const VARS: Record<keyof ClubPalette, string> = {
  primary: "--zwb-petrol",
  secondary: "--zwb-teal",
  neutral: "--zwb-sage",
  accent: "--zwb-gold",
  ink: "--zwb-petrol-dark",
};

function readPalette(): ClubPalette {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    (Object.keys(VARS) as (keyof ClubPalette)[]).map((key) => [
      key,
      normalizeHex(style.getPropertyValue(VARS[key])) ?? DEFAULT_PALETTE[key],
    ]),
  ) as ClubPalette;
}

export function useClubColors(): ClubPalette {
  const [palette, setPalette] = useState<ClubPalette>(DEFAULT_PALETTE);
  useEffect(() => {
    const update = () =>
      setPalette((current) => {
        const next = readPalette();
        return (Object.keys(next) as (keyof ClubPalette)[]).every((k) => next[k] === current[k])
          ? current
          : next;
      });
    update();
    // Licht/donker wisselt via de klasse op <html>.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, []);
  return palette;
}
