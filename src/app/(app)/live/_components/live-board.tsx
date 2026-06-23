"use client";

import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { EmptyState } from "@/components/app-ui";
import { LiveMap, type MapFocus, type PositionRow } from "./live-map";
import type { ActiveSession } from "../types";

const MODE_LABELS: Record<ActiveSession["mode"], string> = {
  outdoor: "Outdoor",
  zwift: "Zwift",
  mywhoosh: "MyWhoosh",
  wahoo_indoor: "Wahoo",
  other_indoor: "Indoor",
};

// Kaart + riderslijst delen één client-boundary, zodat een klik op een outdoor-
// rider de kaart naar dat lid laat vliegen. De mySession-afhankelijke blokken
// (OwnTracks, start/stop) blijven server-side en komen via children binnen.
export function LiveBoard({
  sessions,
  outdoorSessions,
  initialPositions,
  children,
}: {
  sessions: ActiveSession[];
  outdoorSessions: ActiveSession[];
  initialPositions: PositionRow[];
  children: React.ReactNode;
}) {
  const [focus, setFocus] = useState<MapFocus | null>(null);

  const indoorCount = sessions.filter((s) => s.mode !== "outdoor").length;
  const externalCount = sessions.filter((s) => s.external_track_url).length;
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
                          onClick={() =>
                            setFocus({ sessionId: s.id, nonce: Date.now() })
                          }
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
                          LiveTrack
                          <ArrowUpRight className="size-3" />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border bg-card p-4">
            <p className="text-2xl font-semibold">{indoorCount}</p>
            <p className="text-sm text-muted-foreground">Indoor actief</p>
          </div>
          <div className="rounded-md border bg-card p-4">
            <p className="text-2xl font-semibold">{externalCount}</p>
            <p className="text-sm text-muted-foreground">Met LiveTrack-link</p>
          </div>
        </section>

        {children}
      </div>
    </div>
  );
}
