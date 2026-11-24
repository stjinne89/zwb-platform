"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import type { StreamCenterTile } from "@/lib/youtube-live/stream-center";
import { cn } from "@/lib/utils";

// Het streamcenter (2026-11-24): alle streams van een race tegelijk. Geluid van
// hooguit één tegel: de luidspreker zet het daar aan en bij de rest uit, en wie
// het in de YouTube-speler zelf aanzet, dempt de rest ook. Dat gaat met
// postMessage naar de embed (enablejsapi), zonder het script van YouTube.
// Op een smal scherm (telefoon) start niets vanzelf: vier livestreams tegelijk
// kosten te veel mobiele data. Daar tik je een tegel zelf aan.

const YT_ORIGIN = "https://www.youtube-nocookie.com";
const WIDE = "(min-width: 768px)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** null op de server: dan nog geen spelers, pas na het laden weten we de breedte. */
function useWide(): boolean | null {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => null,
  );
}

function embedSrc(tile: StreamCenterTile, autoplay: boolean, origin: string) {
  const params = new URLSearchParams({ playsinline: "1", rel: "0", enablejsapi: "1", origin });
  // Vanzelf starten mag alleen gedempt.
  if (autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1");
  }
  return `${YT_ORIGIN}/embed/${encodeURIComponent(tile.videoId)}?${params}`;
}

/** Tegels per rij: 2 naast elkaar, 3–4 in 2×2, vanaf 5 drie breed. */
function gridClass(count: number) {
  if (count <= 1) return "md:grid-cols-1";
  if (count <= 4) return "md:grid-cols-2";
  return "md:grid-cols-2 xl:grid-cols-3";
}

type PlayerInfo = { muted?: boolean; playing?: boolean };

export function StreamCenter({ tiles }: { tiles: StreamCenterTile[] }) {
  const wide = useWide();
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const info = useRef(new Map<string, PlayerInfo>());
  const [soundId, setSoundId] = useState<string | null>(null);
  const soundRef = useRef<string | null>(null);

  const command = useCallback((id: string, func: string) => {
    frames.current.get(id)?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), YT_ORIGIN);
  }, []);

  /** Geluid naar deze tegel (of nergens), de rest gedempt. */
  const giveSound = useCallback(
    (id: string | null) => {
      soundRef.current = id;
      setSoundId(id);
      for (const tile of tiles) {
        if (tile.id === id) {
          command(tile.id, "unMute");
          command(tile.id, "playVideo");
        } else {
          command(tile.id, "mute");
        }
      }
    },
    [tiles, command],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== YT_ORIGIN || typeof event.data !== "string") return;
      let message: { event?: string; info?: { muted?: boolean; playerState?: number } | null };
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message.event !== "infoDelivery" || !message.info) return;
      const id = [...frames.current].find(([, frame]) => frame.contentWindow === event.source)?.[0];
      if (!id) return;
      const current = info.current.get(id) ?? {};
      if (typeof message.info.muted === "boolean") current.muted = message.info.muted;
      // 1 = speelt, 3 = laadt.
      if (typeof message.info.playerState === "number") current.playing = [1, 3].includes(message.info.playerState);
      info.current.set(id, current);
      // Geluid aan in de speler zelf: deze krijgt het, de rest gaat uit.
      if (current.playing && current.muted === false && soundRef.current !== id) giveSound(id);
      if (current.muted === true && soundRef.current === id) {
        soundRef.current = null;
        setSoundId(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [giveSound]);

  /** De embed meldt zijn stand pas als we zeggen dat we luisteren. */
  function listen(id: string) {
    const frame = frames.current.get(id);
    if (!frame) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id }), YT_ORIGIN);
      if (++tries >= 5) window.clearInterval(timer);
    }, 1000);
  }

  return (
    // Breder dan de rest van de app: de tegels hebben de ruimte nodig.
    <div className="md:relative md:left-1/2 md:w-[min(100vw-2rem,100rem)] md:-translate-x-1/2">
      <ul className={cn("grid grid-cols-1 gap-3", gridClass(tiles.length))}>
        {tiles.map((tile) => {
          const hasSound = soundId === tile.id;
          return (
            <li key={tile.id} className="min-w-0 space-y-1.5">
              <div className="aspect-video w-full overflow-hidden rounded-md bg-muted">
                {wide !== null && (
                  <iframe
                    ref={(frame) => {
                      if (frame) frames.current.set(tile.id, frame);
                      else frames.current.delete(tile.id);
                    }}
                    src={embedSrc(tile, wide && !tile.ended, window.location.origin)}
                    onLoad={() => listen(tile.id)}
                    title={`Stream van ${tile.label}`}
                    className="size-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm">
                {tile.live && <span className="size-2 shrink-0 rounded-full bg-red-600" aria-label="live" />}
                <span className="min-w-0 flex-1 truncate">{tile.label}</span>
                <button
                  type="button"
                  aria-pressed={hasSound}
                  aria-label={hasSound ? `Geluid uit: ${tile.label}` : `Geluid aan: ${tile.label}`}
                  onClick={() => giveSound(hasSound ? null : tile.id)}
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-md hover:bg-muted",
                    hasSound ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {hasSound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                </button>
                <Link
                  href={tile.href}
                  aria-label={`Racepagina: ${tile.label}`}
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
