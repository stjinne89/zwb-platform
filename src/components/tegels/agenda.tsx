import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/app-ui";

// De agenda van het design "tegels": events en eigen trainingen in één lijst,
// met wat geweest is erboven. Puur weergave; de kalenderpagina levert de rijen.

export type AgendaRow = {
  key: string;
  href: string;
  /** Kleur van de rij: koers petrol, training teal, clubrit sage, verjaardag goud. */
  place: "kalender" | "zwbeter" | "club" | "vandaag";
  /** Twee letters, bijvoorbeeld "di". */
  day: string;
  dayNumber: string;
  title: string;
  sub?: string;
  time?: string;
  /** Extra regels onder de rij, zoals teamevents of badges. */
  extra?: ReactNode;
};

function Row({ row, past }: { row: AgendaRow; past?: boolean }) {
  return (
    <li>
      <Link
        href={row.href}
        className={past ? "tg-row tg-row-past" : `tg-row tg-${row.place}`}
      >
        <span className="text-xs font-bold leading-tight">
          {row.day}
          <span className="block text-[1.375rem] font-light tabular-nums">{row.dayNumber}</span>
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-base font-semibold leading-tight">
            {row.title}
          </strong>
          {row.sub && <span className="block truncate text-[0.8125rem] opacity-90">{row.sub}</span>}
        </span>
        {row.time ? <span className="tg-row-time">{row.time}</span> : <span />}
      </Link>
      {row.extra && <div className="mt-1.5 flex flex-wrap items-center gap-2">{row.extra}</div>}
    </li>
  );
}

export function TegelsAgenda({
  past,
  upcoming,
  empty,
}: {
  past: AgendaRow[];
  upcoming: AgendaRow[];
  empty: string;
}) {
  return (
    <div className="space-y-1.5">
      {past.length > 0 && (
        <ul className="space-y-1.5" aria-label="Geweest">
          {past.map((row) => (
            <Row key={row.key} row={row} past />
          ))}
        </ul>
      )}
      <p className="flex items-center gap-2 py-0.5 text-xs font-bold lowercase text-[rgb(var(--zwblok-own-text))] after:h-0.5 after:flex-1 after:bg-[var(--tg-vandaag)] after:content-['']">
        Vandaag
      </p>
      {upcoming.length === 0 ? (
        <EmptyState>{empty}</EmptyState>
      ) : (
        <ul className="space-y-1.5" aria-label="Komend">
          {upcoming.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
