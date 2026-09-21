"use client";

import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";

// Zoomt de kaart op alle getoonde routes samen. Apart bestand omdat useMap()
// alleen binnen een MapContainer mag draaien en die client-only is.
export default function MapFitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  // De uiterste hoeken als vier getallen. Dat is het enige waar het inzoomen van
  // afhangt, en het verandert precies wanneer er écht andere routes getoond
  // worden -- niet bij elke render. Op de puntenlijst zelf afgaan zou bij elke
  // render opnieuw inzoomen en de gebruiker de kaart niet laten verschuiven.
  const box = useMemo(() => {
    if (points.length < 2) return null;
    let south = points[0][0];
    let north = points[0][0];
    let west = points[0][1];
    let east = points[0][1];
    for (const [lat, lon] of points) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lon < west) west = lon;
      if (lon > east) east = lon;
    }
    return [south, west, north, east] as const;
  }, [points]);

  const key = box ? box.join(",") : "";

  useEffect(() => {
    if (!key) return;
    const [south, west, north, east] = key.split(",").map(Number);
    map.fitBounds(
      [
        [south, west],
        [north, east],
      ],
      { padding: [24, 24] },
    );
    // Het paneel eronder verandert van hoogte zodra je een route kiest; zonder
    // deze hint tekent Leaflet dan grijze vlakken.
    const timer = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(timer);
  }, [map, key]);

  return null;
}
