"use client";

import { useMemo, useState } from "react";
import {
  AIR_DENSITY,
  arrivalSecondsAtKm,
  DEFAULT_CDA,
  DEFAULT_CRR,
  DEFAULT_EQUIPMENT_KG,
  estimateRide,
  type RouteSegment,
} from "@/lib/ride-estimate";
import { pickHourForTime } from "@/lib/route-weather-map";
import {
  classifyWind,
  compassDirection,
  type RoutePointForecast,
  type WindForecast,
} from "@/lib/weather";
import type { ClimbInfo, RouteSampleSegment } from "@/lib/route-sample";
import type { ClimbCategory } from "@/lib/gpx-climbs";
import { WindSummary } from "./wind-summary";

const WIND_BADGE: Record<
  "tegenwind" | "meewind" | "zijwind" | "stil",
  { label: string; cls: string }
> = {
  tegenwind: { label: "Tegen", cls: "text-destructive" },
  meewind: { label: "Mee", cls: "text-emerald-600 dark:text-emerald-400" },
  zijwind: { label: "Zij", cls: "text-amber-600 dark:text-amber-400" },
  stil: { label: "Stil", cls: "text-muted-foreground" },
};

function timeHHmm(date: Date) {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

function durationLabel(seconds: number) {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}u ${m.toString().padStart(2, "0")}m` : `${m} min`;
}

export function RouteWeather({
  forecast,
  rideBearing,
  routePoints,
  segments,
  climbs,
  totalKm,
  startAtIso,
  defaultWkg,
  riderWeightKg,
  equipmentKg = DEFAULT_EQUIPMENT_KG,
}: {
  forecast: WindForecast;
  rideBearing: number | null;
  routePoints: RoutePointForecast[];
  segments: RouteSampleSegment[];
  climbs: ClimbInfo[];
  totalKm: number;
  startAtIso: string;
  defaultWkg: number;
  riderWeightKg: number;
  equipmentKg?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [baseWkg, setBaseWkg] = useState(defaultWkg);
  // Alleen expliciet bijgestelde klimmen; de rest volgt de basis.
  const [climbWkg, setClimbWkg] = useState<Record<number, number>>({});

  const wkgForClimb = (index: number) => climbWkg[index] ?? baseWkg;

  const segmentEndKms = useMemo(() => {
    const out: number[] = [];
    let cum = 0;
    for (const s of segments) {
      cum += s.distanceM / 1000;
      out.push(cum);
    }
    return out;
  }, [segments]);

  const estimate = useMemo(() => {
    const modelSegments: RouteSegment[] = segments.map((s) => ({
      distanceM: s.distanceM,
      gradient: s.gradient,
      watts:
        (s.climbIndex === null ? baseWkg : wkgForClimb(s.climbIndex)) * riderWeightKg,
    }));
    return estimateRide({
      segments: modelSegments,
      totalMassKg: riderWeightKg + equipmentKg,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, baseWkg, climbWkg, riderWeightKg, equipmentKg]);

  const startAt = useMemo(() => new Date(startAtIso), [startAtIso]);

  const rows = useMemo(() => {
    return routePoints.map((point) => {
      const arrivalSec = arrivalSecondsAtKm(estimate, segmentEndKms, point.km);
      const arrivalUtc = new Date(startAt.getTime() + arrivalSec * 1000);
      const hour = pickHourForTime(point.hours, arrivalUtc);
      return { point, arrivalUtc, hour };
    });
  }, [routePoints, estimate, segmentEndKms, startAt]);

  const finishUtc = new Date(startAt.getTime() + estimate.totalSeconds * 1000);
  const avgKmh =
    estimate.totalSeconds > 0 ? (totalKm / (estimate.totalSeconds / 3600)) : 0;

  return (
    <div className="space-y-2">
      <WindSummary
        forecast={forecast}
        rideBearing={rideBearing}
        expandable
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
      />

      {expanded && (
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-muted-foreground">
              Aankomst ± <span className="font-semibold text-foreground">{timeHHmm(finishUtc)}</span>
              {" · "}
              {durationLabel(estimate.totalSeconds)} · {Math.round(avgKmh)} km/h gem.
            </p>
            <button
              type="button"
              onClick={() => setShowExplain(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Uitleg
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-sm">
              <span className="flex items-center justify-between">
                <span className="font-medium">Tempo (basis)</span>
                <span className="tabular-nums text-muted-foreground">{baseWkg.toFixed(1)} w/kg</span>
              </span>
              <input
                type="range"
                min={1.5}
                max={8}
                step={0.1}
                value={baseWkg}
                onChange={(e) => setBaseWkg(Number(e.target.value))}
                className="mt-1 w-full accent-primary"
              />
            </label>

            {climbs.map((climb) => (
              <label key={climb.index} className="block text-sm">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">
                    {climb.name ?? `Klim ${climb.index + 1}`}
                    <span className="ml-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                      {categoryShort(climb.category)} · {Math.round(climb.startKm)}–{Math.round(climb.endKm)} km
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">{wkgForClimb(climb.index).toFixed(1)} w/kg</span>
                </span>
                <input
                  type="range"
                  min={1.5}
                  max={8}
                  step={0.1}
                  value={wkgForClimb(climb.index)}
                  onChange={(e) =>
                    setClimbWkg((prev) => ({ ...prev, [climb.index]: Number(e.target.value) }))
                  }
                  className="mt-1 w-full accent-primary"
                />
              </label>
            ))}
          </div>

          <ul className="divide-y text-sm">
            {rows.map(({ point, arrivalUtc, hour }) => {
              const cls = hour
                ? classifyWind(hour.windDirectionFrom, point.bearing, hour.windSpeedKmh)
                : null;
              const badge = cls ? WIND_BADGE[cls.category] : null;
              return (
                <li key={point.km} className="flex items-center gap-3 py-2">
                  <span className="w-12 shrink-0 font-semibold tabular-nums">
                    {timeHHmm(arrivalUtc)}
                  </span>
                  <span className="w-14 shrink-0 tabular-nums text-muted-foreground">
                    {Math.round(point.km)} km
                  </span>
                  {hour ? (
                    <span className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="tabular-nums">
                        {Math.round(hour.windSpeedKmh)} km/h{" "}
                        <span className="text-muted-foreground">{compassDirection(hour.windDirectionFrom)}</span>
                      </span>
                      {badge && <span className={`text-xs font-medium ${badge.cls}`}>{badge.label}</span>}
                      {hour.temperatureC !== null && (
                        <span className="tabular-nums text-muted-foreground">
                          {Math.round(hour.temperatureC)}°
                        </span>
                      )}
                      {hour.precipitationMm !== null && hour.precipitationMm > 0 && (
                        <span className="tabular-nums text-muted-foreground">
                          {hour.precipitationMm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} mm
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex-1 text-muted-foreground">—</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {showExplain && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setShowExplain(false)}
        >
          <div
            className="w-full max-w-md space-y-3 rounded-lg border bg-card p-5 text-sm shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold">Hoe wordt dit berekend?</h3>
              <button
                type="button"
                onClick={() => setShowExplain(false)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Sluiten"
              >
                ✕
              </button>
            </div>
            <p className="text-muted-foreground">
              Per stukje route lossen we de vermogensbalans op naar snelheid: jouw
              vermogen (w/kg × {Math.round(riderWeightKg)} kg) gaat naar luchtweerstand,
              rolweerstand en het overwinnen van de helling. De doorkomsttijd is de start
              plus alle segmenttijden bij elkaar.
            </p>
            <p className="text-muted-foreground">
              Aannames: CdA {DEFAULT_CDA} m² (handen op de kappen), rolweerstand{" "}
              {DEFAULT_CRR} (asfalt), luchtdichtheid {AIR_DENSITY} kg/m³ en{" "}
              {equipmentKg} kg uitrusting bovenop jouw gewicht.
            </p>
            <p className="text-muted-foreground">
              Met de schuifjes stel je je tempo per klim los in. Wind zit níét in het
              tempo — die staat per doorkomstpunt los vermeld, omdat richting en sterkte
              onderweg wisselen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function categoryShort(category: ClimbCategory) {
  return category === "HC" ? "HC" : category;
}
