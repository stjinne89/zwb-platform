"use client";

// Gedeelde presentatie van klimmen op een hoogteprofiel: de gekleurde banden
// (SVG), de categorie-badges (HTML-overlay) en de stats-card. Gebruikt door
// zowel het statische profiel als het live-profiel, zodat ze er identiek
// uitzien en we de rendering maar op één plek onderhouden.

import {
  CLIMB_CATEGORY_COLORS,
  type Climb,
} from "@/lib/gpx-climbs";

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
