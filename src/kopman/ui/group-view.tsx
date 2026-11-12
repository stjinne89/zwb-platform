"use client";

import type { CSSProperties } from "react";
import type { BoardSector } from "../engine/board";
import { groupsOf, type RaceState, type Rider } from "../engine/race";
import { PLAYER_TEAM } from "../engine/types";
import { Portrait, type Mood } from "./portrait";
import { clock, riderName, teamColor } from "./race-view";
import styles from "./kopman.module.css";

const W = 600;
const H = 100;
const INK = "#1b1712";
const FILL = { klim: "rgb(255 197 61 / 0.42)", kasseien: "rgb(176 106 52 / 0.32)", grind: "rgb(196 160 78 / 0.34)" } as const;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The race as groups on the profile. Above: the road around the current
 * sector, with a pin per group. Below: a strip per group that matters (the
 * front, the peloton, and every group with one of yours in it), with your
 * riders' faces where they ride in the group, front to the right, and the
 * rival kopmen as dots in their team colour.
 */
/** Faces side by side: keep their order, but push them apart so none hides another. */
function spread(at: number[]): number[] {
  const n = at.length;
  if (!n) return [];
  const gap = n > 1 ? Math.min(18, 80 / (n - 1)) : 0;
  const p = at.map((v) => clamp(v, 10, 90));
  for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1] + gap);
  p[n - 1] = Math.min(p[n - 1], 90);
  for (let i = n - 2; i >= 0; i--) p[i] = Math.min(p[i], p[i + 1] - gap);
  return p;
}

export function GroupView({ state, sector, moving, moodOf, onRider }: { state: RaceState; sector: BoardSector; moving: boolean; moodOf: (r: Rider) => Mood; onRider?: (id: string) => void }) {
  const course = state.course;
  const groups = groupsOf(state);
  if (!groups.length) return null;
  const biggest = groups.reduce((a, g, i) => (g.length > groups[a].length ? i : a), 0);
  const tagOf = (i: number) => (i === 0 ? "K" : i === biggest && groups[i].length >= 10 ? "P" : String(i + 1));
  const labelOf = (i: number) => (i === 0 ? "Kop" : i === biggest && groups[i].length >= 10 ? "Peloton" : `Groep ${i + 1}`);
  const front = groups[0][0].distance;
  const shown = groups.map((g, i) => ({ g, i })).filter(({ g, i }) => i === 0 || i === biggest || g.some((r) => r.team === PLAYER_TEAM));

  // The window: the current sector, stretched to the hindmost group shown and the head of the race.
  const tail = Math.min(...shown.map(({ g }) => g[g.length - 1].distance));
  const from = clamp(Math.min(sector.start, tail - 400), 0, course.length);
  const to = clamp(Math.max(sector.end, front + 400), Math.min(course.length, from + 1500), course.length);
  const span = Math.max(1, to - from);
  const cells = course.elevation.slice(Math.floor(from / 100), Math.ceil(to / 100) + 1);
  const lo = Math.min(...cells), hi = Math.max(...cells);
  const range = Math.max(60, hi - lo);
  const x = (d: number) => ((clamp(d, from, to) - from) / span) * W;
  const elevAt = (d: number) => course.elevation[clamp(Math.round(d / 100), 0, course.elevation.length - 1)];
  const y = (d: number) => H - 10 - ((elevAt(d) - lo) / range) * (H - 34);
  const step = Math.max(100, Math.round(span / 160 / 100) * 100);
  const line: string[] = [];
  for (let d = from; d < to; d += step) line.push(`${x(d).toFixed(1)},${y(d).toFixed(1)}`);
  line.push(`${W},${y(to).toFixed(1)}`);
  const area = `M0,${H} L${line.join(" L")} L${W},${H} Z`;
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;

  return (
    <div className={`${styles.gv} ${moving ? styles.gvMoving : ""}`}>
      <div className={styles.gvRoad}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={area} fill="#a9c58f" />
          {course.features.filter((f) => f.end > from && f.start < to).map((f) => <rect key={`${f.name}-${f.start}`} x={x(f.start)} y={0} width={Math.max(2, x(f.end) - x(f.start))} height={H} fill={FILL[f.kind]} />)}
          <rect x={x(sector.start)} y={0} width={Math.max(0, x(sector.end) - x(sector.start))} height={H} fill="rgb(255 250 240 / 0.45)" />
          {[sector.start, sector.end].filter((d) => d > from && d < to).map((d) => <line key={d} x1={x(d)} x2={x(d)} y1={0} y2={H} stroke={INK} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.55} vectorEffect="non-scaling-stroke" />)}
          <path d={`M${line.join(" L")}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {to >= course.length ? <line x1={W - 1} x2={W - 1} y1={0} y2={H} stroke={INK} strokeWidth={3} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        {groups.map((g, i) => {
          const head = g[0].distance;
          if (head < from || head > to) return null;
          const mine = g.some((r) => r.team === PLAYER_TEAM);
          const tag = shown.some((s) => s.i === i) ? tagOf(i) : null;
          const size = Math.round(clamp(10 + Math.sqrt(g.length) * 3, 12, 30));
          return (
            <span key={`p${i}`} className={`${styles.gvPin} ${mine ? styles.gvPinMine : ""}`} style={{ left: `${clamp((x(head) / W) * 100, 3, 97).toFixed(2)}%`, top: pct(y(head), H), width: size, height: size } as CSSProperties} aria-hidden="true">
              {tag ?? ""}
            </span>
          );
        })}
      </div>
      <div className={styles.gvLanes}>
        {[...shown].reverse().map(({ g, i }) => {
          const head = g[0].distance;
          const gap = (front - head) / Math.max(5, g[0].speed);
          const n = g.length;
          const at = (r: Rider) => (n > 1 ? 1 - g.indexOf(r) / (n - 1) : 0.5) * 100;
          const mine = g.filter((r) => r.team === PLAYER_TEAM).sort((a, b) => at(a) - at(b));
          const rivals = g.filter((r) => r.kopman && r.team !== PLAYER_TEAM);
          const spot = spread(mine.map(at));
          let prev = -100, row = 0;
          return (
            <div key={`l${i}`} className={`${styles.gvLane} ${mine.length ? styles.gvLaneMine : ""}`}>
              <div className={styles.gvHead}>
                <span className={styles.gvTag}>{tagOf(i)}</span>
                <b>{labelOf(i)}</b>
                <span>{n}{i > 0 && gap >= 1 ? ` · +${clock(gap)}` : ""}</span>
              </div>
              <div className={`${styles.gvTrack} ${mine.length ? "" : styles.gvTrackThin}`} role="list" aria-label={`${labelOf(i)}, ${n} renners`}>
                {rivals.map((r) => <span key={r.id} className={styles.gvRival} style={{ left: `${clamp(at(r), 4, 96)}%`, background: teamColor(r.team) }} title={riderName(r.id)} />)}
                {mine.map((r, k) => {
                  const left = spot[k];
                  row = left - prev < 12 ? (row + 1) % 2 : 0;
                  prev = left;
                  const where = at(r) >= 67 ? "voorin" : at(r) >= 34 ? "in het midden" : "achterin";
                  return (
                    <button key={r.id} type="button" role="listitem" className={`${styles.gvFace} ${r.kopman ? styles.gvKopman : ""}`} style={{ left: `${left}%`, top: row ? "48%" : "0%", animationDelay: `${(r.id.charCodeAt(r.id.length - 1) % 7) * -0.11}s` }} onClick={() => onRider?.(r.id)} aria-label={`${r.card.last}, ${where}`}>
                      <span className={`${styles.gvFaceImg} ${styles[r.card.tier]}`}><Portrait card={r.card} mood={moodOf(r)} crop /></span>
                      <small>{r.card.last}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
