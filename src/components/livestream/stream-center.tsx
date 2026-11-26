"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Maximize2, PanelBottom, Tv, Volume2, VolumeX, X } from "lucide-react";
import type { StreamCenterTile } from "@/lib/youtube-live/stream-center";
import {
  parseStreamCenterPrefs,
  streamCenterView,
  toggleStreamCenterTile,
  type StreamCenterLayout,
  type StreamCenterPrefs,
} from "@/lib/youtube-live/stream-center-view";
import { AddExtraStreamForm, type ExtraStreamRace } from "./add-extra-stream";
import { cn } from "@/lib/utils";

// Het streamcenter (2026-11-24): alle streams van een race tegelijk. Geluid van
// hooguit één tegel: de luidspreker zet het daar aan en bij de rest uit, en wie
// het in de YouTube-speler zelf aanzet, dempt de rest ook. Dat gaat met
// postMessage naar de embed (enablejsapi), zonder het script van YouTube.
// Op een smal scherm (telefoon) start niets vanzelf: vier livestreams tegelijk
// kosten te veel mobiele data. Daar tik je een tegel zelf aan, of je tikt op
// TV: dan starten ze allemaal gedempt, om je scherm naar de TV te spiegelen.
// TV (2026-11-25): het raster schermvullend op zwart, zonder app eromheen en
// zonder scrollen, voor casten of HDMI; het scherm blijft dan aan. Dezelfde
// elementen blijven staan, alleen de klassen wisselen: een iframe dat React
// opnieuw neerzet, laadt de stream opnieuw.

// Kiezen (2026-11-26): welke streams in beeld zijn, en Raster of Groot (één
// stream breed, de rest klein eronder). Een verborgen stream heeft geen speler,
// dus geen data. Groot zetten verplaatst niets in de pagina, alleen op het
// scherm (CSS order): een iframe dat verhuist, laadt opnieuw.

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
const CHIP = "inline-flex min-h-8 max-w-full items-center rounded-full border px-3 text-xs disabled:cursor-not-allowed";

// De keuze per avond op dit apparaat. Lukt localStorage niet (privévenster),
// dan blijft hij in het geheugen tot de pagina sluit.
const PREFS_EVENT = "zwb-streamcenter-prefs";
const memory = new Map<string, string>();

function subscribePrefs(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFS_EVENT, onChange);
  };
}

function readPrefs(key: string): string | null {
  const kept = memory.get(key);
  if (kept !== undefined) return kept;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function usePrefs(key: string): [StreamCenterPrefs, (next: StreamCenterPrefs) => void] {
  const raw = useSyncExternalStore(
    subscribePrefs,
    () => readPrefs(key),
    () => null,
  );
  const prefs = useMemo(() => parseStreamCenterPrefs(raw), [raw]);
  const save = useCallback(
    (next: StreamCenterPrefs) => {
      const value = JSON.stringify(next);
      memory.set(key, value);
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Alleen in het geheugen.
      }
      window.dispatchEvent(new Event(PREFS_EVENT));
    },
    [key],
  );
  return [prefs, save];
}

type PlayerInfo = { muted?: boolean; playing?: boolean };
type WakeLock = { release: () => Promise<void> };
type LockableOrientation = { lock?: (type: "landscape") => Promise<void>; unlock?: () => void };

/** screen.orientation met lock: niet in elke browser, en niet in de DOM-typen. */
function orientation(): LockableOrientation | undefined {
  return (screen as Screen & { orientation?: LockableOrientation }).orientation;
}

function unlockOrientation() {
  try {
    orientation()?.unlock?.();
  } catch {
    // Niet vergrendeld of niet ondersteund.
  }
}

export function StreamCenter({
  tiles,
  addRaces = [],
}: {
  tiles: StreamCenterTile[];
  /** Races waar nog een extra stream bij kan (0370). */
  addRaces?: ExtraStreamRace[];
}) {
  const wide = useWide();
  const frames = useRef(new Map<string, HTMLIFrameElement>());
  const info = useRef(new Map<string, PlayerInfo>());
  const [soundId, setSoundId] = useState<string | null>(null);
  const soundRef = useRef<string | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const [tv, setTv] = useState(false);
  const [prefs, savePrefs] = usePrefs(`zwb-streamcenter:${usePathname()}`);
  const ids = tiles.map((tile) => tile.id);
  const view = streamCenterView(ids, prefs);
  const shown = tiles.filter((tile) => view.visible.includes(tile.id));
  const big = view.big;

  // Esc of de knop van de browser sluit schermvullend: dan ook TV uit.
  useEffect(() => {
    if (!tv) return;
    function onFullscreen() {
      if (document.fullscreenElement) return;
      setTv(false);
      unlockOrientation();
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

  function toggleTile(id: string) {
    const next = toggleStreamCenterTile(ids, prefs, id);
    if (next.hidden.includes(id) && soundRef.current === id) {
      soundRef.current = null;
      setSoundId(null);
    }
    savePrefs(next);
  }

  function setLayout(layout: StreamCenterLayout) {
    savePrefs({ ...prefs, layout });
  }

  /** Groot zetten geeft ook het geluid. */
  function makeBig(id: string) {
    savePrefs({ ...prefs, big: id });
    giveSound(id);
  }

  function openTv() {
    setTv(true);
    // TV start alle streams, ook op de telefoon (spiegelen naar de TV); wie
    // geluid had, houdt het. Terugkijken start niet vanzelf.
    for (const tile of shown) {
      if (tile.ended) continue;
      if (tile.id !== soundRef.current) command(tile.id, "mute");
      command(tile.id, "playVideo");
    }
    // Lukt schermvullend niet (iPhone), dan blijft het raster over de pagina.
    // Lukt het wel, dan ligt een telefoon (Android) meteen dwars; dat mag
    // alleen schermvullend, en een computer weigert het gewoon.
    container.current
      ?.requestFullscreen?.()
      .then(() => orientation()?.lock?.("landscape"))
      .catch(() => {});
  }

  function closeTv() {
    setTv(false);
    unlockOrientation();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

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

  // Raster: zoals altijd, met de streams in beeld. Groot: de grote over de hele
  // breedte, de kleine eronder (telefoon 3, computer 4, TV 6 naast elkaar).
  const small = shown.length - 1;
  const columns = big
    ? Math.max(1, Math.min(small, tv ? 6 : wide ? 4 : 3))
    : tvColumns(shown.length);
  const gridStyle = big
    ? {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        ...(tv && { gridTemplateRows: `minmax(0, 3fr) repeat(${Math.ceil(small / columns)}, minmax(0, 1fr))` }),
      }
    : tv
      ? {
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${Math.ceil(shown.length / columns)}, minmax(0, 1fr))`,
        }
      : undefined;
  const layoutButton = (layout: StreamCenterLayout, label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      aria-pressed={prefs.layout === layout}
      onClick={() => setLayout(layout)}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 px-3 text-xs font-medium",
        prefs.layout === layout ? "bg-muted" : "bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
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
      <div className={cn("flex flex-wrap items-start gap-2", tv && "hidden")}>
        {tiles.length > 1 && (
          // Op de telefoon in een eigen rij onder de knoppen.
          <div className="order-last flex w-full flex-wrap gap-1.5 md:order-none md:w-auto md:min-w-0 md:flex-1">
            {tiles.map((tile) => {
              const inView = view.visible.includes(tile.id);
              return (
                <button
                  key={tile.id}
                  type="button"
                  aria-pressed={inView}
                  disabled={inView && shown.length === 1}
                  onClick={() => toggleTile(tile.id)}
                  className={cn(
                    CHIP,
                    inView
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="truncate">{tile.label}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="ml-auto flex gap-2">
          {shown.length > 1 && (
            <div className="flex overflow-hidden rounded-md border">
              {layoutButton("raster", "Raster", LayoutGrid)}
              {layoutButton("groot", "Groot", PanelBottom)}
            </div>
          )}
          <button
            type="button"
            onClick={openTv}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted"
          >
            <Tv className="size-3.5" aria-hidden />
            TV
          </button>
        </div>
      </div>
      <ul
        className={cn(
          "grid",
          tv ? "h-full gap-1" : big ? "gap-3" : cn("grid-cols-1 gap-3", gridClass(shown.length)),
        )}
        style={gridStyle}
      >
        {shown.map((tile) => {
          const hasSound = soundId === tile.id;
          const isBig = big === tile.id;
          const bigButton = (className: string) =>
            big && !isBig ? (
              <button
                type="button"
                aria-label={`Groot: ${tile.label}`}
                onClick={() => makeBig(tile.id)}
                className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-md", className)}
              >
                <Maximize2 className="size-4" />
              </button>
            ) : null;
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
            <li
              key={tile.id}
              className={cn(
                "min-w-0",
                tv ? "min-h-0" : "space-y-1.5",
                // Niet hoger dan 70% van het scherm.
                isBig && !tv && "mx-auto w-full max-w-[calc(70vh*16/9)]",
              )}
              style={isBig ? { order: -1, gridColumn: "1 / -1" } : undefined}
            >
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
                  <span className="flex shrink-0 gap-1">
                    {bigButton("pointer-events-auto bg-black/70 text-white/60 hover:bg-black/90 hover:text-white")}
                    {soundButton(
                      cn("pointer-events-auto bg-black/70 hover:bg-black/90", hasSound ? "text-white" : "text-white/60"),
                    )}
                  </span>
                </div>
              </div>
              <div className={cn("space-y-1", tv && "hidden")}>
                <div className="flex items-center gap-1 text-sm">
                  {tile.live && <span className="size-2 shrink-0 rounded-full bg-red-600" aria-label="live" />}
                  <span className="min-w-0 flex-1 truncate">{tile.label}</span>
                  {bigButton("text-muted-foreground hover:bg-muted")}
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
      <div className={cn(tv && "hidden")}>
        <AddExtraStreamForm races={addRaces} />
      </div>
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
