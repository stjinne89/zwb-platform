"use client";

// De plattegrond van een Zwift-route.
//
// Bewust géén Leaflet: voor Watopia bestaat geen kaartlaag, dus een echte kaart
// zou lege oceaan bij de Salomonseilanden tonen. Wat Strava wél geeft zijn de
// virtuele coördinaten van de route, en die zijn genoeg om de vórm te tekenen —
// dat is waar een renner een route aan herkent.
//
// De coördinaten worden op hun eigen bounding box genormaliseerd; absolute
// posities zeggen hier niets. De lengtegraad wordt met de cosinus van de breedte
// gecorrigeerd, anders wordt elke route uitgerekt.

import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { linePath } from "@/lib/charts/paths";

export function RouteShape({
  shape,
  name,
}: {
  shape: { lat: number[]; lon: number[] };
  name: string | null;
}) {
  const { lat, lon } = shape;
  if (lat.length < 2) return null;

  const minLat = Math.min(...lat);
  const maxLat = Math.max(...lat);
  const minLon = Math.min(...lon);
  const maxLon = Math.max(...lon);

  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lonScale = Math.cos(midLat) || 1;

  const spanLat = Math.max(maxLat - minLat, 1e-9);
  const spanLon = Math.max((maxLon - minLon) * lonScale, 1e-9);

  return (
    <ResponsiveChart
      ariaLabel={name ? `Vorm van de route ${name}` : "Vorm van de route"}
      height={200}
    >
      {({ metrics, plotWidth, plotHeight }) => {
        // Eén schaal voor beide assen, zodat de vorm klopt in plaats van het vlak
        // te vullen.
        const scale = Math.min(plotWidth / spanLon, plotHeight / spanLat);
        const offsetX = (plotWidth - spanLon * scale) / 2;
        const offsetY = (plotHeight - spanLat * scale) / 2;

        const path = linePath(
          lat,
          (_, index) => offsetX + (lon[index] - minLon) * lonScale * scale,
          // Noord boven: hogere breedtegraad hoort bovenaan.
          (_, index) => offsetY + (maxLat - lat[index]) * scale,
        );

        return (
          <g transform={`translate(${metrics.margin.left}, ${metrics.margin.top})`}>
            <path
              d={path}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={offsetX + (lon[0] - minLon) * lonScale * scale}
              cy={offsetY + (maxLat - lat[0]) * scale}
              r={4}
              fill="var(--chart-1)"
            />
          </g>
        );
      }}
    </ResponsiveChart>
  );
}
