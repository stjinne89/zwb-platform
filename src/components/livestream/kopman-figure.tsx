import type { ReactElement } from "react";
import {
  KOPMAN_INK as INK,
  shade,
  type KopmanColors,
  type KopmanFace,
  type KopmanMood,
} from "@/lib/youtube-live/kopman";

// De eigen kopman van een lid (0347, 2026-11-20): een renner in de tekenstijl
// van de renners uit Kopman (src/kopman/ui/portrait.tsx), met toestemming van
// de eigenaar overgenomen. Een eigen kopie, zodat Kopman los van ZWB blijft. Nieuw
// ten opzichte van Kopman: een vrouw met eigen kapsels en wimpers, en het
// clubtenue (banen, gouden kraag, helm met gouden bies).
//
// Zonder hooks en zonder CSS-klassen, en de onderdelen als gewone functies in
// plaats van componenten: zo tekent Satori (de thumbnail) dezelfde svg als de
// overlay en de keuze in de app. Stil, zonder animatie.

const MOUTH = "#5a1f17";
const TONGUE = "#d9636b";
const BLUSH = "#e8706a";
const SWEAT = "#9bd3f5";

const f = (n: number) => Math.round(n * 100) / 100;

const VIEW = { full: "0 0 100 100", bust: "13 8 74 74", face: "19 19 62 62" } as const;

function star(x: number, y: number, s: number, key: number) {
  const d = `M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`;
  return <path key={key} d={d} fill="#ffe14d" stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />;
}

function eyes(face: KopmanFace, mood: KopmanMood) {
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
      <ellipse cx={f(cx)} cy={f(y)} rx={f(eyeR)} ry={f(ry)} fill="#ffffff" stroke={INK} strokeWidth={1.3} />
      <circle cx={f(cx + (mood === "aanval" ? 0 : 0.3))} cy={f(y + 0.6)} r={f(eyeR * 0.56)} fill={INK} />
      <circle cx={f(cx - eyeR * 0.18)} cy={f(y - eyeR * 0.1)} r={f(eyeR * 0.2)} fill="#ffffff" />
      <path d={`M${f(cx - eyeR - 0.5)} ${f(y - ry * 0.3)} Q${f(cx)} ${f(y - ry - 1.5)} ${f(cx + eyeR + 0.5)} ${f(y - ry * 0.3)}`} fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round" />
      {face.woman ? (
        <path d={`M${f(cx + side * (eyeR - 0.2))} ${f(y - ry * 0.55)} l${f(side * 2.2)} -1.8 M${f(cx + side * (eyeR - 1.4))} ${f(y - ry * 0.85)} l${f(side * 1.6)} -2.2`} stroke={INK} strokeWidth={1.2} strokeLinecap="round" />
      ) : null}
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
  return <g>{[eye(50 - ex, -1), eye(50 + ex, 1)]}</g>;
}

function brows(face: KopmanFace, mood: KopmanMood) {
  const { ex } = face;
  const y = face.eyeY - 7.2;
  const shape: Record<KopmanMood, [number, number, number]> = {
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

function mouth(face: KopmanFace, mood: KopmanMood) {
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
      <g>
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

function nose(face: KopmanFace) {
  const y = face.eyeY + 7.6;
  return (
    <path
      d={`M50.6 ${f(face.eyeY + 2)} Q53.8 ${f(y)} 51.8 ${f(y + 1.3)} Q50.4 ${f(y + 2.1)} 48.4 ${f(y + 0.9)}`}
      fill="none"
      stroke={INK}
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function glasses(face: KopmanFace, y: number, lift: boolean, sun: boolean) {
  const w = face.w + (lift ? 1.6 : 0);
  const ex = face.ex;
  const d = `M${f(50 - w + 0.6)} ${f(y - 3.6)} C${f(50 - 8)} ${f(y - 6.4)} ${f(50 + 8)} ${f(y - 6.4)} ${f(50 + w - 0.6)} ${f(y - 3.6)} L${f(50 + w - 1.6)} ${f(y + 2.4)} C${f(50 + ex + 3)} ${f(y + 5.4)} 53 ${f(y + 4.4)} 50 ${f(y + 2)} C47 ${f(y + 4.4)} ${f(50 - ex - 3)} ${f(y + 5.4)} ${f(50 - w + 1.6)} ${f(y + 2.4)}Z`;
  return (
    <g>
      <path d={d} fill={sun ? face.lens : "#d7ecf3"} fillOpacity={sun ? 1 : 0.55} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <path d={`M${f(50 - ex - 2.6)} ${f(y + 1.4)} L${f(50 - ex + 0.6)} ${f(y - 3.4)} M${f(50 - ex + 0.6)} ${f(y + 1.8)} L${f(50 - ex + 2.4)} ${f(y - 0.8)} M${f(50 + ex - 1.8)} ${f(y + 1.4)} L${f(50 + ex + 1.4)} ${f(y - 3.4)}`} stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
    </g>
  );
}

/**
 * De kopman als svg. `uid` maakt de ids van patronen en uitsnedes uniek op de
 * pagina. `frame`: de hele tekening, een borstbeeld (overlay en thumbnail), of
 * alleen het gezicht met effen schaduw in plaats van rasterpunten (beter
 * leesbaar in het klein).
 */
export function kopmanSvg({
  face,
  colors,
  mood = "rust",
  uid,
  frame = "full",
  size,
}: {
  face: KopmanFace;
  colors: KopmanColors;
  mood?: KopmanMood;
  uid: string;
  frame?: "full" | "bust" | "face";
  /** Breedte en hoogte in px; zonder vult de svg zijn vak. */
  size?: number;
}): ReactElement {
  const crop = frame === "face";
  const id = uid.replace(/[^a-zA-Z0-9]/g, "");
  const skinDots = `kd${id}`;
  const jerseyDots = `kj${id}d`;
  const skyDots = `ks${id}`;
  const faceClip = `kf${id}`;
  const jerseyClip = `kj${id}`;
  const { w, jaw, chin, neck, shoulders: S, eyeY, woman } = face;
  const hairStyle = face.hairStyle;
  const hw = w + 3.6;
  const J = colors.jersey;

  const headPath = `M${f(50 - w)} 34 C${f(50 - w)} ${f(eyeY + 8)} ${f(50 - jaw)} ${f(chin - 6)} 44 ${f(chin - 0.8)} Q50 ${f(chin + 1.6)} 56 ${f(chin - 0.8)} C${f(50 + jaw)} ${f(chin - 6)} ${f(50 + w)} ${f(eyeY + 8)} ${f(50 + w)} 34 Q50 16 ${f(50 - w)} 34Z`;
  const jerseyPath = `M${f(50 - S)} 101 V93 C${f(50 - S)} 85 ${f(50 - S + 10)} 79.6 ${f(50 - neck - 5)} 77.6 Q50 83 ${f(50 + neck + 5)} 77.6 C${f(50 + S - 10)} 79.6 ${f(50 + S)} 85 ${f(50 + S)} 93 V101Z`;
  const helmetPath = `M${f(50 - hw)} 46 C${f(50 - hw - 1.6)} 30 ${f(50 - hw + 5)} 13 50 12 C${f(50 + hw - 5)} 13 ${f(50 + hw + 1.6)} 30 ${f(50 + hw)} 46 C${f(50 + hw - 2.4)} 44 ${f(50 + w - 1)} 41.4 ${f(50 + w - 3)} 39.2 C${f(50 + w - 10)} 36 ${f(50 - w + 10)} 36 ${f(50 - w + 3)} 39.2 C${f(50 - w + 1)} 41.4 ${f(50 - hw + 2.4)} 44 ${f(50 - hw)} 46Z`;

  // Een zonnebril staat op de neus bij rust, en op de helm in de koers (zoals in Kopman).
  const shadesOn = face.glasses === 2 && mood === "rust";
  const skinShadow = crop ? shade(face.skin, 0.2) : `url(#${skinDots})`;
  const jerseyShadow = crop ? shade(J, 0.16) : `url(#${jerseyDots})`;

  const ponytail = woman && hairStyle === 0;
  const longHair = (!woman && hairStyle === 2) || (woman && hairStyle === 1);
  const braid = woman && hairStyle === 2;
  const sidePieces = woman && (hairStyle === 1 || hairStyle === 3);

  return (
    <svg
      viewBox={VIEW[frame]}
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      style={size ? undefined : { display: "block", width: "100%", height: "100%" }}
    >
      <defs>
        <pattern id={skinDots} width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.8} cy={1.8} r={0.95} fill={shade(face.skin, 0.32)} />
        </pattern>
        <pattern id={jerseyDots} width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.8} cy={1.8} r={0.95} fill={shade(J, 0.28)} />
        </pattern>
        <pattern id={skyDots} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={2} cy={2} r={0.8} fill={colors.dots} />
        </pattern>
        <clipPath id={faceClip}>
          <path d={headPath} />
        </clipPath>
        <clipPath id={jerseyClip}>
          <path d={jerseyPath} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={100} height={100} fill={colors.sky} />
      <rect x={0} y={0} width={100} height={100} fill={`url(#${skyDots})`} />
      {mood === "aanval" ? (
        <g stroke={INK} strokeWidth={0.9} strokeLinecap="round" opacity={0.6}>
          <path d="M4 30 H18 M8 38 H26 M2 46 H22 M10 54 H27 M5 62 H20 M74 34 H96 M78 44 H99 M76 56 H94 M20 34 H28 M73 50 H80" />
        </g>
      ) : null}
      {mood === "zege" ? <g>{[star(14, 24, 4.6, 0), star(86, 13, 3.6, 1), star(10, 52, 3, 2), star(30, 9, 2.8, 3)]}</g> : null}

      {ponytail ? (
        <path d={`M${f(50 + hw - 4)} 38 C${f(50 + hw + 9)} 41 ${f(50 + hw + 10)} 60 ${f(50 + hw + 4)} 76 C${f(50 + hw + 3)} 66 ${f(50 + hw)} 55 ${f(50 + hw - 6)} 47Z`} fill={face.hair} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      ) : null}
      {ponytail ? (
        <path d={`M${f(50 + hw + 2)} 50 Q${f(50 + hw + 5)} 58 ${f(50 + hw + 3.4)} 68`} fill="none" stroke={INK} strokeWidth={0.8} strokeLinecap="round" />
      ) : null}
      {longHair ? (
        <path d={`M${f(50 - w + 1)} 44 C${f(50 - w - 3)} 58 ${f(50 - w + 1)} 68 ${f(50 - neck - 1)} 75 H${f(50 + neck + 1)} C${f(50 + w - 1)} 68 ${f(50 + w + 3)} 58 ${f(50 + w - 1)} 44Z`} fill={face.hair} stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      ) : null}

      <path d={`M${f(50 - neck)} 62 V80 Q50 84 ${f(50 + neck)} 80 V62Z`} fill={face.skin} stroke={INK} strokeWidth={1.6} />
      <path d={`M${f(50 - neck)} 66 Q50 ${f(chin + 7)} ${f(50 + neck)} 66 V73 Q50 77 ${f(50 - neck)} 73Z`} fill={skinShadow} />

      {mood === "zege" ? (
        <g>
          <path d={`M${f(50 + S - 13)} 88 C${f(50 + S - 7)} 72 79 60 77.4 49 L88.6 47.6 C90.6 61 ${f(50 + S + 2)} 76 ${f(50 + S - 1)} 90Z`} fill={J} stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M77.2 51 L88.8 49.6" stroke={colors.gold} strokeWidth={3} />
          <path d="M77.2 49.6 L88.8 48.2 M77.6 52.6 L89 51.2" stroke={INK} strokeWidth={0.9} />
          <path d="M76.6 47.6 C74.8 41 76.2 34.8 82 34 C88 33.2 91.2 37 90.4 43 C90 46.2 88.4 48.2 85 48.2Z" fill={face.skin} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <path d="M79.6 37.6 Q84 36.4 88.8 38.6 M79 41.2 Q84 40 89.8 42.2 M77.4 44.4 Q82 45.6 85.2 43.4" fill="none" stroke={INK} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      ) : null}

      <path d={jerseyPath} fill={J} stroke={INK} strokeWidth={2.1} strokeLinejoin="round" />
      <g clipPath={`url(#${jerseyClip})`}>
        <path d={`M${f(50 - S)} 86 L${f(50 - S + 8)} 80 L${f(50 - S + 12)} 101 H${f(50 - S)}Z M${f(50 + S)} 86 L${f(50 + S - 8)} 80 L${f(50 + S - 12)} 101 H${f(50 + S)}Z`} fill={colors.trim} stroke={INK} strokeWidth={1} />
        <path d={`M${f(50 - S)} 99 L${f(50 + S)} 84 V90 L${f(50 - S)} 105Z`} fill={colors.band} stroke={INK} strokeWidth={0.8} />
        <path d={`M${f(50 - S)} 94.6 L${f(50 + S)} 79.6 V82.4 L${f(50 - S)} 97.4Z`} fill={colors.gold} stroke={INK} strokeWidth={0.8} />
        <ellipse cx={50} cy={82} rx={f(neck + 10)} ry={6} fill={jerseyShadow} />
        <ellipse cx={f(50 + S - 2)} cy={96} rx={14} ry={12} fill={jerseyShadow} />
      </g>
      <path d={`M${f(50 - neck - 4)} 78.2 Q50 85.6 ${f(50 + neck + 4)} 78.2`} fill="none" stroke={INK} strokeWidth={4.4} strokeLinecap="round" />
      <path d={`M${f(50 - neck - 4)} 78.2 Q50 85.6 ${f(50 + neck + 4)} 78.2`} fill="none" stroke={colors.gold} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M50 83.6 V101" stroke={INK} strokeWidth={1} />
      <rect x={48.8} y={84} width={2.4} height={3.6} rx={0.6} fill="#c9c9c9" stroke={INK} strokeWidth={0.8} />
      {braid ? (
        <g fill={face.hair} stroke={INK} strokeWidth={1.2} strokeLinejoin="round">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse key={i} cx={f(50 - w - 0.6 - i * 0.9)} cy={f(50 + i * 7)} rx={f(4.2 - i * 0.25)} ry={4.4} transform={`rotate(${i % 2 ? 24 : -24} ${f(50 - w - 0.6 - i * 0.9)} ${f(50 + i * 7)})`} />
          ))}
          <path d={`M${f(50 - w - 5.6)} 91 L${f(50 - w - 7.4)} 98 L${f(50 - w - 3)} 98Z`} />
        </g>
      ) : null}

      {!woman && hairStyle === 1 ? (
        <g fill={face.hair} stroke={INK} strokeWidth={1.1}>
          {[-1, 1].flatMap((s) => [0, 1, 2].map((i) => <circle key={`${s}${i}`} cx={f(50 + s * (hw - 0.6 - i * 0.6))} cy={f(45 + i * 2.6)} r={2.5} />))}
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

      {!woman && (hairStyle === 0 || hairStyle === 2) ? (
        <g fill={face.hair} stroke={INK} strokeWidth={0.9} strokeLinejoin="round">
          <path d={`M${f(50 - w + 0.3)} 39.4 L${f(50 - w + 2.8)} 39.4 L${f(50 - w + 2.4)} 47.2 L${f(50 - w + 0.6)} 48.2Z`} />
          <path d={`M${f(50 + w - 0.3)} 39.4 L${f(50 + w - 2.8)} 39.4 L${f(50 + w - 2.4)} 47.2 L${f(50 + w - 0.6)} 48.2Z`} />
        </g>
      ) : null}

      {sidePieces ? (
        <g fill={face.hair} stroke={INK} strokeWidth={1.1} strokeLinejoin="round">
          <path d={`M${f(50 - w - 1.2)} 39 Q${f(50 - w - 2.4)} 52 ${f(50 - w + 1)} ${f(eyeY + 12)} L${f(50 - w + 4.4)} ${f(eyeY + 9)} Q${f(50 - w + 2.6)} 48 ${f(50 - w + 4)} 39.4Z`} />
          <path d={`M${f(50 + w + 1.2)} 39 Q${f(50 + w + 2.4)} 52 ${f(50 + w - 1)} ${f(eyeY + 12)} L${f(50 + w - 4.4)} ${f(eyeY + 9)} Q${f(50 + w - 2.6)} 48 ${f(50 + w - 4)} 39.4Z`} />
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

      {shadesOn ? glasses(face, eyeY, false, true) : eyes(face, mood)}
      {face.glasses === 1 ? glasses(face, eyeY, false, false) : null}
      {brows(face, mood)}
      {nose(face)}
      {face.facial === 2 ? (
        <path d={`M${f(50 - face.mouthW * 0.95)} ${f(chin - 10.4)} Q50 ${f(chin - 14.6)} ${f(50 + face.mouthW * 0.95)} ${f(chin - 10.4)} Q50 ${f(chin - 12)} ${f(50 - face.mouthW * 0.95)} ${f(chin - 10.4)}Z`} fill={face.hair} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
      ) : null}
      {mouth(face, mood)}

      <g fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round">
        <path d={`M${f(50 - w + 0.8)} 44 Q${f(50 - w + 1.4)} ${f(eyeY + 10)} ${f(50 - jaw + 2.2)} ${f(chin - 3.6)}`} />
        <path d={`M${f(50 + w - 0.8)} 44 Q${f(50 + w - 1.4)} ${f(eyeY + 10)} ${f(50 + jaw - 2.2)} ${f(chin - 3.6)}`} />
      </g>

      <path d={helmetPath} fill={colors.helmet} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d={`M${f(50 - hw + 2.2)} 41.6 Q50 27.4 ${f(50 + hw - 2.2)} 41.6`} fill="none" stroke={INK} strokeWidth={3.8} />
      <path d={`M${f(50 - hw + 2.2)} 41.6 Q50 27.4 ${f(50 + hw - 2.2)} 41.6`} fill="none" stroke={colors.helmetBand} strokeWidth={2} />
      <g fill="#0f1b28" stroke={INK} strokeWidth={0.9}>
        <path d="M48.2 15.4 Q50 14.6 51.8 15.4 L52.4 25.6 Q50 26.6 47.6 25.6Z" />
        <path d={`M${f(50 - hw * 0.5)} 21 Q${f(50 - hw * 0.4)} 19 ${f(50 - hw * 0.28)} 18.6 L${f(50 - hw * 0.32)} 28 Q${f(50 - hw * 0.45)} 29 ${f(50 - hw * 0.58)} 29.4Z`} />
        <path d={`M${f(50 + hw * 0.5)} 21 Q${f(50 + hw * 0.4)} 19 ${f(50 + hw * 0.28)} 18.6 L${f(50 + hw * 0.32)} 28 Q${f(50 + hw * 0.45)} 29 ${f(50 + hw * 0.58)} 29.4Z`} />
      </g>
      <path d={`M${f(50 - hw * 0.7)} 31 C${f(50 - hw * 0.66)} 22 ${f(50 - hw * 0.3)} 16 46 15.4 C${f(50 - hw * 0.38)} 19 ${f(50 - hw * 0.55)} 24 ${f(50 - hw * 0.58)} 31.6Z`} fill="#ffffff" opacity={0.28} />
      {face.glasses === 2 && !shadesOn ? glasses(face, 31.4, true, true) : null}

      {mood === "limiet" ? (
        <g>
          <path d={`M${f(50 + hw + 1.4)} 40 C${f(50 + hw + 3.6)} 43 ${f(50 + hw + 3.6)} 46 ${f(50 + hw + 1.4)} 46 C${f(50 + hw - 0.8)} 46 ${f(50 + hw - 0.8)} 43 ${f(50 + hw + 1.4)} 40Z`} fill={SWEAT} stroke={INK} strokeWidth={0.9} />
          <path d={`M${f(50 - hw - 2)} 48 C${f(50 - hw)} 50.6 ${f(50 - hw)} 53.2 ${f(50 - hw - 2)} 53.2 C${f(50 - hw - 4)} 53.2 ${f(50 - hw - 4)} 50.6 ${f(50 - hw - 2)} 48Z`} fill={SWEAT} stroke={INK} strokeWidth={0.9} />
          <path d={`M${f(50 - hw - 3)} 30 l-4 -2.4 M${f(50 - hw - 4)} 36 l-4.6 0 M${f(50 + hw + 3)} 30 l4 -2.4`} stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
