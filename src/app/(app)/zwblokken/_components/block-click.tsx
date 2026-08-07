"use client";

// Vertaalt een kaartklik naar het blok waarin die klik valt. Dynamisch
// geïmporteerd met ssr:false, zodat react-leaflet niet tijdens SSR draait.

import { useMapEvents } from "react-leaflet";
import { lonLatToBlock } from "@/lib/zwblokken/grid";

export default function BlockClick({
  onPick,
}: {
  onPick: (x: number, y: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { x, y } = lonLatToBlock(e.latlng.lat, e.latlng.lng);
      onPick(x, y);
    },
  });
  return null;
}
