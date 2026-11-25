"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Tv, Volume2, VolumeX, X } from "lucide-react";
import type { StreamCenterTile } from "@/lib/youtube-live/stream-center";
import { cn } from "@/lib/utils";

// Het streamcenter (2026-11-24): alle streams van een race tegelijk. Geluid van
// hooguit één tegel: de luidspreker zet het daar aan en bij de rest uit, en wie
// het in de YouTube-speler zelf aanzet, dempt de rest ook. Dat gaat met
// postMessage naar de embed (enablejsapi), zonder het script van YouTube.
// Op een smal scherm (telefoon) start niets vanzelf: vier livestreams tegelijk
// kosten te veel mobiele data. Daar tik je een tegel zelf aan.
// TV (2026-11-25): het raster schermvullend op zwart, zonder app eromheen en
// zonder scrollen, voor casten of HDMI; het scherm blijft dan aan. Dezelfde
// elementen blijven staan, alleen de klassen wisselen: een iframe dat React
// opnieuw neerzet, laadt de stream opnieuw.

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

/** Kolommen in TV: 4 in 2×2 vult een 16:9-scherm precies, 5 en 6 in 3×2. */
function tvColumns(count: number) {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}

const LINK = "inline-flex min-h-7 items-center rounded-md border bg-card px-2 text-xs hover:bg-muted";

type PlayerInfo = { muted?: boolean; playing?: boolean };
type WakeLock = { release: () => Promise<void> };

export function StreamCenter({ tiles }: { tiles: StreamCenterTile[] }) {
  const wide = useWide();
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const info = useRef(new Map<string, PlayerInfo>());
  const [soundId, setSoundId] = useState<string | null>(null);
  const soundRef = useRef<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [tv, setTv] = useState(false);

  function openTv() {
    setTv(true);
    // Lukt schermvullend niet (iPhone), dan blijft het raster over de pagina.
    container.current?.requestFullscreen?.().catch(() => {});
  }

  function closeTv() {
    setTv(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  // Esc of de knop van de browser sluit schermvullend: dan ook TV uit.
  useEffect(() => {
    if (!tv) return;
    function onFullscreen() {
      if (!document.fullscreenElement) setTv(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setTv(false);
    }
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("keydown", onKey);
    };
  }, [tv]);

  // Het scherm blijft aan zolang TV open is.
  useEffect(() => {
    if (!tv) return;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLock> } })
      .wakeLock;
    if (!wakeLock) return;
    let lock: WakeLock | null = null;
    let stopped = false;
    const request = () => {
      if (document.visibilityState !== "visible") return;
      wakeLock
        .request("screen")
        .then((next) => {
          if (stopped) next.release().catch(() => {});
          else lock = next;
        })
        .catch(() => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", request);
      lock?.release().catch(() => {});
    };
  }, [tv]);

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

  const columns = tvColumns(tiles.length);
  return (
    <div
      ref={container}
      className={cn(
        tv
          ? "fixed inset-0 z-50 bg-black p-1"
          : // Breder dan de rest van de app: de tegels hebben de ruimte nodig.
            "space-y-2 md:relative md:left-1/2 md:w-[min(100vw-2rem,100rem)] md:-translate-x-1/2",
      )}
    >
      <div className={cn("flex justify-end", tv && "hidden")}>
        <button
          type="button"
          onClick={openTv}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
        >
          <Tv className="size-3.5" aria-hidden />
          TV
        </button>
      </div>
      <ul
        className={cn("grid", tv ? "h-full gap-1" : cn("grid-cols-1 gap-3", gridClass(tiles.length)))}
        style={
          tv
            ? {
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${Math.ceil(tiles.length / columns)}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {tiles.map((tile) => {
          const hasSound = soundId === tile.id;
          const soundButton = (className: string) => (
            <button
              type="button"
              aria-pressed={hasSound}
              aria-label={hasSound ? `Geluid uit: ${tile.label}` : `Geluid aan: ${tile.label}`}
              onClick={() => giveSound(hasSound ? null : tile.id)}
              className={cn("inline-flex size-9 items-center justify-center rounded-md", className)}
            >
              {hasSound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>
          );
          return (
            <li key={tile.id} className={cn("min-w-0", tv ? "min-h-0" : "space-y-1.5")}>
              <div
                className={cn(
                  "relative w-full overflow-hidden",
                  tv ? "h-full rounded-sm bg-black" : "aspect-video rounded-md bg-muted",
                )}
              >
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
                {/* In TV: label en luidspreker over het beeld. */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-1.5",
                    !tv && "hidden",
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    {tile.live && <span className="size-2 shrink-0 rounded-full bg-red-600" aria-hidden />}
                    <span className="truncate">{tile.label}</span>
                  </span>
                  {soundButton(
                    cn("pointer-events-auto bg-black/70 hover:bg-black/90", hasSound ? "text-white" : "text-white/60"),
                  )}
                </div>
              </div>
              <div className={cn("space-y-1", tv && "hidden")}>
                <div className="flex items-center gap-1 text-sm">
                  {tile.live && <span className="size-2 shrink-0 rounded-full bg-red-600" aria-label="live" />}
                  <span className="min-w-0 flex-1 truncate">{tile.label}</span>
                  {soundButton(cn("hover:bg-muted", hasSound ? "text-primary" : "text-muted-foreground"))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={tile.href} className={LINK}>
                    Race
                  </Link>
                  {tile.links.map((link) =>
                    link.external ? (
                      <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                        {link.label}
                      </a>
                    ) : (
                      <Link key={link.key} href={link.href} className={LINK}>
                        {link.label}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        aria-label="TV sluiten"
        onClick={closeTv}
        className={cn(
          "absolute right-2 bottom-2 z-10 inline-flex size-9 items-center justify-center rounded-md bg-black/60 text-white/70 hover:text-white",
          !tv && "hidden",
        )}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
