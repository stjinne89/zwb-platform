"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Werkelijke breedte van een element, zodat een grafiek op zijn eigen maat kan
 * tekenen in plaats van een vaste viewBox weg te schalen.
 *
 * De eerste render (server én client) gebruikt `fallback`, daarna corrigeert de
 * ResizeObserver. Dat houdt de hydratie gelijk.
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(fallback = 640) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };

    // Ontbreekt in jsdom en in oudere browsers; dan volstaat één meting.
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
