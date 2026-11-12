"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { riding, type RaceState, type Rider } from "../engine/race";
import { PLAYER_TEAM } from "../engine/types";
import { PLAYER_COLOR } from "../engine/world";
import { bendsFor, CAMERA_BACK, cameraAt, cameraRider, gradeHere, laneTargets, pedalOffset, projector, ROAD_HALF, roadX, roadY, surfaceAhead, VIEW_AHEAD, type Bend } from "./chase-scene";
import { teamColor } from "./race-view";
import styles from "./kopman.module.css";

/**
 * The race as the camera bike sees it, drawn like the rest of Kopman: ink lines,
 * flat paper colours and halftone dots. One canvas, redrawn each frame while the
 * sector rides; it stops when it is off screen or the tab is hidden.
 */

const INK = "#1b1712";
const SKY = "#dcebf0";
const SKY_DOT = "#c4dbe3";
const GRASS = "#a9c58f";
const GRASS_DOT = "#7f9f6c";
const HILL_FAR = "#c3d6ae";
const HILL_NEAR = "#94b47f";
const VERGE = "#e2d0a9";
const ROAD = ["#7a746b", "#827b72"];
const COBBLE = ["#8f7c63", "#977f63"];
const STONE = "#6c5b46";
const GRAVEL = ["#c9a96c", "#cfb077"];
const GRIT = "#a3854d";
const PAPER = "#fbf3e1";
const SKIN = "#e7b38b";
const SHORTS = "#2a251f";

/** Distances ahead at which the road is sampled: dense near the camera, sparse far away. */
const SAMPLES = (() => {
  const out: number[] = [];
  for (let z = 1.2; z < VIEW_AHEAD; z = z * 1.05 + 0.35) out.push(z);
  out.push(VIEW_AHEAD);
  return out;
})();

function dots(color: string, background: string, size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = background;
  g.fillRect(0, 0, size, size);
  g.fillStyle = color;
  for (const [x, y] of [[size / 4, size / 4], [(size * 3) / 4, (size * 3) / 4]]) {
    g.beginPath();
    g.arc(x, y, size / 7, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

type Scene = { sky: CanvasPattern | null; grass: CanvasPattern | null };

function hill(ctx: CanvasRenderingContext2D, w: number, horizon: number, shift: number, height: number, waves: [number, number, number][], fill: string) {
  ctx.beginPath();
  ctx.moveTo(0, horizon + 1);
  for (let x = 0; x <= w; x += 6) {
    const u = (x + shift) / w;
    const y = waves.reduce((s, [a, f, p]) => s + a * Math.sin(u * f + p), 0);
    ctx.lineTo(x, horizon - height * (0.55 + 0.45 * y));
  }
  ctx.lineTo(w, horizon + 1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function drawRider(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, r: Rider, pedal: number, kopman: boolean) {
  const mine = r.team === PLAYER_TEAM;
  const jersey = mine ? PLAYER_COLOR : teamColor(r.team);
  const line = Math.max(1, Math.min(3, s * 0.035));
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = "rgb(27 23 18 / 0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y, s * 0.34, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  if (s * 1.6 < 12) {
    // Far away: a dab of colour and a head is all the eye reads.
    ctx.fillStyle = jersey;
    ctx.fillRect(x - s * 0.2, y - s * 1.4, s * 0.4, s * 0.6);
    ctx.fillStyle = INK;
    ctx.fillRect(x - s * 0.03, y - s * 0.8, s * 0.06, s * 0.8);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x - s * 0.1, y - s * 1.6, s * 0.2, s * 0.18);
    return;
  }
  const mode = r.override?.mode ?? r.mode;
  if (mode === "aanval" || mode === "sprint") {
    // Speed lines, the comic way of saying "he goes".
    ctx.strokeStyle = INK;
    ctx.lineWidth = line;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const yy = y - s * (0.75 + i * 0.22);
      const x0 = x + side * s * (0.42 + (i % 2) * 0.08);
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + side * s * 0.38, yy + s * 0.05);
      ctx.stroke();
    }
  }
  // Rear wheel, seen edge-on.
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.035, y - s * 0.68, s * 0.07, s * 0.68, s * 0.035);
  ctx.fill();
  // Legs: thigh in the shorts, calf in skin; the pedals go round.
  const hipY = y - s * 0.93;
  for (const side of [-1, 1]) {
    const p = pedal + (side > 0 ? Math.PI : 0);
    const footY = y - s * 0.36 + Math.sin(p) * s * 0.15;
    const footX = x + side * s * 0.09;
    const kneeY = (hipY + footY) / 2 - s * 0.05;
    const kneeX = x + side * s * 0.16;
    ctx.lineWidth = s * 0.12 + line * 2;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + side * s * 0.1, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
    ctx.lineWidth = s * 0.12;
    ctx.strokeStyle = SHORTS;
    ctx.beginPath();
    ctx.moveTo(x + side * s * 0.1, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();
    ctx.strokeStyle = SKIN;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  }
  // Arms reach forward to the bars, so from behind they angle out and down.
  const shoulderY = y - s * 1.36;
  for (const side of [-1, 1]) {
    ctx.lineWidth = s * 0.09 + line * 2;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x + side * s * 0.17, shoulderY + s * 0.04);
    ctx.lineTo(x + side * s * 0.25, y - s * 1.06);
    ctx.stroke();
    ctx.lineWidth = s * 0.09;
    ctx.strokeStyle = SKIN;
    ctx.stroke();
  }
  // Back and shorts.
  ctx.beginPath();
  ctx.moveTo(x - s * 0.17, hipY + s * 0.04);
  ctx.quadraticCurveTo(x - s * 0.24, y - s * 1.2, x - s * 0.2, shoulderY);
  ctx.quadraticCurveTo(x, shoulderY - s * 0.07, x + s * 0.2, shoulderY);
  ctx.quadraticCurveTo(x + s * 0.24, y - s * 1.2, x + s * 0.17, hipY + s * 0.04);
  ctx.closePath();
  ctx.fillStyle = jersey;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = SHORTS;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.17, hipY - s * 0.02, s * 0.34, s * 0.1, s * 0.03);
  ctx.fill();
  if (!mine) {
    // A band across the back in paper: the team's jersey is more than one colour.
    ctx.fillStyle = "rgb(251 243 225 / 0.55)";
    ctx.fillRect(x - s * 0.21, y - s * 1.18, s * 0.42, s * 0.06);
  }
  // Head low over the bars: a helmet in the team colour, its vents in ink.
  const headY = shoulderY - s * 0.07;
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(x, headY + s * 0.05, s * 0.06, s * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.105, headY + s * 0.04);
  ctx.quadraticCurveTo(x - s * 0.11, headY - s * 0.085, x, headY - s * 0.09);
  ctx.quadraticCurveTo(x + s * 0.11, headY - s * 0.085, x + s * 0.105, headY + s * 0.04);
  ctx.closePath();
  ctx.fillStyle = mine ? INK : jersey;
  ctx.fill();
  ctx.lineWidth = line;
  ctx.strokeStyle = INK;
  ctx.stroke();
  if (s > 30) {
    ctx.strokeStyle = mine ? PLAYER_COLOR : PAPER;
    ctx.lineWidth = Math.max(1, s * 0.012);
    for (const dx of [-0.045, 0, 0.045]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * s, headY - s * 0.07);
      ctx.lineTo(x + dx * s * 1.3, headY + s * 0.01);
      ctx.stroke();
    }
  }
  if (kopman) {
    const ty = headY - s * 0.24;
    const w = Math.max(5, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - w, ty - w * 1.2);
    ctx.lineTo(x + w, ty - w * 1.2);
    ctx.lineTo(x, ty);
    ctx.closePath();
    ctx.fillStyle = "#d6372b";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, line);
    ctx.stroke();
  }
}

type Live = { lanes: Map<string, number>; odo: number; last: number; rate: number | undefined };

/** The finish across the road: a chequered line, two posts and a banner over it. */
function drawFinish(ctx: CanvasRenderingContext2D, P: ReturnType<typeof projector>, state: RaceState, bend: Bend, cam: number, z: number) {
  const ground = (dz: number) => roadY(state, cam, z + dz);
  const cx = (dz: number) => roadX(bend, cam, z + dz);
  const n = 10;
  for (let row = 0; row < 2; row++) {
    const z0 = z + row * 0.35, z1 = z0 + 0.35;
    for (let i = 0; i < n; i++) {
      const u0 = -ROAD_HALF + (i / n) * ROAD_HALF * 2, u1 = u0 + (ROAD_HALF * 2) / n;
      ctx.beginPath();
      ctx.moveTo(P.x(cx(z0 - z) + u0, z0), P.y(ground(z0 - z), z0));
      ctx.lineTo(P.x(cx(z0 - z) + u1, z0), P.y(ground(z0 - z), z0));
      ctx.lineTo(P.x(cx(z1 - z) + u1, z1), P.y(ground(z1 - z), z1));
      ctx.lineTo(P.x(cx(z1 - z) + u0, z1), P.y(ground(z1 - z), z1));
      ctx.closePath();
      ctx.fillStyle = (i + row) % 2 ? INK : PAPER;
      ctx.fill();
    }
  }
  const s = P.scale(z);
  const y0 = ground(0);
  const post = ROAD_HALF + 0.5;
  ctx.lineWidth = Math.max(1, Math.min(3, s * 0.06));
  ctx.strokeStyle = INK;
  for (const side of [-1, 1]) {
    const x = P.x(cx(0) + side * post, z);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x - s * 0.12, P.y(y0 + 4.6, z), s * 0.24, P.y(y0, z) - P.y(y0 + 4.6, z));
    ctx.strokeRect(x - s * 0.12, P.y(y0 + 4.6, z), s * 0.24, P.y(y0, z) - P.y(y0 + 4.6, z));
  }
  const left = P.x(cx(0) - post, z), right = P.x(cx(0) + post, z);
  const top = P.y(y0 + 4.6, z), bottom = P.y(y0 + 3.7, z);
  ctx.fillStyle = "#d6372b";
  ctx.fillRect(left, top, right - left, bottom - top);
  const cells = 16, ch = (bottom - top) / 3;
  for (let i = 0; i < cells; i++) {
    ctx.fillStyle = i % 2 ? INK : PAPER;
    ctx.fillRect(left + ((right - left) * i) / cells, bottom - ch, (right - left) / cells, ch);
  }
  ctx.strokeRect(left, top, right - left, bottom - top);
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, state: RaceState, bend: Bend, scene: Scene, live: Live, now: number, moving: boolean) {
  const dt = live.last ? Math.min(0.1, (now - live.last) / 1000) : 0;
  live.last = now;
  const cam = cameraAt(state);
  const followed = cameraRider(state);
  // In the sprint the road runs at race speed times the slow motion; otherwise at a pace that reads well.
  if (moving) live.odo += dt * Math.max(4, followed.speed) * (live.rate ?? 0.9);
  const horizon = Math.round(h * 0.36);
  // A tall stage (a phone held upright) zooms in, so the bunch fills the lower half instead of empty road.
  const focal = Math.min(Math.max(w * 0.8, h * 0.7), h * 2.2);
  const P = projector(w, horizon, focal);

  ctx.fillStyle = scene.sky ?? SKY;
  ctx.fillRect(0, 0, w, horizon + 2);
  // The hills turn with the road: a bend ahead swings them across.
  const heading = roadX(bend, cam, 140) / 140;
  hill(ctx, w, horizon, heading * w * 0.9 + cam * 0.02, h * 0.13, [[0.5, 5, 1.3], [0.3, 11, 0.4], [0.2, 23, 2.1]], HILL_FAR);
  hill(ctx, w, horizon, heading * w * 1.6 + cam * 0.05, h * 0.08, [[0.5, 4, 0.2], [0.35, 9, 2.6], [0.15, 19, 1.1]], HILL_NEAR);

  const pts = SAMPLES.map((z) => {
    const s = P.scale(z);
    return { z, x: P.x(roadX(bend, cam, z), z), y: P.y(roadY(state, cam, z), z), half: ROAD_HALF * s, s, surface: surfaceAhead(state, cam, z) };
  });
  ctx.fillStyle = scene.grass ?? GRASS;
  ctx.fillRect(0, horizon, w, h - horizon);
  for (let i = pts.length - 2; i >= 0; i--) {
    const a = pts[i], b = pts[i + 1];
    if (a.y < 0) continue;
    const top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
    ctx.fillStyle = scene.grass ?? GRASS;
    ctx.fillRect(0, top - 0.5, w, bottom - top + 1);
    const quad = (k: number, fill: string) => {
      ctx.beginPath();
      ctx.moveTo(a.x - a.half * k, a.y);
      ctx.lineTo(b.x - b.half * k, b.y);
      ctx.lineTo(b.x + b.half * k, b.y);
      ctx.lineTo(a.x + a.half * k, a.y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };
    quad(1.22, VERGE);
    const band = Math.floor((live.odo + a.z) / 7) % 2;
    const palette = a.surface === "kasseien" ? COBBLE : a.surface === "grind" ? GRAVEL : ROAD;
    quad(1, palette[band]);
    if (a.surface === "kasseien" && a.z < 70) {
      ctx.fillStyle = STONE;
      const row = Math.floor((live.odo + a.z) / 0.8);
      const n = 7;
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5 + (row % 2) * 0.5) / (n + 0.5) * 2 - 1;
        ctx.beginPath();
        ctx.ellipse(a.x + u * a.half, (a.y + b.y) / 2, a.s * 0.2, Math.max(0.6, (a.y - b.y) * 0.28), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (a.surface === "grind" && a.z < 60) {
      ctx.fillStyle = GRIT;
      for (let j = 0; j < 9; j++) {
        const u = Math.sin((Math.floor(live.odo + a.z) * 7.13 + j * 3.7) * 12.9898) * 0.95;
        ctx.fillRect(a.x + u * a.half, (a.y + b.y) / 2, Math.max(1, a.s * 0.06), Math.max(1, a.s * 0.06));
      }
    } else if (a.surface === "asfalt" && Math.floor((live.odo + a.z) / 3.5) % 2 === 0) {
      quad(0.03, PAPER);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, Math.min(3, a.s * 0.09));
    ctx.beginPath();
    ctx.moveTo(a.x - a.half, a.y);
    ctx.lineTo(b.x - b.half, b.y);
    ctx.moveTo(a.x + a.half, a.y);
    ctx.lineTo(b.x + b.half, b.y);
    ctx.stroke();
  }

  const finish = state.course.tt ? -1 : state.course.length - cam;
  if (finish > 1.5 && finish < VIEW_AHEAD) drawFinish(ctx, P, state, bend, cam, finish);

  // The road nearer than a rider can hide him behind a crest: clip at its highest point.
  const crest: number[] = [];
  pts.forEach((p, i) => crest.push(Math.min(i ? crest[i - 1] : Infinity, p.y)));
  const targets = laneTargets(state);
  const shown = state.riders
    .filter((r) => riding(r))
    .map((r) => ({ r, z: r.distance - cam }))
    .filter((x) => x.z > 2.4 && x.z < VIEW_AHEAD)
    .sort((a, b) => b.z - a.z || a.r.id.localeCompare(b.r.id));
  // In the sprint your kopman is drawn last: the riders behind him must not hide where you steer.
  const own = state.sprint ? shown.findIndex((x) => x.r.id === state.sprint!.id) : -1;
  if (own >= 0) shown.push(...shown.splice(own, 1));
  for (const { r, z } of shown) {
    const target = targets.get(r.id) ?? 0;
    // Your kopman in the sprint goes where you steer him, at once.
    const lane = r.id === state.sprint?.id || !live.lanes.has(r.id) ? target : live.lanes.get(r.id)! + (target - live.lanes.get(r.id)!) * Math.min(1, dt * 2.5);
    live.lanes.set(r.id, lane);
    const s = P.scale(z);
    const x = P.x(roadX(bend, cam, z) + lane, z);
    const y = P.y(roadY(state, cam, z), z);
    let j = 0;
    while (j + 1 < pts.length && pts[j + 1].z < z - 2) j++;
    const clip = pts[j].z < z - 2 ? crest[j] : Infinity;
    if (clip < y - s * 1.9) continue;
    const pedal = moving ? now / 1000 * 2 * Math.PI * 1.45 + pedalOffset(r.id) : pedalOffset(r.id);
    if (clip < y) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, clip + 1);
      ctx.clip();
      drawRider(ctx, x, y, s, r, pedal, r.kopman && r.team === PLAYER_TEAM);
      ctx.restore();
    } else drawRider(ctx, x, y, s, r, pedal, r.kopman && r.team === PLAYER_TEAM);
  }
}

/** `rate`: race seconds per real second, in the sprint; `children` lie over the picture. */
export function ChaseView({ state, moving, frame, rate, children }: { state: RaceState; moving: boolean; frame: number; rate?: number; children?: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const caption = useRef<HTMLSpanElement>(null);
  const grade = useRef<HTMLSpanElement>(null);
  const live = useRef<Live>({ lanes: new Map(), odo: 0, last: 0, rate: undefined });
  useEffect(() => { live.current.rate = rate; }, [rate]);
  const size = useRef({ w: 0, h: 0 });
  const bend = useRef<Bend | null>(null);
  const scene = useRef<Scene | null>(null);
  const repaint = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = wrap.current, c = canvas.current;
    if (!el || !c) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = el.clientWidth, h = el.clientHeight;
      size.current = { w, h };
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Resizing clears the canvas: draw again at once, also between sectors.
      repaint.current?.();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    if (!scene.current) scene.current = { sky: ctx.createPattern(dots(SKY_DOT, SKY, 10), "repeat"), grass: ctx.createPattern(dots(GRASS_DOT, GRASS, 8), "repeat") };
    bend.current ??= bendsFor(state.raceId, state.seed);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = true;
    const paint = (now: number) => {
      const { w, h } = size.current;
      if (!w || !h) return;
      draw(ctx, w, h, state, bend.current!, scene.current!, live.current, now, moving && !reduced);
      const cam = cameraAt(state) + CAMERA_BACK;
      const feature = state.course.features.find((f) => cam >= f.start && cam < f.end);
      if (caption.current) {
        caption.current.textContent = feature?.name ?? "";
        caption.current.hidden = !feature;
      }
      const g = gradeHere(state, cameraAt(state));
      if (grade.current) {
        grade.current.textContent = `${g > 0 ? "+" : ""}${g}%`;
        grade.current.hidden = Math.abs(g) < 2;
      }
    };
    repaint.current = () => paint(performance.now());
    const loop = (now: number) => {
      paint(now);
      if (moving && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && moving) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    });
    io.observe(c);
    const onShow = () => { if (!document.hidden && moving) { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); } };
    document.addEventListener("visibilitychange", onShow);
    const lives = live.current;
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", onShow); lives.last = 0; repaint.current = null; };
  }, [state, moving]);

  // Between sectors nothing moves: draw again only when the board changes.
  useEffect(() => { if (!moving) repaint.current?.(); }, [frame, moving]);

  return (
    <div ref={wrap} className={styles.chase}>
      <canvas ref={canvas} role="img" aria-label="Koersbeeld vanaf de motor" />
      <span ref={caption} className={styles.chaseCaption} hidden />
      <span ref={grade} className={styles.chaseGrade} hidden />
      {children}
    </div>
  );
}
