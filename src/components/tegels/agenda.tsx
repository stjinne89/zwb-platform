import Link from "next/link";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { EmptyState } from "@/components/app-ui";
import { groupByMonth } from "@/lib/events/month-groups";

// De agenda van het design "tegels": events en eigen trainingen in één lijst,
// met wat geweest is erboven. Puur weergave; de kalenderpagina levert de rijen.

export type AgendaRow = {
  key: string;
  href: string;
  /** Dag in Amsterdam, "2026-11-02"; bepaalt onder welke maand de rij valt. */
  dateKey: string;
  /** Kleur van het dagvak: de afgesproken eventkleur, teal voor een eigen
   * training, goud voor een verjaardag. */
  color: { bg: string; ink: string };
  /** Foto als achtergrond van het dagvak, in plaats van de kleur (verjaardag). */
  image?: string | null;
  /** Twee letters, bijvoorbeeld "di". */
  day: string;
  dayNumber: string;
  title: string;
  sub?: string;
  time?: string;
  /** Wie "ja" zei: avatars met de teller erachter. */
  riders?: Array<{ id: string; name: string; avatarUrl: string | null }>;
  /** Extra regels onder de rij, zoals teamevents of badges. */
  extra?: ReactNode;
};

function Row({ row, past }: { row: AgendaRow; past?: boolean }) {
  return (
    <li>
      <Link
        href={row.href}
        className={past ? "tg-row tg-row-past" : "tg-row"}
        style={{ "--row-bg": row.color.bg, "--row-ink": row.color.ink } as CSSProperties}
      >
        <span
          className={row.image ? "tg-row-day tg-row-day-photo" : "tg-row-day"}
          style={
            row.image
              ? {
                  backgroundImage: `linear-gradient(rgb(0 0 0 / 0.38), rgb(0 0 0 / 0.38)), url("${row.image}")`,
                }
              : undefined
          }
        >
          {row.day}
          <b>{row.dayNumber}</b>
        </span>
        <span className="tg-row-body">
          <strong className="block truncate text-base font-medium leading-tight">{row.title}</strong>
          {row.sub && (
            <span className="block truncate text-[0.8125rem] text-muted-foreground">{row.sub}</span>
          )}
          {row.riders && row.riders.length > 0 && (
            <span className="tg-riders">
              <span className="tg-riders-stack">
                {row.riders.slice(0, 6).map((rider) =>
                  rider.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={rider.id} src={rider.avatarUrl} alt="" title={rider.name} />
                  ) : (
                    <span key={rider.id} title={rider.name}>
                      {rider.name.slice(0, 1).toUpperCase()}
                    </span>
                  ),
                )}
              </span>
              {row.riders.length} {row.riders.length === 1 ? "doet" : "doen"} mee
            </span>
          )}
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
  todayKey,
  empty,
}: {
  past: AgendaRow[];
  upcoming: AgendaRow[];
  todayKey: string;
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
        groupByMonth(upcoming, (row) => row.dateKey, todayKey).map((group) => (
          <Fragment key={group.monthKey ?? "nu"}>
            {group.label && (
              <p
                aria-hidden
                className="flex items-center gap-2 pt-3 pb-0.5 text-xs font-bold lowercase text-muted-foreground after:h-px after:flex-1 after:bg-border after:content-['']"
              >
                {group.label}
              </p>
            )}
            <ul className="space-y-1.5" aria-label={group.label ?? "Komend"}>
              {group.items.map((row) => (
                <Row key={row.key} row={row} />
              ))}
            </ul>
          </Fragment>
        ))
      )}
    </div>
  );
}
