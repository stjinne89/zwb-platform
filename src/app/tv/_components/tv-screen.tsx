"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StreamCenter } from "@/components/livestream/stream-center";
import type { StreamCenterTile } from "@/lib/youtube-live/stream-center";

// Een gekoppelde tv: het raster van vanavond, en elke halve minuut opnieuw
// gevraagd, zodat een stream die erbij komt of live gaat vanzelf verschijnt.
// De tegels houden hun sleutel, dus wat al speelt, laadt niet opnieuw.

const REFRESH_MS = 30_000;

export function TvScreen({ tiles, night }: { tiles: StreamCenterTile[]; night: string }) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  if (tiles.length === 0) {
    const day = new Date(`${night}T12:00:00Z`).toLocaleDateString("nl-NL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
    return (
      <main className="fixed inset-0 flex flex-col items-center justify-center gap-2 bg-black text-white">
        <p className="text-3xl font-semibold">Geen streams</p>
        <p className="text-lg text-white/60">{day}</p>
      </main>
    );
  }

  return <StreamCenter tiles={tiles} fixedTv />;
}
