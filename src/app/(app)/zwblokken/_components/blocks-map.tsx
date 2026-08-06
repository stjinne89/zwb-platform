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

export type MemberOption = { id: string; name: string; blocks: number };

/** Stabiele referentie, zodat een lege set geen hertekening uitlokt. */
const EMPTY: PackedBlocks = {};

type Props = {
  club: PackedClubBlocks;
  maxRiders: number;
  initialOwn: PackedBlocks;
  members: MemberOption[];
  selectedId: string;
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

export function BlocksMap({
  club,
  maxRiders,
  initialOwn,
  members,
  selectedId,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [memberId, setMemberId] = useState(selectedId);
  // Opgehaalde sets per lid, zodat heen-en-weer wisselen niet opnieuw fetcht.
  const [fetched, setFetched] = useState<Record<string, PackedBlocks>>({});
  const [fullscreen, setFullscreen] = useState(false);

  const pending = memberId !== selectedId && !fetched[memberId];
  const ownPacked =
    memberId === selectedId ? initialOwn : fetched[memberId] ?? EMPTY;

  const clubBlocks = useMemo(() => unpackClub(club), [club]);
  const ownBlocks = useMemo(() => unpackOwn(ownPacked), [ownPacked]);
  // Valt terug op het midden van Nederland als er nog niets te tonen is.
  const center = useMemo<[number, number]>(
    () => centerOf(ownBlocks) ?? centerOf(clubBlocks) ?? [52.09, 5.11],
    [ownBlocks, clubBlocks],
  );

  useEffect(() => {
    if (memberId === selectedId || fetched[memberId]) return;

    let cancelled = false;
    fetch(`/api/zwblokken?profile=${encodeURIComponent(memberId)}`)
      .then((res) => (res.ok ? res.json() : { blocks: EMPTY }))
      .then((data) => {
        if (cancelled) return;
        setFetched((prev) => ({ ...prev, [memberId]: data.blocks ?? EMPTY }));
      })
      .catch(() => {
        // Ook bij een fout een (lege) set opslaan, anders blijft "Laden…" staan.
        if (!cancelled) setFetched((prev) => ({ ...prev, [memberId]: EMPTY }));
      });
    return () => {
      cancelled = true;
    };
  }, [memberId, selectedId, fetched]);

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.blocks})
            </option>
          ))}
        </select>
        {pending ? (
          <span className="text-sm text-muted-foreground">Laden…</span>
        ) : null}
        <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-[2px]"
              style={{ background: "rgb(var(--zwblok-club) / 0.55)" }}
            />
            Club
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-[2px]"
              style={{ background: "rgb(var(--zwblok-own) / 0.7)" }}
            />
            Geselecteerd lid
          </span>
        </div>
      </div>

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
    </div>
  );
}
