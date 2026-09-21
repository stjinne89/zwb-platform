"use client";

import { useMapEvents } from "react-leaflet";

// Vangt kaartkliks op. Dynamisch te importeren met ssr:false, want react-leaflet
// raakt window aan bij het initialiseren.
//
// Stond eerst route-lokaal bij de eventkaart (POI's plaatsen); sinds de
// vertrekpunten op /profiel hetzelfde nodig hebben staat hij hier.
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
