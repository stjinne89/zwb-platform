"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Pencil, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileView = "bewerken" | "leden" | "deelbaar";

const VIEWS: { view: ProfileView; href: string; label: string; icon: LucideIcon }[] = [
  { view: "bewerken", href: "/profiel?weergave=bewerken", label: "Bewerken", icon: Pencil },
  { view: "leden", href: "/profiel", label: "Wat leden zien", icon: Users },
  { view: "deelbaar", href: "/profiel?weergave=deelbaar", label: "Deelbaar profiel", icon: Globe },
];

/** Gouden schuifknop met drie standen: bewerken, wat leden zien, deelbaar profiel. */
export function ProfileViewToggle({ view }: { view: ProfileView }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(view);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = VIEWS.findIndex((v) => v.view === shown);

  function select(index: number) {
    const next = VIEWS[index];
    if (!next || next.view === shown) return;
    startTransition(() => {
      setShown(next.view);
      router.push(next.href, { scroll: false });
    });
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
    <div className="flex justify-center">
      <div
        role="radiogroup"
        aria-label="Profielweergave"
        className="view-slider"
        data-pos={current}
      >
        <span className="view-slider-knob" aria-hidden />
        {VIEWS.map((option, index) => {
          const active = index === current;
          const Icon = option.icon;
          return (
            <button
              key={option.view}
              ref={(el) => {
                radioRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={option.label}
              title={option.label}
              tabIndex={active ? 0 : -1}
              onClick={() => select(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn("view-slider-option", active && "view-slider-option-active")}
            >
              <Icon aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
