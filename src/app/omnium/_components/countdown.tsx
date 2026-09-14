"use client";

import { useSyncExternalStore } from "react";

// Een tikkende klok als externe store in plaats van een effect met setState:
// dat laatste is een cascade-render en wordt door de React-lintregels afgekeurd.
// De serversnapshot is 0, zodat server en client hetzelfde eerste beeld geven
// en er geen hydratieverschil ontstaat.
function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => 0;

function parts(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function label(totalSeconds: number): string {
  const { days, hours, minutes, seconds } = parts(totalSeconds);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Telt af naar een moment. Toont niets zolang de klok nog niet loopt (server
 * of eerste render) en niets meer zodra het moment voorbij is — een aftelling
 * die op nul blijft staan is verwarrender dan geen aftelling.
 */
export function Countdown({
  targetIso,
  prefix,
}: {
  targetIso: string;
  prefix: string;
}) {
  const nowSeconds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  if (nowSeconds === 0) return null;

  const remaining = Math.floor(new Date(targetIso).getTime() / 1000) - nowSeconds;
  if (remaining <= 0) return null;

  return (
    <span className="tabular-nums">
      {prefix} {label(remaining)}
    </span>
  );
}
