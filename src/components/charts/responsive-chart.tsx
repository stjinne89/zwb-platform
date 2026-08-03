"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useContainerWidth } from "@/components/charts/use-container-width";
import {
  chartHeight,
  chartMetrics,
  pointerIndex,
  pointerRatio,
  type ChartMetrics,
} from "@/lib/charts/responsive";

export type ChartContext = {
  width: number;
  height: number;
  metrics: ChartMetrics;
  /** Breedte van het plotvlak, dus zonder marges. */
  plotWidth: number;
  /** Hoogte van het plotvlak. */
  plotHeight: number;
};

/**
 * Meet de container en tekent een SVG waarvan de viewBox gelijk is aan die
 * breedte. Eén SVG-eenheid is daardoor één CSS-pixel: `fontSize={12}` is echt
 * 12px, ook op een telefoon.
 *
 * `touch-action: pan-y` is bewust: verticaal scrollen over de grafiek blijft
 * werken, horizontaal slepen scrubt door de data.
 */
export function ResponsiveChart({
  ariaLabel,
  height,
  heightOptions,
  fallbackWidth = 640,
  className,
  onPointerRatio,
  children,
}: {
  ariaLabel: string;
  /** Vaste hoogte; laat weg voor een hoogte die met de breedte meebeweegt. */
  height?: number;
  heightOptions?: Parameters<typeof chartHeight>[1];
  fallbackWidth?: number;
  className?: string;
  /** Fractie 0-1 binnen het plotvlak, of null als de aanwijzer weg is. */
  onPointerRatio?: (ratio: number | null) => void;
  children: (ctx: ChartContext) => ReactNode;
}) {
  const { ref, width } = useContainerWidth<HTMLDivElement>(fallbackWidth);
  const metrics = chartMetrics(width);
  const chartH = height ?? chartHeight(width, heightOptions);
  const plotWidth = Math.max(0, width - metrics.margin.left - metrics.margin.right);
  const plotHeight = Math.max(0, chartH - metrics.margin.top - metrics.margin.bottom);

  const report = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!onPointerRatio) return;
    onPointerRatio(pointerRatio(event, width, metrics.margin));
  };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {width > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${chartH}`}
          width={width}
          height={chartH}
          role="img"
          aria-label={ariaLabel}
          className="block max-w-full [touch-action:pan-y]"
          onPointerMove={report}
          onPointerDown={report}
          onPointerLeave={() => onPointerRatio?.(null)}
        >
          {children({ width, height: chartH, metrics, plotWidth, plotHeight })}
        </svg>
      ) : null}
    </div>
  );
}

/**
 * Actieve index binnen een reeks, gevoed door `onPointerRatio`. Op touch blijft
 * de selectie staan na een tap; op muis verdwijnt hij bij verlaten.
 */
export function useChartPointer(length: number) {
  const [index, setIndex] = useState<number | null>(null);
  const onPointerRatio = (ratio: number | null) => {
    setIndex(ratio == null ? null : pointerIndex(ratio, length));
  };
  return { index, onPointerRatio, clear: () => setIndex(null) };
}
