"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { LiveMap, type MapFocus, type PositionRow } from "./live-map";
import type { ActiveSession, RiderStats } from "../types";

const MODE_LABELS: Record<ActiveSession["mode"], string> = {
  outdoor: "Outdoor",
  zwift: "Zwift",
  mywhoosh: "MyWhoosh",
  wahoo_indoor: "Wahoo",
  other_indoor: "Indoor",
};

function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Alleen de waarden die er zijn: zonder sensor geen lege vakjes. */
function statTiles(stats: RiderStats) {
  const elapsedMs = Date.parse(stats.recordedAt) - Date.parse(stats.rideStartAt);
  const avgKmh =
    stats.distanceM !== null && elapsedMs > 60_000
      ? stats.distanceM / 1000 / (elapsedMs / 3_600_000)
      : null;
  const tiles: { label: string; value: string }[] = [];
  if (stats.speedKmh !== null) tiles.push({ label: "Snelheid", value: `${formatNumber(stats.speedKmh, 1)} km/u` });
  if (avgKmh !== null) tiles.push({ label: "Gemiddeld", value: `${formatNumber(avgKmh, 1)} km/u` });
  if (stats.distanceM !== null) tiles.push({ label: "Afstand", value: `${formatNumber(stats.distanceM / 1000, 1)} km` });
  tiles.push({ label: "Onderweg", value: formatDuration(elapsedMs) });
  if (stats.powerW !== null) tiles.push({ label: "Vermogen", value: `${stats.powerW} W` });
  if (stats.cadenceRpm !== null) tiles.push({ label: "Cadans", value: `${stats.cadenceRpm} rpm` });
  if (stats.heartRate !== null) tiles.push({ label: "Hartslag", value: `${stats.heartRate} bpm` });
  return tiles;
}

// Kaart + riderslijst delen één client-boundary, zodat een klik op een outdoor-
// rider de kaart naar dat lid laat vliegen. De koppelpanelen (Garmin/Wahoo,
// OwnTracks) blijven server-side en komen via children binnen.
export function LiveBoard({
  sessions,
  outdoorSessions,
  initialPositions,
  riderStats,
  children,
}: {
  sessions: ActiveSession[];
  outdoorSessions: ActiveSession[];
  initialPositions: PositionRow[];
  riderStats: Record<string, RiderStats>;
  children: React.ReactNode;
}) {
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const outdoorIds = new Set(outdoorSessions.map((s) => s.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="space-y-3">
        <LiveMap
          outdoorSessions={outdoorSessions}
          initialPositions={initialPositions}
          focus={focus}
        />
        {outdoorSessions.length === 0 && (
          <EmptyState>Geen outdoor riders actief.</EmptyState>
        )}
      </div>

      <div className="space-y-4">
        <section className="rounded-md border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Actieve riders ({sessions.length})</h2>
          </div>
          {sessions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Niemand is live.</p>
          ) : (
            <ul className="divide-y">
              {sessions.map((s) => {
                const canFocus = outdoorIds.has(s.id);
                const info = (
                  <>
                    <p className="truncate font-medium">
                      {canFocus && (
                        <MapPin className="mr-1 inline size-3.5 text-primary" />
                      )}
                      {s.profileName}
                      <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {MODE_LABELS[s.mode]}
                      </span>
                    </p>
                    {s.status_text && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {s.status_text}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sinds{" "}
                      {new Date(s.started_at).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Amsterdam",
                      })}
                    </p>
                  </>
                );
                return (
                  <li key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {canFocus ? (
                        <button
                          type="button"
                          onClick={() => {
                            setFocus({ sessionId: s.id, nonce: Date.now() });
                            setOpenId((current) => (current === s.id ? null : s.id));
                          }}
                          aria-expanded={openId === s.id}
                          className="min-w-0 flex-1 rounded text-left hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          title="Toon op de kaart"
                        >
                          {info}
                        </button>
                      ) : (
                        <div className="min-w-0 flex-1">{info}</div>
                      )}
                      {s.external_track_url && (
                        <a
                          href={s.external_track_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                        >
                          {s.source === "garmin"
                            ? "Garmin"
                            : s.source === "wahoo"
                              ? "Wahoo"
                              : "LiveTrack"}
                          <ArrowUpRight className="size-3" />
                        </a>
                      )}
                    </div>
                    {openId === s.id && riderStats[s.id] && (
                      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {statTiles(riderStats[s.id]).map((tile) => (
                          <div key={tile.label} className="rounded-md border bg-background p-2">
                            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                              {tile.label}
                            </dt>
                            <dd className="mt-0.5 font-medium tabular-nums">{tile.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {children}
      </div>
    </div>
  );
}
