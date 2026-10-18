"use client";

// De renner van de rekenaar: een wielrenner in het ZWB-tenue van opzij, die
// meebeweegt met de houding, helm, fiets, wielen, bandenspanning en het wegdek.
// Het tenue is er in de winter- en de zomereditie, naar een foto van de club.
// Helm, frame en wielen volgen het gekozen product: profiel en openingen van de
// helm, de kenmerken van het frame, velghoogte en spaken. Alleen vorm, geen
// logo's of merkkleuren (zie producttests.ts).
//
// De houding is data: een romphoek en de plek van de handen. Ellebogen en knieën
// rekent de figuur zelf uit met vaste lengtes, zodat de renner van houding kan
// wisselen zonder dat een arm onderweg krimpt. Kleuren komen uit `.renner` in
// globals.css, voor licht en donker.

import { useEffect, useId, useRef, useState } from "react";
import type { FietsUiterlijk, HelmProfiel, HelmUiterlijk, WielUiterlijk } from "@/lib/materiaal/producttests";
import type { HoudingId, Onderdeel, SpanningId, WegdekId } from "@/lib/materiaal/rekenaar";

type P = [number, number];

export const VIEWBOX = { x: 0, y: -60, w: 400, h: 310 } as const;

const ACHTER: P = [110, 180];
const VOOR: P = [275, 180];
const WIEL = 54.5;
const GROND = 237;
const TRAPAS: P = [180, 192];
const ZADEL: P = [148, 80];
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
  helm: HelmUiterlijk;
  fiets: FietsUiterlijk;
  wielen: WielUiterlijk;
  spanning: SpanningId;
};

const rad = (deg: number) => (deg * Math.PI) / 180;
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const f = (n: number) => Math.round(n * 10) / 10;
const pt = (p: P) => `${f(p[0])} ${f(p[1])}`;
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

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

const HELM_VORM: Record<HelmProfiel, string> = {
  gaten: "M -17 4 C -19 -14 -4 -22 8 -19 C 16 -17 20 -10 21 -3 L 14 -4 C 8 -10 -6 -10 -12 4 Z",
  rond: "M -18 5 C -21 -14 -5 -23 8 -20 C 17 -18 21 -10 21 -3 L 14 -4 C 8 -9 -6 -9 -13 5 Z",
  kort: "M -15 7 L -18 -5 C -17 -16 -4 -22 8 -19 C 17 -17 21 -10 21 -3 L 14 -4 C 8 -9 -6 -9 -11 6 Z",
  staart: "M -28 1 C -22 -15 -6 -22 8 -19 C 17 -17 21 -10 21 -3 L 14 -4 C 8 -9 -6 -9 -16 4 Z",
};

/** Openingen in de schaal: bij een helm met gaten over de hele kap, bij een aerohelm vooraan. */
function openingen(helm: HelmUiterlijk): [P, P][] {
  const vol = helm.profiel === "gaten";
  const van = rad(vol ? -35 : -28);
  const tot = rad(vol ? -165 : -115);
  // Tussen de openingen blijft schaal over: hoe meer gaten, hoe korter elk gat.
  const boog = Math.abs(tot - van) * 12;
  const lengte = Math.min(vol ? 4.5 : 4.5, (boog / Math.max(1, helm.gaten)) * 0.45);
  return Array.from({ length: helm.gaten }, (_, i) => {
    const a = van + ((tot - van) * (i + 0.5)) / helm.gaten;
    const plek: P = [14 * Math.cos(a), -5 + 11 * Math.sin(a)];
    const raak = [-14 * Math.sin(a), 11 * Math.cos(a)];
    const n = Math.hypot(raak[0], raak[1]);
    const d: P = [(raak[0] / n) * (lengte / 2), (raak[1] / n) * (lengte / 2)];
    return [
      [plek[0] - d[0], plek[1] - d[1]],
      [plek[0] + d[0], plek[1] + d[1]],
    ];
  });
}

function Helm({ helm }: { helm: HelmUiterlijk }) {
  return (
    <g key={`${helm.profiel}-${helm.gaten}`} className="renner-wissel">
      <path d={HELM_VORM[helm.profiel]} fill="var(--renner-helm)" stroke="var(--renner-rand)" strokeWidth="1" />
      <g stroke="var(--renner-gat)" strokeWidth={helm.profiel === "gaten" ? 1.8 : 2.6} strokeLinecap="round">
        {openingen(helm).map(([a, b], i) => (
          <path key={i} d={`M ${pt(a)} L ${pt(b)}`} />
        ))}
      </g>
    </g>
  );
}

function Hoofd({ romp, helm }: { romp: number; helm: HelmUiterlijk }) {
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

/** Pixels per millimeter: het wiel is 670 mm hoog. */
const MM = WIEL / 335;
const VELG_BUITEN = 51.8;

function Wiel({ c, wiel, voor, spanning }: { c: P; wiel: WielUiterlijk; voor: boolean; spanning: SpanningId }) {
  const hoogte = wiel.velg[voor ? 0 : 1];
  const aantal = wiel.spaken[voor ? 0 : 1];
  // Een golvende velg loopt in acht golven tussen de laagste en de hoogste maat.
  const diepte = (a: number) =>
    wiel.golvend ? (wiel.velg[0] + (wiel.velg[1] - wiel.velg[0]) * (1 + Math.cos(8 * a)) * 0.5) * MM : hoogte * MM;
  const binnen = (a: number) => VELG_BUITEN - diepte(a);
  const rondom = (r: (a: number) => number, stappen: number) =>
    Array.from({ length: stappen }, (_, i) => {
      const a = (i / stappen) * Math.PI * 2;
      return `${i === 0 ? "M" : "L"} ${f(c[0] + r(a) * Math.cos(a))} ${f(c[1] + r(a) * Math.sin(a))}`;
    }).join(" ") + " Z";
  const spaak = wiel.spaak;
  return (
    <g key={JSON.stringify(wiel) + voor} className="renner-wissel">
      <g
        stroke="var(--renner-velg)"
        strokeWidth={spaak === "staal" ? 0.8 : 1.3}
        strokeLinecap="round"
        fill="none"
      >
        {Array.from({ length: aantal }, (_, i) => {
          const a = (i / aantal) * Math.PI * 2 + 0.2;
          const eind = binnen(a) + 0.5;
          if (spaak === "gekruld") {
            const punten = Array.from({ length: 6 }, (_, k) => {
              const r = 4 + ((eind - 4) * k) / 5;
              const uit = k % 2 === 0 || k === 5 ? 0 : 1.6 * (k % 4 === 1 ? 1 : -1);
              return `${k === 0 ? "M" : "L"} ${f(c[0] + r * Math.cos(a) - uit * Math.sin(a))} ${f(c[1] + r * Math.sin(a) + uit * Math.cos(a))}`;
            });
            return <path key={i} d={punten.join(" ")} />;
          }
          return <line key={i} x1={f(c[0] + 4 * Math.cos(a))} y1={f(c[1] + 4 * Math.sin(a))} x2={f(c[0] + eind * Math.cos(a))} y2={f(c[1] + eind * Math.sin(a))} />;
        })}
      </g>
      {wiel.golvend ? (
        <path d={`${rondom(() => VELG_BUITEN, 72)} ${rondom(binnen, 144)}`} fill="var(--renner-velg-vlak)" fillRule="evenodd" />
      ) : (
        <circle cx={c[0]} cy={c[1]} r={f(VELG_BUITEN - (hoogte * MM) / 2)} fill="none" stroke="var(--renner-velg-vlak)" strokeWidth={f(hoogte * MM)} />
      )}
      <circle cx={c[0]} cy={c[1]} r={WIEL} fill="none" stroke="var(--renner-band)" strokeWidth="5" />
      {spanning === "zacht" && <ellipse cx={c[0]} cy={GROND - 1.5} rx="12" ry="3" fill="var(--renner-band)" />}
      <circle cx={c[0]} cy={c[1]} r="4" fill="var(--renner-frame)" />
    </g>
  );
}

const BUIZEN = {
  rond: { boven: 5, onder: 6.5, zit: 5.5, balhoofd: 7, vork: 4.5, liggend: 4.5, staand: 3.6, post: 3.5 },
  aero: { boven: 6.5, onder: 9, zit: 8, balhoofd: 9.5, vork: 6, liggend: 5, staand: 4, post: 5 },
  diep: { boven: 8, onder: 11.5, zit: 10, balhoofd: 11.5, vork: 7.5, liggend: 5.5, staand: 4.5, post: 6 },
} as const;

function Frame({ fiets }: { fiets: FietsUiterlijk }) {
  const b = BUIZEN[fiets.buis];
  // De zitknoop zakt langs de zitbuis naarmate de bovenbuis meer afloopt.
  const zitknoop = lerp(TRAPAS, ZADEL, 0.79 - 0.23 * fiets.aflopend);
  const onder: P = fiets.hoogBalhoofd ? [253.6, 128] : BALHOOFD_ONDER;
  const staysAan = fiets.staysLaag ? lerp(TRAPAS, zitknoop, 0.56) : zitknoop;
  const zitMidden = lerp(TRAPAS, zitknoop, 0.5);
  const zitbuis = fiets.zitbuisBocht
    ? `M ${pt(TRAPAS)} Q ${pt(add(zitMidden, [8, 1]))} ${pt(zitknoop)}`
    : `M ${pt(TRAPAS)} L ${pt(zitknoop)}`;
  const vork = fiets.golvendeVork
    ? `M ${pt(onder)} C 272 136 252 160 ${pt(VOOR)}`
    : `M ${pt(onder)} Q 268 150 ${pt(VOOR)}`;
  const richting = [BALHOOFD_BOVEN[0] - zitknoop[0], BALHOOFD_BOVEN[1] - zitknoop[1]];
  const klem: P =
    fiets.stuur === "doorlopend"
      ? [262, BALHOOFD_BOVEN[1] + (richting[1] / richting[0]) * (262 - BALHOOFD_BOVEN[0])]
      : [262, 92];
  const gat = lerp(zitknoop, BALHOOFD_BOVEN, 0.09);
  const hoekBoven = (Math.atan2(richting[1], richting[0]) * 180) / Math.PI;
  return (
    <g key={JSON.stringify(fiets)} className="renner-wissel" stroke="var(--renner-frame)" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M ${pt(TRAPAS)} L ${pt(ACHTER)}`} strokeWidth={b.liggend} />
      <path d={`M ${pt(staysAan)} L ${pt(ACHTER)}`} strokeWidth={b.staand} />
      <path d={zitbuis} strokeWidth={b.zit} />
      <path d={`M ${pt(zitknoop)} L ${pt(ZADEL)}`} strokeWidth={b.post} />
      <path d={`M ${pt(zitknoop)} L ${pt(BALHOOFD_BOVEN)}`} strokeWidth={b.boven} />
      <path d={`M ${pt(TRAPAS)} L ${pt(onder)}`} strokeWidth={b.onder} />
      <path d={`M ${pt(BALHOOFD_BOVEN)} L ${pt(onder)}`} strokeWidth={b.balhoofd} />
      <path d={vork} strokeWidth={b.vork} />
      {fiets.gat && (
        <>
          {/* Een volle knoop van bovenbuis, zitbuis en achterbrug, met het gat erdoor. */}
          <path
            d={`M ${pt(zitknoop)} L ${pt(lerp(zitknoop, BALHOOFD_BOVEN, 0.2))} L ${pt(lerp(zitknoop, TRAPAS, 0.22))} L ${pt(lerp(zitknoop, ACHTER, 0.18))} Z`}
            fill="var(--renner-frame)"
            strokeWidth="2"
          />
          <ellipse
            cx={f(gat[0] - 1)}
            cy={f(gat[1] + 8)}
            rx="6.5"
            ry="2.8"
            transform={`rotate(${f(hoekBoven + 12)} ${f(gat[0] - 1)} ${f(gat[1] + 8)})`}
            fill="var(--card)"
            stroke="none"
          />
        </>
      )}
      <path d="M 131 78 Q 146 74 162 78" strokeWidth="5" />
      {fiets.stuur === "los" && <path d={`M ${pt(BALHOOFD_BOVEN)} L 249 94 L 262 92`} strokeWidth="4.5" />}
      {fiets.stuur === "integraal" && <path d={`M ${pt(BALHOOFD_BOVEN)} L 262 92`} strokeWidth="6.5" />}
      {fiets.stuur === "doorlopend" && <path d={`M ${pt(BALHOOFD_BOVEN)} L ${pt(klem)} L 262 92`} strokeWidth={b.boven} />}
      {fiets.stuur === "v" && (
        <>
          <path d={`M ${pt(BALHOOFD_BOVEN)} L 262 92`} strokeWidth="7.5" />
          <path d={`M ${pt(add(BALHOOFD_BOVEN, [4, -1]))} L 258 94`} stroke="var(--card)" strokeWidth="1.8" />
        </>
      )}
      <path d="M 262 92 Q 272 88 277 94 Q 281 104 278 110 Q 274 116 266 114" strokeWidth={fiets.stuur === "los" ? 4 : 4.6} />
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

/** Waar de loep met het hoofd staat, en hoeveel groter. */
const LOEP = { c: [62, 22] as P, r: 44, schaal: 1.75 };

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
  const id = useId().replace(/:/g, "");
  const doel = POSES[beeld.houding];
  const pose = useHouding(doel);
  const schimPose = schim && schim !== beeld.houding ? POSES[schim] : null;
  const wijk = focus === "fiets" || focus === "wielen" || focus === "banden";
  const kop = hoofd(pose.romp);

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
      <g className="renner-lichaam" data-wijk={wijk || undefined}>
        <Been pedaal={PEDAAL_VER} ver />
        <Arm pose={pose} tenue={tenue} ver />
      </g>
      <Wiel c={ACHTER} wiel={beeld.wielen} voor={false} spanning={beeld.spanning} />
      <Wiel c={VOOR} wiel={beeld.wielen} voor spanning={beeld.spanning} />
      <Frame fiets={beeld.fiets} />
      <g className="renner-lichaam" data-wijk={wijk || undefined}>
        <Nek romp={pose.romp} />
        <Romp romp={pose.romp} clipId={`${id}-r`} tenue={tenue} />
        <Been pedaal={PEDAAL_NA} />
        <Hoofd romp={pose.romp} helm={beeld.helm} />
        <Arm pose={pose} tenue={tenue} />
      </g>
      {focus === "helm" && (
        <g className="renner-wissel">
          <path
            d={`M ${pt(add(LOEP.c, [LOEP.r * 0.75, -LOEP.r * 0.66]))} L ${pt(add(kop, [-16, 0]))}`}
            stroke="var(--renner-rand-loep)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <clipPath id={`${id}-loep`}>
            <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} />
          </clipPath>
          <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} fill="var(--card)" />
          <g clipPath={`url(#${id}-loep)`}>
            <g transform={`translate(${pt(LOEP.c)}) scale(${LOEP.schaal}) translate(${f(-kop[0] + 3)} ${f(-kop[1] + 5)})`}>
              <Nek romp={pose.romp} />
              <Romp romp={pose.romp} clipId={`${id}-lr`} tenue={tenue} />
              <Hoofd romp={pose.romp} helm={beeld.helm} />
            </g>
          </g>
          <circle cx={LOEP.c[0]} cy={LOEP.c[1]} r={LOEP.r} fill="none" stroke="var(--renner-rand-loep)" strokeWidth="1.2" />
        </g>
      )}
    </svg>
  );
}
