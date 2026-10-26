"use client";

// /weekoverzicht: hetzelfde overzicht, op elk moment terug te zien. Sluiten
// gaat terug naar waar het lid vandaan kwam.

import { useRouter } from "next/navigation";
import type { WeekReview } from "@/lib/weekly-review/service";
import { WeekReviewStories } from "./week-review";

export function WeekReviewPage({ review, preview = false }: { review: WeekReview; preview?: boolean }) {
  const router = useRouter();
  return (
    <WeekReviewStories
      review={review}
      preview={preview}
      onClose={() => (window.history.length > 1 ? router.back() : router.push("/dashboard"))}
    />
  );
}
