"use client";

// De renner van de rekenaar: een wielrenner in het ZWB-tenue van opzij op een
// racefiets, semi-realistisch getekend (gekozen uit drie stijlproeven,
// 2026-11-27; `.impeccable/mocks/renner-stijlproeven.html`). Hij beweegt mee
// met de houding, helm, fiets, wielen, bandenspanning en het wegdek. Het tenue
// is er in de winter- en de zomereditie, naar een foto van de club. Helm, frame
// en wielen volgen het gekozen product: profiel en openingen van de helm, de
// kenmerken van het frame, velghoogte en spaken. Alleen vorm, geen logo's of
// merkkleuren (zie producttests.ts).
//
// Alles staat in millimeters op de geometrie van een racefiets in maat 56
// (stack 571, reach 395, kettingstag 410, trapasverlaging 72, balhoofd- en
// zitbuishoek 73,5°), met de achteras in de oorsprong en y naar beneden. Eén
// transform zet het in de viewBox van de pagina. De houding is data: heup,
// romphoek, pols en greep. Knieën en ellebogen rekent de figuur zelf uit met
// vaste lengtes, zodat de renner van houding kan wisselen zonder dat een arm
// onderweg krimpt.
//
// Elk onderdeel is een silhouet met zijn kleuren erin. Schaduw en strijklicht
// komen uit hetzelfde silhouet, verschoven en vervaagd (`Deel`), zodat ze bij
// elke vorm en houding vanzelf kloppen. Kleuren en sterktes komen uit `.renner`
// in globals.css, voor licht en donker.

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { FietsUiterlijk, HelmProfiel, HelmUiterlijk, WielUiterlijk } from "@/lib/materiaal/producttests";
import type { HoudingId, Onderdeel, SpanningId, WegdekId } from "@/lib/materiaal/rekenaar";

type P = [number, number];

export const VIEWBOX = { x: 0, y: -60, w: 400, h: 310 } as const;

/** Van millimeters naar de viewBox: de achteras staat op (110, 180). */
const SCHAAL = 0.166;
const OORSPRONG: P = [110, 180];
const naarBeeld = (q: P): P => [OORSPRONG[0] + q[0] * SCHAAL, OORSPRONG[1] + q[1] * SCHAAL];
const IN_MM = `translate(${OORSPRONG[0]} ${OORSPRONG[1]}) scale(${SCHAAL})`;

const D = Math.PI / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const lengte = (a: P) => Math.hypot(a[0], a[1]);
const eenheid = (a: P): P => mul(a, 1 / lengte(a));
const loodrecht = (a: P): P => [-a[1], a[0]];
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pool = (c: P, r: number, graden: number): P => [c[0] + r * Math.cos(graden * D), c[1] + r * Math.sin(graden * D)];
const f = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`;

/** Een buis met ronde uiteinden, taps van `wa` naar `wb`. */
function buis(a: P, b: P, wa: number, wb = wa): string {
  const n = loodrecht(eenheid(sub(b, a)));
  const ra = wa / 2;
  const rb = wb / 2;
  return `M${pt(add(a, mul(n, ra)))}L${pt(add(b, mul(n, rb)))}A${f(rb)} ${f(rb)} 0 0 0 ${pt(sub(b, mul(n, rb)))}L${pt(sub(a, mul(n, ra)))}A${f(ra)} ${f(ra)} 0 0 0 ${pt(add(a, mul(n, ra)))}Z`;
}

/** Een recht afgesneden band, zoals een mouwboord of sokrand. */
function band(a: P, b: P, wa: number, wb = wa): string {
  const n = loodrecht(eenheid(sub(b, a)));
  return `M${pt(add(a, mul(n, wa / 2)))}L${pt(add(b, mul(n, wb / 2)))}L${pt(sub(b, mul(n, wb / 2)))}L${pt(sub(a, mul(n, wa / 2)))}Z`;
}

/** Een ledemaat: taps, met een buik halverwege; `plus` en `min` geven elke kant extra. */
function lid(a: P, b: P, wa: number, wb: number, t: number, midden: number, plus = 0, min = 0): string {
  const n = loodrecht(eenheid(sub(b, a)));
  const m = lerp(a, b, t);
  const a1 = add(a, mul(n, wa / 2));
  const b1 = add(b, mul(n, wb / 2));
  const m1 = add(m, mul(n, midden / 2 + plus));
  const a2 = sub(a, mul(n, wa / 2));
  const b2 = sub(b, mul(n, wb / 2));
  const m2 = sub(m, mul(n, midden / 2 + min));
  const c1 = sub(mul(m1, 2), lerp(a1, b1, 0.5));
  const c2 = sub(mul(m2, 2), lerp(a2, b2, 0.5));
  return `M${pt(a1)}Q${pt(c1)} ${pt(b1)}A${f(wb / 2)} ${f(wb / 2)} 0 0 0 ${pt(b2)}Q${pt(c2)} ${pt(a2)}A${f(wa / 2)} ${f(wa / 2)} 0 0 0 ${pt(a1)}Z`;
}

function bezier(p0: P, p1: P, p2: P, p3: P, n = 20): P[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as P;
  });
}

/** Een gebogen buis als vlak langs `punten`, taps van `w0` naar `w1`, met ronde uiteinden. */
function kromme(punten: P[], w0: number, w1 = w0): string {
  const links: P[] = [];
  const rechts: P[] = [];
  punten.forEach((q, i) => {
    const a = punten[Math.max(0, i - 1)];
    const b = punten[Math.min(punten.length - 1, i + 1)];
    const n = loodrecht(eenheid(sub(b, a)));
    const r = (w0 + (w1 - w0) * (i / (punten.length - 1))) / 2;
    links.push(add(q, mul(n, r)));
    rechts.push(sub(q, mul(n, r)));
  });
  const r0 = w0 / 2;
  const r1 = w1 / 2;
  return (
    `M${pt(links[0])}` +
    links.slice(1).map((q) => `L${pt(q)}`).join("") +
    `A${f(r1)} ${f(r1)} 0 0 0 ${pt(rechts[rechts.length - 1])}` +
    rechts.slice(0, -1).reverse().map((q) => `L${pt(q)}`).join("") +
    `A${f(r0)} ${f(r0)} 0 0 0 ${pt(links[0])}Z`
  );
}

const cirkel = (c: P, r: number) =>
  `M${f(c[0] + r)} ${f(c[1])}A${f(r)} ${f(r)} 0 1 0 ${f(c[0] - r)} ${f(c[1])}A${f(r)} ${f(r)} 0 1 0 ${f(c[0] + r)} ${f(c[1])}Z`;
const ring = (c: P, r1: number, r2: number) => cirkel(c, r1) + cirkel(c, r2);
const boog = (c: P, r: number, van: number, tot: number) => `M${pt(pool(c, r, van))}A${f(r)} ${f(r)} 0 0 1 ${pt(pool(c, r, tot))}`;

/** Twee botten van `a` naar `b`; het gewricht valt aan de kant van `zijde`. */
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

/** Een punt in een gedraaid assenstelsel (oorsprong, hoek in graden) naar de wereld. */
function plaats(o: P, graden: number, q: P): P {
  const c = Math.cos(graden * D);
  const s = Math.sin(graden * D);
  return [o[0] + q[0] * c - q[1] * s, o[1] + q[0] * s + q[1] * c];
}

/** Een pad met lokale coördinaten naar de wereld (alleen M, L, C, Q en Z). */
function lokaal(o: P, graden: number, d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => pt(plaats(o, graden, [Number(x), Number(y)])));
}

// ---- De fiets ----

const ACHTER: P = [0, 0];
const VOOR: P = [993, 0];
const TRAPAS: P = [403.6, 72];
const BAND_R = 339;
const GROND = BAND_R;
const OMHOOG = eenheid([-0.284, -0.9588]);
const zitbuis = (t: number) => add(TRAPAS, mul(OMHOOG, t));
const BALHOOFD: P = [798.6, -499];
const ZADELPEN = zitbuis(705);
const STUUR: P = [893, -524];
const CRANK = 172.5;
const CRANKHOEK = 40;
const PEDAAL_NA = pool(TRAPAS, CRANK, CRANKHOEK);
const PEDAAL_VER = pool(TRAPAS, CRANK, CRANKHOEK + 180);
const WIELTJE_BOVEN: P = [24, 64];
const WIELTJE_ONDER: P = [-6, 148];

/** Het stuur van opzij: de bovenkant zie je op zijn kop, daarna naar voren en de beugel in. */
const BEUGEL: P[] = [
  ...bezier(STUUR, [915, -528], [940, -532], [962, -532], 8),
  ...bezier([962, -532], [1014, -534], [1024, -452], [988, -420], 18).slice(1),
  ...bezier([988, -420], [968, -404], [948, -400], [924, -401], 8).slice(1),
];
const HOOD = "M 946 -527 C 958 -552 984 -568 1004 -564 C 1018 -561 1018 -548 1008 -540 C 1000 -531 1001 -517 1004 -506 L 980 -498 C 970 -510 957 -518 946 -527 Z";
const REMGREEP = kromme(bezier([1000, -508], [1014, -472], [1010, -430], [990, -398], 16), 15, 13);
const ZADEL = "M 96 -652 C 120 -670 190 -666 250 -656 L 354 -642 C 366 -640 366 -628 354 -627 L 250 -628 C 190 -630 130 -628 104 -634 C 90 -637 88 -646 96 -652 Z";

/** Buisdiktes in mm van opzij, per soort frame. */
const BUIZEN = {
  rond: { onder: [46, 44], zit: [34, 32], boven: [32, 32], balhoofd: [44, 48], vork: [30, 18], liggend: [26, 16], staand: [16, 12], post: 27 },
  aero: { onder: [60, 52], zit: [50, 38], boven: [34, 40], balhoofd: [46, 58], vork: [44, 24], liggend: [38, 22], staand: [22, 15], post: 31 },
  diep: { onder: [72, 62], zit: [60, 44], boven: [40, 46], balhoofd: [52, 66], vork: [52, 26], liggend: [40, 22], staand: [24, 16], post: 36 },
} as const;

// ---- De renner ----

const DIJ = 430;
const SCHEEN = 440;
const BOVENARM = 310;
const ONDERARM = 272;
const ROMP_LENGTE = 520;

const BAL_NA = add(PEDAAL_NA, [6, -14]);
const ENKEL_NA = add(BAL_NA, [-128, -66]);
const BAL_VER = add(PEDAAL_VER, [6, -14]);
const ENKEL_VER = add(BAL_VER, [-126, -74]);

type Pose = { heup: P; romp: number; pols: P; greep: P; elleboog: P };

function maakPose(heup: P, romp: number, pols: P, greep: P, elleboog?: P): Pose {
  const s = schouderVan({ heup, romp });
  return { heup, romp, pols, greep, elleboog: elleboog ?? gewricht(s, pols, BOVENARM, ONDERARM, 1) };
}

/**
 * Op de remgrepen: handen op de hoods. In de beugel: handen onderin. Onderarmen
 * plat: de renner schuift naar voren, de onderarmen liggen over de bovenkant
 * van het stuur en de handen hangen over de hoods.
 */
const POSES: Record<HoudingId, Pose> = {
  remgrepen: maakPose([212, -714], 38, [936, -560], [990, -552]),
  beugel: maakPose([222, -712], 21, [904, -444], [960, -414]),
  onderarmen: maakPose([262, -708], 18, [1000, -580], [1036, -566], [762, -566]),
};

function schouderVan(pose: Pick<Pose, "heup" | "romp">): P {
  return plaats(pose.heup, -pose.romp, [ROMP_LENGTE, 0]);
}

function hoofdVan(pose: Pick<Pose, "heup" | "romp">): { c: P; draai: number } {
  const s = schouderVan(pose);
  const hoek = 50 + (pose.romp - 21) * 0.4;
  return { c: add(s, mul([Math.cos(hoek * D), -Math.sin(hoek * D)], 162)), draai: -4 + (pose.romp - 21) * 0.25 };
}

export type Tenue = "winter" | "zomer";

/** Wat de figuur tekent; de pagina leidt het af uit de gekozen producten. */
export type RennerBeeld = {
  houding: HoudingId;
  helm: HelmUiterlijk;
  fiets: FietsUiterlijk;
  wielen: WielUiterlijk;
  spanning: SpanningId;
  /** Lange mouwen bij het SONIC-snelpak. */
  mouw?: "kort" | "lang";
};

/** Hoekpunt boven het hoofd, de romp en de fiets: daar staan de knoppen. */
export function ankers(beeld: RennerBeeld): Record<Onderdeel, P> {
  const pose = POSES[beeld.houding];
  const kop = hoofdVan(pose).c;
  return {
    helm: naarBeeld(add(kop, [-20, -190])),
    houding: naarBeeld(plaats(pose.heup, -pose.romp, [300, -190])),
    fiets: naarBeeld([626, -181]),
    wielen: naarBeeld([-181, -181]),
    banden: naarBeeld([1211, 265]),
    kleding: naarBeeld(add(lerp(ENKEL_NA, gewricht(pose.heup, ENKEL_NA, DIJ, SCHEEN, -1), 0.35), [-10, 0])),
  };
}

/** Zachte overgang van de houding; direct bij `prefers-reduced-motion`. */
function useHouding(doel: Pose): Pose {
  const [pose, setPose] = useState(doel);
  const huidig = useRef(doel);
  useEffect(() => {
    const van = huidig.current;
    if (van === doel) return;
    const start = performance.now();
    // Bij minder beweging staat de renner in één frame in de nieuwe houding.
    const duur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 520;
    let frame = 0;
    const stap = (nu: number) => {
      const t = duur === 0 ? 1 : Math.min(1, (nu - start) / duur);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const tussen: Pose =
        t === 1
          ? doel
          : {
              heup: lerp(van.heup, doel.heup, e),
              romp: van.romp + (doel.romp - van.romp) * e,
              pols: lerp(van.pols, doel.pols, e),
              greep: lerp(van.greep, doel.greep, e),
              elleboog: lerp(van.elleboog, doel.elleboog, e),
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

// ---- Schaduw en strijklicht ----

const VAK = { x: -900, y: -1600, width: 2800, height: 2400 };

/**
 * Een onderdeel met volume. Het licht valt van linksboven: de schaduw is het
 * silhouet min een kopie die naar het licht is geschoven, het strijklicht het
 * omgekeerde. Beide vervaagd en binnen het silhouet gehouden.
 */
function Deel({
  id,
  vorm,
  ver,
  schaduw = 1,
  glans = 1,
  children,
  detail,
}: {
  id: string;
  vorm: string[];
  ver?: boolean;
  schaduw?: number;
  glans?: number;
  children: ReactNode;
  detail?: ReactNode;
}) {
  const paden = vorm.map((d, i) => <path key={i} d={d} />);
  return (
    <g>
      <defs>
        <g id={`${id}-v`}>{paden}</g>
        <clipPath id={`${id}-c`}>{paden}</clipPath>
        <filter id={`${id}-z`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
        <mask id={`${id}-s`} maskUnits="userSpaceOnUse" {...VAK}>
          <use href={`#${id}-v`} fill="#fff" />
          <use href={`#${id}-v`} fill="#000" transform="translate(-18 -26)" filter={`url(#${id}-z)`} />
        </mask>
        <mask id={`${id}-l`} maskUnits="userSpaceOnUse" {...VAK}>
          <use href={`#${id}-v`} fill="#fff" />
          <use href={`#${id}-v`} fill="#000" transform="translate(5 8)" filter={`url(#${id}-z)`} />
        </mask>
      </defs>
      {children}
      <g clipPath={`url(#${id}-c)`}>
        <rect {...VAK} fill="var(--renner-schaduw)" mask={`url(#${id}-s)`} style={{ opacity: `calc(var(--renner-schaduw-sterkte) * ${schaduw})` }} />
        <rect {...VAK} fill="#fff" mask={`url(#${id}-l)`} style={{ opacity: `calc(var(--renner-glans-sterkte) * ${glans})` }} />
        {ver && <rect {...VAK} fill="var(--renner-schaduw)" style={{ opacity: "var(--renner-ver-sterkte)" }} />}
      </g>
      {detail}
    </g>
  );
}

const Vlak = ({ d, kleur, style }: { d: string; kleur: string; style?: CSSProperties }) => <path d={d} fill={kleur} style={style} />;

function Lijn({ d, kleur, dikte, style, dash }: { d: string; kleur: string; dikte: number; style?: CSSProperties; dash?: string }) {
  return <path d={d} fill="none" stroke={kleur} strokeWidth={dikte} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} style={style} />;
}

// ---- Wielen ----

function Wiel({ id, c, wiel, voor, spanning, schijf }: { id: string; c: P; wiel: WielUiterlijk; voor: boolean; spanning: SpanningId; schijf: boolean }) {
  const diepte = wiel.velg[voor ? 0 : 1];
  const aantal = wiel.spaken[voor ? 0 : 1];
  // Een golvende velg loopt in acht golven tussen de laagste en de hoogste maat.
  const binnen = (a: number) =>
    311 - (wiel.golvend ? wiel.velg[0] + ((wiel.velg[1] - wiel.velg[0]) * (1 + Math.cos(8 * a))) / 2 : diepte);
  const gemiddeld = wiel.golvend ? (wiel.velg[0] + wiel.velg[1]) / 2 : diepte;
  const velgBinnen = Array.from({ length: 144 }, (_, i) => {
    const a = (i / 144) * Math.PI * 2;
    return `${i === 0 ? "M" : "L"}${f(c[0] + binnen(a) * Math.cos(a))} ${f(c[1] + binnen(a) * Math.sin(a))}`;
  }).join("") + "Z";
  const naaf = voor ? 24 : 32;
  const spaken = Array.from({ length: aantal }, (_, i) => {
    const graden = (i * 360) / aantal + 7;
    const a = graden * D;
    const kruis = (i % 2 ? 1 : -1) * (voor ? 18 : 26);
    const van = pool(c, naaf, graden + kruis);
    const eind: P = [c[0] + (binnen(a) + 4) * Math.cos(a), c[1] + (binnen(a) + 4) * Math.sin(a)];
    if (wiel.spaak === "gekruld") {
      const punten = Array.from({ length: 7 }, (_, k) => {
        const q = lerp(van, eind, k / 6);
        const uit = k === 0 || k === 6 ? 0 : (k % 2 ? 9 : -9);
        const n = loodrecht(eenheid(sub(eind, van)));
        return add(q, mul(n, uit));
      });
      return `M${punten.map(pt).join("L")}`;
    }
    return `M${pt(van)}L${pt(eind)}`;
  }).join("");
  const remklauw = buis(pool(c, 58, (voor ? 150 : 24) - 14), pool(c, 86, (voor ? 150 : 24) + 12), 36, 34);
  const schijfVorm = ring(c, 80, 64) + [0, 60, 120, 180, 240, 300].map((a) => buis(pool(c, 22, a + 15), pool(c, 66, a), 9, 7)).join("");
  const ventiel = pool(c, 311 - (wiel.golvend ? wiel.velg[0] : diepte), -58);
  return (
    <g key={JSON.stringify(wiel) + voor} className="renner-wissel">
      <defs>
        <radialGradient id={`${id}-b`} cx={c[0]} cy={c[1]} r={BAND_R} gradientUnits="userSpaceOnUse">
          <stop offset={f((309 / BAND_R) * 1000) / 1000} style={{ stopColor: "var(--renner-band)" }} />
          <stop offset="0.955" style={{ stopColor: "var(--renner-band-licht)" }} />
          <stop offset="1" style={{ stopColor: "var(--renner-band)" }} />
        </radialGradient>
        <radialGradient id={`${id}-v`} cx={c[0]} cy={c[1]} r="314" gradientUnits="userSpaceOnUse">
          <stop offset={f(((311 - gemiddeld) / 314) * 1000) / 1000} style={{ stopColor: "var(--renner-velg-diep)" }} />
          <stop offset={f(((311 - gemiddeld * 0.65) / 314) * 1000) / 1000} style={{ stopColor: "var(--renner-velg)" }} />
          <stop offset="0.975" style={{ stopColor: "var(--renner-velg-licht)" }} />
          <stop offset="1" style={{ stopColor: "var(--renner-velg)" }} />
        </radialGradient>
      </defs>
      {/* Schijf en remklauw zitten links, achter de spaken. */}
      {schijf && (
        <g style={{ opacity: 0.55 }}>
          <path d={schijfVorm} fill="var(--renner-schijf)" fillRule="evenodd" />
          <path d={remklauw} fill="var(--renner-metaal-donker)" />
        </g>
      )}
      <path d={ring(c, BAND_R, 309)} fill={`url(#${id}-b)`} fillRule="evenodd" />
      {spanning === "zacht" && <ellipse cx={c[0]} cy={GROND - 4} rx="64" ry="9" fill="var(--renner-band)" />}
      <Lijn d={spaken} kleur="var(--renner-spaak)" dikte={wiel.spaak === "carbon" ? 4.6 : 2.6} />
      <path d={cirkel(c, 314) + velgBinnen} fill={`url(#${id}-v)`} fillRule="evenodd" />
      <Lijn d={boog(c, 311 - gemiddeld * 0.45, 200, 262)} kleur="#fff" dikte={gemiddeld * 0.22} style={{ opacity: "var(--renner-glans-velg)" }} />
      <Lijn d={boog(c, 311 - gemiddeld * 0.45, 20, 60)} kleur="#fff" dikte={gemiddeld * 0.12} style={{ opacity: "calc(var(--renner-glans-velg) * 0.55)" }} />
      <Lijn d={boog(c, 326, 205, 250)} kleur="#fff" dikte={4} style={{ opacity: "calc(var(--renner-glans-velg) * 0.8)" }} />
      <path d={buis(ventiel, pool(c, 311 - (wiel.golvend ? wiel.velg[0] : diepte) - 22, -58), 9)} fill="var(--renner-metaal)" />
      <circle cx={c[0]} cy={c[1]} r={naaf + 4} fill="var(--renner-metaal-donker)" />
      <circle cx={c[0]} cy={c[1]} r="13" fill="var(--renner-frame)" />
    </g>
  );
}

// ---- Frame, zadel en stuur ----

function Frame({ id, fiets }: { id: string; fiets: FietsUiterlijk }) {
  const b = BUIZEN[fiets.buis];
  // De zitknoop zakt langs de zitbuis naarmate de bovenbuis meer afloopt.
  const knoopT = 560 - 110 * fiets.aflopend;
  const knoop = zitbuis(knoopT);
  const staysAan = zitbuis(fiets.staysLaag ? knoopT - 70 : knoopT - 8);
  const balhoofdLengte = fiets.hoogBalhoofd ? 168 : 140;
  const balhoofdOnder = add(BALHOOFD, mul(OMHOOG, -balhoofdLengte));
  const bovenVoor = add(BALHOOFD, mul(OMHOOG, -20));
  const onderVoor = add(balhoofdOnder, mul(OMHOOG, 16));
  const kroon = add(balhoofdOnder, mul(OMHOOG, -30));

  const zitbuisVorm = fiets.zitbuisBocht
    ? kromme(bezier(TRAPAS, add(zitbuis(knoopT * 0.3), [34, 0]), add(zitbuis(knoopT * 0.7), [14, 0]), knoop, 16), b.zit[0], b.zit[1])
    : buis(TRAPAS, knoop, b.zit[0], b.zit[1]);
  // De vork van een Dogma golft; de andere lopen recht met de voorwaartse uitval onderaan.
  const vork = fiets.golvendeVork
    ? kromme(bezier(kroon, add(kroon, [70, 80]), add(VOOR, [-80, -150]), VOOR, 18), b.vork[0], b.vork[1])
    : kromme(bezier(kroon, add(kroon, [30, 110]), add(VOOR, [-30, -120]), VOOR, 14), b.vork[0], b.vork[1]);

  const steun = add(BALHOOFD, mul(OMHOOG, 16));
  const voorbouw: string[] = [];
  if (fiets.stuur === "los") {
    voorbouw.push(buis(add(BALHOOFD, mul(OMHOOG, 2)), add(BALHOOFD, mul(OMHOOG, 34)), 36), buis(add(BALHOOFD, mul(OMHOOG, 20)), STUUR, 36, 34), cirkel(STUUR, 18));
  } else if (fiets.stuur === "integraal") {
    voorbouw.push(buis(add(BALHOOFD, mul(OMHOOG, 2)), add(BALHOOFD, mul(OMHOOG, 22)), b.balhoofd[0] - 2, b.balhoofd[0] - 4), buis(steun, STUUR, 44, 32));
  } else if (fiets.stuur === "v") {
    voorbouw.push(`M${pt(add(BALHOOFD, [-24, 6]))}L${pt(add(BALHOOFD, mul(OMHOOG, 34)))}L${pt(add(STUUR, [8, -16]))}L${pt(add(STUUR, [8, 14]))}Z`);
  } else {
    voorbouw.push(buis(bovenVoor, STUUR, b.boven[1], 34));
  }

  const vorm = [
    buis(TRAPAS, ACHTER, b.liggend[0], b.liggend[1]),
    buis(staysAan, ACHTER, b.staand[0], b.staand[1]),
    zitbuisVorm,
    buis(knoop, bovenVoor, b.boven[0], b.boven[1]),
    buis(TRAPAS, onderVoor, b.onder[0], b.onder[1]),
    buis(add(BALHOOFD, mul(OMHOOG, 6)), add(balhoofdOnder, mul(OMHOOG, -12)), b.balhoofd[0], b.balhoofd[1]),
    vork,
    cirkel(TRAPAS, 36),
    cirkel(ACHTER, 20),
    cirkel(VOOR, 18),
    buis(knoop, ZADELPEN, b.post, b.post),
    ...voorbouw,
  ];
  if (fiets.gat) {
    // Een volle knoop van bovenbuis, zitbuis en achterbrug; het gat zit erin.
    vorm.push(`M${pt(knoop)}L${pt(lerp(knoop, bovenVoor, 0.2))}L${pt(lerp(knoop, TRAPAS, 0.24))}L${pt(lerp(knoop, ACHTER, 0.2))}Z`);
  }
  const gat = lerp(knoop, bovenVoor, 0.07);
  const glans = (a: P, c: P) => <Lijn d={`M${pt(a)}L${pt(c)}`} kleur="#fff" dikte={5} style={{ opacity: "var(--renner-glans-frame)" }} />;
  return (
    <g key={JSON.stringify(fiets)} className="renner-wissel">
      {fiets.gat && (
        <defs>
          <mask id={`${id}-gat`} maskUnits="userSpaceOnUse" {...VAK}>
            <rect {...VAK} fill="#fff" />
            <ellipse cx={f(gat[0] + 18)} cy={f(gat[1] + 40)} rx="44" ry="17" transform={`rotate(-28 ${f(gat[0] + 18)} ${f(gat[1] + 40)})`} fill="#000" />
          </mask>
        </defs>
      )}
      <g mask={fiets.gat ? `url(#${id}-gat)` : undefined}>
        <Deel
          id={`${id}-f`}
          vorm={vorm}
          detail={
            <>
              <Lijn d={`M${pt(add(knoop, [-6, -4]))}L${pt(add(knoop, [22, -2]))}`} kleur="var(--renner-frame-detail)" dikte={2.5} />
              <Lijn d={`M${pt(add(lerp(add(BALHOOFD, mul(OMHOOG, 6)), balhoofdOnder, 0), [18, 6]))}L${pt(add(balhoofdOnder, [20, -10]))}`} kleur="var(--renner-frame-detail)" dikte={2.5} style={{ opacity: 0.6 }} />
              <circle cx={ACHTER[0]} cy={ACHTER[1]} r="7" fill="none" stroke="var(--renner-frame-detail)" strokeWidth="2.5" />
              <circle cx={VOOR[0]} cy={VOOR[1]} r="7" fill="none" stroke="var(--renner-frame-detail)" strokeWidth="2.5" />
              {glans(add(lerp(TRAPAS, onderVoor, 0.2), [-16, -22]), add(lerp(TRAPAS, onderVoor, 0.85), [-14, -20]))}
              {glans(add(lerp(knoop, bovenVoor, 0.1), [0, -12]), add(lerp(knoop, bovenVoor, 0.9), [0, -14]))}
              {glans(add(lerp(BALHOOFD, balhoofdOnder, 0.05), [-14, 0]), add(lerp(BALHOOFD, balhoofdOnder, 0.9), [-16, 0]))}
              {!fiets.zitbuisBocht && glans(add(lerp(TRAPAS, knoop, 0.15), [-18, 6]), add(lerp(TRAPAS, knoop, 0.9), [-12, 6]))}
            </>
          }
        >
          <g fill="var(--renner-frame)">
            {vorm.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
          {fiets.stuur === "v" && <Lijn d={`M${pt(add(BALHOOFD, mul(OMHOOG, 16)))}L${pt(add(STUUR, [4, 0]))}`} kleur="var(--renner-frame-detail)" dikte={6} />}
          {fiets.stuur !== "los" && <ellipse cx={STUUR[0]} cy={STUUR[1]} rx="28" ry="11" fill="var(--renner-stuur)" />}
        </Deel>
      </g>
      {fiets.rem === "velg" && <Velgremmen kroon={kroon} staysAan={staysAan} />}
    </g>
  );
}

/** Een klassieke fiets met velgremmen: een klauw op de vorkkroon en een op de achterbrug, met kabels. */
function Velgremmen({ kroon, staysAan }: { kroon: P; staysAan: P }) {
  const voor = add(kroon, [6, 18]);
  const achter = lerp(staysAan, ACHTER, 0.28);
  return (
    <g>
      <path d={buis(add(voor, [-14, -6]), add(voor, [22, 28]), 22, 16)} fill="var(--renner-metaal)" />
      <path d={buis(add(achter, [-6, -14]), add(achter, [12, 22]), 22, 16)} fill="var(--renner-metaal)" />
      <Lijn d={`M 1004 -540 C 1060 -600 900 -640 ${pt(add(voor, [-10, -10]))}`} kleur="var(--renner-zool)" dikte={5} />
      <Lijn d={`M 990 -530 C 1000 -600 840 -560 ${pt(lerp(BALHOOFD, add(BALHOOFD, mul(OMHOOG, -140)), 0.3))}`} kleur="var(--renner-zool)" dikte={5} style={{ opacity: 0.7 }} />
    </g>
  );
}

function Zadel({ id }: { id: string }) {
  const rails = buis([150, -630], [300, -628], 9);
  const klem = buis([200, -630], ZADELPEN, 14, 24);
  return (
    <Deel id={id} vorm={[ZADEL, rails, klem]} detail={<Lijn d="M 106 -646 C 160 -652 230 -646 352 -634" kleur="var(--renner-frame-detail)" dikte={2.5} style={{ opacity: 0.5 }} />}>
      <Vlak d={rails} kleur="var(--renner-metaal-donker)" />
      <Vlak d={klem} kleur="var(--renner-frame)" />
      <Vlak d={ZADEL} kleur="var(--renner-zadel)" />
    </Deel>
  );
}

function Stuur({ id }: { id: string }) {
  const beugel = kromme(BEUGEL, 26);
  return (
    <Deel id={id} vorm={[beugel, HOOD, REMGREEP]} detail={<Lijn d="M 968 -548 C 980 -556 994 -560 1004 -556" kleur="var(--renner-frame-detail)" dikte={2.5} style={{ opacity: 0.7 }} />}>
      <Vlak d={beugel} kleur="var(--renner-stuur)" />
      <Vlak d={REMGREEP} kleur="var(--renner-metaal-donker)" />
      <Vlak d={HOOD} kleur="var(--renner-zool)" />
    </Deel>
  );
}

// ---- Aandrijving ----

function Cassette() {
  return (
    <g>
      {[60, 54, 48, 42, 36, 31, 26, 22].map((r, i) => (
        <circle key={r} cx={ACHTER[0]} cy={ACHTER[1]} r={r} fill={i % 2 ? "var(--renner-metaal)" : "var(--renner-metaal-donker)"} />
      ))}
      <Lijn d={boog(ACHTER, 50, 205, 260)} kleur="#fff" dikte={6} style={{ opacity: 0.35 }} />
    </g>
  );
}

function Aandrijving({ id }: { id: string }) {
  const bovenpart = `M${pt([TRAPAS[0], TRAPAS[1] - 104])}L${pt([0, -42])}`;
  const onderpart =
    `M${pt([TRAPAS[0], TRAPAS[1] + 104])}L${pt(add(WIELTJE_ONDER, [0, 17]))}` +
    `A17 17 0 0 1 ${pt(add(WIELTJE_ONDER, [-12, -12]))}L${pt(add(WIELTJE_BOVEN, [16, 4]))}` +
    `A16 16 0 0 0 ${pt(add(WIELTJE_BOVEN, [-6, -15]))}L${pt([-4, 42])}`;
  const kooi = buis(WIELTJE_BOVEN, WIELTJE_ONDER, 46, 42);
  const derailleur = buis([14, 24], [34, 58], 34, 28);
  const voorBlad = buis(add(zitbuis(150), [12, -6]), add(zitbuis(150), [74, 6]), 24, 18);
  const voorKlem = buis(zitbuis(170), add(zitbuis(150), [20, -4]), 26, 22);
  const spin = [45, 135, 225, 315].map((a) => buis(pool(TRAPAS, 20, a), pool(TRAPAS, 98, a), 26, 16)).join("");
  const crank = buis(TRAPAS, PEDAAL_NA, 42, 28);
  const pedaal = buis(add(PEDAAL_NA, [-42, -2]), add(PEDAAL_NA, [42, -2]), 15);
  return (
    <g>
      <Lijn d={bovenpart + onderpart} kleur="var(--renner-ketting)" dikte={11} />
      <Lijn d={bovenpart + onderpart} kleur="var(--renner-metaal)" dikte={4} dash="7 6" />
      <Deel id={`${id}-rd`} vorm={[kooi, derailleur]}>
        <Vlak d={derailleur} kleur="var(--renner-zool)" />
        <Vlak d={kooi} kleur="var(--renner-metaal-donker)" />
        <circle cx={WIELTJE_BOVEN[0]} cy={WIELTJE_BOVEN[1]} r="9" fill="var(--renner-zool)" />
        <circle cx={WIELTJE_ONDER[0]} cy={WIELTJE_ONDER[1]} r="9" fill="var(--renner-zool)" />
      </Deel>
      <Deel id={`${id}-fd`} vorm={[voorBlad, voorKlem]}>
        <Vlak d={voorKlem} kleur="var(--renner-zool)" />
        <Vlak d={voorBlad} kleur="var(--renner-metaal-donker)" />
      </Deel>
      <Deel id={`${id}-bl`} vorm={[cirkel(TRAPAS, 104)]} schaduw={0.6} detail={<Lijn d={cirkel(TRAPAS, 101)} kleur="var(--renner-metaal)" dikte={2} dash="2.5 5.4" style={{ opacity: 0.8 }} />}>
        <path d={ring(TRAPAS, 104, 72)} fill="var(--renner-metaal-donker)" fillRule="evenodd" />
        <path d={ring(TRAPAS, 96, 84)} fill="var(--renner-zool)" fillRule="evenodd" />
        <Vlak d={spin} kleur="var(--renner-frame)" />
        <circle cx={TRAPAS[0]} cy={TRAPAS[1]} r="30" fill="var(--renner-frame)" />
      </Deel>
      <Deel id={`${id}-cr`} vorm={[crank, cirkel(TRAPAS, 26), pedaal]}>
        <Vlak d={crank} kleur="var(--renner-frame)" />
        <circle cx={TRAPAS[0]} cy={TRAPAS[1]} r="26" fill="var(--renner-metaal-donker)" />
        <Vlak d={pedaal} kleur="var(--renner-zool)" />
      </Deel>
    </g>
  );
}

// ---- Lichaam ----

function voetAssen(bal: P, enkel: P) {
  const hiel = add(enkel, [-38, 62]);
  const d = sub(bal, hiel);
  return { o: hiel, graden: Math.atan2(d[1], d[0]) / D, l: lengte(d) };
}

function schoen(bal: P, enkel: P) {
  const { o, graden, l } = voetAssen(bal, enkel);
  return {
    vorm: lokaal(o, graden, `M -8 -10 C -16 -58 -12 -94 4 -104 L 74 -98 C 112 -82 150 -60 ${f(l + 20)} -40 C ${f(l + 52)} -30 ${f(l + 72)} -16 ${f(l + 68)} 2 L 2 6 C -6 4 -9 -2 -8 -10 Z`),
    zool: lokaal(o, graden, `M -6 2 L ${f(l + 64)} 4`),
    knop: plaats(o, graden, [96, -62]),
    riem: lokaal(o, graden, `M 120 -72 L ${f(l - 6)} -4`),
  };
}

function kuit(knie: P, enkel: P) {
  const n = loodrecht(eenheid(sub(enkel, knie)));
  const achter = n[0] < 0;
  return lid(knie, enkel, 104, 58, 0.34, 108, achter ? 26 : 4, achter ? 4 : 26);
}

function dij(heup: P, knie: P) {
  const n = loodrecht(eenheid(sub(knie, heup)));
  const voor = n[0] > 0;
  return lid(heup, knie, 150, 104, 0.42, 146, voor ? 18 : 6, voor ? 6 : 18);
}

function Been({ id, pose, ver }: { id: string; pose: Pose; ver?: boolean }) {
  const heup = ver ? add(pose.heup, [6, -4]) : pose.heup;
  const enkel = ver ? ENKEL_VER : ENKEL_NA;
  const bal = ver ? BAL_VER : BAL_NA;
  const knie = gewricht(heup, enkel, DIJ, SCHEEN, -1);
  const dijVorm = dij(heup, knie);
  const kuitVorm = kuit(knie, enkel);
  const s = schoen(bal, enkel);
  return (
    <Deel
      id={id}
      vorm={[dijVorm, kuitVorm, s.vorm]}
      ver={ver}
      detail={
        !ver && (
          <>
            <circle cx={f(s.knop[0])} cy={f(s.knop[1])} r="15" fill="var(--renner-zool)" />
            <Lijn d={s.riem} kleur="var(--renner-schoen-detail)" dikte={2.5} style={{ opacity: 0.8 }} />
          </>
        )
      }
    >
      <Vlak d={dijVorm} kleur="var(--renner-huid)" />
      <Vlak d={kuitVorm} kleur="var(--renner-huid)" />
      <Vlak d={band(enkel, lerp(enkel, knie, 0.3), 70, 80)} kleur="var(--renner-sok)" />
      <Vlak d={band(lerp(enkel, knie, 0.26), lerp(enkel, knie, 0.3), 78, 82)} kleur="var(--tenue-blauw)" />
      <Vlak d={lid(heup, lerp(heup, knie, 0.8), 150, 124, 0.45, 148, 12, 12)} kleur="var(--renner-broek)" />
      <Vlak d={band(lerp(heup, knie, 0.76), lerp(heup, knie, 0.8), 134, 128)} kleur="var(--tenue-blauw)" />
      <Vlak d={s.vorm} kleur="var(--renner-schoen)" />
      <Lijn d={s.zool} kleur="var(--renner-zool)" dikte={11} />
    </Deel>
  );
}

function VerCrank({ id }: { id: string }) {
  const crank = buis(TRAPAS, PEDAAL_VER, 36, 26);
  const pedaal = buis(add(PEDAAL_VER, [-40, -2]), add(PEDAAL_VER, [40, -2]), 14);
  return (
    <Deel id={id} vorm={[crank, pedaal]} ver>
      <Vlak d={crank} kleur="var(--renner-metaal-donker)" />
      <Vlak d={pedaal} kleur="var(--renner-zool)" />
    </Deel>
  );
}

function Arm({ id, pose, tenue, mouw, ver }: { id: string; pose: Pose; tenue: Tenue; mouw?: "kort" | "lang"; ver?: boolean }) {
  const verschuif: P = ver ? [10, -8] : [0, 0];
  const s = add(schouderVan(pose), verschuif);
  const elleboog = add(pose.elleboog, verschuif);
  const pols = add(pose.pols, ver ? [8, -6] : [0, 0]);
  const greep = add(pose.greep, ver ? [8, -6] : [0, 0]);
  const boven = lid(s, elleboog, 104, 82, 0.45, 108, 0, 8);
  const onder = lid(elleboog, pols, 82, 60, 0.35, 86, 6, 4);
  const hand = buis(pols, greep, 64, 54);
  const zomer = tenue === "zomer";
  const stof = zomer ? "var(--tenue-wit)" : "var(--tenue-blauw)";
  const boord = zomer ? "var(--tenue-blauw)" : "var(--tenue-goud)";
  return (
    <Deel id={id} vorm={[boven, onder, hand]} ver={ver}>
      <Vlak d={onder} kleur="var(--renner-huid)" />
      <Vlak d={buis(lerp(s, elleboog, 0.6), elleboog, 104, 82)} kleur="var(--renner-huid)" />
      {mouw === "lang" ? (
        <>
          <Vlak d={boven} kleur={stof} />
          <Vlak d={lid(elleboog, lerp(elleboog, pols, 0.92), 84, 64, 0.35, 88, 6, 4)} kleur={stof} />
          <Vlak d={band(lerp(elleboog, pols, 0.84), lerp(elleboog, pols, 0.92), 68, 64)} kleur={boord} />
        </>
      ) : (
        <>
          <Vlak d={lid(s, lerp(s, elleboog, 0.62), 112, 100, 0.4, 114, 0, 4)} kleur={stof} />
          <Vlak d={band(lerp(s, elleboog, 0.5), lerp(s, elleboog, 0.6), 110, 104)} kleur={boord} />
        </>
      )}
      <Vlak d={hand} kleur="var(--renner-handschoen)" />
    </Deel>
  );
}

// De romp in lokale mm: x langs de rug van heup naar schouder, y naar de buik.
const ROMP_VORM =
  "M -78 10 C -92 -40 -50 -86 30 -96 C 150 -112 330 -122 470 -104 C 540 -96 584 -60 580 -14 C 576 30 556 64 520 84 C 450 120 330 138 220 132 C 130 126 64 112 20 96 C -30 82 -70 56 -78 10 Z";

function Romp({ id, pose, tenue }: { id: string; pose: Pose; tenue: Tenue }) {
  const zomer = tenue === "zomer";
  return (
    <g transform={`translate(${pt(pose.heup)}) rotate(${f(-pose.romp)})`}>
      <defs>
        <clipPath id={`${id}-k`}>
          <path d={ROMP_VORM} />
        </clipPath>
      </defs>
      <Deel
        id={id}
        vorm={[ROMP_VORM]}
        detail={<Lijn d="M 40 -94 C 30 -20 50 60 60 120" kleur="var(--renner-naad)" dikte={2.5} style={{ opacity: 0.35 }} />}
      >
        <path d={ROMP_VORM} fill={zomer ? "var(--tenue-wit)" : "var(--tenue-blauw)"} />
        <g key={tenue} clipPath={`url(#${id}-k)`} className="renner-wissel">
          {/* Het patroon van het tenue, in de maat van de vorige tekening (×5,8). */}
          <g transform="scale(5.8)">
            {zomer ? (
              <>
                <path d="M -24 28 L 30 28 L 44 -36 L -24 -36 Z" fill="var(--tenue-blauw)" />
                <path d="M -24 -36 L 30 -36 L 4 -4 Z" fill="var(--tenue-blauw-licht)" />
                <path d="M 4 -4 L 30 28 L -24 28 Z" fill="var(--tenue-blauw-lichter)" opacity="0.7" />
                <path d="M 18 -36 L 44 -36 L 36 -4 Z" fill="var(--tenue-blauw-donker)" opacity="0.6" />
              </>
            ) : (
              <>
                <path d="M -24 -36 L 22 -36 L 6 -2 Z" fill="var(--tenue-blauw-licht)" />
                <path d="M 6 -2 L 32 28 L -24 28 Z" fill="var(--tenue-blauw-lichter)" opacity="0.55" />
                <path d="M 22 -36 L 46 -36 L 30 4 Z" fill="var(--tenue-blauw-licht)" opacity="0.7" />
                <path d="M 30 4 L 50 28 L 32 28 Z" fill="var(--tenue-blauw-donker)" opacity="0.6" />
              </>
            )}
            {/* De gouden band op de borst. */}
            <path d="M 58 28 L 64 28 L 64 -36 L 58 -36 Z" fill="var(--tenue-goud)" />
          </g>
          {/* De broek onder de zoom van het shirt. */}
          <path d="M -140 -40 L 40 -140 L 60 140 L -140 140 Z" fill="var(--renner-broek)" />
        </g>
      </Deel>
    </g>
  );
}

function Nek({ id, pose }: { id: string; pose: Pose }) {
  const s = schouderVan(pose);
  const kop = hoofdVan(pose).c;
  const vorm = lid(add(s, [-6, -40]), add(kop, [-22, 44]), 104, 86, 0.5, 96);
  return (
    <Deel id={id} vorm={[vorm]}>
      <Vlak d={vorm} kleur="var(--renner-huid)" />
    </Deel>
  );
}

// Hoofd en helm in lokale mm: oorsprong midden in het hoofd, x naar voren.
const HOOFD_VORM =
  "M -72 42 C -104 -20 -82 -104 0 -108 C 70 -110 106 -62 103 -10 L 105 0 C 112 10 127 22 122 31 C 117 37 105 37 101 41 C 103 53 99 61 97 67 C 101 75 97 89 81 93 C 56 99 31 97 11 91 C -29 81 -61 66 -72 42 Z";
const RAND = "C 62 -26 22 -38 -20 -28";
const HELM_VORM: Record<HelmProfiel, string> = {
  // Een gewone helm met gaten: hoekiger, met een overstek achter.
  gaten: `M -118 40 C -128 0 -118 -90 -40 -126 C 10 -146 80 -134 112 -96 C 128 -76 128 -44 120 -26 C 118 -18 112 -14 104 -14 ${RAND} C -60 -18 -90 10 -118 40 Z`,
  // Een aerohelm voor de weg: een gladde, ronde kap.
  rond: `M -116 34 C -134 -34 -100 -134 4 -138 C 84 -140 128 -92 122 -34 C 121 -20 114 -14 104 -14 ${RAND} C -62 -16 -94 8 -116 34 Z`,
  // Kort en glad, achter recht afgesneden.
  kort: `M -102 30 C -114 -10 -104 -122 6 -136 C 86 -140 128 -92 122 -34 C 121 -20 114 -14 104 -14 ${RAND} C -56 -18 -82 4 -102 30 Z`,
  // Met een staart die achter het hoofd doorloopt.
  staart: `M -156 10 C -144 -62 -96 -134 6 -138 C 86 -140 128 -92 122 -34 C 121 -20 114 -14 104 -14 ${RAND} C -72 -16 -112 -2 -156 10 Z`,
};

/** De openingen in de schaal: bij een helm met gaten over de hele kap, bij een aerohelm vooraan. */
function openingen(helm: HelmUiterlijk): string[] {
  const vol = helm.profiel === "gaten";
  const van = vol ? -28 : -24;
  const tot = vol ? -150 : -96;
  const lengteGat = vol ? 26 : 34;
  return Array.from({ length: helm.gaten }, (_, i) => {
    const a = (van + ((tot - van) * (i + 0.5)) / helm.gaten) * D;
    const plek: P = [8 + 100 * Math.cos(a), -16 + 112 * Math.sin(a)];
    const raak = eenheid([-100 * Math.sin(a), 112 * Math.cos(a)]);
    return `M${pt(sub(plek, mul(raak, lengteGat / 2)))}L${pt(add(plek, mul(raak, lengteGat / 2)))}`;
  });
}

function Hoofd({ id, pose, helm }: { id: string; pose: Pose; helm: HelmUiterlijk }) {
  const { c, draai } = hoofdVan(pose);
  const helmVorm = HELM_VORM[helm.profiel];
  return (
    <g transform={`translate(${pt(c)}) rotate(${f(draai)})`}>
      <Deel
        id={id}
        vorm={[HOOFD_VORM, helmVorm]}
        glans={1.3}
        detail={
          <g key={`${helm.profiel}-${helm.gaten}`} className="renner-wissel">
            <Lijn d="M -60 -96 C -20 -122 40 -126 80 -108" kleur="#fff" dikte={10} style={{ opacity: "var(--renner-glans-helm)" }} />
            <Lijn d="M 84 -4 C 96 -8 108 -4 116 2" kleur="#fff" dikte={4} style={{ opacity: "var(--renner-glans-helm)" }} />
          </g>
        }
      >
        <Vlak d={HOOFD_VORM} kleur="var(--renner-huid)" />
        {/* Het oor, met de riempjes ervoor en erachter die eronder samenkomen. */}
        <path d="M -16 -2 C -4 -10 10 2 8 20 C 6 38 -10 42 -20 30 C -26 20 -26 4 -16 -2 Z" fill="var(--renner-naad)" style={{ opacity: 0.12 }} />
        <Lijn d="M -16 -2 C -4 -10 10 2 8 20 C 6 38 -10 42 -20 30" kleur="var(--renner-naad)" dikte={2.5} style={{ opacity: 0.45 }} />
        <Lijn d="M 20 -28 C 16 0 10 30 -4 54 M -44 -16 C -36 10 -22 36 -4 54 C 10 72 26 88 42 96" kleur="var(--renner-zool)" dikte={4.5} />
        <g key={`${helm.profiel}-${helm.gaten}`} className="renner-wissel">
          <Vlak d={helmVorm} kleur="var(--renner-helm)" />
          <Lijn d={`M -116 34 C -94 8 -62 -16 -20 -28 C 22 -38 62 -26 104 -14`} kleur="var(--renner-helm-rand)" dikte={3.5} />
          {openingen(helm).map((d, i) => (
            <Lijn key={i} d={d} kleur="var(--renner-gat)" dikte={helm.profiel === "gaten" ? 9 : 10} />
          ))}
        </g>
        <Vlak d="M 70 -6 C 92 -14 114 -8 124 2 C 122 18 106 28 88 26 C 76 24 70 12 70 -6 Z" kleur="var(--renner-lens)" />
        <Lijn d="M 72 -2 L -4 2" kleur="var(--renner-zool)" dikte={6} />
      </Deel>
    </g>
  );
}

/** Het stuk van de beugel of de remgreep dat voor de vingers langs loopt. */
function VoorDeHand({ houding }: { houding: HoudingId }) {
  if (houding === "beugel") return <path d={kromme(BEUGEL.slice(-12), 26)} fill="var(--renner-stuur)" />;
  if (houding === "remgrepen") return <path d={REMGREEP} fill="var(--renner-metaal-donker)" />;
  return null;
}

function Weg({ id, wegdek }: { id: string; wegdek: WegdekId }) {
  return (
    <g>
      <defs>
        <filter id={`${id}-z`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
      </defs>
      {wegdek === "glad" ? (
        <Lijn d={`M -560 ${GROND + 14} L 1580 ${GROND + 14}`} kleur="var(--renner-weg)" dikte={18} />
      ) : (
        <g key="ruw" className="renner-wissel" fill="var(--renner-weg)">
          {Array.from({ length: 23 }, (_, i) => (
            <rect key={i} x={-560 + i * 96} y={GROND + 6 + (i % 2) * 9} width="81" height={42 - (i % 3) * 6} rx="18" />
          ))}
        </g>
      )}
      <ellipse cx="520" cy={GROND + 3} rx="800" ry="22" fill="var(--renner-grond)" filter={`url(#${id}-z)`} style={{ opacity: "var(--renner-grond-sterkte)" }} />
      <ellipse cx={ACHTER[0]} cy={GROND + 1} rx="120" ry="7" fill="var(--renner-grond)" style={{ opacity: 0.35 }} />
      <ellipse cx={VOOR[0]} cy={GROND + 1} rx="120" ry="7" fill="var(--renner-grond)" style={{ opacity: 0.35 }} />
    </g>
  );
}

/** De houding van de andere opzet als stippellijn: romp, arm en hoofd. */
function Schim({ pose }: { pose: Pose }) {
  const s = schouderVan(pose);
  const kop = hoofdVan(pose).c;
  return (
    <g className="renner-schim-groep">
      <path d={ROMP_VORM} transform={`translate(${pt(pose.heup)}) rotate(${f(-pose.romp)})`} className="renner-schim" vectorEffect="non-scaling-stroke" />
      <path d={`M${pt(s)}L${pt(pose.elleboog)}L${pt(pose.pols)}`} className="renner-schim renner-schim-lijn" vectorEffect="non-scaling-stroke" />
      <circle cx={kop[0]} cy={kop[1]} r="110" className="renner-schim" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/** Waar de loep met het hoofd staat (in de viewBox), en hoeveel groter. */
const LOEP = { c: [62, 38] as P, r: 44, schaal: 1.75 };

export function RennerFiguur({
  beeld,
  schim,
  tenue,
  wegdek,
  focus,
  className,
}: {
  beeld: RennerBeeld;
  /** De houding van de andere opzet, als stippellijn erachter, als die verschilt. */
  schim?: HoudingId;
  tenue: Tenue;
  wegdek: WegdekId;
  /** Het gekozen onderdeel: bij fiets, wielen en banden wijkt de renner, bij de helm komt er een loep. */
  focus?: Onderdeel;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pose = useHouding(POSES[beeld.houding]);
  const schimPose = schim && schim !== beeld.houding ? POSES[schim] : null;
  const wijk = focus === "fiets" || focus === "wielen" || focus === "banden";
  const kop = naarBeeld(hoofdVan(pose).c);
  const schijf = beeld.fiets.rem !== "velg";

  return (
    <svg viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`} className={className} role="img" aria-hidden="true">
      <g transform={IN_MM}>
        <Weg id={`${id}w`} wegdek={wegdek} />
        {schimPose && <Schim pose={schimPose} />}
        <g className="renner-lichaam" data-wijk={wijk || undefined}>
          <Arm id={`${id}av`} pose={pose} tenue={tenue} mouw={beeld.mouw} ver />
          <Been id={`${id}bv`} pose={pose} ver />
        </g>
        <VerCrank id={`${id}cv`} />
        <Wiel id={`${id}wa`} c={ACHTER} wiel={beeld.wielen} voor={false} spanning={beeld.spanning} schijf={schijf} />
        <Wiel id={`${id}wv`} c={VOOR} wiel={beeld.wielen} voor spanning={beeld.spanning} schijf={schijf} />
        <Cassette />
        <Frame id={`${id}f`} fiets={beeld.fiets} />
        <Zadel id={`${id}z`} />
        <Stuur id={`${id}s`} />
        <Aandrijving id={`${id}d`} />
        <g className="renner-lichaam" data-wijk={wijk || undefined}>
          <Been id={`${id}bn`} pose={pose} />
          <Romp id={`${id}r`} pose={pose} tenue={tenue} />
          <Nek id={`${id}n`} pose={pose} />
          <Hoofd id={`${id}h`} pose={pose} helm={beeld.helm} />
          <Arm id={`${id}an`} pose={pose} tenue={tenue} mouw={beeld.mouw} />
          <VoorDeHand houding={beeld.houding} />
        </g>
      </g>
      {focus === "helm" && (
        <g className="renner-wissel">
          <path d={`M ${pt(add(LOEP.c, [LOEP.r * 0.75, -LOEP.r * 0.66]))} L ${pt(add(kop, [-16, 0]))}`} stroke="var(--renner-rand-loep)" strokeWidth="1" strokeDasharray="3 3" />
          <clipPath id={`${id}-loep`}>
            <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} />
          </clipPath>
          <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} fill="var(--card)" />
          <g clipPath={`url(#${id}-loep)`}>
            <g transform={`translate(${pt(LOEP.c)}) scale(${LOEP.schaal}) translate(${f(-kop[0] - 4)} ${f(-kop[1] + 5)})`}>
              <g transform={IN_MM}>
                <Romp id={`${id}lr`} pose={pose} tenue={tenue} />
                <Nek id={`${id}ln`} pose={pose} />
                <Hoofd id={`${id}lh`} pose={pose} helm={beeld.helm} />
              </g>
            </g>
          </g>
          <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} fill="none" stroke="var(--renner-rand-loep)" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}
