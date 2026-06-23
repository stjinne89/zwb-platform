"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Pencil } from "lucide-react";
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
import {
  POI_TYPES,
  POI_TYPE_LIST,
  type EventPoi,
  type PoiType,
  type ProfilePoi,
} from "./poi";
import { addEventPoi, removeEventPoi, saveEventClimbs } from "../_actions";

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
  initialPois = [],
  currentUserId = null,
}: {
  gpxUrl: string;
  cols?: ColLite[];
  eventId?: string;
  canManage?: boolean;
  initialClimbs?: ClimbRange[];
  initialPois?: EventPoi[];
  currentUserId?: string | null;
}) {
  const [points, setPoints] = useState<GpxPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeClimb, setActiveClimb] = useState<number | null>(null);

  const [overrides, setOverrides] = useState<ClimbRange[]>(initialClimbs);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClimbRange[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // POI's (waterpunten e.d.) — door leden geplaatst, blijvend op kaart + profiel.
  const [pois, setPois] = useState<EventPoi[]>(initialPois);
  const [placing, setPlacing] = useState(false);
  const [poiDraft, setPoiDraft] = useState<{
    lat: number;
    lng: number;
    type: PoiType;
    label: string;
  } | null>(null);
  const [poiSaving, setPoiSaving] = useState(false);

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

  // Cumulatieve km per route-punt — voor het projecteren van POI's op het profiel.
  const cumKm = useMemo(() => {
    const out: number[] = new Array(points.length);
    out[0] = 0;
    for (let i = 1; i < points.length; i++) {
      out[i] = out[i - 1] + segmentKm(points[i - 1], points[i]);
    }
    return out;
  }, [points]);

  const projectKm = (lat: number, lng: number): number => {
    if (points.length === 0) return 0;
    let bestIdx = 0;
    let bd = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = (points[i].lat - lat) ** 2 + (points[i].lon - lng) ** 2;
      if (d < bd) {
        bd = d;
        bestIdx = i;
      }
    }
    return cumKm[bestIdx] ?? 0;
  };

  // Toon de opgeslagen POI's + (tijdens plaatsen) de live draft-POI.
  const displayPois: EventPoi[] = poiDraft
    ? [
        ...pois,
        {
          id: "__draft__",
          type: poiDraft.type,
          label: poiDraft.label || null,
          lat: poiDraft.lat,
          lng: poiDraft.lng,
          createdBy: currentUserId,
        },
      ]
    : pois;

  const profilePois: ProfilePoi[] = displayPois.map((p) => ({
    id: p.id,
    type: p.type,
    label: p.label,
    km: projectKm(p.lat, p.lng),
  }));

  const canPlacePoi = Boolean(eventId && currentUserId && points.length > 1);

  const onMapClick = (lat: number, lng: number) => {
    if (!placing) return;
    setPoiDraft((prev) => ({ lat, lng, type: prev?.type ?? "water", label: prev?.label ?? "" }));
  };

  const savePoi = async () => {
    if (!eventId || !poiDraft) return;
    setPoiSaving(true);
    const res = await addEventPoi(eventId, {
      type: poiDraft.type,
      label: poiDraft.label,
      lat: poiDraft.lat,
      lng: poiDraft.lng,
    });
    setPoiSaving(false);
    if (!res.ok) return;
    setPois((prev) => [...prev, res.poi as EventPoi]);
    setPoiDraft(null);
    setPlacing(false);
  };

  const deletePoi = async (id: string) => {
    setPois((prev) => prev.filter((p) => p.id !== id));
    const res = await removeEventPoi(id);
    if (!res.ok) {
      // Terugzetten bij fout (best-effort).
      const removed = pois.find((p) => p.id === id);
      if (removed) setPois((prev) => [...prev, removed]);
    }
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
          pois={displayPois}
          placing={placing}
          onMapClick={onMapClick}
          onDeletePoi={deletePoi}
          currentUserId={currentUserId}
          canModerate={canManage}
        />
        <ElevationProfile
          points={points}
          climbs={climbs}
          activeClimb={activeClimb}
          onActiveClimb={setActiveClimb}
          pois={profilePois}
        />
      </div>

      {canPlacePoi && (
        <div className="space-y-2">
          {!placing && !poiDraft ? (
            <button
              type="button"
              onClick={() => setPlacing(true)}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MapPin className="size-3.5" />
              POI toevoegen
            </button>
          ) : !poiDraft ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Klik op de kaart om een punt te plaatsen…</span>
              <button
                type="button"
                onClick={() => setPlacing(false)}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Type
                <select
                  value={poiDraft.type}
                  onChange={(e) =>
                    setPoiDraft({ ...poiDraft, type: e.target.value as PoiType })
                  }
                  className="rounded border bg-background px-2 py-1 text-sm text-foreground"
                >
                  {POI_TYPE_LIST.map((t) => (
                    <option key={t} value={t}>
                      {POI_TYPES[t].emoji} {POI_TYPES[t].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
                Label (optioneel)
                <input
                  type="text"
                  value={poiDraft.label}
                  onChange={(e) => setPoiDraft({ ...poiDraft, label: e.target.value })}
                  placeholder={POI_TYPES[poiDraft.type].label}
                  className="rounded border bg-background px-2 py-1 text-sm text-foreground"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPoiDraft(null);
                    setPlacing(false);
                  }}
                  disabled={poiSaving}
                  className="rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={savePoi}
                  disabled={poiSaving}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {poiSaving ? "Bezig…" : "Plaatsen"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

function segmentKm(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function routeTotalKm(points: GpxPoint[]): number {
  let cum = 0;
  for (let i = 1; i < points.length; i++) cum += segmentKm(points[i - 1], points[i]);
  return cum;
}
