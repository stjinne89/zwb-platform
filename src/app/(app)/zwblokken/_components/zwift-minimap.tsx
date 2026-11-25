"use client";

// Zwifts eigen minimap als ondergrond, ook als Zwift hem gedraaid tekent.
//
// Leaflets ImageOverlay kan een beeld alleen recht in zijn grenzen leggen. In
// Makuri Islands, France en Scotland ligt noord op de minimap rechts (zie
// imageRotation in src/lib/zwblokken/zwift.ts). Daarom een SVG-overlay met het
// beeld als <image>: binnen de SVG kan het draaien, en Leaflet schuift en zoomt
// de SVG zelf. Het beeld komt nog steeds rechtstreeks van Zwifts CDN.

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { minimapTransform } from "@/lib/zwblokken/minimap";

const SVG_NS = "http://www.w3.org/2000/svg";

type Props = {
  url: string;
  /** [[zuid, west], [noord, oost]] */
  bounds: [[number, number], [number, number]];
  /** Graden tegen de klok in om noord boven te krijgen. */
  rotation: number;
  onError?: () => void;
};

export default function ZwiftMinimap({ url, bounds, rotation, onError }: Props) {
  const map = useMap();
  // Via een ref: een nieuwe callback per render mag de laag niet opnieuw opbouwen.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const [[south, west], [north, east]] = bounds;

  useEffect(() => {
    let cancelled = false;
    let layer: { remove: () => void } | null = null;

    import("leaflet").then((L) => {
      if (cancelled) return;
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 1 1");
      // De grenzen zijn niet exact vierkant; het beeld volgt ze, zoals ImageOverlay.
      svg.setAttribute("preserveAspectRatio", "none");
      const image = document.createElementNS(SVG_NS, "image");
      image.setAttribute("href", url);
      image.setAttribute("width", "1");
      image.setAttribute("height", "1");
      image.setAttribute("preserveAspectRatio", "none");
      const transform = minimapTransform(rotation);
      if (transform) image.setAttribute("transform", transform);
      image.addEventListener("error", () => onErrorRef.current?.());
      svg.appendChild(image);

      layer = L.svgOverlay(
        svg,
        [
          [south, west],
          [north, east],
        ],
        // In de tegelpane, zodat de blokkenlaag er altijd boven ligt.
        { pane: "tilePane", interactive: false, attribution: "Kaart &copy; Zwift" },
      ).addTo(map);
    });

    return () => {
      cancelled = true;
      layer?.remove();
    };
  }, [map, url, rotation, south, west, north, east]);

  return null;
}
