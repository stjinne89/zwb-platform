"use client";

import { useClubTexts } from "@/components/club-texts-provider";

// Herkomstlabel bij een segment- of coltijd die ZWB zelf mat uit een GPX of een
// intervals.icu-rit (lib/segments/gps-sync.ts). Uitleg staat op /hulp.
export function GpsLabel() {
  const clubTexts = useClubTexts();
  return (
    <span
      title={`Gemeten door ${clubTexts.shortName}`}
      className="mr-1.5 inline-block rounded border px-1 align-middle text-[10px] font-semibold leading-4 text-muted-foreground"
    >
      GPS
    </span>
  );
}
