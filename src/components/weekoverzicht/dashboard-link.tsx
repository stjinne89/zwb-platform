// Vaste ingang naar het weekoverzicht op het dashboard (wens eigenaar,
// 2026-10-18): de hele week zichtbaar, altijd naar de laatst afgesloten week.
// Een tegel in de stijl van de app, niet in die van de pop-up: het
// zeefdrukregister blijft binnen het overzicht zelf (DESIGN.md, De Grensregel).

import Link from "next/link";
import { addDays, isoWeekNumber, reviewPeriod } from "@/lib/weekly-review/period";
import { ClubText } from "@/components/club-texts-provider";

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function shortRange(start: string, end: string) {
  const [, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS[m2 - 1]}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
}

export function WeekReviewDashboardLink() {
  const { weekStart } = reviewPeriod();
  const week = isoWeekNumber(weekStart);
  const range = shortRange(weekStart, addDays(weekStart, 6));

  return (
    <Link href="/weekoverzicht" className="tg-tile tg-zwbeter">
      <span className="tg-tile-small"><ClubText text="{beter} · weekoverzicht" /></span>
      <span className="tg-tile-title mt-0.5">Week {week}</span>
      <span className="tg-tile-num text-[1.25rem]">{range}</span>
    </Link>
  );
}
