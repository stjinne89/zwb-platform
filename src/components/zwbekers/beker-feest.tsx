"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./beker-feest.module.css";

/** Welke bekers dit toestel al gevierd heeft. Per toestel: zonder opslag geen feest, nooit twee keer. */
const SEEN_KEY = "zwbekers-gevierd";
const SEEN_MAX = 100;
const CONFETTI_MS = 4500;
const COLORS = ["#e7c56b", "#c9a45a", "#f4efe4", "#0b8a8f", "#e8762b", "#b3262d"];
const FLAGS = 15;

/**
 * Het blok met de bekers van deze week op het dashboard (wens eigenaar,
 * 2026-10-28). Zit er een beker bij die dit toestel nog niet zag, dan hangen
 * er slingers over het blok en valt er confetti over het scherm. Met
 * `prefers-reduced-motion` hangen de slingers stil en blijft de confetti weg.
 */
export function BekerFeest({ ids, className, children }: { ids: string[]; className?: string; children: ReactNode }) {
  const [party, setParty] = useState<null | { confetti: boolean }>(null);
  const key = ids.join(",");

  useEffect(() => {
    let seen: string[];
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
      seen = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return;
    }
    const fresh = ids.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify([...fresh, ...seen].slice(0, SEEN_MAX)));
    } catch {
      return;
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Na het lezen van de opslag, dus pas na de eerste weergave.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParty({ confetti: !still });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` staat voor `ids`
  }, [key]);

  return (
    <section className={`relative ${className ?? ""}`}>
      {party && <Slingers />}
      {children}
      {party?.confetti && <Confetti />}
    </section>
  );
}

/** Twee doorhangende vlaggenlijnen boven het blok. */
function Slingers() {
  const lines = [
    { sag: 26, offset: 0, delay: 0 },
    { sag: 18, offset: 0.5, delay: 0.15 },
  ];
  return (
    <svg className={styles.slingers} viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden>
      {lines.map((line, index) => {
        // Een doorhangende lijn van links naar rechts: y = sag · 4t(1 - t).
        const at = (t: number) => ({ x: t * 300, y: 2 + line.sag * 4 * t * (1 - t) });
        return (
          <g key={index} className={styles.line} style={{ animationDelay: `${line.delay}s` }}>
            <path d={`M 0 2 Q 150 ${2 + line.sag * 2} 300 2`} fill="none" stroke="#c9a45a" strokeWidth={0.8} />
            {Array.from({ length: FLAGS }, (_, flag) => {
              const t = (flag + 0.5 + line.offset) / (FLAGS + 1);
              const a = at(t - 0.022);
              const b = at(t + 0.022);
              const tip = at(t);
              return (
                <path
                  key={flag}
                  d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${tip.x} ${tip.y + 11} Z`}
                  fill={COLORS[(flag + index * 3) % COLORS.length]}
                  className={styles.flag}
                  style={{ animationDelay: `${line.delay + 0.6 + (flag % 4) * 0.12}s` }}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

type Piece = { x: number; y: number; vx: number; vy: number; spin: number; angle: number; size: number; color: string; wobble: number };

/** Confetti over het hele scherm, een paar seconden; klikken gaat er gewoon doorheen. */
function Confetti() {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const width = window.innerWidth;
    const count = Math.round(Math.min(220, Math.max(90, width / 6)));
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * window.innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 2 + Math.random() * 3,
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      wobble: Math.random() * Math.PI * 2,
    }));

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      context.clearRect(0, 0, canvas.width, canvas.height);
      // Het laatste stuk vervaagt de confetti in plaats van hem af te kappen.
      context.globalAlpha = Math.min(1, Math.max(0, (CONFETTI_MS - elapsed) / 900));
      for (const piece of pieces) {
        piece.wobble += 0.08;
        piece.x += piece.vx + Math.sin(piece.wobble) * 0.6;
        piece.y += piece.vy;
        piece.angle += piece.spin;
        context.save();
        context.translate(piece.x, piece.y);
        context.rotate(piece.angle);
        // Kantelen: een draaiend snippertje wordt smaller en weer breder.
        context.scale(1, Math.abs(Math.cos(piece.wobble)) * 0.8 + 0.2);
        context.fillStyle = piece.color;
        context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        context.restore();
      }
      if (elapsed < CONFETTI_MS) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  if (done) return null;
  return <canvas ref={ref} className={styles.confetti} aria-hidden />;
}
