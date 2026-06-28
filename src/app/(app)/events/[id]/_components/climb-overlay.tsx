"use client";

// Gedeelde presentatie van klimmen op een hoogteprofiel: de gekleurde banden
// (SVG), de categorie-badges (HTML-overlay) en de stats-card. Gebruikt door
// zowel het statische profiel als het live-profiel, zodat ze er identiek
// uitzien en we de rendering maar op één plek onderhouden.

import {
  CLIMB_CATEGORY_COLORS,
  type Climb,
} from "@/lib/gpx-climbs";
import { ZONE_COLOR, ZONE_LABEL, type EventZone } from "./zone";

const fmt = (n: number, digits = 1) =>
  n.toLocaleString("nl-NL", { maximumFractionDigits: digits });

export function climbLength(climb: Climb): string {
  return climb.lengthM >= 1000
    ? `${fmt(climb.lengthM / 1000)} km`
    : `${Math.round(climb.lengthM)} m`;
}

/** Gekleurde band per klim, getekend binnen de profiel-SVG (viewBox-coords). */
export function ClimbBands({
  climbs,
  xFor,
  height,
  activeIndex,
}: {
  climbs: Climb[];
  xFor: (km: number) => number;
  height: number;
  activeIndex: number | null;
}) {
  return (
    <g>
      {climbs.map((climb, i) => {
        const x = xFor(climb.startKm);
        const w = Math.max(0, xFor(climb.endKm) - x);
        return (
          <rect
            key={i}
            x={x}
            y={0}
            width={w}
            height={height}
            fill={CLIMB_CATEGORY_COLORS[climb.category]}
            fillOpacity={activeIndex === i ? 0.32 : 0.18}
          />
        );
      })}
    </g>
  );
}

/**
 * Geneutraliseerde zones als band binnen de profiel-SVG (viewBox-coords).
 * Cyaan met een diagonale arcering, zodat het duidelijk geen klim-band is.
 */
export function ZoneBands({
  zones,
  xFor,
  height,
  idSuffix,
}: {
  zones: EventZone[];
  xFor: (km: number) => number;
  height: number;
  idSuffix: string;
}) {
  if (zones.length === 0) return null;
  const patternId = `zone-hatch-${idSuffix}`;
  return (
    <g>
      <defs>
        <pattern
          id={patternId}
          width={6}
          height={6}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width={6} height={6} fill={ZONE_COLOR} fillOpacity={0.14} />
          <line x1={0} y1={0} x2={0} y2={6} stroke={ZONE_COLOR} strokeWidth={1.5} strokeOpacity={0.5} />
        </pattern>
      </defs>
      {zones.map((zone, i) => {
        const x = xFor(zone.startKm);
        const w = Math.max(0, xFor(zone.endKm) - x);
        return (
          <g key={i}>
            <rect x={x} y={0} width={w} height={height} fill={`url(#${patternId})`} />
            <line x1={x} y1={0} x2={x} y2={height} stroke={ZONE_COLOR} strokeWidth={1} strokeOpacity={0.7} />
            <line x1={x + w} y1={0} x2={x + w} y2={height} stroke={ZONE_COLOR} strokeWidth={1} strokeOpacity={0.7} />
          </g>
        );
      })}
    </g>
  );
}

/** Zone-labels als HTML-laag bovenop de SVG (net als de klim-badges). */
export function ZoneBadges({
  zones,
  totalKm,
  uprightDeg = 0,
}: {
  zones: EventZone[];
  totalKm: number;
  uprightDeg?: number;
}) {
  if (zones.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {zones.map((zone, i) => {
        const midKm = (zone.startKm + zone.endKm) / 2;
        const left = totalKm > 0 ? (midKm / totalKm) * 100 : 0;
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              backgroundColor: ZONE_COLOR,
              transform: `translateX(-50%) rotate(${uprightDeg}deg)`,
            }}
            className="absolute top-1 max-w-[40%] truncate rounded px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white shadow-sm"
          >
            {zone.label?.trim() || ZONE_LABEL}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Categorie-badges als HTML-laag bovenop de SVG. Nodig omdat de SVG
 * `preserveAspectRatio="none"` gebruikt — tekst in de SVG zou vervormen.
 * Positioneert per klim op het midden van het km-bereik.
 */
export function ClimbBadges({
  climbs,
  totalKm,
  activeIndex,
  onSelect,
  uprightDeg = 0,
}: {
  climbs: Climb[];
  totalKm: number;
  activeIndex: number | null;
  onSelect: (index: number) => void;
  /** Tegen-rotatie (graden) zodat de badges rechtop blijven in een geroteerde
   *  (liggende) fullscreen-weergave. */
  uprightDeg?: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {climbs.map((climb, i) => {
        const midKm = (climb.startKm + climb.endKm) / 2;
        const left = totalKm > 0 ? (midKm / totalKm) * 100 : 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              left: `${left}%`,
              borderColor: CLIMB_CATEGORY_COLORS[climb.category],
              backgroundColor: CLIMB_CATEGORY_COLORS[climb.category],
              transform: `translateX(-50%) rotate(${uprightDeg}deg)`,
            }}
            className={`pointer-events-auto absolute top-1 rounded px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white shadow-sm ${
              activeIndex === i ? "ring-2 ring-white/80" : ""
            }`}
            aria-label={`Klim ${climb.name ?? climb.category}`}
          >
            {climb.category}
          </button>
        );
      })}
    </div>
  );
}

/** Terse stats-card voor de actieve klim — geen helptekst (product-copy-regel). */
export function ClimbInfoCard({ climb }: { climb: Climb }) {
  return (
    <div
      className="rounded-lg border bg-card p-3 text-sm"
      style={{ borderLeftColor: CLIMB_CATEGORY_COLORS[climb.category], borderLeftWidth: 4 }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-semibold">{climb.name ?? "Klim"}</span>
        <span
          className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: CLIMB_CATEGORY_COLORS[climb.category] }}
        >
          {climb.category}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums sm:grid-cols-4">
        <Stat label="Lengte" value={climbLength(climb)} />
        <Stat label="Gem." value={`${fmt(climb.avgGradient)}%`} />
        <Stat label="Max." value={`${fmt(climb.maxGradient)}%`} />
        <Stat label="Stijging" value={`${Math.round(climb.gainM)} hm`} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Compacte legenda van de categorieën die in deze route voorkomen. */
export function ClimbLegend({ climbs }: { climbs: Climb[] }) {
  const present = Array.from(new Set(climbs.map((c) => c.category)));
  if (present.length === 0) return null;
  const order = ["4e", "3e", "2e", "1e", "HC"] as const;
  const sorted = order.filter((c) => present.includes(c));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {sorted.map((cat) => (
        <span key={cat} className="inline-flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm"
            style={{ backgroundColor: CLIMB_CATEGORY_COLORS[cat] }}
          />
          {cat}
        </span>
      ))}
    </div>
  );
}
