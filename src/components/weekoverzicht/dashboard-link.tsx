// Vaste ingang naar het weekoverzicht op het dashboard (wens eigenaar,
// 2026-10-18): de hele week zichtbaar, altijd naar de laatst afgesloten week.
// In de stijl van de app, niet in die van de pop-up: het zeefdrukregister
// blijft binnen het overzicht zelf (DESIGN.md, De Grensregel).

import Link from "next/link";
import { CalendarRange, ChevronRight } from "lucide-react";
import { addDays, isoWeekNumber, reviewPeriod } from "@/lib/weekly-review/period";

const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function shortRange(start: string, end: string) {
  const [, m1, d1] = start.split("-").map(Number);
  const [, m2, d2] = end.split("-").map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MONTHS[m2 - 1]}` : `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`;
}

export function WeekReviewDashboardLink({ tegels = false }: { tegels?: boolean }) {
  const { weekStart } = reviewPeriod();
  const week = isoWeekNumber(weekStart);
  const range = shortRange(weekStart, addDays(weekStart, 6));

  if (tegels) {
    return (
      <Link href="/weekoverzicht" className="tg-tile tg-zwbeter">
        <span className="tg-tile-small">ZWBeter · weekoverzicht</span>
        <span className="tg-tile-title mt-0.5">Week {week}</span>
        <span className="tg-tile-num text-[1.25rem]">{range}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/weekoverzicht"
      className="flex min-h-11 items-center gap-3 rounded-lg border bg-card/90 px-4 py-3 text-sm transition hover:border-primary/40 hover:bg-muted/60"
    >
      <CalendarRange className="size-4 shrink-0 text-primary" />
      <span className="flex-1">
        <span className="font-medium">Weekoverzicht week {week}</span>
        <span className="ml-2 text-muted-foreground tabular-nums">{range}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
