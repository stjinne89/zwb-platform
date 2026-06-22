"use client";

import { useEffect, useMemo, useState } from "react";
import { parseGpx, type GpxPoint } from "@/lib/gpx";
import {
  detectClimbs,
  labelClimbsWithCols,
  type ColLite,
} from "@/lib/gpx-climbs";
import { GpxMap } from "./gpx-map";
import { ElevationProfile } from "./elevation-profile";

/**
 * Haalt de GPX één keer op, berekent de klimmen één keer, en deelt
 * `points` + `climbs` + de actieve-klim-state met zowel de kaart als het
 * hoogteprofiel. Vervangt de losse <GpxMap/> + <ElevationProfile/> die elk
 * de GPX apart ophaalden.
 */
export function RouteSection({
  gpxUrl,
  cols = [],
}: {
  gpxUrl: string;
  cols?: ColLite[];
}) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeClimb, setActiveClimb] = useState<number | null>(null);

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

  const climbs = useMemo(() => {
    if (points.length < 2) return [];
    return labelClimbsWithCols(detectClimbs(points), points, cols);
  }, [points, cols]);

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
      <GpxMap
        points={points}
        climbs={climbs}
        activeClimb={activeClimb}
        onActiveClimb={setActiveClimb}
      />
      <ElevationProfile
        points={points}
        climbs={climbs}
        activeClimb={activeClimb}
        onActiveClimb={setActiveClimb}
      />
    </div>
  );
}
