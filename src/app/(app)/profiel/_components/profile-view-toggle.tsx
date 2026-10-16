"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type ProfileView = "bewerken" | "leden" | "deelbaar";

const VIEWS: { view: ProfileView; href: string; label: string }[] = [
  { view: "bewerken", href: "/profiel?weergave=bewerken", label: "Bewerken" },
  { view: "leden", href: "/profiel", label: "Wat leden zien" },
  { view: "deelbaar", href: "/profiel?weergave=deelbaar", label: "Deelbaar profiel" },
];

/**
 * Gouden dimmer met drie standen. Hoe meer mensen je profiel zien, hoe meer
 * licht: uit bij bewerken, gedimd voor leden, vol voor het deelbare profiel.
 */
export function ProfileViewToggle({ view }: { view: ProfileView }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(view);
  const [dragPos, setDragPos] = useState<number | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const current = VIEWS.findIndex((v) => v.view === shown);
  const pos = dragPos ?? current;

  function select(index: number) {
    const next = VIEWS[index];
    if (!next || next.view === shown) return;
    startTransition(() => {
      setShown(next.view);
      router.push(next.href, { scroll: false });
    });
  }

  function indexAt(clientX: number) {
    const rect = plateRef.current?.getBoundingClientRect();
    if (!rect) return current;
    const third = rect.width / 3;
    return Math.min(2, Math.max(0, Math.floor((clientX - rect.left) / third)));
  }

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + VIEWS.length) % VIEWS.length;
    radioRefs.current[next]?.focus();
    select(next);
  }

  return (
    <div className="dimmer" data-pos={pos} data-dragging={dragPos !== null || undefined}>
      <div
        ref={plateRef}
        aria-hidden
        className="dimmer-plate"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragPos(indexAt(event.clientX));
        }}
        onPointerMove={(event) => {
          if (dragPos === null) return;
          setDragPos(indexAt(event.clientX));
        }}
        onPointerUp={(event) => {
          const index = indexAt(event.clientX);
          setDragPos(null);
          select(index);
        }}
        onPointerCancel={() => setDragPos(null)}
      >
        <span className="dimmer-glow" />
        <span className="dimmer-screw" />
        <span className="dimmer-slot">
          <span className="dimmer-notch" />
          <span className="dimmer-notch" />
          <span className="dimmer-notch" />
        </span>
        <span className="dimmer-knob">
          <span className="dimmer-ridge" />
          <span className="dimmer-lamp" />
          <span className="dimmer-ridge" />
        </span>
        <span className="dimmer-screw" />
      </div>

      <div role="radiogroup" aria-label="Profielweergave" className="dimmer-labels">
        {VIEWS.map((option, index) => {
          const active = index === current;
          return (
            <button
              key={option.view}
              ref={(el) => {
                radioRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn("dimmer-label", index === pos && "dimmer-label-active")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
