"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Maximize2, X } from "lucide-react";
import { blockBounds } from "@/lib/zwblokken/grid";
import { BlocksLayer, type BlockSet } from "./blocks-layer";
import "leaflet/dist/leaflet.css";

// react-leaflet hits window during init — must be client-only.
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);

/** Compacte transportvorm: x → lijst van y's (plus rider_count voor de club). */
export type PackedBlocks = Record<string, number[]>;
export type PackedClubBlocks = Record<string, [number, number][]>;

type Props = {
  club: PackedClubBlocks;
  own: PackedBlocks;
  maxRiders: number;
};

function unpackOwn(packed: PackedBlocks): BlockSet {
  const out: BlockSet = new Map();
  for (const [x, ys] of Object.entries(packed)) {
    const inner = new Map<number, number>();
    for (const y of ys) inner.set(y, 1);
    out.set(Number(x), inner);
  }
  return out;
}

function unpackClub(packed: PackedClubBlocks): BlockSet {
  const out: BlockSet = new Map();
  for (const [x, entries] of Object.entries(packed)) {
    const inner = new Map<number, number>();
    for (const [y, riders] of entries) inner.set(y, riders);
    out.set(Number(x), inner);
  }
  return out;
}

/** Zwaartepunt van een blokkenset, zodat de kaart opent waar de data ligt. */
function centerOf(blocks: BlockSet): [number, number] | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const [x, inner] of blocks) {
    for (const y of inner.keys()) {
      sumX += x;
      sumY += y;
      count++;
    }
  }
  if (count === 0) return null;
  const [[south, west], [north, east]] = blockBounds(
    Math.round(sumX / count),
    Math.round(sumY / count),
  );
  return [(south + north) / 2, (west + east) / 2];
}

export function BlocksMap({ club, own, maxRiders }: Props) {
  const { resolvedTheme } = useTheme();
  const [fullscreen, setFullscreen] = useState(false);

  const clubBlocks = useMemo(() => unpackClub(club), [club]);
  const ownBlocks = useMemo(() => unpackOwn(own), [own]);
  // Valt terug op het midden van Nederland als er nog niets te tonen is.
  const center = useMemo<[number, number]>(
    () => centerOf(ownBlocks) ?? centerOf(clubBlocks) ?? [52.09, 5.11],
    [ownBlocks, clubBlocks],
  );

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  // Twee losse Leaflet-instanties (inline + fullscreen), zoals gpx-map.tsx:
  // Leaflet verhuist niet netjes tussen containers, dus elk krijgt een eigen key.
  const renderMap = (key: string) => (
    <MapContainer
      key={key}
      center={center}
      zoom={10}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <BlocksLayer
        club={clubBlocks}
        own={ownBlocks}
        maxRiders={maxRiders}
        theme={resolvedTheme}
      />
    </MapContainer>
  );

  return (
    <>
      <div className="relative h-[65vh] overflow-hidden rounded-xl border border-border">
        {renderMap("inline")}
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Kaart vergroten"
          className="absolute right-3 top-3 z-[1000] rounded-md border border-border bg-card/90 p-2 shadow-sm"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {fullscreen ? (
        <div className="fixed inset-0 z-[2000] bg-background">
          <div className="h-full w-full">{renderMap("fullscreen")}</div>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Sluiten"
            className="absolute right-4 top-4 z-[2001] rounded-md border border-border bg-card/90 p-2 shadow-sm"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
