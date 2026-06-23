"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { parseGpx, type GpxPoint } from "@/lib/gpx";
import {
  climbsFromRanges,
  detectClimbs,
  labelClimbsWithCols,
  type ClimbRange,
  type ColLite,
} from "@/lib/gpx-climbs";
import { GpxMap } from "./gpx-map";
import { ElevationProfile } from "./elevation-profile";
import { ClimbEditor } from "./climb-editor";
import { saveEventClimbs } from "../_actions";

/**
 * Haalt de GPX één keer op, berekent de klimmen één keer, en deelt
 * `points` + `climbs` + de actieve-klim-state met zowel de kaart als het
 * hoogteprofiel. Admin/creator kan de klimmen bijsturen (overrides); die
 * vervangen dan de automatische detectie.
 */
export function RouteSection({
  gpxUrl,
  cols = [],
  eventId,
  canManage = false,
  initialClimbs = [],
}: {
  gpxUrl: string;
  cols?: ColLite[];
  eventId?: string;
  canManage?: boolean;
  initialClimbs?: ClimbRange[];
}) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeClimb, setActiveClimb] = useState<number | null>(null);

  const [overrides, setOverrides] = useState<ClimbRange[]>(initialClimbs);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClimbRange[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  // Automatisch gedetecteerde klimmen (fallback + startpunt voor de editor).
  const autoClimbs = useMemo(() => {
    if (points.length < 2) return [];
    return labelClimbsWithCols(detectClimbs(points), points, cols);
  }, [points, cols]);

  // Effectieve klimmen: tijdens bewerken het draft-bereik, anders de opgeslagen
  // overrides, anders de automatische detectie.
  const climbs = useMemo(() => {
    if (points.length < 2) return [];
    if (editing) return climbsFromRanges(points, draft, cols);
    if (overrides.length > 0) return climbsFromRanges(points, overrides, cols);
    return autoClimbs;
  }, [points, cols, editing, draft, overrides, autoClimbs]);

  const toRanges = (): ClimbRange[] =>
    (overrides.length > 0 ? overrides : autoClimbs).map((c) => ({
      startKm: Math.round(c.startKm * 1000) / 1000,
      endKm: Math.round(c.endKm * 1000) / 1000,
      name: overrides.length > 0 ? c.name : null,
      category: overrides.length > 0 ? c.category : null,
    }));

  const totalKm = useMemo(
    () => (points.length > 1 ? routeTotalKm(points) : 0),
    [points],
  );

  const startEditing = () => {
    setMessage(null);
    setDraft(toRanges());
    setEditing(true);
  };

  const persist = async (ranges: ClimbRange[]) => {
    if (!eventId) return;
    setSaving(true);
    setMessage(null);
    const res = await saveEventClimbs(
      eventId,
      ranges.map((r) => ({
        name: r.name ?? null,
        category: r.category ?? null,
        startKm: r.startKm,
        endKm: r.endKm,
      })),
    );
    setSaving(false);
    if (!res.ok) {
      setMessage(res.error ?? "Opslaan mislukt.");
      return;
    }
    setOverrides(ranges);
    setEditing(false);
    setActiveClimb(null);
  };

  if (error) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      {canManage && eventId && points.length > 1 && !editing && (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3.5" />
          Klimmen bewerken
        </button>
      )}

      {canManage && eventId && editing && (
        <ClimbEditor
          draft={draft}
          preview={climbs}
          totalKm={totalKm}
          saving={saving}
          message={message}
          onChange={setDraft}
          onResetAuto={() =>
            setDraft(
              autoClimbs.map((c) => ({
                startKm: Math.round(c.startKm * 1000) / 1000,
                endKm: Math.round(c.endKm * 1000) / 1000,
                name: null,
                category: null,
              })),
            )
          }
          onSave={() => persist(draft)}
          onClear={() => persist([])}
          onCancel={() => {
            setEditing(false);
            setMessage(null);
          }}
        />
      )}
    </div>
  );
}

function routeTotalKm(points: GpxPoint[]): number {
  let cum = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    cum += 2 * R * Math.asin(Math.sqrt(h));
  }
  return cum;
}
