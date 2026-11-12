"use client";

import { useId, useMemo } from "react";
import { hashSeed, rng } from "../engine/rng";
import type { RiderCard, RiderType, Tier } from "../engine/types";
import styles from "./kopman.module.css";

// Rennerportretten in de stijl van een Belgisch stripalbum: inktlijn, vlakke
// kleuren en rasterpunten als schaduw. Elk gezicht komt uit de id van de kaart,
// dus een renner ziet er altijd hetzelfde uit; de stemming wisselt in de koers.

export type Mood = "rust" | "aanval" | "limiet" | "zege";

export const INK = "#1b1712";
export const PAPER = "#fffaf0";
export const JERSEY = "#ffc53d";
export const TRIM = "#23405c";
const MOUTH = "#5a1f17";
const TONGUE = "#d9636b";
const BLUSH = "#e8706a";
const SWEAT = "#9bd3f5";

const SKINS = ["#f7dcc4", "#efc6a2", "#e2ac82", "#cc8f62", "#a96d45", "#7c4c2f"];
const HAIRS = ["#2a1d14", "#3d2717", "#5c3a1f", "#8a5a2b", "#c8994f", "#e3c47e", "#a8452a", "#7d7d7a"];
const BLOND_COUNTRIES = new Set(["NOR", "DEN", "NED", "GER", "GBR"]);
const LENSES = ["#23313f", "#2f6fa8", "#d8692a", "#3b2a4f"];

export const SKY: Record<Tier, { sky: string; far: string; near: string; ray: string }> = {
  brons: { sky: "#d3e6dc", far: "#e2a676", near: "#c4804f", ray: "#e2efe8" },
  zilver: { sky: "#d6e8f2", far: "#a8c6d9", near: "#7ea4bd", ray: "#e6f1f7" },
  goud: { sky: "#ffe9a8", far: "#e9c27a", near: "#cf9a45", ray: "#ffd23a" },
  diamant: { sky: "#e2f8ff", far: "#9fdcef", near: "#5fb7d6", ray: "#c4f2ff" },
};

export type Face = {
  skin: string;
  hair: string;
  brow: string;
  w: number;
  jaw: number;
  chin: number;
  neck: number;
  shoulders: number;
  ex: number;
  eyeY: number;
  eyeR: number;
  browThick: number;
  nose: 0 | 1 | 2;
  mouthW: number;
  hairStyle: 0 | 1 | 2 | 3;
  facial: 0 | 1 | 2 | 3;
  glasses: 0 | 1 | 2;
  lens: string;
  freckles: boolean;
  blink: number;
};

const BUILD: Record<RiderType, { w: [number, number]; neck: number; shoulders: number; jaw: number }> = {
  klimmer: { w: [14.6, 15.8], neck: 6.4, shoulders: 33, jaw: 0.7 },
  sprinter: { w: [17.6, 19.2], neck: 10, shoulders: 43, jaw: 0.86 },
  tijdrijder: { w: [16, 17.2], neck: 8.2, shoulders: 39, jaw: 0.8 },
  klassieker: { w: [16.4, 17.8], neck: 8.8, shoulders: 40, jaw: 0.8 },
  allrounder: { w: [15.6, 17.2], neck: 7.8, shoulders: 37, jaw: 0.76 },
};

function pickWeighted<T>(random: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let roll = random() * total;
  for (const [item, w] of items) {
    roll -= w;
    if (roll < 0) return item;
  }
  return items[items.length - 1][0];
}

export function faceOf(card: RiderCard): Face {
  const r = rng(hashSeed("gezicht", card.id));
  const build = BUILD[card.type];
  const w = build.w[0] + r() * (build.w[1] - build.w[0]);
  const skinIndex = Math.floor(r() * SKINS.length);
  const blondish = BLOND_COUNTRIES.has(card.country);
  const hairIndex = pickWeighted(r, HAIRS.map((_, i) => [i, i === 4 || i === 5 ? (blondish ? 3 : 0.7) : i === 6 ? 0.6 : i === 7 ? 0.5 : 1.6] as [number, number]));
  const hair = HAIRS[hairIndex];
  const eyeR = 3.5 + r() * 0.8;
  return {
    skin: SKINS[skinIndex],
    hair,
    brow: hairIndex >= 4 && hairIndex <= 6 ? "#7a5228" : hairIndex === 7 ? "#4f4f4c" : INK,
    w,
    jaw: w * (build.jaw + r() * 0.1),
    chin: 71 + r() * 3,
    neck: build.neck + r() * 1.2,
    shoulders: build.shoulders + r() * 3,
    ex: 6.6 + r() * 1.3,
    eyeY: 50 + r() * 1.4,
    eyeR,
    browThick: 1.9 + r() * 1.3 + (card.type === "sprinter" ? 0.5 : 0),
    nose: Math.floor(r() * 3) as 0 | 1 | 2,
    mouthW: 5.4 + r() * 2.4,
    hairStyle: pickWeighted(r, [[0, 4], [1, 2], [2, 1.5], [3, 2]] as [0 | 1 | 2 | 3, number][]),
    facial: pickWeighted(r, [[0, 11], [1, 4], [2, 2], [3, 3]] as [0 | 1 | 2 | 3, number][]),
    glasses: pickWeighted(r, [[0, 9], [1, 6], [2, 2]] as [0 | 1 | 2, number][]),
    lens: LENSES[Math.floor(r() * LENSES.length)],
    freckles: skinIndex <= 1 && r() < 0.35,
    blink: -r() * 4.6,
  };
}

const f = (n: number) => Math.round(n * 100) / 100;

/** `hex` pushed `t` of the way towards the ink: the darker tint a halftone prints in. */
function shade(hex: string, t = 0.3) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(INK.slice(1), 16);
  const mix = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, "0")}`;
}

function Scenery({ type, tier }: { type: RiderType; tier: Tier }) {
  const c = SKY[tier];
  const line = { stroke: INK, strokeWidth: 1, strokeLinejoin: "round" as const };
  switch (type) {
    case "klimmer":
      return (
        <g>
          <path d="M0 70 L13 53 L22 61 L37 43 L51 59 L64 47 L77 60 L90 49 L100 57 V100 H0Z" fill={c.far} {...line} />
          <path d="M0 80 L12 65 L30 100 H0Z" fill={c.near} {...line} />
          <path d="M58 100 L80 54 L100 82 V100Z" fill={c.near} {...line} />
          <path d="M74.6 66.4 L80 54 L86.2 63 L83.2 61.4 L80.6 64 L78 61.8Z" fill={PAPER} {...line} strokeWidth={0.9} />
          <path d="M33.6 47.6 L37 43 L40.6 48.4 L38.6 47.2 L36.8 49.2Z" fill={PAPER} {...line} strokeWidth={0.8} />
        </g>
      );
    case "klassieker":
      return (
        <g>
          <path d="M0 73 Q24 59 54 70 T100 66 V100 H0Z" fill={c.far} {...line} />
          <path d="M13 65 V50 H23 V65Z" fill={c.near} {...line} />
          <path d="M11.6 50.4 L18 37 L24.4 50.4Z" fill={c.near} {...line} />
          <path d="M16.4 57 V53.6 Q18 51.6 19.6 53.6 V57Z" fill={INK} />
          <path d="M18 37 V33.6 M16.6 35 H19.4" stroke={INK} strokeWidth={0.9} />
          <path d="M0 86 H100 V100 H0Z" fill={c.near} {...line} />
          <g fill="none" stroke={INK} strokeWidth={0.7} opacity={0.75}>
            {[88, 93, 98].map((y, row) =>
              Array.from({ length: 15 }, (_, i) => <rect key={`${row}-${i}`} x={i * 7 - (row % 2 ? 3.5 : 0)} y={y - 1.8} width={5.6} height={3.6} rx={1.6} />),
            )}
          </g>
        </g>
      );
    case "sprinter":
      return (
        <g>
          <path d="M0 80 Q4 74 8 80 Q12 73 16 80 Q20 75 24 80 Q28 72 32 80 Q36 75 40 80 Q44 73 48 80 Q52 75 56 80 Q60 72 64 80 Q68 75 72 80 Q76 73 80 80 Q84 75 88 80 Q92 72 96 80 Q98 76 100 79 V100 H0Z" fill={c.far} {...line} />
          <path d="M0 86 H100 V100 H0Z" fill={c.near} {...line} />
          <path d="M0 92 H100" stroke={INK} strokeWidth={0.8} />
          <path d="M3 100 V5 H6.4 V100Z M93.6 100 V5 H97 V100Z" fill={PAPER} {...line} />
          <rect x={3} y={4} width={94} height={9} fill={PAPER} {...line} />
          <g fill={INK}>
            {Array.from({ length: 21 }, (_, i) => <rect key={i} x={3 + i * 4.5} y={i % 2 ? 4 : 8.5} width={4.5} height={4.5} />)}
          </g>
        </g>
      );
    case "tijdrijder":
      return (
        <g>
          <path d="M0 72 H100 V100 H0Z" fill={c.far} {...line} />
          <path d="M0 81 L100 77 M0 90 L100 86" stroke={INK} strokeWidth={0.6} opacity={0.7} />
          <path d="M12.4 72 L14 58 H18.4 L20 72Z" fill={c.near} {...line} />
          <path d="M13.4 58.2 Q16.2 54.4 19 58.2Z" fill={c.near} {...line} />
          <g className={styles.pMill}>
            {[0, 90, 180, 270].map((a) => (
              <rect key={a} x={15.4} y={45.4} width={1.8} height={11.4} fill={PAPER} {...line} strokeWidth={0.7} transform={`rotate(${a + 20} 16.2 57)`} />
            ))}
            <circle cx={16.2} cy={57} r={1} fill={INK} />
          </g>
          <path d="M82 72 V66 H90 V72" fill={c.near} {...line} />
          <path d="M80.6 66.2 L86 61.4 L91.4 66.2Z" fill={c.near} {...line} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M0 70 Q20 57 42 68 T82 61 T100 63 V100 H0Z" fill={c.far} {...line} />
          <path d="M0 84 Q30 71 60 82 T100 77 V100 H0Z" fill={c.near} {...line} />
          <path d="M85 74 V64" stroke={INK} strokeWidth={2.2} />
          <circle cx={85} cy={60} r={7} fill={c.near} {...line} />
          <path d="M81 58 Q83 55 86 56" stroke={INK} strokeWidth={0.8} fill="none" />
          <path d="M14 70 V64.6" stroke={INK} strokeWidth={1.6} />
          <circle cx={14} cy={62} r={4} fill={c.near} {...line} />
        </g>
      );
  }
}

function Star({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  const d = `M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`;
  return <path className={styles.pTwinkle} style={{ animationDelay: `${delay}s` }} d={d} fill="#ffe14d" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />;
}

function Eyes({ face, mood }: { face: Face; mood: Mood }) {
  const { ex, eyeY: y, eyeR } = face;
  if (mood === "limiet") {
    return (
      <g fill="none" stroke={INK} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${f(50 - ex - 3.4)} ${f(y - 2.6)} L${f(50 - ex + 2.4)} ${f(y)} L${f(50 - ex - 3.4)} ${f(y + 2.6)}`} />
        <path d={`M${f(50 + ex + 3.4)} ${f(y - 2.6)} L${f(50 + ex - 2.4)} ${f(y)} L${f(50 + ex + 3.4)} ${f(y + 2.6)}`} />
      </g>
    );
  }
  if (mood === "zege") {
    return (
      <g fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round">
        <path d={`M${f(50 - ex - 3.4)} ${f(y + 1.2)} Q${f(50 - ex)} ${f(y - 3.6)} ${f(50 - ex + 3.4)} ${f(y + 1.2)}`} />
        <path d={`M${f(50 + ex - 3.4)} ${f(y + 1.2)} Q${f(50 + ex)} ${f(y - 3.6)} ${f(50 + ex + 3.4)} ${f(y + 1.2)}`} />
      </g>
    );
  }
  const ry = eyeR * 1.14;
  const eye = (cx: number, side: -1 | 1) => (
    <g key={side}>
      <g className={styles.pBlink} style={{ animationDelay: `${face.blink}s` }}>
        <ellipse cx={f(cx)} cy={f(y)} rx={f(eyeR)} ry={f(ry)} fill="#ffffff" stroke={INK} strokeWidth={1.3} />
        <g className={styles.pLook} style={{ animationDelay: `${face.blink}s` }}>
          <circle cx={f(cx + (mood === "aanval" ? 0 : 0.3))} cy={f(y + 0.6)} r={f(eyeR * 0.56)} fill={INK} />
          <circle cx={f(cx - eyeR * 0.18)} cy={f(y - eyeR * 0.1)} r={f(eyeR * 0.2)} fill="#ffffff" />
        </g>
        <path d={`M${f(cx - eyeR - 0.5)} ${f(y - ry * 0.3)} Q${f(cx)} ${f(y - ry - 1.5)} ${f(cx + eyeR + 0.5)} ${f(y - ry * 0.3)}`} fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round" />
      </g>
      {mood === "aanval" ? (
        <path
          d={`M${f(cx - eyeR - 0.6)} ${f(y - ry * 0.95 + (side === -1 ? -0.6 : 1.6))} L${f(cx + eyeR + 0.6)} ${f(y - ry * 0.95 + (side === -1 ? 1.6 : -0.6))} L${f(cx + eyeR + 0.6)} ${f(y - ry - 1)} L${f(cx - eyeR - 0.6)} ${f(y - ry - 1)}Z`}
          fill={face.skin}
        />
      ) : null}
      {mood === "aanval" ? (
        <path d={`M${f(cx - eyeR - 0.4)} ${f(y - ry * 0.95 + (side === -1 ? -0.6 : 1.6))} L${f(cx + eyeR + 0.4)} ${f(y - ry * 0.95 + (side === -1 ? 1.6 : -0.6))}`} stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
      ) : null}
    </g>
  );
  return <g>{eye(50 - ex, -1)}{eye(50 + ex, 1)}</g>;
}

function Brows({ face, mood }: { face: Face; mood: Mood }) {
  const { ex } = face;
  const y = face.eyeY - 7.2;
  const shape: Record<Mood, [number, number, number]> = {
    rust: [0.4, -2, 0.2],
    aanval: [2.6, -0.6, -1.4],
    limiet: [-2.2, -1.8, 1.6],
    zege: [-1, -4.6, -0.4],
  };
  const [inner, mid, outer] = shape[mood];
  const brow = (side: -1 | 1) =>
    `M${f(50 + side * 2.8)} ${f(y + inner)} Q${f(50 + side * ex)} ${f(y + mid)} ${f(50 + side * (ex + 4.6))} ${f(y + outer)}`;
  return (
    <g fill="none" stroke={face.brow} strokeWidth={f(face.browThick)} strokeLinecap="round">
      <path d={brow(-1)} />
      <path d={brow(1)} />
      {mood === "limiet" ? <path d={`M48.6 ${f(y - 3.4)} Q50 ${f(y - 4.4)} 51.4 ${f(y - 3.4)}`} stroke={INK} strokeWidth={0.8} /> : null}
    </g>
  );
}

function Mouth({ face, mood }: { face: Face; mood: Mood }) {
  const w = face.mouthW;
  const y = face.chin - 8.4;
  if (mood === "aanval") {
    return (
      <g strokeLinejoin="round">
        <path d={`M${f(50 - w)} ${f(y - 1.8)} Q50 ${f(y - 2.8)} ${f(50 + w)} ${f(y - 1.8)} L${f(50 + w - 0.6)} ${f(y + 2)} Q50 ${f(y + 3.2)} ${f(50 - w + 0.6)} ${f(y + 2)}Z`} fill="#ffffff" stroke={INK} strokeWidth={1.4} />
        <path d={`M${f(50 - w + 0.5)} ${f(y + 0.1)} H${f(50 + w - 0.5)} M47.8 ${f(y - 2.3)} V${f(y + 2.6)} M52.2 ${f(y - 2.3)} V${f(y + 2.6)} M${f(50 - w * 0.68)} ${f(y - 2)} V${f(y + 2.2)} M${f(50 + w * 0.68)} ${f(y - 2)} V${f(y + 2.2)}`} stroke={INK} strokeWidth={0.8} />
      </g>
    );
  }
  if (mood === "limiet") {
    return (
      <g className={styles.pGasp}>
        <ellipse cx={50} cy={f(y + 1)} rx={f(w * 0.56)} ry={3.8} fill={MOUTH} stroke={INK} strokeWidth={1.5} />
        <path d={`M${f(50 - w * 0.4)} ${f(y + 3.3)} Q50 ${f(y + 1.2)} ${f(50 + w * 0.4)} ${f(y + 3.3)}`} fill={TONGUE} />
      </g>
    );
  }
  if (mood === "zege") {
    return (
      <g strokeLinejoin="round">
        <path d={`M${f(50 - w - 1.6)} ${f(y - 1.6)} Q50 ${f(y - 0.4)} ${f(50 + w + 1.6)} ${f(y - 1.6)} Q${f(50 + w)} ${f(y + 6.6)} 50 ${f(y + 7.2)} Q${f(50 - w)} ${f(y + 6.6)} ${f(50 - w - 1.6)} ${f(y - 1.6)}Z`} fill={MOUTH} stroke={INK} strokeWidth={1.5} />
        <path d={`M${f(50 - w - 0.6)} ${f(y - 1.2)} Q50 ${f(y - 0.2)} ${f(50 + w + 0.6)} ${f(y - 1.2)} L${f(50 + w - 0.2)} ${f(y + 1)} Q50 ${f(y + 1.9)} ${f(50 - w + 0.2)} ${f(y + 1)}Z`} fill="#ffffff" />
        <ellipse cx={50} cy={f(y + 5)} rx={f(w * 0.5)} ry={1.6} fill={TONGUE} />
      </g>
    );
  }
  return (
    <g fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round">
      <path d={`M${f(50 - w)} ${f(y)} Q50 ${f(y + 3.4)} ${f(50 + w)} ${f(y - 0.4)}`} />
      <path d={`M${f(50 + w - 0.4)} ${f(y - 1.4)} L${f(50 + w + 0.8)} ${f(y + 0.2)}`} strokeWidth={1} />
    </g>
  );
}

function Nose({ face }: { face: Face }) {
  const y = face.eyeY + 7.6;
  const props = { fill: "none", stroke: INK, strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (face.nose === 1) return <path d={`M50.2 ${f(face.eyeY + 1)} L52.8 ${f(y + 0.4)} Q53.2 ${f(y + 2.2)} 50.6 ${f(y + 2)}`} {...props} />;
  if (face.nose === 2) {
    return (
      <g>
        <ellipse cx={50.4} cy={f(y + 0.6)} rx={2.5} ry={1.9} fill={face.skin} stroke={INK} strokeWidth={1.2} />
        <circle cx={49.2} cy={f(y + 1.3)} r={0.45} fill={INK} />
      </g>
    );
  }
  return <path d={`M50.6 ${f(face.eyeY + 2)} Q53.8 ${f(y)} 51.8 ${f(y + 1.3)} Q50.4 ${f(y + 2.1)} 48.4 ${f(y + 0.9)}`} {...props} />;
}

function Glasses({ face, y, lift }: { face: Face; y: number; lift?: boolean }) {
  const w = face.w + (lift ? 1.6 : 0);
  const ex = face.ex;
  const d = `M${f(50 - w + 0.6)} ${f(y - 3.6)} C${f(50 - 8)} ${f(y - 6.4)} ${f(50 + 8)} ${f(y - 6.4)} ${f(50 + w - 0.6)} ${f(y - 3.6)} L${f(50 + w - 1.6)} ${f(y + 2.4)} C${f(50 + ex + 3)} ${f(y + 5.4)} 53 ${f(y + 4.4)} 50 ${f(y + 2)} C47 ${f(y + 4.4)} ${f(50 - ex - 3)} ${f(y + 5.4)} ${f(50 - w + 1.6)} ${f(y + 2.4)}Z`;
  return (
    <g>
      <path d={d} fill={face.lens} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={`M${f(50 - ex - 2.6)} ${f(y + 1.4)} L${f(50 - ex + 0.6)} ${f(y - 3.4)} M${f(50 - ex + 0.6)} ${f(y + 1.8)} L${f(50 - ex + 2.4)} ${f(y - 0.8)} M${f(50 + ex - 1.8)} ${f(y + 1.4)} L${f(50 + ex + 1.4)} ${f(y - 3.4)}`} stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

export function Portrait({ card, mood = "rust", live = true, crop = false }: { card: RiderCard; mood?: Mood; live?: boolean; crop?: boolean }) {
  const face = useMemo(() => faceOf(card), [card]);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const skinDots = `kd${uid}`;
  const jerseyDots = `kj${uid}d`;
  const faceClip = `kf${uid}`;
  const jerseyClip = `kj${uid}`;
  const c = SKY[card.tier];
  const { w, jaw, chin, neck, shoulders: S, eyeY } = face;
  const hw = w + 3.6;

  const headPath = `M${f(50 - w)} 34 C${f(50 - w)} ${f(eyeY + 8)} ${f(50 - jaw)} ${f(chin - 6)} 44 ${f(chin - 0.8)} Q50 ${f(chin + 1.6)} 56 ${f(chin - 0.8)} C${f(50 + jaw)} ${f(chin - 6)} ${f(50 + w)} ${f(eyeY + 8)} ${f(50 + w)} 34 Q50 16 ${f(50 - w)} 34Z`;
  const jerseyPath = `M${f(50 - S)} 101 V93 C${f(50 - S)} 85 ${f(50 - S + 10)} 79.6 ${f(50 - neck - 5)} 77.6 Q50 83 ${f(50 + neck + 5)} 77.6 C${f(50 + S - 10)} 79.6 ${f(50 + S)} 85 ${f(50 + S)} 93 V101Z`;
  const helmetPath = `M${f(50 - hw)} 46 C${f(50 - hw - 1.6)} 30 ${f(50 - hw + 5)} 13 50 12 C${f(50 + hw - 5)} 13 ${f(50 + hw + 1.6)} 30 ${f(50 + hw)} 46 C${f(50 + hw - 2.4)} 44 ${f(50 + w - 1)} 41.4 ${f(50 + w - 3)} 39.2 C${f(50 + w - 10)} 36 ${f(50 - w + 10)} 36 ${f(50 - w + 3)} 39.2 C${f(50 - w + 1)} 41.4 ${f(50 - hw + 2.4)} 44 ${f(50 - hw)} 46Z`;

  const shadesOn = face.glasses === 2 && mood === "rust";
  // Ben-Day dots in a darker tint of the colour underneath; at race size a flat tint reads better.
  const skinShadow = crop ? shade(face.skin, 0.2) : `url(#${skinDots})`;
  const jerseyShadow = crop ? shade(JERSEY, 0.16) : `url(#${jerseyDots})`;
  const moodClass = mood === "limiet" ? styles.pShake : mood === "aanval" ? styles.pLean : mood === "zege" ? styles.pHop : "";

  return (
    <svg
      className={`${styles.portrait} ${live ? "" : styles.still}`}
      viewBox={crop ? "19 19 62 62" : "0 0 100 100"}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={skinDots} width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.8} cy={1.8} r={0.95} fill={shade(face.skin, 0.32)} />
        </pattern>
        <pattern id={jerseyDots} width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.8} cy={1.8} r={0.95} fill={shade(JERSEY, 0.28)} />
        </pattern>
        <clipPath id={faceClip}><path d={headPath} /></clipPath>
        <clipPath id={jerseyClip}><path d={jerseyPath} /></clipPath>
      </defs>

      <rect x={0} y={0} width={100} height={100} fill={c.sky} />
      {(card.tier === "goud" || card.tier === "diamant") ? (
        <g className={styles.pSpin} fill={c.ray}>
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M50 42 L46 -40 L54 -40Z" transform={`rotate(${i * 30} 50 42)`} />
          ))}
        </g>
      ) : null}
      <Scenery type={card.type} tier={card.tier} />

      {mood === "aanval" ? (
        <g className={styles.pSpeed} stroke={INK} strokeWidth={0.9} strokeLinecap="round" opacity={0.6}>
          <path d="M4 30 H18 M8 38 H26 M2 46 H22 M10 54 H27 M5 62 H20 M74 34 H96 M78 44 H99 M76 56 H94 M20 34 H28 M73 50 H80" />
        </g>
      ) : null}
      {mood === "zege" ? (
        <g>
          <Star x={14} y={24} s={4.6} delay={0} />
          <Star x={86} y={13} s={3.6} delay={0.5} />
          <Star x={10} y={52} s={3} delay={0.9} />
          <Star x={30} y={9} s={2.8} delay={0.3} />
        </g>
      ) : null}

      <g className={styles.pBreathe}>
        {face.hairStyle === 2 ? (
          <path d={`M${f(50 - w + 1)} 44 C${f(50 - w - 3)} 58 ${f(50 - w + 1)} 68 ${f(50 - neck - 1)} 75 H${f(50 + neck + 1)} C${f(50 + w - 1)} 68 ${f(50 + w + 3)} 58 ${f(50 + w - 1)} 44Z`} fill={face.hair} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
        ) : null}

        <path d={`M${f(50 - neck)} 62 V80 Q50 84 ${f(50 + neck)} 80 V62Z`} fill={face.skin} stroke={INK} strokeWidth={1.6} />
        <path d={`M${f(50 - neck)} 66 Q50 ${f(chin + 7)} ${f(50 + neck)} 66 V73 Q50 77 ${f(50 - neck)} 73Z`} fill={skinShadow} />

        {mood === "zege" ? (
          <g className={styles.pPump}>
            <path d={`M${f(50 + S - 13)} 88 C${f(50 + S - 7)} 72 79 60 77.4 49 L88.6 47.6 C90.6 61 ${f(50 + S + 2)} 76 ${f(50 + S - 1)} 90Z`} fill={JERSEY} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
            <path d="M77.2 51 L88.8 49.6" stroke={TRIM} strokeWidth={3} />
            <path d="M77.2 49.6 L88.8 48.2 M77.6 52.6 L89 51.2" stroke={INK} strokeWidth={0.9} />
            <path d="M76.6 47.6 C74.8 41 76.2 34.8 82 34 C88 33.2 91.2 37 90.4 43 C90 46.2 88.4 48.2 85 48.2Z" fill={face.skin} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
            <path d="M79.6 37.6 Q84 36.4 88.8 38.6 M79 41.2 Q84 40 89.8 42.2 M77.4 44.4 Q82 45.6 85.2 43.4" fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
          </g>
        ) : null}

        <path d={jerseyPath} fill={JERSEY} stroke={INK} strokeWidth={2.1} strokeLinejoin="round" />
        <g clipPath={`url(#${jerseyClip})`}>
          <path d={`M${f(50 - S)} 86 L${f(50 - S + 8)} 80 L${f(50 - S + 12)} 101 H${f(50 - S)}Z M${f(50 + S)} 86 L${f(50 + S - 8)} 80 L${f(50 + S - 12)} 101 H${f(50 + S)}Z`} fill={TRIM} stroke={INK} strokeWidth={1} />
          <ellipse cx={50} cy={82} rx={f(neck + 10)} ry={6} fill={jerseyShadow} />
          <ellipse cx={f(50 + S - 2)} cy={96} rx={14} ry={12} fill={jerseyShadow} />
        </g>
        <path d={`M${f(50 - neck - 4)} 78.2 Q50 85.6 ${f(50 + neck + 4)} 78.2`} fill="none" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
        <path d={`M${f(50 - neck - 4)} 78.2 Q50 85.6 ${f(50 + neck + 4)} 78.2`} fill="none" stroke={TRIM} strokeWidth={2.6} strokeLinecap="round" />
        <path d="M50 83.6 V101" stroke={INK} strokeWidth={1} />
        <rect x={48.8} y={84} width={2.4} height={3.6} rx={0.6} fill="#c9c9c9" stroke={INK} strokeWidth={0.8} />

        <g className={moodClass} style={{ transformOrigin: "50px 76px" }}>
          {face.hairStyle === 1 ? (
            <g fill={face.hair} stroke={INK} strokeWidth={1.1}>
              {[-1, 1].map((s) => [0, 1, 2].map((i) => <circle key={`${s}${i}`} cx={f(50 + s * (hw - 0.6 - i * 0.6))} cy={f(45 + i * 2.6)} r={2.5} />))}
            </g>
          ) : null}

          {[-1, 1].map((s) => (
            <g key={s}>
              <ellipse cx={f(50 + s * (w - 0.4))} cy={f(eyeY + 3)} rx={3} ry={4.6} fill={face.skin} stroke={INK} strokeWidth={1.4} />
              <path d={`M${f(50 + s * (w + 0.8))} ${f(eyeY + 0.8)} Q${f(50 + s * (w + 1.6))} ${f(eyeY + 3)} ${f(50 + s * (w + 0.6))} ${f(eyeY + 5.2)}`} fill="none" stroke={INK} strokeWidth={0.8} />
            </g>
          ))}

          <path d={headPath} fill={face.skin} stroke={INK} strokeWidth={1.9} strokeLinejoin="round" />
          <g clipPath={`url(#${faceClip})`}>
            <ellipse cx={f(50 + w + 3)} cy={58} rx={f(w * 0.62)} ry={26} fill={skinShadow} />
            {face.facial === 1 ? <ellipse cx={50} cy={f(chin - 4)} rx={f(jaw + 3)} ry={11} fill={face.hair} opacity={0.3} /> : null}
          </g>

          {face.hairStyle === 0 || face.hairStyle === 2 ? (
            <g fill={face.hair} stroke={INK} strokeWidth={0.9} strokeLinejoin="round">
              <path d={`M${f(50 - w + 0.3)} 39.4 L${f(50 - w + 2.8)} 39.4 L${f(50 - w + 2.4)} 47.2 L${f(50 - w + 0.6)} 48.2Z`} />
              <path d={`M${f(50 + w - 0.3)} 39.4 L${f(50 + w - 2.8)} 39.4 L${f(50 + w - 2.4)} 47.2 L${f(50 + w - 0.6)} 48.2Z`} />
            </g>
          ) : null}

          {face.facial === 3 ? (
            <path
              d={`M${f(50 - w + 0.6)} ${f(eyeY + 5)} C${f(50 - w + 1)} ${f(chin - 9)} ${f(50 - jaw)} ${f(chin - 2)} 50 ${f(chin + 2.6)} C${f(50 + jaw)} ${f(chin - 2)} ${f(50 + w - 1)} ${f(chin - 9)} ${f(50 + w - 0.6)} ${f(eyeY + 5)} C${f(50 + w - 3)} ${f(eyeY + 12)} ${f(50 + face.mouthW + 2.4)} ${f(chin - 12.6)} 50 ${f(chin - 12.4)} C${f(50 - face.mouthW - 2.4)} ${f(chin - 12.6)} ${f(50 - w + 3)} ${f(eyeY + 12)} ${f(50 - w + 0.6)} ${f(eyeY + 5)}Z`}
              fill={face.hair}
              stroke={INK}
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          ) : null}

          {mood === "limiet" || mood === "zege" ? (
            <g fill={BLUSH} opacity={0.55}>
              <ellipse cx={f(50 - face.ex - 1.6)} cy={f(eyeY + 7)} rx={3.4} ry={2} />
              <ellipse cx={f(50 + face.ex + 1.6)} cy={f(eyeY + 7)} rx={3.4} ry={2} />
            </g>
          ) : null}
          {face.freckles ? (
            <g fill="#b0703e" opacity={0.7}>
              {[-1, 1].map((s) => [0, 1, 2].map((i) => <circle key={`${s}${i}`} cx={f(50 + s * (face.ex + 0.6 + i * 1.5))} cy={f(eyeY + 6 + (i % 2) * 1.2)} r={0.45} />))}
            </g>
          ) : null}

          {shadesOn ? <Glasses face={face} y={eyeY} /> : <Eyes face={face} mood={mood} />}
          <Brows face={face} mood={mood} />
          <Nose face={face} />
          {face.facial === 2 ? (
            <path d={`M${f(50 - face.mouthW * 0.95)} ${f(chin - 10.4)} Q50 ${f(chin - 14.6)} ${f(50 + face.mouthW * 0.95)} ${f(chin - 10.4)} Q50 ${f(chin - 12)} ${f(50 - face.mouthW * 0.95)} ${f(chin - 10.4)}Z`} fill={face.hair} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
          ) : null}
          <Mouth face={face} mood={mood} />

          <g fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round">
            <path d={`M${f(50 - w + 0.8)} 44 Q${f(50 - w + 1.4)} ${f(eyeY + 10)} ${f(50 - jaw + 2.2)} ${f(chin - 3.6)}`} />
            <path d={`M${f(50 + w - 0.8)} 44 Q${f(50 + w - 1.4)} ${f(eyeY + 10)} ${f(50 + jaw - 2.2)} ${f(chin - 3.6)}`} />
          </g>

          <path d={helmetPath} fill={TRIM} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <path d={`M${f(50 - hw + 2.2)} 41.6 Q50 27.4 ${f(50 + hw - 2.2)} 41.6`} fill="none" stroke={INK} strokeWidth={3.8} />
          <path d={`M${f(50 - hw + 2.2)} 41.6 Q50 27.4 ${f(50 + hw - 2.2)} 41.6`} fill="none" stroke={JERSEY} strokeWidth={2} />
          <g fill="#0f1b28" stroke={INK} strokeWidth={0.9}>
            <path d="M48.2 15.4 Q50 14.6 51.8 15.4 L52.4 25.6 Q50 26.6 47.6 25.6Z" />
            <path d={`M${f(50 - hw * 0.5)} 21 Q${f(50 - hw * 0.4)} 19 ${f(50 - hw * 0.28)} 18.6 L${f(50 - hw * 0.32)} 28 Q${f(50 - hw * 0.45)} 29 ${f(50 - hw * 0.58)} 29.4Z`} />
            <path d={`M${f(50 + hw * 0.5)} 21 Q${f(50 + hw * 0.4)} 19 ${f(50 + hw * 0.28)} 18.6 L${f(50 + hw * 0.32)} 28 Q${f(50 + hw * 0.45)} 29 ${f(50 + hw * 0.58)} 29.4Z`} />
          </g>
          <path d={`M${f(50 - hw * 0.7)} 31 C${f(50 - hw * 0.66)} 22 ${f(50 - hw * 0.3)} 16 46 15.4 C${f(50 - hw * 0.38)} 19 ${f(50 - hw * 0.55)} 24 ${f(50 - hw * 0.58)} 31.6Z`} fill="#ffffff" opacity={0.28} />
          {face.glasses === 1 || (face.glasses === 2 && !shadesOn) ? <Glasses face={face} y={31.4} lift /> : null}

          {mood === "limiet" ? (
            <g>
              <path className={styles.pDrop} d={`M${f(50 + hw + 1.4)} 40 C${f(50 + hw + 3.6)} 43 ${f(50 + hw + 3.6)} 46 ${f(50 + hw + 1.4)} 46 C${f(50 + hw - 0.8)} 46 ${f(50 + hw - 0.8)} 43 ${f(50 + hw + 1.4)} 40Z`} fill={SWEAT} stroke={INK} strokeWidth={0.9} />
              <path className={styles.pDrop} style={{ animationDelay: "0.6s" }} d={`M${f(50 - hw - 2)} 48 C${f(50 - hw)} 50.6 ${f(50 - hw)} 53.2 ${f(50 - hw - 2)} 53.2 C${f(50 - hw - 4)} 53.2 ${f(50 - hw - 4)} 50.6 ${f(50 - hw - 2)} 48Z`} fill={SWEAT} stroke={INK} strokeWidth={0.9} />
              <path d={`M${f(50 - hw - 3)} 30 l-4 -2.4 M${f(50 - hw - 4)} 36 l-4.6 0 M${f(50 + hw + 3)} 30 l4 -2.4`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
            </g>
          ) : null}
        </g>
      </g>
    </svg>
  );
}
