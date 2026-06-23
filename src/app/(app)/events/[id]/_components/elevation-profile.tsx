"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { GpxPoint } from "@/lib/gpx";
import type { Climb } from "@/lib/gpx-climbs";
import {
  ClimbBadges,
  ClimbBands,
  ClimbInfoCard,
  ClimbLegend,
} from "./climb-overlay";
import { POI_TYPES, type ProfilePoi } from "./poi";

const HEIGHT = 100;
const PADDING = 4;

function haversineKm(a: GpxPoint, b: GpxPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Geometry = {
  width: number;
  xFor: (km: number) => number;
  linePath: string;
  areaPath: string;
};

export function ElevationProfile({
  points,
  climbs,
  activeClimb,
  onActiveClimb,
  pois = [],
}: {
  points: GpxPoint[];
  climbs: Climb[];
  activeClimb: number | null;
  onActiveClimb: (index: number | null) => void;
  pois?: ProfilePoi[];
}) {
  const [hover, setHover] = useState<
    { km: number; ele: number; grade: number } | null
  >(null);
  const [fullscreen, setFullscreen] = useState(false);

  const stats = useMemo(() => {
    if (points.length < 2) return null;
    let cumKm = 0;
    const samples: { km: number; ele: number }[] = [];
    let minEle = Infinity;
    let maxEle = -Infinity;
    let gain = 0;
    for (let i = 0; i < points.length; i++) {
      if (i > 0) cumKm += haversineKm(points[i - 1], points[i]);
      const ele = points[i].ele;
      if (ele === undefined) continue;
      samples.push({ km: cumKm, ele });
      if (ele < minEle) minEle = ele;
      if (ele > maxEle) maxEle = ele;
      if (i > 0) {
        const prevEle = points[i - 1].ele;
        if (prevEle !== undefined && ele > prevEle) gain += ele - prevEle;
      }
    }
    if (samples.length < 2) return null;
    return { samples, totalKm: cumKm, minEle, maxEle, gain };
  }, [points]);

  const geometry: Geometry | null = useMemo(() => {
    if (!stats) return null;
    const { samples, totalKm, minEle, maxEle } = stats;
    const step = Math.max(1, Math.floor(samples.length / 250));
    const decimated = samples.filter(
      (_, i) => i % step === 0 || i === samples.length - 1,
    );
    const eleRange = Math.max(1, maxEle - minEle);
    const width = 1000;
    const xFor = (km: number) => PADDING + (km / totalKm) * (width - 2 * PADDING);
    const yFor = (ele: number) =>
      HEIGHT - PADDING - ((ele - minEle) / eleRange) * (HEIGHT - 2 * PADDING);

    let linePath = `M ${xFor(decimated[0].km)},${yFor(decimated[0].ele)}`;
    for (let i = 1; i < decimated.length; i++) {
      linePath += ` L ${xFor(decimated[i].km)},${yFor(decimated[i].ele)}`;
    }
    const areaPath =
      `M ${xFor(decimated[0].km)},${HEIGHT - PADDING} ` +
      linePath.replace(/^M /, "L ") +
      ` L ${xFor(decimated[decimated.length - 1].km)},${HEIGHT - PADDING} Z`;
    return { width, xFor, linePath, areaPath };
  }, [stats]);

  const sampleAtKm = useCallback(
    (km: number): { km: number; ele: number } | null => {
      if (!stats) return null;
      const { samples } = stats;
      let best = samples[0];
      let bestDelta = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const delta = Math.abs(samples[i].km - km);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = samples[i];
        } else if (samples[i].km > km) {
          break;
        }
      }
      return best;
    },
    [stats],
  );

  const onScrub = useCallback(
    (km: number | null) => {
      if (km == null) {
        setHover(null);
        return;
      }
      const center = sampleAtKm(km);
      if (!center) {
        setHover(null);
        return;
      }
      // Lokaal stijgingspercentage over een ~100 m-venster (minder ruisgevoelig
      // dan punt-tot-punt).
      const lo = sampleAtKm(km - 0.05) ?? center;
      const hi = sampleAtKm(km + 0.05) ?? center;
      const dDistM = (hi.km - lo.km) * 1000;
      const grade = dDistM > 0 ? ((hi.ele - lo.ele) / dDistM) * 100 : 0;
      setHover({ km: center.km, ele: center.ele, grade });
    },
    [sampleAtKm],
  );

  const onSelectAtKm = useCallback(
    (km: number) => {
      const idx = climbs.findIndex((c) => km >= c.startKm && km <= c.endKm);
      onActiveClimb(idx >= 0 && idx !== activeClimb ? idx : null);
    },
    [climbs, activeClimb, onActiveClimb],
  );

  if (!stats || !geometry) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Geen hoogtedata in deze GPX.
      </div>
    );
  }

  const { totalKm, minEle, maxEle, gain } = stats;

  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <h3 className="font-semibold">Hoogteprofiel</h3>
        <span className="text-muted-foreground">
          {totalKm.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km ·{" "}
          {Math.round(gain)} hm · {Math.round(minEle)}–{Math.round(maxEle)}m
        </span>
      </div>

      <div className="relative">
        <ProfileChart
          geometry={geometry}
          climbs={climbs}
          activeClimb={activeClimb}
          totalKm={totalKm}
          cursorKm={hover?.km ?? null}
          idSuffix="inline"
          pois={pois}
          onScrub={onScrub}
          onSelectAtKm={onSelectAtKm}
          onTapFullscreen={() => setFullscreen(true)}
        />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Hoogteprofiel vergroten"
          className="absolute right-1 top-1 rounded-md bg-card/80 p-1 text-muted-foreground shadow-sm backdrop-blur transition hover:text-foreground"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {/* Readout onder het profiel — verdwijnt niet achter de categorie-badges. */}
      <div className="h-5 text-sm tabular-nums text-muted-foreground">
        {hover
          ? `${hover.km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km · ${Math.round(hover.ele)} m · ${hover.grade.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`
          : ""}
      </div>

      <ClimbLegend climbs={climbs} />

      {activeClimb !== null && climbs[activeClimb] && (
        <ClimbInfoCard climb={climbs[activeClimb]} />
      )}

      {fullscreen && (
        <FullscreenProfile
          geometry={geometry}
          climbs={climbs}
          activeClimb={activeClimb}
          totalKm={totalKm}
          hover={hover}
          pois={pois}
          onScrub={onScrub}
          onSelectAtKm={onSelectAtKm}
          onClose={() => {
            setFullscreen(false);
            setHover(null);
          }}
        />
      )}
    </div>
  );
}

function ProfileChart({
  geometry,
  climbs,
  activeClimb,
  totalKm,
  cursorKm,
  idSuffix,
  rotated = false,
  fill = false,
  pois = [],
  onScrub,
  onSelectAtKm,
  onTapFullscreen,
  heightClass = "h-24 w-full sm:h-28",
}: {
  geometry: Geometry;
  climbs: Climb[];
  activeClimb: number | null;
  totalKm: number;
  cursorKm: number | null;
  idSuffix: string;
  rotated?: boolean;
  fill?: boolean;
  pois?: ProfilePoi[];
  onScrub: (km: number | null) => void;
  onSelectAtKm: (km: number) => void;
  onTapFullscreen?: () => void;
  heightClass?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, xFor, linePath, areaPath } = geometry;

  const ratioFromEvent = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    // In de geroteerde (liggende) weergave loopt de afstand-as langs de
    // verticale schermrichting.
    const r = rotated
      ? (clientY - rect.top) / rect.height
      : (clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, r));
  };

  return (
    <div
      ref={ref}
      className={`relative touch-none select-none ${fill ? "h-full w-full" : ""}`}
      onPointerMove={(e) => onScrub(ratioFromEvent(e.clientX, e.clientY) * totalKm)}
      onPointerLeave={() => onScrub(null)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" && onTapFullscreen) {
          onTapFullscreen();
          return;
        }
        const km = ratioFromEvent(e.clientX, e.clientY) * totalKm;
        onScrub(km);
        onSelectAtKm(km);
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={`block ${fill ? "h-full w-full" : heightClass}`}
        aria-label="Hoogteprofiel van de route"
      >
        <defs>
          <linearGradient id={`elev-fill-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--color-zwb-petrol)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <ClimbBands
          climbs={climbs}
          xFor={xFor}
          height={HEIGHT}
          activeIndex={activeClimb}
        />
        <path d={areaPath} fill={`url(#elev-fill-${idSuffix})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-zwb-petrol)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {cursorKm != null && (
          <line
            x1={xFor(cursorKm)}
            y1={0}
            x2={xFor(cursorKm)}
            y2={HEIGHT}
            stroke="var(--color-zwb-petrol)"
            strokeWidth="1"
            strokeOpacity="0.6"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      <ClimbBadges
        climbs={climbs}
        totalKm={totalKm}
        activeIndex={activeClimb}
        onSelect={(i) => onSelectAtKm((climbs[i].startKm + climbs[i].endKm) / 2)}
      />

      {/* POI's: blijvend zichtbaar op de tijdlijn van het profiel. */}
      <div className="pointer-events-none absolute inset-0">
        {pois.map((poi) => {
          const left = totalKm > 0 ? (poi.km / totalKm) * 100 : 0;
          const meta = POI_TYPES[poi.type];
          return (
            <div
              key={poi.id}
              className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center"
              style={{ left: `${left}%` }}
              title={poi.label?.trim() || meta.label}
            >
              <span className="text-[0.7rem] leading-none drop-shadow-sm">
                {meta.emoji}
              </span>
              <span
                className="w-px flex-1"
                style={{ backgroundColor: meta.color, opacity: 0.5, minHeight: 6 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FullscreenProfile({
  geometry,
  climbs,
  activeClimb,
  totalKm,
  hover,
  pois = [],
  onScrub,
  onSelectAtKm,
  onClose,
}: {
  geometry: Geometry;
  climbs: Climb[];
  activeClimb: number | null;
  totalKm: number;
  hover: { km: number; ele: number; grade: number } | null;
  pois?: ProfilePoi[];
  onScrub: (km: number | null) => void;
  onSelectAtKm: (km: number) => void;
  onClose: () => void;
}) {
  const [win, setWin] = useState<{ w: number; h: number } | null>(null);
  // Touch-apparaat (telefoon/tablet) vs. desktop met muis. Bepaalt of we
  // mogen draaien — op desktop nooit, ook niet in een smal venster.
  const [coarse, setCoarse] = useState(false);

  // Body-scroll vergrendelen + Escape sluit.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Meet het scherm zodat we een liggend "canvas" kunnen maken dat na rotatie
  // het hele scherm vult.
  useLayoutEffect(() => {
    const measure = () => {
      setWin({ w: window.innerWidth, h: window.innerHeight });
      setCoarse(window.matchMedia("(pointer: coarse)").matches);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const readout = hover
    ? `${hover.km.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km · ${Math.round(hover.ele)} m · ${hover.grade.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`
    : "Sleep of tik op het profiel";

  // Alleen op een touch-apparaat in portret draaien we naar liggend voor
  // maximaal zicht; op desktop tonen we het profiel gewoon groot, niet gedraaid.
  const rotated = coarse && !!win && win.h > win.w;

  const content = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b p-3">
        <span className="text-sm font-medium tabular-nums">{readout}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          className="rounded-md border bg-background p-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden p-2">
        <ProfileChart
          geometry={geometry}
          climbs={climbs}
          activeClimb={activeClimb}
          totalKm={totalKm}
          cursorKm={hover?.km ?? null}
          idSuffix="full"
          rotated={rotated}
          fill
          pois={pois}
          onScrub={onScrub}
          onSelectAtKm={onSelectAtKm}
        />
      </div>
      {activeClimb !== null && climbs[activeClimb] && (
        <div className="shrink-0 border-t p-3">
          <ClimbInfoCard climb={climbs[activeClimb]} />
        </div>
      )}
    </>
  );

  // z-[1000] zodat het boven de Leaflet-kaart valt (panes tot z-700); bg-card is
  // volledig ondoorzichtig.
  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden bg-card">
      {win &&
        (rotated ? (
          // Portret: het hele canvas 90° draaien zodat alles liggend staat,
          // te lezen door de telefoon te kantelen. Breedte = schermhoogte,
          // hoogte = schermbreedte, zodat het na rotatie precies past.
          <div
            className="absolute left-1/2 top-1/2 flex flex-col"
            style={{
              width: win.h,
              height: win.w,
              transform: "translate(-50%, -50%) rotate(90deg)",
            }}
          >
            {content}
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">{content}</div>
        ))}
    </div>
  );
}
