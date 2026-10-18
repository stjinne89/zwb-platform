"use client";

// De renner van de rekenaar: een wielrenner in het ZWB-tenue van opzij, die
// meebeweegt met de houding, helm, fiets, wielen, bandenspanning en het wegdek.
// Het tenue is er in de winter- en de zomereditie, naar een foto van de club.
//
// De houding is data: een romphoek en de plek van de handen. Ellebogen en knieën
// rekent de figuur zelf uit met vaste lengtes, zodat de renner van houding kan
// wisselen zonder dat een arm onderweg krimpt. Kleuren komen uit `.renner` in
// globals.css, voor licht en donker.

import { useEffect, useId, useRef, useState } from "react";
import type { HoudingId, Onderdeel, SpanningId, WegdekId } from "@/lib/materiaal/rekenaar";

type P = [number, number];

export const VIEWBOX = { x: 0, y: -60, w: 400, h: 310 } as const;

const ACHTER: P = [110, 180];
const VOOR: P = [275, 180];
const WIEL = 54.5;
const GROND = 237;
const TRAPAS: P = [180, 192];
const ZADELBUIS: P = [157, 110];
const BALHOOFD_BOVEN: P = [246, 100];
const BALHOOFD_ONDER: P = [252, 122];
const HEUP: P = [142, 70];
const ROMP = 88;
const BOVENARM = 52;
const ONDERARM = 54;
const DIJ = 80;
const SCHEEN = 84;
const PEDAAL_NA: P = [207, 202];
const PEDAAL_VER: P = [153, 182];

type Pose = { romp: number; hand: P };

const POSES: Record<HoudingId, Pose> = {
  remgrepen: { romp: 40, hand: [273, 88] },
  beugel: { romp: 28, hand: [270, 112] },
  onderarmen: { romp: 16, hand: [273, 88] },
};

export type Tenue = "winter" | "zomer";

/** Wat de figuur tekent; de pagina leidt het af uit de gekozen producten. */
export type RennerBeeld = {
  houding: HoudingId;
  helm: "aero" | "gaten";
  aeroFiets: boolean;
  diepeWielen: boolean;
  spanning: SpanningId;
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const f = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`;

/** Twee botten van `a` naar `b`; het gewricht valt aan de kant van `zijde` (1 of -1). */
function gewricht(a: P, b: P, l1: number, l2: number, zijde: 1 | -1): P {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const ux = dx / d;
  const uy = dy / d;
  return [a[0] + ux * x - uy * h * zijde, a[1] + uy * x + ux * h * zijde];
}

function schouder(romp: number): P {
  return [HEUP[0] + ROMP * Math.cos(rad(romp)), HEUP[1] - ROMP * Math.sin(rad(romp))];
}

function hoofd(romp: number): P {
  const s = schouder(romp);
  const hoek = rad(romp + 30);
  return [s[0] + 30 * Math.cos(hoek), s[1] - 30 * Math.sin(hoek)];
}

/** Hoekpunt boven het hoofd, de romp en de fiets: daar staan de knoppen. */
export function ankers(beeld: RennerBeeld): Record<Onderdeel, P> {
  const pose = POSES[beeld.houding];
  const h = hoofd(pose.romp);
  return {
    helm: [h[0] - 2, h[1] - 26],
    houding: rompPunt(pose.romp, 46, -24),
    fiets: [214, 150],
    wielen: [ACHTER[0] - 30, ACHTER[1] - 30],
    banden: [VOOR[0] + 36, VOOR[1] + 44],
    kleding: [PEDAAL_NA[0] - 22, PEDAAL_NA[1] - 30],
  };
}

function rompPunt(romp: number, x: number, y: number): P {
  const c = Math.cos(rad(romp));
  const s = Math.sin(rad(romp));
  return [HEUP[0] + x * c + y * s, HEUP[1] - x * s + y * c];
}

/** Zachte overgang van de houding; direct bij `prefers-reduced-motion`. */
function useHouding(doel: Pose): Pose {
  const [pose, setPose] = useState(doel);
  const huidig = useRef(doel);
  useEffect(() => {
    const van = huidig.current;
    if (van.romp === doel.romp && van.hand[0] === doel.hand[0] && van.hand[1] === doel.hand[1]) return;
    const start = performance.now();
    // Bij minder beweging staat de renner in één frame in de nieuwe houding.
    const duur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520;
    let frame = 0;
    const stap = (nu: number) => {
      const t = duur === 0 ? 1 : Math.min(1, (nu - start) / duur);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const tussen: Pose = {
        romp: van.romp + (doel.romp - van.romp) * e,
        hand: [van.hand[0] + (doel.hand[0] - van.hand[0]) * e, van.hand[1] + (doel.hand[1] - van.hand[1]) * e],
      };
      huidig.current = tussen;
      setPose(tussen);
      if (t < 1) frame = requestAnimationFrame(stap);
    };
    frame = requestAnimationFrame(stap);
    return () => cancelAnimationFrame(frame);
  }, [doel]);
  return pose;
}

const ROMP_VORM =
  "M -3 12 L -7 -5 Q -4 -14 6 -15 Q 46 -25 86 -15 Q 97 -11 95 0 Q 92 9 79 10 Q 40 16 -3 12 Z";

function Romp({ romp, clipId, tenue, schim }: { romp: number; clipId: string; tenue?: Tenue; schim?: boolean }) {
  const transform = `translate(${pt(HEUP)}) rotate(${f(-romp)})`;
  if (schim) return <path d={ROMP_VORM} transform={transform} className="renner-schim" />;
  const zomer = tenue === "zomer";
  return (
    <g transform={transform}>
      <clipPath id={clipId}>
        <path d={ROMP_VORM} />
      </clipPath>
      <path d={ROMP_VORM} fill={zomer ? "var(--tenue-wit)" : "var(--tenue-blauw)"} />
      <g key={tenue} clipPath={`url(#${clipId})`} className="renner-wissel">
        {zomer ? (
          <>
            {/* Onderaan het blauwe vlak; de V van de voorkant loopt van opzij gezien schuin. */}
            <path d="M -12 20 L 30 20 L 44 -30 L -12 -30 Z" fill="var(--tenue-blauw)" />
            <path d="M -12 -30 L 30 -30 L 4 -4 Z" fill="var(--tenue-blauw-licht)" />
            <path d="M 4 -4 L 30 20 L -12 20 Z" fill="var(--tenue-blauw-lichter)" opacity="0.7" />
            <path d="M 18 -30 L 44 -30 L 36 -4 Z" fill="var(--tenue-blauw-donker)" opacity="0.6" />
          </>
        ) : (
          <>
            <path d="M -12 -30 L 22 -30 L 6 -2 Z" fill="var(--tenue-blauw-licht)" />
            <path d="M 6 -2 L 32 20 L -12 20 Z" fill="var(--tenue-blauw-lichter)" opacity="0.55" />
            <path d="M 22 -30 L 46 -30 L 30 4 Z" fill="var(--tenue-blauw-licht)" opacity="0.7" />
            <path d="M 30 4 L 50 20 L 32 20 Z" fill="var(--tenue-blauw-donker)" opacity="0.6" />
          </>
        )}
        {/* De gouden band op de borst. */}
        <path d="M 58 20 L 64 20 L 64 1 L 58 2 Z" fill="var(--tenue-goud)" />
      </g>
      {zomer && <path d={ROMP_VORM} fill="none" stroke="var(--renner-rand)" strokeWidth="1" />}
    </g>
  );
}

function Helm({ helm }: { helm: RennerBeeld["helm"] }) {
  const schaal =
    helm === "aero"
      ? "M -21 3 C -21 -15 -5 -22 8 -19 C 17 -17 21 -10 21 -3 L 14 -4 C 8 -9 -6 -9 -15 5 Z"
      : "M -17 4 C -19 -14 -4 -22 8 -19 C 16 -17 20 -10 21 -3 L 14 -4 C 8 -10 -6 -10 -12 4 Z";
  return (
    <g key={helm} className="renner-wissel">
      <path d={schaal} fill="var(--renner-helm)" stroke="var(--renner-rand)" strokeWidth="1" />
      {helm === "aero" ? (
        <path d="M -18 -2 C -15 -14 -2 -19 10 -16" fill="none" stroke="var(--renner-gat)" strokeWidth="1.4" strokeLinecap="round" />
      ) : (
        <g stroke="var(--renner-gat)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M -10 -11 L -4 -15" />
          <path d="M -1 -14 L 6 -16" />
          <path d="M 9 -14 L 14 -11" />
          <path d="M -13 -3 L -8 -7" />
        </g>
      )}
    </g>
  );
}

function Hoofd({ romp, helm }: { romp: number; helm: RennerBeeld["helm"] }) {
  const c = hoofd(romp);
  const knik = (40 - romp) * 0.35;
  return (
    <g transform={`translate(${pt(c)}) rotate(${f(knik)})`}>
      <circle r="13" fill="var(--renner-huid)" />
      <path d="M 7 -1 L 15 0" stroke="var(--renner-broek)" strokeWidth="3.2" strokeLinecap="round" />
      <Helm helm={helm} />
    </g>
  );
}

function Nek({ romp }: { romp: number }) {
  const van = rompPunt(romp, 80, -3);
  return <path d={`M ${pt(van)} L ${pt(hoofd(romp))}`} stroke="var(--renner-huid)" strokeWidth="11" strokeLinecap="round" />;
}

function Arm({ pose, tenue, ver, schim }: { pose: Pose; tenue?: Tenue; ver?: boolean; schim?: boolean }) {
  const s = add(schouder(pose.romp), ver ? [4, -3] : [0, 0]);
  const hand = add(pose.hand, ver ? [4, -3] : [0, 0]);
  const elleboog = gewricht(s, hand, BOVENARM, ONDERARM, 1);
  const mouw: P = [s[0] + (elleboog[0] - s[0]) * 0.45, s[1] + (elleboog[1] - s[1]) * 0.45];
  const boord: P = [s[0] + (elleboog[0] - s[0]) * 0.38, s[1] + (elleboog[1] - s[1]) * 0.38];
  if (schim) {
    return <path d={`M ${pt(s)} L ${pt(elleboog)} L ${pt(hand)}`} className="renner-schim renner-schim-lijn" />;
  }
  return (
    <g opacity={ver ? 0.55 : 1} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${pt(elleboog)} L ${pt(hand)}`} stroke="var(--renner-huid)" strokeWidth="9.5" />
      <path d={`M ${pt(mouw)} L ${pt(elleboog)}`} stroke="var(--renner-huid)" strokeWidth="11" />
      <path d={`M ${pt(s)} L ${pt(mouw)}`} stroke={tenue === "zomer" ? "var(--tenue-wit)" : "var(--tenue-blauw)"} strokeWidth="14" />
      <path d={`M ${pt(boord)} L ${pt(mouw)}`} stroke={tenue === "zomer" ? "var(--tenue-blauw)" : "var(--tenue-goud)"} strokeWidth="14" strokeLinecap="butt" />
      <circle cx={hand[0]} cy={hand[1]} r="5.5" fill="var(--renner-broek)" stroke="none" />
    </g>
  );
}

function Been({ pedaal, ver }: { pedaal: P; ver?: boolean }) {
  const heup = add(HEUP, ver ? [3, -2] : [0, 0]);
  const knie = gewricht(heup, pedaal, DIJ, SCHEEN, -1);
  const broek: P = [heup[0] + (knie[0] - heup[0]) * 0.78, heup[1] + (knie[1] - heup[1]) * 0.78];
  const langs = (t: number): P => [pedaal[0] + (knie[0] - pedaal[0]) * t, pedaal[1] + (knie[1] - pedaal[1]) * t];
  const enkel = langs(0.06);
  const sok = langs(0.3);
  const sokBand = langs(0.24);
  return (
    <g opacity={ver ? 0.55 : 1} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${pt(knie)} L ${pt(pedaal)}`} stroke="var(--renner-huid)" strokeWidth="12" />
      <path d={`M ${pt(broek)} L ${pt(knie)}`} stroke="var(--renner-huid)" strokeWidth="14" />
      <path d={`M ${pt(heup)} L ${pt(broek)}`} stroke="var(--renner-broek)" strokeWidth="18" />
      <path d={`M ${pt(enkel)} L ${pt(sok)}`} stroke="var(--renner-sok)" strokeWidth="12.5" strokeLinecap="butt" />
      <path d={`M ${pt(sokBand)} L ${pt(sok)}`} stroke="var(--tenue-blauw)" strokeWidth="12.5" strokeLinecap="butt" />
      <path d={`M ${pt(add(pedaal, [-11, -2]))} L ${pt(add(pedaal, [13, 2]))}`} stroke="var(--renner-schoen)" strokeWidth="8" />
    </g>
  );
}

function Wiel({ c, diep, spanning }: { c: P; diep: boolean; spanning: SpanningId }) {
  const spaken = diep ? 12 : 18;
  const binnen = diep ? 38 : 49;
  return (
    <g>
      <g stroke="var(--renner-velg)" strokeWidth="0.9">
        {Array.from({ length: spaken }, (_, i) => {
          const a = (i / spaken) * Math.PI * 2 + 0.2;
          return <line key={i} x1={c[0] + 4 * Math.cos(a)} y1={c[1] + 4 * Math.sin(a)} x2={c[0] + binnen * Math.cos(a)} y2={c[1] + binnen * Math.sin(a)} />;
        })}
      </g>
      <circle key={String(diep)} className="renner-wissel" cx={c[0]} cy={c[1]} r={diep ? 44.5 : 50.5} fill="none" stroke="var(--renner-velg-vlak)" strokeWidth={diep ? 13 : 3.5} />
      {diep && <circle cx={c[0]} cy={c[1]} r={42} fill="none" stroke="var(--tenue-goud)" strokeWidth="1.6" opacity="0.8" />}
      <circle cx={c[0]} cy={c[1]} r={WIEL} fill="none" stroke="var(--renner-band)" strokeWidth="5" />
      {spanning === "zacht" && <ellipse cx={c[0]} cy={GROND - 1.5} rx="12" ry="3" fill="var(--renner-band)" />}
      <circle cx={c[0]} cy={c[1]} r="4" fill="var(--renner-frame)" />
    </g>
  );
}

function Frame({ aero }: { aero: boolean }) {
  const buis = aero ? 9.5 : 5.5;
  const achterbrug: P = aero ? [166, 128] : ZADELBUIS;
  return (
    <g key={aero ? "aero" : "race"} className="renner-wissel" stroke="var(--renner-frame)" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${pt(TRAPAS)} L ${pt(ACHTER)}`} strokeWidth={aero ? 6 : 4.5} />
      <path d={`M ${pt(achterbrug)} L ${pt(ACHTER)}`} strokeWidth={aero ? 5 : 4} />
      <path d={`M ${pt(TRAPAS)} L ${pt(ZADELBUIS)}`} strokeWidth={buis} />
      <path d={`M ${pt(ZADELBUIS)} L ${pt(BALHOOFD_BOVEN)}`} strokeWidth={aero ? 8 : 5.5} />
      <path d={`M ${pt(TRAPAS)} L ${pt(BALHOOFD_ONDER)}`} strokeWidth={aero ? 11 : 6.5} />
      <path d={`M ${pt(BALHOOFD_BOVEN)} L ${pt(BALHOOFD_ONDER)}`} strokeWidth={aero ? 11 : 7} />
      <path d={`M ${pt(BALHOOFD_ONDER)} Q 268 150 ${pt(VOOR)}`} strokeWidth={aero ? 7 : 4.5} />
      {aero && <path d={`M ${pt(add(TRAPAS, [8, -14]))} L ${pt(add(BALHOOFD_ONDER, [-8, 10]))}`} stroke="var(--tenue-goud)" strokeWidth="2" />}
      <path d="M 157 110 L 148 80" strokeWidth="4" />
      <path d="M 131 78 Q 146 74 162 78" strokeWidth="5" />
      <path d={`M ${pt(BALHOOFD_BOVEN)} L 249 94 L 262 92`} strokeWidth={aero ? 6 : 4.5} />
      <path d="M 262 92 Q 272 88 277 94 Q 281 104 278 110 Q 274 116 266 114" strokeWidth="4" />
      <path d="M 270 90 L 276 86" strokeWidth="5" />
      <circle cx={TRAPAS[0]} cy={TRAPAS[1]} r="13" strokeWidth="2.5" />
      <path d={`M ${pt(PEDAAL_VER)} L ${pt(PEDAAL_NA)}`} strokeWidth="4.5" />
    </g>
  );
}

function Weg({ wegdek }: { wegdek: WegdekId }) {
  if (wegdek === "glad") {
    return <path d={`M 16 ${GROND + 2.5} L 384 ${GROND + 2.5}`} stroke="var(--renner-weg)" strokeWidth="3" strokeLinecap="round" />;
  }
  return (
    <g key="ruw" className="renner-wissel" fill="var(--renner-weg)">
      {Array.from({ length: 23 }, (_, i) => (
        <rect key={i} x={16 + i * 16} y={GROND + 1 + (i % 2) * 1.5} width="13.5" height={7 - (i % 3)} rx="3" />
      ))}
    </g>
  );
}

export function RennerFiguur({
  beeld,
  schim,
  tenue,
  wegdek,
  className,
}: {
  beeld: RennerBeeld;
  /** De houding van de andere opzet, als stippellijn erachter, als die verschilt. */
  schim?: HoudingId;
  tenue: Tenue;
  wegdek: WegdekId;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const doel = POSES[beeld.houding];
  const pose = useHouding(doel);
  const schimPose = schim && schim !== beeld.houding ? POSES[schim] : null;

  return (
    <svg
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`}
      className={className}
      role="img"
      aria-hidden="true"
    >
      <Weg wegdek={wegdek} />
      {schimPose && (
        <g className="renner-schim-groep">
          <Romp romp={schimPose.romp} clipId={`${id}-s`} schim />
          <Arm pose={schimPose} schim />
          <circle cx={hoofd(schimPose.romp)[0]} cy={hoofd(schimPose.romp)[1]} r="15" className="renner-schim" />
        </g>
      )}
      <Been pedaal={PEDAAL_VER} ver />
      <Arm pose={pose} tenue={tenue} ver />
      <Wiel c={ACHTER} diep={beeld.diepeWielen} spanning={beeld.spanning} />
      <Wiel c={VOOR} diep={beeld.diepeWielen} spanning={beeld.spanning} />
      <Frame aero={beeld.aeroFiets} />
      <Nek romp={pose.romp} />
      <Romp romp={pose.romp} clipId={`${id}-r`} tenue={tenue} />
      <Been pedaal={PEDAAL_NA} />
      <Hoofd romp={pose.romp} helm={beeld.helm} />
      <Arm pose={pose} tenue={tenue} />
    </svg>
  );
}
