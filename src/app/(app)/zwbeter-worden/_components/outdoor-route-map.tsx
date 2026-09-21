"use client";

// De drie voorgestelde rondjes op één kaart, elk in een eigen kleur.
//
// Waarom op één kaart en niet drie kaartjes: je kiest niet tussen drie plaatjes
// maar tussen drie kanten op. Over elkaar heen zie je in één oogopslag welk
// rondje welke hoek van je omgeving pakt -- en dat is precies de keuze die je
// maakt.
//
// De lijn is aanklikbaar, maar een lijn van drie pixels is op een telefoon niet
// te raken. Daarom ligt er een onzichtbare, dikke lijn onder elke route die de
// klik opvangt, en blijft de lijst eronder de volwaardige tweede weg naar
// dezelfde keuze.

import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), {
  ssr: false,
});
const FitBounds = dynamic(() => import("./map-fit-bounds"), { ssr: false });

/** Jersey-kleuren, in deze volgorde toegekend aan de rondjes op score. */
export const ROUTE_COLORS = ["#004653", "#b8873d", "#7f9590"] as const;

export type MapRoute = {
  id: string;
  line: Array<[number, number]>;
};

export function OutdoorRouteMap({
  routes,
  selectedId,
  onSelect,
}: {
  routes: MapRoute[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const drawable = routes.filter((route) => route.line.length >= 2);
  if (drawable.length === 0) return null;

  const all = drawable.flatMap((route) => route.line);
  const start = drawable[0].line[0];

  return (
    <div className="mt-2 h-72 overflow-hidden rounded-md border">
      <MapContainer center={start} zoom={11} className="size-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={all} />

        {drawable.map((route, index) => {
          const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
          const selected = route.id === selectedId;
          return (
            <PolylinePair
              key={route.id}
              route={route}
              color={color}
              selected={selected}
              dimmed={selectedId !== null && !selected}
              onSelect={onSelect}
            />
          );
        })}

        {/* Het vertrekpunt: alle rondjes beginnen en eindigen hier. */}
        <CircleMarker
          center={start}
          radius={6}
          pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#111827", fillOpacity: 1 }}
        />
      </MapContainer>
    </div>
  );
}

function PolylinePair({
  route,
  color,
  selected,
  dimmed,
  onSelect,
}: {
  route: MapRoute;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const handlers = { click: () => onSelect(route.id) };
  return (
    <>
      {/* Onzichtbare trefzone: breed genoeg voor een vinger. */}
      <Polyline
        positions={route.line}
        pathOptions={{ color, weight: 18, opacity: 0 }}
        eventHandlers={handlers}
      />
      <Polyline
        positions={route.line}
        pathOptions={{
          color,
          weight: selected ? 6 : 4,
          opacity: dimmed ? 0.35 : 1,
        }}
        eventHandlers={handlers}
      />
    </>
  );
}
