"use client";

// ZWB DS: het hoogteprofiel van de race met de renners erop.
//
// De server geeft elke 15 s een stand die al naar hetzelfde moment is geschat.
// Hier schuiven de stippen daartussen vier keer per seconde door op hun laatste
// snelheid, zodat het beeld beweegt in plaats van te springen. Geen CSS-overgang:
// die begon bij de positie uit de serverweergave en liep in een tabblad op de
// achtergrond niet door. Hooguit 20 s ver: daarna is
// er al een nieuwe stand, of klopt de schatting niet meer.

import { useEffect, useRef, useState } from "react";
import type { DsMark } from "@/lib/ds/field";

export type CourseRider = {
  id: string;
  name: string;
  zwb: boolean;
  me: boolean;
  distanceM: number;
  speedMs: number;
  finished: boolean;
};

type Profile = { distanceM: number[]; altitudeM: number[] };

const MAX_AHEAD_S = 20;
/** Breedte van de uitvergrote strook: anderhalve kilometer voor en achter. */
const WINDOW_M = 1500;
/** Een vlakke route mag niet als een berg ogen: minstens zoveel meter hoogteverschil in beeld. */
const MIN_RISE_M = 30;

function altitudeAt(profile: Profile | null, m: number): number {
  if (!profile || profile.distanceM.length < 2) return 0;
  const d = profile.distanceM;
  if (m <= d[0]) return profile.altitudeM[0];
  if (m >= d[d.length - 1]) return profile.altitudeM[d.length - 1];
  let lo = 0;
  let hi = d.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (d[mid] <= m) lo = mid;
    else hi = mid;
  }
  const span = d[hi] - d[lo] || 1;
  return profile.altitudeM[lo] + ((m - d[lo]) / span) * (profile.altitudeM[hi] - profile.altitudeM[lo]);
}

function scaleY(profile: Profile | null, fromM: number, toM: number, height: number, padTop: number, padBottom: number) {
  if (!profile) return () => height / 2;
  const inView = profile.altitudeM.filter((_, i) => profile.distanceM[i] >= fromM && profile.distanceM[i] <= toM);
  const lo = Math.min(...inView, altitudeAt(profile, fromM), altitudeAt(profile, toM));
  const hi = Math.max(...inView, altitudeAt(profile, fromM), altitudeAt(profile, toM));
  const mid = (lo + hi) / 2;
  const rise = Math.max(hi - lo, MIN_RISE_M);
  return (alt: number) => height - padBottom - ((alt - (mid - rise / 2)) / rise) * (height - padTop - padBottom);
}

function areaPath(profile: Profile | null, fromM: number, toM: number, x: (m: number) => number, y: (alt: number) => number, height: number) {
  const points: Array<[number, number]> = [[fromM, altitudeAt(profile, fromM)]];
  if (profile) {
    profile.distanceM.forEach((m, i) => {
      if (m > fromM && m < toM) points.push([m, profile.altitudeM[i]]);
    });
  }
  points.push([toM, altitudeAt(profile, toM)]);
  const line = points.map(([m, alt], i) => `${i ? "L" : "M"}${x(m).toFixed(1)},${y(alt).toFixed(1)}`).join("");
  return { line, area: `${line}L${x(toM).toFixed(1)},${height}L${x(fromM).toFixed(1)},${height}Z` };
}

/**
 * Renners die op het scherm bijna op elkaar liggen, stapelen we boven het
 * profiel: zo is een groep van twintig te zien als groep en niet als één stip.
 * De eigen renners eerst, zodat zij op het profiel liggen en hun naam eronder
 * past; de rest van voor naar achter erboven.
 */
function stack(list: Array<{ id: string; x: number; zwb: boolean }>, gapPx: number, maxLanes: number) {
  const lanes = new Map<string, number>();
  const placed: Array<{ x: number; lane: number }> = [];
  for (const item of [...list].sort((a, b) => Number(b.zwb) - Number(a.zwb) || b.x - a.x)) {
    const taken = new Set(placed.filter((p) => Math.abs(p.x - item.x) < gapPx).map((p) => p.lane));
    let lane = 0;
    while (taken.has(lane) && lane < maxLanes) lane++;
    placed.push({ x: item.x, lane });
    lanes.set(item.id, lane);
  }
  return lanes;
}

function firstName(name: string) {
  return name.replace(/\s*[[(].*$/, "").split(" ")[0];
}

export function DsCourse({
  profile,
  routeM,
  marks,
  riders,
}: {
  profile: Profile | null;
  routeM: number;
  marks: DsMark[];
  riders: CourseRider[];
}) {
  // Getekend op de echte breedte, zodat stippen en namen op een telefoon even
  // groot zijn als op een groot scherm.
  const box = useRef<HTMLElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setW(Math.max(240, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [aheadS, setAheadS] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setAheadS(Math.min(MAX_AHEAD_S, (Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  const at = (r: CourseRider) => (r.finished ? routeM : Math.min(routeM, r.distanceM + r.speedMs * aheadS));
  const racing = riders.filter((r) => !r.finished);
  const me = racing.find((r) => r.me);
  const leader = racing.reduce<CourseRider | null>((best, r) => (!best || at(r) > at(best) ? r : best), null);
  const focus = me ?? leader;

  // Hele race.
  const fullH = 110;
  const fx = (m: number) => (m / routeM) * W;
  const fy = scaleY(profile, 0, routeM, fullH, 26, 8);
  const full = areaPath(profile, 0, routeM, fx, fy, fullH);

  // Uitvergroot rond de focus.
  const center = focus ? at(focus) : 0;
  const fromM = Math.max(0, Math.min(center - WINDOW_M, routeM - 2 * WINDOW_M));
  const toM = Math.min(routeM, fromM + 2 * WINDOW_M);
  const zoomH = 130;
  const zx = (m: number) => ((m - fromM) / (toM - fromM || 1)) * W;
  const zy = scaleY(profile, fromM, toM, zoomH, 40, 30);
  const zoom = areaPath(profile, fromM, toM, zx, zy, zoomH);
  const inWindow = riders.filter((r) => at(r) >= fromM && at(r) <= toM);

  const dot = (x: number, y: number) => ({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` });
  const fullLanes = stack(riders.map((r) => ({ id: r.id, x: fx(at(r)), zwb: r.zwb })), 6, 4);
  const zoomLanes = stack(inWindow.map((r) => ({ id: r.id, x: zx(at(r)), zwb: r.zwb })), 9, 4);
  const zwbLast = (a: CourseRider, b: CourseRider) => Number(a.zwb) - Number(b.zwb);

  return (
    <section ref={box} className="space-y-3 rounded-lg border bg-card px-4 py-3">
      <svg viewBox={`0 0 ${W} ${fullH}`} className="block w-full" role="img" aria-label="Hoogteprofiel van de race">
        <path d={full.area} className="fill-muted" />
        <path d={full.line} className="fill-none stroke-muted-foreground/60" strokeWidth={1.5} />
        {marks.map((mark) => (
          <g key={`${mark.name}-${mark.atM}`}>
            <title>{mark.name}</title>
            <line x1={fx(mark.atM)} x2={fx(mark.atM)} y1={fy(altitudeAt(profile, mark.atM))} y2={fullH} className="stroke-muted-foreground/40" strokeWidth={1} strokeDasharray="3 3" />
          </g>
        ))}
        <rect x={fx(fromM)} y={0} width={fx(toM) - fx(fromM)} height={fullH} className="fill-primary/10" />
        {[...riders].sort(zwbLast).map((r) => (
          <circle
            key={r.id}
            r={r.zwb ? 5 : 3.5}
            className={r.zwb ? "fill-primary stroke-background" : "fill-foreground/70 stroke-background"}
            strokeWidth={1.5}
            style={{
              ...dot(fx(at(r)), fy(altitudeAt(profile, at(r))) - (fullLanes.get(r.id) ?? 0) * 5),
            }}
          >
            <title>{r.name}</title>
          </circle>
        ))}
      </svg>

      {focus && (
        <svg viewBox={`0 0 ${W} ${zoomH}`} className="block w-full" role="img" aria-label={me ? "Rond jou" : "Rond de kop"}>
          <path d={zoom.area} className="fill-muted" />
          <path d={zoom.line} className="fill-none stroke-muted-foreground/60" strokeWidth={1.5} />
          {marks
            .filter((mark) => mark.atM >= fromM && mark.atM <= toM)
            .map((mark) => (
              <g key={`${mark.name}-${mark.atM}`}>
                <line x1={zx(mark.atM)} x2={zx(mark.atM)} y1={zy(altitudeAt(profile, mark.atM))} y2={zoomH} className="stroke-muted-foreground/40" strokeWidth={1} strokeDasharray="3 3" />
                <text x={zx(mark.atM) + 4} y={zoomH - 6} className="fill-muted-foreground text-[11px]">
                  {mark.name}
                </text>
              </g>
            ))}
          {[...inWindow]
            .sort(zwbLast)
            .map((r) => (
              <g
                key={r.id}
                style={{
                  ...dot(zx(at(r)), zy(altitudeAt(profile, at(r))) - (zoomLanes.get(r.id) ?? 0) * 7),
                    }}
              >
                <title>{r.name}</title>
                <circle r={r.zwb ? 6 : 4.5} className={r.zwb ? "fill-primary stroke-background" : "fill-foreground/70 stroke-background"} strokeWidth={1.5} />
                {r.zwb && (
                  <text y={20} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                    {r.me ? "Jij" : firstName(r.name)}
                  </text>
                )}
              </g>
            ))}
        </svg>
      )}
    </section>
  );
}
