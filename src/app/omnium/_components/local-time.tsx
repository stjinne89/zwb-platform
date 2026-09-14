"use client";

import { useSyncExternalStore } from "react";

const AMSTERDAM = "Europe/Amsterdam";

function format(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

// Server rendert altijd Amsterdam, de client mag daarna zijn eigen zone tonen.
// Via useSyncExternalStore in plaats van een effect met setState: dat laatste
// is een cascade-render en wordt door de React-lintregels afgekeurd.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Toont de starttijd in de zone van de bezoeker naast de Nederlandse tijd. Het
 * veld is internationaal en de starttijd staat vast op Amsterdamse tijd, dus
 * één keer per seizoen verschuift het uur elders in de wereld.
 */
export function LocalTime({ iso }: { iso: string }) {
  const hydrated = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const zone = hydrated
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : AMSTERDAM;
  const showLocal = hydrated && zone && zone !== AMSTERDAM;

  return (
    <span className="inline-flex flex-wrap gap-x-2">
      <span className="tabular-nums">{format(iso, AMSTERDAM)} CET/CEST</span>
      {showLocal && (
        <span className="tabular-nums text-muted-foreground">
          · {format(iso, zone)} your time
        </span>
      )}
    </span>
  );
}
