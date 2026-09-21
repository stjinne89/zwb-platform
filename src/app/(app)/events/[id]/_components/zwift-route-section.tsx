"use client";

// Het parcours van een Zwift-event: de vorm van de route en het hoogteprofiel
// over lead-in en alle ronden. De tegenhanger van RouteSection voor een .gpx,
// maar zonder Leaflet — zie route-shape.tsx waarom.

import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { linePath } from "@/lib/charts/paths";
import { linearScale } from "@/lib/charts/scale";
import type { PacingAccent, PacingSegment } from "@/lib/pacing/route-profile";
import { RouteShape } from "./route-shape";

export function ZwiftRouteSection({
  routeName,
  world,
  laps,
  totalKm,
  segments,
  accents,
  shape,
}: {
  routeName: string | null;
  world: string | null;
  laps: number | null;
  totalKm: number;
  segments: PacingSegment[];
  accents: PacingAccent[];
  shape: { lat: number[]; lon: number[] } | null;
}) {
  const meta = [
    world ? world.charAt(0).toUpperCase() + world.slice(1) : null,
    laps && laps > 1 ? `${laps} ronden` : null,
    `${totalKm.toFixed(1)} km`,
  ].filter(Boolean);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div>
        <h2 className="font-semibold">Parcours{routeName ? `: ${routeName}` : ""}</h2>
        <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
      </div>
      {shape && <RouteShape shape={shape} name={routeName} />}
      {segments.length > 1 && (
        <ZwiftProfile segments={segments} accents={accents} totalKm={totalKm} />
      )}
    </section>
  );
}

function ZwiftProfile({
  segments,
  accents,
  totalKm,
}: {
  segments: PacingSegment[];
  accents: PacingAccent[];
  totalKm: number;
}) {
  const kms = [0];
  const elevation = [0];
  for (const segment of segments) {
    kms.push(kms[kms.length - 1] + segment.distanceM / 1000);
    elevation.push(elevation[elevation.length - 1] + segment.gradient * segment.distanceM);
  }
  const minEle = Math.min(...elevation);
  const maxEle = Math.max(...elevation, minEle + 10);
  const climbs = accents.filter((accent) => accent.kind === "climb");

  return (
    <ResponsiveChart ariaLabel="Hoogteprofiel" height={140}>
      {({ metrics, plotWidth, plotHeight }) => {
        const x = linearScale({ domain: [0, totalKm], range: [0, plotWidth] });
        const y = linearScale({ domain: [minEle, maxEle], range: [plotHeight, 0] });
        const profile = linePath(
          elevation,
          (_, index) => x.forward(kms[index]),
          (value) => y.forward(value),
        );
        const area = `${profile} L ${x.forward(kms[kms.length - 1]).toFixed(1)} ${plotHeight.toFixed(1)} L 0 ${plotHeight.toFixed(1)} Z`;

        return (
          <g transform={`translate(${metrics.margin.left}, ${metrics.margin.top})`}>
            {climbs.map((climb) => (
              <rect
                key={climb.id}
                x={x.forward(climb.startKm)}
                y={0}
                width={Math.max(1, x.forward(climb.endKm) - x.forward(climb.startKm))}
                height={plotHeight}
                fill="var(--chart-4)"
                opacity={0.16}
              >
                <title>
                  {climb.name} · km {climb.startKm.toFixed(1)}–{climb.endKm.toFixed(1)} ·{" "}
                  {(climb.avgGradient * 100).toFixed(1)}%
                </title>
              </rect>
            ))}
            <path d={area} fill="var(--chart-2)" opacity={0.22} />
            <path d={profile} fill="none" stroke="var(--chart-2)" strokeWidth={1.5} />
            <text x={0} y={plotHeight + 14} fontSize={11} fill="currentColor" opacity={0.6}>
              0 km
            </text>
            <text
              x={plotWidth}
              y={plotHeight + 14}
              fontSize={11}
              fill="currentColor"
              opacity={0.6}
              textAnchor="end"
            >
              {totalKm.toFixed(1)} km
            </text>
          </g>
        );
      }}
    </ResponsiveChart>
  );
}
