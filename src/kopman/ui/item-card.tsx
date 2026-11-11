import { Users, Wrench } from "lucide-react";
import { useId } from "react";
import { TIER_LABELS } from "../engine/cards";
import { itemCard, slotLabel, type ItemCard, type ItemSlot } from "../engine/items";
import type { Tier } from "../engine/types";
import styles from "./kopman.module.css";
import { INK, JERSEY, PAPER, SKY, TRIM } from "./portrait";
import { FrameStar } from "./rider-card";

const STEEL = "#b8c2cb";
const CARBON = "#2a2f36";
const GLASS = "#cfe3ef";
const RED = "#d6372b";
/** The accent that marks the tier inside a drawing. */
const ACCENT: Record<Tier, string> = { brons: "#c98a55", zilver: "#c3cfd9", goud: JERSEY };
const LW = 1.8;

/** A tube in ligne claire: a coloured stroke with an ink line on both sides. */
function Tube({ d, color, w = 4 }: { d: string; color: string; w?: number }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={w + LW * 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  );
}

function teeth(cx: number, cy: number, r: number, n: number, depth: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n;
    const rr = i % 2 === 0 ? r : r - depth;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const ink = { stroke: INK, strokeWidth: LW, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Drawing({ item }: { item: ItemCard }) {
  const { tier } = item;
  const accent = ACCENT[tier];
  switch (item.slot as ItemSlot) {
    case "frame": {
      const tube = tier === "brons" ? STEEL : tier === "zilver" ? TRIM : CARBON;
      return (
        <g>
          <circle cx={45} cy={66} r={7} fill={STEEL} {...ink} />
          <Tube d="M22 66 L45 66 L38 36 L66 38 L69 50 L45 66" color={tube} w={tier === "goud" ? 5 : 4} />
          <Tube d="M38 40 L22 66" color={tube} w={3} />
          <Tube d="M69 50 L75 68" color={tube} w={3} />
          {tier !== "brons" ? <path d="M48 37.4 L60 37.8" stroke={accent} strokeWidth={2.4} strokeLinecap="round" /> : null}
          <Tube d="M38 36 L36.6 29" color={STEEL} w={2.4} />
          <path d="M28 28.4 Q36 25 45 28 L44 31 Q36 30 28.8 31.6Z" fill={INK} />
          <Tube d="M66 38 L73 34 M73 34 Q80 34 80 40 Q80 45 76 45" color={CARBON} w={2.4} />
        </g>
      );
    }
    case "wielen": {
      const depth = tier === "brons" ? 3 : tier === "zilver" ? 7 : 11;
      const rim = tier === "brons" ? STEEL : CARBON;
      const inner = 26 - depth;
      return (
        <g className={styles.iSpin}>
          <circle cx={50} cy={52} r={29} fill="none" stroke={INK} strokeWidth={6} />
          <circle cx={50} cy={52} r={26 - depth / 2} fill="none" stroke={rim} strokeWidth={depth} />
          <circle cx={50} cy={52} r={26} fill="none" {...ink} />
          <circle cx={50} cy={52} r={inner} fill="none" {...ink} />
          {tier !== "brons" ? <path d={`M${50 - (26 - depth / 2)} 52 A${26 - depth / 2} ${26 - depth / 2} 0 0 1 50 ${52 - (26 - depth / 2)}`} fill="none" stroke={accent} strokeWidth={1.8} strokeDasharray="5 3" /> : null}
          {Array.from({ length: 16 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 16;
            return <line key={i} x1={50 + 3.6 * Math.cos(a + 0.3)} y1={52 + 3.6 * Math.sin(a + 0.3)} x2={50 + inner * Math.cos(a)} y2={52 + inner * Math.sin(a)} stroke={INK} strokeWidth={0.8} />;
          })}
          <circle cx={50} cy={52} r={4.4} fill={PAPER} {...ink} />
        </g>
      );
    }
    case "banden": {
      const wall = tier === "brons" ? "#3d3833" : "#d9b77e";
      return (
        <g>
          <circle cx={50} cy={52} r={27} fill="none" stroke={INK} strokeWidth={10} />
          {Array.from({ length: 28 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 28;
            return <line key={i} x1={50 + 29 * Math.cos(a)} y1={52 + 29 * Math.sin(a)} x2={50 + 25.6 * Math.cos(a + 0.06)} y2={52 + 25.6 * Math.sin(a + 0.06)} stroke="#4c4640" strokeWidth={1.4} />;
          })}
          <circle cx={50} cy={52} r={21.6} fill="none" stroke={wall} strokeWidth={3.4} />
          <circle cx={50} cy={52} r={19.8} fill="none" {...ink} />
          {tier === "goud" ? <rect x={42} y={21.4} width={16} height={5} rx={1.4} fill={JERSEY} {...ink} strokeWidth={1.2} /> : null}
        </g>
      );
    }
    case "aandrijving": {
      const ring = tier === "brons" ? STEEL : tier === "zilver" ? CARBON : JERSEY;
      return (
        <g>
          <path d="M42 33 L78 35 M42 77 L78 49" stroke={INK} strokeWidth={4.6} strokeLinecap="round" />
          <path d="M42 33 L78 35 M42 77 L78 49" stroke={STEEL} strokeWidth={2.2} strokeDasharray="2.2 1.4" />
          <g className={styles.iSpin}>
            <polygon points={teeth(42, 55, 23, 34, 2.4)} fill={ring} {...ink} />
            <circle cx={42} cy={55} r={15} fill="none" {...ink} />
            {Array.from({ length: 5 }, (_, i) => <path key={i} d="M42 55 L42 41" transform={`rotate(${i * 72} 42 55)`} stroke={INK} strokeWidth={4.4} strokeLinecap="round" />)}
            <circle cx={42} cy={55} r={4.6} fill={PAPER} {...ink} />
          </g>
          <polygon points={teeth(78, 42, 8, 14, 1.6)} fill={STEEL} {...ink} />
          <circle cx={78} cy={42} r={2.4} fill={PAPER} {...ink} />
        </g>
      );
    }
    case "remmen": {
      const r = tier === "brons" ? 22 : tier === "zilver" ? 25 : 28;
      const caliper = tier === "brons" ? CARBON : tier === "zilver" ? TRIM : JERSEY;
      return (
        <g>
          <g className={styles.iSpin}>
            <circle cx={46} cy={54} r={r} fill={STEEL} {...ink} />
            <circle cx={46} cy={54} r={r - 4.6} fill="none" stroke={INK} strokeWidth={0.8} />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (Math.PI * 2 * i) / 12;
              return <circle key={i} cx={46 + (r - 8) * Math.cos(a)} cy={54 + (r - 8) * Math.sin(a)} r={1.7} fill={SKY[tier].sky} {...ink} strokeWidth={0.9} />;
            })}
            <circle cx={46} cy={54} r={9} fill={CARBON} {...ink} />
            <circle cx={46} cy={54} r={3} fill={PAPER} {...ink} />
          </g>
          <g transform={`rotate(45 ${46 + r * 0.7} ${54 - r * 0.7})`}>
            <rect x={46 + r * 0.7 - 12} y={54 - r * 0.7 - 7} width={24} height={14} rx={4} fill={caliper} {...ink} />
            <path d={`M${46 + r * 0.7 - 6} ${54 - r * 0.7} L${46 + r * 0.7 + 6} ${54 - r * 0.7}`} stroke={tier === "goud" ? INK : PAPER} strokeWidth={1.4} strokeLinecap="round" />
          </g>
        </g>
      );
    }
    case "kleding":
      return (
        <g>
          <path d="M30 34 L42 27 Q50 32 58 27 L70 34 L81 47 L72 54 L68 49 L68 82 L32 82 L32 49 L28 54 L19 47Z" fill={JERSEY} {...ink} />
          <path d="M32 62 L68 62 L68 68 L32 68Z" fill={TRIM} {...ink} strokeWidth={1.2} />
          <path d="M42 27 Q50 36 58 27" fill="none" {...ink} />
          {tier === "brons" ? null : <path d="M19 47 L28 54 M81 47 L72 54" stroke={TRIM} strokeWidth={3} strokeLinecap="round" />}
          {tier === "goud" ? (
            <g transform="translate(60 6) rotate(12)">
              <path d="M2 18 Q4 4 18 3 Q30 3 36 12 L30 18Z" fill={TRIM} {...ink} />
              <path d="M8 10 Q16 6 26 8" stroke={JERSEY} strokeWidth={2} fill="none" strokeLinecap="round" />
            </g>
          ) : null}
        </g>
      );
    case "voeding":
      return (
        <g>
          <rect x={26} y={36} width={22} height={46} rx={5} fill={GLASS} {...ink} />
          <rect x={26} y={52} width={22} height={12} fill={JERSEY} {...ink} strokeWidth={1.2} />
          <rect x={28} y={29} width={18} height={8} rx={2} fill={TRIM} {...ink} />
          <rect x={34} y={23} width={6} height={6} rx={1.5} fill={CARBON} {...ink} />
          {tier === "brons" ? (
            <path d="M54 66 L82 58 L84 64 L56 72Z M54 66 L52 69 L56 72 M82 58 L86 59 L84 64" fill={RED} {...ink} />
          ) : (
            (tier === "goud" ? [RED, "#5ad19a", JERSEY] : [RED]).map((color, i) => (
              <path key={i} d="M0 0 L12 0 L12 18 L8 22 L4 22 L0 18Z" transform={`translate(${58 + i * 7} ${50 - i * 6}) rotate(${12 + i * 8})`} fill={color} {...ink} />
            ))
          )}
        </g>
      );
    case "trainer":
      return (
        <g>
          <rect x={45} y={20} width={10} height={7} rx={2} fill={STEEL} {...ink} />
          <circle cx={50} cy={56} r={28} fill={accent} {...ink} />
          <circle cx={50} cy={56} r={22.6} fill={PAPER} {...ink} />
          {Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 36 L50 39.4" transform={`rotate(${i * 30} 50 56)`} stroke={INK} strokeWidth={i % 3 === 0 ? 2 : 1.1} strokeLinecap="round" />)}
          <g className={styles.iTick}><path d="M50 56 L50 38" stroke={RED} strokeWidth={2} strokeLinecap="round" /></g>
          <circle cx={50} cy={56} r={2.6} fill={INK} />
        </g>
      );
    case "mechanieker":
      return (
        <g className={styles.iWobble}>
          <g transform="rotate(-38 50 54)">
            <rect x={20} y={50} width={52} height={9} rx={4.5} fill={STEEL} {...ink} />
            <path d="M72 46 a10 10 0 1 1 0 17 L76 58 L80 58 L80 51 L76 51Z" fill={STEEL} {...ink} />
            <circle cx={20} cy={54.5} r={8} fill={STEEL} {...ink} />
            <circle cx={20} cy={54.5} r={3.6} fill={SKY[item.tier].sky} {...ink} />
          </g>
          <g transform="rotate(40 50 54)">
            <rect x={22} y={51.5} width={30} height={6} rx={1.5} fill={STEEL} {...ink} />
            <rect x={52} y={48} width={24} height={13} rx={5} fill={accent === JERSEY ? RED : accent} {...ink} />
          </g>
        </g>
      );
    case "fysio":
      return (
        <g>
          <path d="M24 60 L20 84 M76 60 L80 84 M22 74 L78 74" stroke={INK} strokeWidth={3} strokeLinecap="round" />
          <rect x={14} y={52} width={66} height={9} rx={3} fill={TRIM} {...ink} />
          <rect x={78} y={50} width={12} height={8} rx={3} fill={TRIM} {...ink} />
          <rect x={30} y={44} width={24} height={8} rx={2} fill={PAPER} {...ink} />
          <path d="M30 48 L54 48" stroke={accent === "#c3cfd9" ? TRIM : accent} strokeWidth={2} />
          {tier !== "brons" ? <rect x={62} y={36} width={8} height={16} rx={2} fill={GLASS} {...ink} /> : null}
          {tier === "goud" ? <rect x={63.6} y={32} width={4.8} height={4.6} rx={1} fill={RED} {...ink} strokeWidth={1.2} /> : null}
        </g>
      );
    case "ploegleider":
      return (
        <g>
          <rect x={54} y={14} width={5} height={22} rx={2} fill={CARBON} {...ink} />
          <rect x={36} y={34} width={28} height={50} rx={6} fill={CARBON} {...ink} />
          <rect x={41} y={40} width={18} height={10} rx={2} fill={tier === "brons" ? GLASS : JERSEY} {...ink} strokeWidth={1.2} />
          {[56, 61, 66, 71].map((y) => <path key={y} d={`M42 ${y} L58 ${y}`} stroke={STEEL} strokeWidth={1.8} strokeLinecap="round" />)}
          <g className={styles.iWave} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round">
            <path d="M66 22 Q72 28 66 34" />
            <path d="M71 17 Q81 28 71 39" />
            {tier === "goud" ? <path d="M76 12 Q90 28 76 44" /> : null}
          </g>
        </g>
      );
    case "chauffeur": {
      const x0 = tier === "brons" ? 24 : 10;
      const x1 = tier === "brons" ? 78 : 90;
      const span = x1 - x0;
      const panes = tier === "brons" ? 2 : 5;
      return (
        <g>
          <rect x={x0} y={38} width={span} height={36} rx={6} fill={JERSEY} {...ink} />
          <rect x={x0} y={62} width={span} height={7} fill={TRIM} {...ink} strokeWidth={1.2} />
          {tier === "goud" ? <path d={`M${x0} 56 L${x1} 56`} stroke={RED} strokeWidth={2.4} /> : null}
          {Array.from({ length: panes }, (_, i) => {
            const w = (span - 20) / panes;
            return <rect key={i} x={x0 + 5 + i * w} y={43} width={w - 3} height={10} rx={1.6} fill={GLASS} {...ink} strokeWidth={1.2} />;
          })}
          <path d={`M${x1 - 10} 42 L${x1 - 2} 42 L${x1 - 2} 58 L${x1 - 10} 58Z`} fill={GLASS} {...ink} strokeWidth={1.2} />
          {[x0 + 14, x1 - 16].map((cx) => (
            <g key={cx} className={styles.iSpin}>
              <circle cx={cx} cy={75} r={8} fill={INK} />
              <circle cx={cx} cy={75} r={3.2} fill={STEEL} />
              <path d={`M${cx - 3} 75 L${cx + 3} 75`} stroke={INK} strokeWidth={1} />
            </g>
          ))}
        </g>
      );
    }
  }
}

/** Equipment or staff as a drawn plate: the same album look as a rider. */
export function ItemArt({ item, live = true }: { item: ItemCard; live?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const dots = `id${uid}`;
  const c = SKY[item.tier];
  return (
    <svg className={`${styles.portrait} ${live ? "" : styles.still}`} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={dots} width={3.6} height={3.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.8} cy={1.8} r={0.7} fill={c.far} opacity={0.5} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={100} height={100} fill={c.sky} />
      {item.tier === "goud" ? (
        <g className={styles.pSpin} fill={c.ray}>
          {Array.from({ length: 12 }, (_, i) => <path key={i} d="M50 42 L46 -40 L54 -40Z" transform={`rotate(${i * 30} 50 42)`} />)}
        </g>
      ) : null}
      <rect x={0} y={0} width={100} height={100} fill={`url(#${dots})`} />
      <ellipse cx={50} cy={88} rx={32} ry={3.4} fill={INK} opacity={0.16} />
      <Drawing item={item} />
    </svg>
  );
}

export function ItemCardView({ id, live = false, children }: { id: string; live?: boolean; children?: React.ReactNode }) {
  const item = itemCard(id);
  const Icon = item.group === "materiaal" ? Wrench : Users;
  return (
    <div className={`${styles.card} ${styles[item.tier]}`} aria-label={`${item.name}, ${slotLabel(item.slot)}, ${TIER_LABELS[item.tier]}: ${item.effect}`}>
      <div className={styles.plate}>
        <ItemArt item={item} live={live} />
        <span className={styles.cardMeta}><Icon size={13} aria-hidden />{item.group === "materiaal" ? "MAT" : "STAF"}</span>
      </div>
      {item.tier === "goud" ? (
        <>
          <FrameStar className={`${styles.frameStar} ${styles.frameStarA}`} />
          <FrameStar className={`${styles.frameStar} ${styles.frameStarB}`} />
        </>
      ) : null}
      <div className={`${styles.cardName} ${styles.itemName}`}>
        <small>{slotLabel(item.slot)}</small>
        <strong>{item.name}</strong>
      </div>
      <div className={styles.effect}>{item.effect}</div>
      {children}
    </div>
  );
}

/** One slot on the team screen: the best card you hold for it, or an empty frame. */
export function SlotTile({ slot, item }: { slot: ItemSlot; item?: ItemCard }) {
  return (
    <div className={`${styles.slotTile} ${item ? "" : styles.slotEmpty}`}>
      <span className={`${styles.slotArt} ${item ? styles[item.tier] : ""}`}>{item ? <ItemArt item={item} live={false} /> : null}</span>
      <span className={styles.slotText}>
        <small>{slotLabel(slot)}</small>
        <b>{item ? item.name : "Leeg"}</b>
        {item ? <span>{item.effect}</span> : null}
      </span>
    </div>
  );
}
