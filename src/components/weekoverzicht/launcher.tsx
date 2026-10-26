"use client";

// Opent het weekoverzicht vanzelf, één keer: op zondagavond of de dagen erna,
// zolang het lid het nog niet zag. De layout zet dit alleen neer binnen dat
// venster; hier vragen we één keer per sessie of er iets klaarstaat.

import { useEffect, useState } from "react";
import type { WeekReview } from "@/lib/weekly-review/service";
import { markWeekReviewSeenAction, openWeekReview } from "@/app/(app)/weekoverzicht/_actions";
import { stencilFont } from "./fonts";
import { WeekReviewStories } from "./week-review";

const CHECKED_KEY = "zwb-weekoverzicht-gecheckt";

export function WeekReviewLauncher({ weekStart }: { weekStart: string }) {
  const [review, setReview] = useState<WeekReview | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem(CHECKED_KEY) === weekStart) return;
    } catch {
      // Geen sessionStorage (privévenster): gewoon vragen.
    }
    openWeekReview()
      .then((result) => {
        if (cancelled) return;
        try {
          sessionStorage.setItem(CHECKED_KEY, weekStart);
        } catch {
          // niets
        }
        if (result) {
          setReview(result);
          void markWeekReviewSeenAction(result.weekStart);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  // Zolang het overzicht nog wordt opgehaald: een onzichtbaar woord in de
  // stencilletter, zodat de browser die alvast laadt.
  if (!review) {
    return (
      <span aria-hidden="true" className={`${stencilFont.className} pointer-events-none fixed -left-[9999px] font-black`}>
        WEEK
      </span>
    );
  }
  return <WeekReviewStories review={review} onClose={() => setReview(null)} />;
}
