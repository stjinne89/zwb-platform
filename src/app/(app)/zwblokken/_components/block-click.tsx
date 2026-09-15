"use client";

// Vertaalt een kaartklik naar het blok waarin die klik valt. Dynamisch
// geïmporteerd met ssr:false, zodat react-leaflet niet tijdens SSR draait.

import { useMapEvents } from "react-leaflet";
import { BLOCK_ZOOM, lonLatToBlock } from "@/lib/zwblokken/grid";

export default function BlockClick({
  onPick,
  zoom = BLOCK_ZOOM,
}: {
  onPick: (x: number, y: number) => void;
  /** Zoomniveau van het blokraster: 14 buiten, 16 in de Zwift-werelden. */
  zoom?: number;
}) {
  useMapEvents({
    click: (e) => {
      const { x, y } = lonLatToBlock(e.latlng.lat, e.latlng.lng, zoom);
      onPick(x, y);
    },
  });
  return null;
}
