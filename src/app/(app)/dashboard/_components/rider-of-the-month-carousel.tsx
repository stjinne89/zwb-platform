"use client";

import { useEffect, useState } from "react";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";

import { MemberLink } from "@/components/member-link";
import { RANKING_ICONS } from "@/components/ranking-icon";
import type { RankingIcon } from "@/lib/rankings/rankings";

/** `rank` uit de ranglijst: bij gelijke stand dezelfde plek. */
export type RiderEntry = { id: string; name: string; value: string; rank: number };
/** Een ranglijst van ZWB Rankings over de maand (sinds 2026-10-26; daarvoor km, uren, kudo's en hm). */
export type RiderMetricSlide = {
  key: string;
  label: string;
  icon: RankingIcon;
  riders: RiderEntry[];
};

const ROTATE_MS = 6500;

export function RiderOfTheMonthCarousel({ slides }: { slides: RiderMetricSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // index in de deps: na handmatig bladeren begint de rotatietijd opnieuw.
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, slides.length, index]);

  if (slides.length === 0) return null;

  const step = (delta: number) =>
    setIndex((i) => (i + delta + slides.length) % slides.length);

  const slide = slides[index];
  const Icon = RANKING_ICONS[slide.icon];

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
        <div className="flex items-center gap-1">
          {slides.length > 1 && (
            <button
              type="button"
              aria-label="Vorige maatstaf"
              onClick={() => step(-1)}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          {/* Tien stippen passen niet naast de titel op een telefoon; daar een teller. */}
          <span className="px-1 text-xs tabular-nums text-muted-foreground sm:hidden" aria-hidden>
            {index + 1}/{slides.length}
          </span>
          <div className="hidden items-center px-1 sm:flex" role="tablist" aria-label="Maatstaf">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.label}
                onClick={() => setIndex(i)}
                className="flex size-6 items-center justify-center"
              >
                {/* Stip blijft klein; het tapdoel eromheen niet. */}
                <span
                  className={`size-1.5 rounded-full transition-colors ${
                    i === index ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {slides.length > 1 && (
            <button
              type="button"
              aria-label="Volgende maatstaf"
              onClick={() => step(1)}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div key={slide.key} className="animate-in fade-in duration-700">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
          <Icon className="size-4" />
          {slide.label}
        </div>
        <ol className="space-y-1 text-sm">
          {slide.riders.map((rider) => (
            <li key={rider.id} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-block w-5 shrink-0 text-right tabular-nums text-muted-foreground">
                  {rider.rank}.
                </span>
                <span className="truncate">
                  <MemberLink id={rider.id}>{rider.name}</MemberLink>
                </span>
              </span>
              <span className="shrink-0 font-medium tabular-nums">{rider.value}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
