"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontaal scrollende rij tabs of chips die op mobiel tot de schermrand
 * doorloopt.
 *
 * Waarom niet gewoon `overflow-x-auto`: dan wordt het laatste item middenin
 * afgekapt zonder dat iets verraadt dat er meer is, en op een pagina met
 * `px-4` stopt de strip binnen de marge. Deze variant loopt full-bleed, snapt
 * per item, toont een fade aan de kant waar nog inhoud zit, en scrolt het
 * actieve item in beeld.
 *
 * Markeer het actieve kind met `data-active="true"` om dat laatste te laten
 * werken.
 */
export function ScrollTabs({
  children,
  ariaLabel,
  variant = "plain",
  className,
}: {
  children: ReactNode;
  ariaLabel?: string;
  /** "panel" tekent de omkaderde balk; "plain" laat de items vrij staan. */
  variant?: "panel" | "plain";
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    setEdges({
      left: scrollLeft > 1,
      right: scrollLeft + clientWidth < scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    syncEdges();

    const active = element.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      const offset =
        active.offsetLeft - element.clientWidth / 2 + active.offsetWidth / 2;
      element.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
    }

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(syncEdges);
    observer.observe(element);
    return () => observer.disconnect();
  }, [syncEdges, children]);

  return (
    <div className={cn("relative", variant === "panel" ? "-mx-4 sm:mx-0" : "-mx-4 sm:mx-0", className)}>
      <div
        ref={scroller}
        onScroll={syncEdges}
        aria-label={ariaLabel}
        role={ariaLabel ? "navigation" : undefined}
        className={cn(
          "flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth px-4 sm:px-0",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          variant === "panel" &&
            "border-y bg-card py-1 sm:rounded-lg sm:border sm:px-1",
          variant === "plain" && "gap-1.5 py-0.5",
        )}
      >
        {children}
      </div>

      {/* Fade als er nog inhoud buiten beeld zit. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent transition-opacity sm:hidden",
          edges.left ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent transition-opacity sm:hidden",
          edges.right ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

/** Tapdoel van minimaal 44px hoog, zoals de ontwerpregels voorschrijven. */
export const SCROLL_TAB_ITEM =
  "flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-md px-3 text-sm font-medium transition";
