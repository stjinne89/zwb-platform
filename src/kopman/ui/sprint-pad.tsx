"use client";

import { ArrowLeft, ArrowRight, ChevronsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { launch, steer, type BoardState } from "../engine/board";
import { kopmanOf } from "../engine/race";
import { PLAYER_TEAM } from "../engine/types";
import styles from "./kopman.module.css";

/** Pixels a finger has to travel before it counts as a swipe. */
const SWIPE = 24;

/**
 * The last kilometre by hand, over the race view: swipe left or right to change
 * lanes, up to go. The arrow keys and the three buttons do the same.
 */
export function SprintPad({ board, onChange }: { board: BoardState; onChange: () => void }) {
  const [noRoom, setNoRoom] = useState(false);
  const from = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef(0);
  const sprint = board.race.sprint!;
  const k = kopmanOf(board.race, PLAYER_TEAM)!;
  const gone = sprint.launched || k.mode === "sprint";

  const act = useRef<(what: "links" | "rechts" | "gaan") => void>(() => {});
  useEffect(() => {
    act.current = (what) => {
      const ok = what === "gaan" ? launch(board) : steer(board, what === "links" ? -1 : 1);
      if (!ok && what !== "gaan") {
        setNoRoom(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setNoRoom(false), 700);
      }
      onChange();
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const what = e.key === "ArrowLeft" ? "links" : e.key === "ArrowRight" ? "rechts" : e.key === "ArrowUp" || e.key === " " ? "gaan" : null;
      if (!what) return;
      e.preventDefault();
      act.current(what);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.clearTimeout(timer.current); };
  }, []);

  const left = Math.max(0, Math.round(board.race.course.length - k.distance));
  const legs = Math.round((k.wbal / k.wprime) * 100);
  return (
    <div
      className={styles.sprintPad}
      onPointerDown={(e) => { from.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const f = from.current;
        from.current = null;
        if (!f) return;
        const dx = e.clientX - f.x, dy = e.clientY - f.y;
        if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(dy)) act.current(dx < 0 ? "links" : "rechts");
        else if (-dy >= SWIPE && -dy > Math.abs(dx)) act.current("gaan");
      }}
      onPointerCancel={() => { from.current = null; }}
    >
      <div className={styles.sprintHud} aria-live="polite">
        <b>{left} m</b>
        <span className={styles.sprintLegs} role="meter" aria-label="Sprintkracht" aria-valuemin={0} aria-valuemax={100} aria-valuenow={legs}>
          <span style={{ width: `${legs}%` }} />
        </span>
        {sprint.boxed ? <span className={styles.sprintFlag}>Ingesloten</span> : noRoom ? <span className={styles.sprintFlag}>Geen ruimte</span> : null}
      </div>
      <div className={styles.sprintKeys}>
        <button type="button" aria-label="Naar links" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={() => act.current("links")}><ArrowLeft size={20} aria-hidden /></button>
        <button type="button" aria-label="Aanzetten" className={styles.sprintGo} disabled={gone} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={() => act.current("gaan")}><ChevronsUp size={22} aria-hidden /></button>
        <button type="button" aria-label="Naar rechts" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} onClick={() => act.current("rechts")}><ArrowRight size={20} aria-hidden /></button>
      </div>
    </div>
  );
}
