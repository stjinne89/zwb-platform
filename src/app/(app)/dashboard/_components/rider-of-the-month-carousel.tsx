"use client";

import { useEffect, useState } from "react";
import { Trophy, Bike, Clock, Mountain, Heart, type LucideIcon } from "lucide-react";

export type RiderEntry = { name: string; value: string };
export type RiderMetricSlide = {
  key: "km" | "uren" | "kudos" | "hm";
  label: string;
  unit: string;
  riders: RiderEntry[];
};

const ICONS: Record<RiderMetricSlide["key"], LucideIcon> = {
  km: Bike,
  uren: Clock,
  kudos: Heart,
  hm: Mountain,
};

const ROTATE_MS = 6500;

export function RiderOfTheMonthCarousel({ slides }: { slides: RiderMetricSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  const slide = slides[index];
  const Icon = ICONS[slide.key];

  return (
    <div
      className="mt-4 rounded-lg border bg-card p-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Trophy className="size-4 text-primary" />
          Rider of the month
        </h3>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Maatstaf">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={s.label}
              onClick={() => setIndex(i)}
              className={`size-1.5 rounded-full transition-colors ${
                i === index ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      <div key={slide.key} className="animate-in fade-in duration-700">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Icon className="size-4" />
          {slide.label}
        </div>
        <ol className="space-y-1 text-sm">
          {slide.riders.map((rider, idx) => (
            <li key={rider.name + idx} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 text-right tabular-nums text-muted-foreground">
                  {idx + 1}.
                </span>
                {rider.name}
              </span>
              <span className="font-medium tabular-nums">
                {rider.value}
                {slide.unit && <span className="ml-1 text-muted-foreground">{slide.unit}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
