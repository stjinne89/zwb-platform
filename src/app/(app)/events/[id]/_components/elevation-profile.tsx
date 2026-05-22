"use client";

import { useEffect, useMemo, useState } from "react";
import { parseGpx, type GpxPoint } from "@/lib/gpx";

const HEIGHT = 100;
const PADDING = 4;

function haversineKm(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function ElevationProfile({ gpxUrl }: { gpxUrl: string }) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(gpxUrl);
        if (!res.ok) throw new Error(`Kon GPX niet ophalen (${res.status})`);
        const text = await res.text();
        const summary = parseGpx(text);
        if (!cancelled) setPoints(summary.points);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Onbekende fout");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gpxUrl]);

  const stats = useMemo(() => {
    if (points.length < 2) return null;

    // Bouw distance-array en filter punten zonder elevation
    let cumKm = 0;
    const samples: { km: number; ele: number }[] = [];
    let minEle = Infinity;
    let maxEle = -Infinity;
    let gain = 0;

    for (let i = 0; i < points.length; i++) {
      if (i > 0) cumKm += haversineKm(points[i - 1], points[i]);
      const ele = points[i].ele;
      if (ele === undefined) continue;
      samples.push({ km: cumKm, ele });
      if (ele < minEle) minEle = ele;
      if (ele > maxEle) maxEle = ele;
      if (i > 0) {
        const prevEle = points[i - 1].ele;
        if (prevEle !== undefined && ele > prevEle) gain += ele - prevEle;
      }
    }

    if (samples.length < 2) return null;
    return { samples, totalKm: cumKm, minEle, maxEle, gain };
  }, [points]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Geen hoogtedata in deze GPX.
      </div>
    );
  }

  const { samples, totalKm, minEle, maxEle, gain } = stats;
  // ~250 samples max voor performance
  const step = Math.max(1, Math.floor(samples.length / 250));
  const decimated = samples.filter((_, i) => i % step === 0 || i === samples.length - 1);

  const eleRange = Math.max(1, maxEle - minEle);
  const width = 1000; // virtuele coords; SVG schaalt via viewBox

  const xFor = (km: number) => PADDING + (km / totalKm) * (width - 2 * PADDING);
  const yFor = (ele: number) =>
    HEIGHT - PADDING - ((ele - minEle) / eleRange) * (HEIGHT - 2 * PADDING);

  // Bouw path: line + filled-area onder de lijn
  let linePath = `M ${xFor(decimated[0].km)},${yFor(decimated[0].ele)}`;
  for (let i = 1; i < decimated.length; i++) {
    linePath += ` L ${xFor(decimated[i].km)},${yFor(decimated[i].ele)}`;
  }
  const areaPath =
    `M ${xFor(decimated[0].km)},${HEIGHT - PADDING} ` +
    linePath.replace(/^M /, "L ") +
    ` L ${xFor(decimated[decimated.length - 1].km)},${HEIGHT - PADDING} Z`;

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <h3 className="font-semibold">Hoogteprofiel</h3>
        <span className="text-muted-foreground">
          {totalKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km ·{" "}
          {Math.round(gain)} hm ·{" "}
          {Math.round(minEle)}–{Math.round(maxEle)}m
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-24 w-full sm:h-28"
        aria-label="Hoogteprofiel van de route"
      >
        <defs>
          <linearGradient id="elev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#elev-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-zwb-petrol)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
