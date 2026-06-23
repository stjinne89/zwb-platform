"use client";

import { useMapEvents } from "react-leaflet";

// Vangt kaartkliks op (alleen actief tijdens POI-plaatsmodus). Dynamisch
// geïmporteerd met ssr:false zodat react-leaflet niet tijdens SSR draait.
export default function MapClick({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}
