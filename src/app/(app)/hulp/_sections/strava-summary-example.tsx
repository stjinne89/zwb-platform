"use client";

import { useClubTexts } from "@/components/club-texts-provider";
import { fillClubText } from "@/lib/club-texts";
import { summaryHeader } from "@/lib/training/strava-summary-header";

/** Een voorbeeld van het Strava-blok, met de kopregel en steen van de club. */
export function StravaSummaryExample({ text }: { text: string }) {
  const clubTexts = useClubTexts();
  return <>{`${summaryHeader(clubTexts.words.beter)}\n${fillClubText(text, clubTexts)}`}</>;
}
