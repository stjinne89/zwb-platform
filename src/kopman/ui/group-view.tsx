"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { BoardSector } from "../engine/board";
import { groupsOf, type RaceState, type Rider } from "../engine/race";
import { PLAYER_TEAM } from "../engine/types";
import { Portrait, type Mood } from "./portrait";
import { clock, riderName, teamColor } from "./race-view";
import styles from "./kopman.module.css";

const INK = "#1b1712";
const SURFACE = { klim: "#ffd36b", kasseien: "#c99561", grind: "#dcc690" } as const;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Room around the road, in pixels: signs on top, your faces above the road, rival faces below. */
const SIGNS = 18;
const ABOVE = 50;
const BELOW = 46;
const RIVAL = 22;
const PAD_L = 52;
const PAD_R = 58;
const PILL = 50;

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100003;
  return h;
}

/** Keep the order, push apart to at least `gap` px around where they were, stay within [lo, hi]. */
function spread(xs: number[], gap: number, lo: number, hi: number): number[] {
  const n = xs.length;
  if (!n) return [];
  const g = n > 1 ? Math.min(gap, (hi - lo) / (n - 1)) : 0;
  const p = [...xs];
  for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1] + g);
  // Centre the row on the riders it points to, then keep it inside.
  const shift = xs.reduce((a, v) => a + v, 0) / n - p.reduce((a, v) => a + v, 0) / n;
  const move = clamp(shift, lo - p[0], hi - p[n - 1]);
  return p.map((v) => clamp(v + move, lo, hi));
}

type Dot = { r: Rider; x: number; y: number };

/**
 * The race from above: the road around the current sector as a winding ribbon,
 * every group as a cluster of dots in team colours, your riders as faces above
 * the road and the rival kopmen as small faces below it. The course has no map,
 * so the bends are drawn, the same for every run of a race. Groups too close
 * to draw apart are pushed apart a little; the pill in front of each group
 * gives the real gap.
 */
export function GroupView({ state, sector, moving, moodOf, onRider }: { state: RaceState; sector: BoardSector; moving: boolean; moodOf: (r: Rider) => Mood; onRider?: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 340, h: 210 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const course = state.course;
  const groups = groupsOf(state);
  const { w, h } = size;
  if (!groups.length) return <div ref={ref} className={styles.bv} />;

  const biggest = groups.reduce((a, g, i) => (g.length > groups[a].length ? i : a), 0);
  const isPeloton = (i: number) => i === biggest && i > 0 && groups[i].length >= 10;
  const labelled = (i: number) => i === 0 || i === biggest || groups[i].some((r) => r.team === PLAYER_TEAM);
  const front = groups[0][0].distance;

  // The window: the current sector, stretched to the hindmost group that matters and the head of the race.
  const tail = Math.min(...groups.filter((_, i) => labelled(i)).map((g) => g[g.length - 1].distance));
  const from = clamp(Math.min(sector.start, tail - 300), 0, course.length);
  const to = clamp(Math.max(sector.end, front + 300), Math.min(course.length, from + 1500), course.length);
  const span = Math.max(1, to - from);
  const usable = Math.max(40, w - PAD_L - PAD_R);
  const xOf = (d: number) => PAD_L + ((d - from) / span) * usable;
  const dOf = (x: number) => from + ((x - PAD_L) / usable) * span;

  // The bends follow the distance, so they slide along as the race moves on.
  const seed = (hash(course.id) % 628) / 100;
  const band = Math.max(20, h - SIGNS - ABOVE - BELOW);
  const mid = SIGNS + ABOVE + band / 2;
  const amp = Math.max(0, band / 2 - 12);
  const wiggle = clamp(1 - span / 16000, 0.25, 1);
  const yAtD = (d: number) => mid + amp * (0.75 * Math.sin((d / 7000) * 2 * Math.PI + seed) + 0.25 * wiggle * Math.sin((d / 2600) * 2 * Math.PI + seed * 1.7));
  const yAt = (x: number) => yAtD(dOf(x));
  const normal = (x: number) => {
    const dy = yAt(x + 1) - yAt(x - 1);
    const len = Math.hypot(2, dy);
    return { nx: -dy / len, ny: 2 / len };
  };
  const pathBetween = (x0: number, x1: number) => {
    const pts: string[] = [];
    for (let x = x0; x < x1; x += 4) pts.push(`${x.toFixed(1)},${yAt(x).toFixed(1)}`);
    pts.push(`${x1.toFixed(1)},${yAt(x1).toFixed(1)}`);
    return `M${pts.join(" L")}`;
  };
  /** The highest and lowest the road gets under a face of this width, so a face never sits on the road. */
  const topOf = (x: number, half: number) => Math.min(yAt(x - half), yAt(x), yAt(x + half), yAt(x - half / 2), yAt(x + half / 2));
  const bottomOf = (x: number, half: number) => Math.max(yAt(x - half), yAt(x), yAt(x + half), yAt(x - half / 2), yAt(x + half / 2));
  const roadEnd = Math.min(w + 4, xOf(course.length));
  const road = pathBetween(-4, roadEnd);

  // Groups in view, back to front. Groups too close to draw apart (each with
  // its pill in front) are pushed apart, as little as possible, and the whole
  // row stays inside the block.
  const lenOf = (g: Rider[]) => clamp(4 + Math.sqrt(g.length) * 5, 4, 46);
  const items = groups
    .map((g, i) => ({ g, i, len: lenOf(g), room: labelled(i) ? PILL + 10 : 6, x: xOf(g[0].distance) }))
    .filter((o) => o.x > -20 && o.x < w + 20)
    .reverse();
  const starts = items.map((o) => o.x - o.len);
  const p = [...starts];
  for (let k = 1; k < p.length; k++) p[k] = Math.max(p[k], p[k - 1] + items[k - 1].len + items[k - 1].room);
  const last = items.length - 1;
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const lo = items.length ? 4 - p[0] : 0;
  const hi = items.length ? w - 4 - items[last].len - items[last].room - p[last] : 0;
  const move = Math.max(lo, Math.min(hi, mean(starts) - mean(p)));
  const drawn = items.map((o, k) => {
    const n = o.g.length, head = p[k] + move + o.len;
    const dots: Dot[] = o.g.map((r, j) => {
      const fx = head - (n > 1 ? j / (n - 1) : 0) * o.len;
      const lane = n >= 3 ? ((j % 3) - 1) * 5 : 0;
      const { nx, ny } = normal(fx);
      return { r, x: fx + nx * lane, y: yAt(fx) + ny * lane };
    });
    return { g: o.g, i: o.i, head, dots };
  });

  const all = drawn.flatMap((d) => d.dots);
  const mine = all.filter((d) => d.r.team === PLAYER_TEAM).sort((a, b) => a.x - b.x);
  const mineX = spread(mine.map((d) => d.x), 36, 27, w - 27);
  const mineY = mineX.map((x) => Math.max(SIGNS + 2, topOf(x, 26) - 12 - 42));
  // The rival kopmen under their own group, in two rows when there are more than four.
  const rivalSlots = drawn.flatMap(({ dots }) => {
    const rv = dots.filter((d) => d.r.kopman && d.r.team !== PLAYER_TEAM);
    if (!rv.length) return [];
    const rows = rv.length > 4 ? 2 : 1, cols = Math.ceil(rv.length / rows);
    const cx = rv.reduce((a, d) => a + d.x, 0) / rv.length;
    return rv.map((d, k) => ({ d, row: Math.floor(k / cols), x: cx + ((k % cols) - (cols - 1) / 2) * RIVAL }));
  });
  const rivals: Dot[] = [], rivalX: number[] = [], rivalY: number[] = [];
  for (const row of [0, 1]) {
    const slots = rivalSlots.filter((s) => s.row === row).sort((a, b) => a.x - b.x);
    spread(slots.map((s) => s.x), RIVAL, 11, w - 11).forEach((x, k) => {
      rivals.push(slots[k].d);
      rivalX.push(x);
      rivalY.push(Math.min(h - 21 - (1 - row) * RIVAL, bottomOf(x, 11) + 13 + row * RIVAL));
    });
  }

  const signs: { x: number; text: string }[] = [];
  for (const f of course.features) {
    if (f.end < from || f.start > to) continue;
    const at = clamp(xOf(Math.max(f.start, from)), 30, w - 30);
    if (signs.length && at - signs[signs.length - 1].x < 76) continue;
    const e0 = course.elevation[Math.floor(f.start / 100)] ?? 0, e1 = course.elevation[Math.floor(f.end / 100)] ?? e0;
    const grade = f.kind === "klim" ? Math.round(((e1 - e0) / Math.max(100, f.end - f.start)) * 100) : 0;
    signs.push({ x: at, text: `${f.name}${grade > 0 ? ` ${grade}%` : ""}` });
  }
  const ticks = [sector.start, sector.end].filter((d) => d > from && d < to && d < course.length);
  const finish = to >= course.length ? xOf(course.length) : null;
  const delay = (r: Rider) => `${(r.id.charCodeAt(r.id.length - 1) % 7) * -0.11}s`;
  const across = (x: number, half: number) => {
    const y = yAt(x), { nx, ny } = normal(x);
    return { x1: x - nx * half, y1: y - ny * half, x2: x + nx * half, y2: y + ny * half };
  };

  return (
    <div ref={ref} className={`${styles.bv} ${moving ? styles.bvMoving : ""}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <path d={road} fill="none" stroke={INK} strokeWidth={25} strokeLinecap="round" strokeLinejoin="round" />
        <path d={road} fill="none" stroke="#e8e0cd" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" />
        {course.features.filter((f) => f.end > from && f.start < to).map((f) => {
          const x0 = Math.max(-4, xOf(f.start)), x1 = Math.min(roadEnd, xOf(f.end));
          if (x1 - x0 < 2) return null;
          const d = pathBetween(x0, x1);
          return (
            <g key={`${f.name}-${f.start}`}>
              <path d={d} fill="none" stroke={SURFACE[f.kind]} strokeWidth={20} />
              {f.kind === "kasseien" ? <path d={d} fill="none" stroke="#8a5a33" strokeWidth={14} strokeDasharray="2.5 3.5" opacity={0.55} /> : null}
            </g>
          );
        })}
        <path d={road} fill="none" stroke="#fffaf0" strokeWidth={1.6} strokeDasharray="7 8" opacity={0.9} />
        {ticks.map((d) => <line key={d} {...across(xOf(d), 15)} stroke={INK} strokeWidth={1.6} strokeDasharray="3 3" />)}
        {finish !== null ? (
          <g>
            <line {...across(finish, 12)} stroke="#fff" strokeWidth={6} />
            <line {...across(finish, 12)} stroke={INK} strokeWidth={6} strokeDasharray="3 3" />
          </g>
        ) : null}
        {signs.map((s) => <line key={`p${s.x}`} x1={s.x} x2={s.x} y1={SIGNS - 2} y2={yAt(s.x) - 12} stroke={INK} strokeWidth={1.2} strokeDasharray="2 3" opacity={0.6} />)}
        {mine.map((d, k) => <line key={`lm${d.r.id}`} x1={mineX[k]} y1={mineY[k] + 40} x2={d.x} y2={d.y} stroke={INK} strokeWidth={1.3} />)}
        {rivals.map((d, k) => <line key={`lr${d.r.id}`} x1={rivalX[k]} y1={rivalY[k]} x2={d.x} y2={d.y} stroke={teamColor(d.r.team)} strokeWidth={1.2} opacity={0.75} />)}
        {all.map((d) => (
          <circle key={d.r.id} className={styles.bvDot} r={d.r.team === PLAYER_TEAM ? 3.4 : 2.7} style={{ transform: `translate(${d.x.toFixed(1)}px, ${d.y.toFixed(1)}px)` }} fill={teamColor(d.r.team)} stroke={INK} strokeWidth={d.r.team === PLAYER_TEAM ? 1.4 : 0.8} />
        ))}
      </svg>
      {signs.map((s) => <span key={`s${s.x}`} className={styles.bvSign} style={{ left: s.x }}>{s.text}</span>)}
      {drawn.filter((d) => labelled(d.i)).map(({ g, i, head }) => {
        const x = Math.min(head + 6 + PILL / 2, w - PILL / 2 - 2);
        const gap = (front - g[0].distance) / Math.max(5, g[0].speed);
        const tag = i === 0 ? "K" : isPeloton(i) ? "P" : String(i + 1);
        const text = i > 0 && gap >= 1 ? `+${clock(gap)}` : `${g.length}`;
        const name = i === 0 ? "Kop" : isPeloton(i) ? "Peloton" : `Groep ${i + 1}`;
        return (
          <span key={`g${i}`} className={`${styles.bvPill} ${g.some((r) => r.team === PLAYER_TEAM) ? styles.bvPillMine : ""}`} style={{ transform: `translate(${(x - PILL / 2).toFixed(1)}px, ${(yAt(x) - 9).toFixed(1)}px)` }} title={`${name}, ${g.length} renners`}>
            <b>{tag}</b>{text}
          </span>
        );
      })}
      {mine.map((d, k) => {
        const x = mineX[k], y = mineY[k];
        return (
          <button key={d.r.id} type="button" className={`${styles.bvFace} ${d.r.kopman ? styles.bvKopman : ""}`} style={{ transform: `translate(${(x - 26).toFixed(1)}px, ${y.toFixed(1)}px)` }} onClick={() => onRider?.(d.r.id)} aria-label={riderName(d.r.id)}>
            <small>{d.r.card.last}</small>
            <span className={styles.bvBob} style={{ animationDelay: delay(d.r) }}>
              <span className={`${styles.bvImg} ${styles[d.r.card.tier]}`}><Portrait card={d.r.card} mood={moodOf(d.r)} crop /></span>
            </span>
          </button>
        );
      })}
      {rivals.map((d, k) => {
        const x = rivalX[k], y = rivalY[k];
        return (
          <button key={d.r.id} type="button" className={styles.bvRival} style={{ transform: `translate(${(x - 10).toFixed(1)}px, ${y.toFixed(1)}px)`, "--team": teamColor(d.r.team) } as CSSProperties} onClick={() => onRider?.(d.r.id)} aria-label={riderName(d.r.id)}>
            <span className={styles.bvBob} style={{ animationDelay: delay(d.r) }}>
              <Portrait card={d.r.card} mood={moodOf(d.r)} crop live={false} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
