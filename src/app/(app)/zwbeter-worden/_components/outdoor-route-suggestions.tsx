"use client";

// Rondjes bij een geplande buitentraining, vanaf een eigen vertrekpunt.
//
// Anders dan de Zwift-voorstellen staan deze er niet vanzelf: een rondje kost
// een call naar een routeplanner, dus het lid vraagt erom. Daarna blijven ze
// staan tot hij opnieuw vraagt.
//
// Alleen feiten in de kaart -- afstand, hoogtemeters, geschatte tijd, wat de
// wind doet. De uitleg staat op /hulp.

import { useState, useTransition } from "react";
import { Download, MapPin, Wind } from "lucide-react";
import Link from "next/link";
import {
  chooseOutdoorRoute,
  generateOutdoorRoutesAction,
} from "../_actions";

export type OutdoorRouteView = {
  id: string;
  distanceKm: number;
  elevationM: number;
  estimatedMinutes: number;
  scorePct: number;
  summary: string | null;
  windNote: string | null;
  chosen: boolean;
};

export type StartPointOption = { id: string; label: string };

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}u${`${rest}`.padStart(2, "0")}` : `${rest} min`;
}

function scoreTone(scorePct: number) {
  if (scorePct >= 80) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  if (scorePct >= 68) return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

export function OutdoorRouteSuggestions({
  workoutId,
  routes,
  startPoints,
}: {
  workoutId: string;
  routes: OutdoorRouteView[];
  startPoints: StartPointOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [startPointId, setStartPointId] = useState(startPoints[0]?.id ?? "");

  function generate() {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("workout_id", workoutId);
      if (startPointId) formData.set("start_point_id", startPointId);
      const outcome = await generateOutdoorRoutesAction(formData);
      if (!outcome.ok) setError(outcome.error);
    });
  }

  function choose(routeId: string) {
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("route_id", routeId);
      const outcome = await chooseOutdoorRoute(formData);
      if (!outcome.ok) setError(outcome.error ?? "Er ging iets mis.");
    });
  }

  if (startPoints.length === 0) {
    return (
      <div className="rounded-md border bg-primary/5 p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="size-4 shrink-0 text-primary" />
          Buiten rijden
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Zet een vertrekpunt op{" "}
          <Link href="/profiel#vertrekpunten" className="underline hover:text-foreground">
            je profiel
          </Link>
          , dan stelt ZWB hier rondjes voor.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-primary/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="size-4 shrink-0 text-primary" />
          Buiten rijden
          <Link
            href="/hulp#routevoorstellen"
            title="Hulp bij routevoorstellen"
            aria-label="Hulp bij routevoorstellen"
            className="text-xs font-normal text-muted-foreground underline hover:text-foreground"
          >
            uitleg
          </Link>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {startPoints.length > 1 ? (
            <select
              value={startPointId}
              onChange={(event) => setStartPointId(event.target.value)}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
              aria-label="Vertrekpunt"
            >
              {startPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.label}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
          >
            {pending ? "Bezig..." : routes.length > 0 ? "Opnieuw" : "Stel rondjes voor"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      {routes.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {routes.map((route) => (
            <li
              key={route.id}
              className={`rounded-md border bg-background p-3 ${route.chosen ? "border-primary" : ""}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${scoreTone(route.scorePct)}`}
                >
                  {route.scorePct}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {route.distanceKm.toFixed(0)} km · {route.elevationM} hm ·{" "}
                    {duration(route.estimatedMinutes)}
                  </p>
                  {route.windNote ? (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Wind className="size-3 shrink-0" />
                      {route.windNote}
                    </p>
                  ) : null}
                  {route.summary ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{route.summary}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {route.chosen ? (
                      <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                        Gekozen
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => choose(route.id)}
                        disabled={pending}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-60"
                      >
                        Kies dit rondje
                      </button>
                    )}
                    <a
                      href={`/api/training/outdoor-routes/${route.id}/gpx`}
                      className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                    >
                      <Download className="size-3" />
                      GPX
                    </a>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
