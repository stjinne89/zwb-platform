import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/app-ui";
import { ViewOnStrava } from "@/components/strava-brand";
import { ResponsiveTable, type ResponsiveColumn } from "@/components/ui/responsive-table";
import { helpHrefForAnchor } from "@/lib/help-categories";
import { DISCIPLINE_LABELS } from "@/lib/strava/sports";
import type { TileInfo } from "@/lib/stats/tiles";
import { trainingArticleBySlug } from "@/lib/training/training-library";
import { TileTitle, type TileTitleInfo } from "../../_components/tile-title";
import {
  bucketTitle,
  type CalendarDay,
  type DisciplineTotals,
  type PeriodRecord,
  type PersonalRide,
  type RideRecord,
  type Streaks,
  type Totals,
  EMPTY_TOTALS,
} from "@/lib/stats/personal";
import { MIN_COMPARE_RIDES } from "@/lib/stats/compare";

export const nl = (value: number, digits = 0) =>
  value.toLocaleString("nl-NL", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function hoursMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

const MONTHS_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

export function dayLabel(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return `${date} ${MONTHS_SHORT[month - 1]} ${year}`;
}

/** De uitleg van een tegel met de links erbij: het kennisbankartikel en /hulp. */
function titleInfo(info: TileInfo | undefined): TileTitleInfo | null {
  if (!info) return null;
  const article = info.article ? trainingArticleBySlug(info.article) : null;
  return {
    text: info.text,
    article: article ? { href: `/zwbeter-worden/kennis/${article.slug}`, title: article.title } : null,
    helpHref: helpHrefForAnchor("mijn-statistieken"),
  };
}

export function Tile({
  title,
  width,
  info,
  actions,
  children,
}: {
  title: string;
  width: "full" | "half";
  /** Uitleg achter de titel (hover of tik). */
  info?: TileInfo;
  /** Rechts naast de titel: een knop, of een kort bijschrift. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-lg border bg-card p-4", width === "full" && "lg:col-span-2")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TileTitle title={title} info={titleInfo(info)} />
        {actions}
      </div>
      {children}
    </section>
  );
}

export function TileFallback({ title, width }: { title: string; width: "full" | "half" }) {
  return (
    <Tile title={title} width={width}>
      <div className="h-48 animate-pulse rounded-md bg-muted/60" />
    </Tile>
  );
}

export function NoData({ children = "Geen ritten in deze periode." }: { children?: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

// ── Totalen ───────────────────────────────────────────────────────────────

function delta(now: number, before: number) {
  if (before <= 0) return null;
  return Math.round(((now - before) / before) * 100);
}

export function TotalsGrid({ now, before: earlier }: { now: Totals; before: Totals }) {
  const before = earlier.rides >= MIN_COMPARE_RIDES ? earlier : EMPTY_TOTALS;
  return (
    <KpiGrid
      items={[
        { label: "Kilometers", value: nl(now.km), delta: delta(now.km, before.km) },
        { label: "Uren", value: nl(now.hours), delta: delta(now.hours, before.hours) },
        { label: "Hoogtemeters", value: nl(now.elevation), delta: delta(now.elevation, before.elevation) },
        { label: "Ritten", value: nl(now.rides), delta: delta(now.rides, before.rides) },
        { label: "kJ", value: nl(now.kilojoules), delta: delta(now.kilojoules, before.kilojoules) },
        { label: "TSS", value: nl(now.tss), delta: delta(now.tss, before.tss) },
      ]}
    />
  );
}

export type KpiItem = { label: string; value: string; delta: number | null };

/** Procentueel verschil met vorig jaar, of null als er vorig jaar niets was. */
export function percentDelta(now: number, before: number) {
  return delta(now, before);
}

export function KpiGrid({ items }: { items: KpiItem[] }) {
  // Geen kaartjes in de kaart: de cijfers staan los, groot, met een haarlijn
  // ertussen. Kilometers voorop en het grootst: daar kijkt iedereen eerst naar.
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3",
        items.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-6",
      )}
    >
      {items.map((item, index) => (
        <div key={item.label} className={cn("min-w-0", index === 0 && "col-span-2 sm:col-span-1")}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className={cn("mt-1 truncate", index === 0 ? "st-num" : "st-kpi")}>{item.value}</dd>
          {item.delta != null && (
            <dd
              className={cn(
                "mt-1 text-xs tabular-nums",
                item.delta >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {item.delta >= 0 ? "▲" : "▼"} {Math.abs(item.delta)}%
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

// ── Kalender ──────────────────────────────────────────────────────────────

/** Dekking van de hoofdkleur per dag: vier stappen, zodat een rustige week niet wegvalt. */
function level(km: number, max: number) {
  if (km <= 0) return 0;
  const ratio = km / Math.max(1, max);
  if (ratio < 0.25) return 0.3;
  if (ratio < 0.5) return 0.5;
  if (ratio < 0.75) return 0.75;
  return 1;
}

export function CalendarHeatmap({ days, streaks }: { days: CalendarDay[]; streaks: Streaks }) {
  const max = Math.max(...days.map((day) => day.km), 1);
  const weeks = Math.ceil(days.length / 7);
  return (
    <div className="space-y-3">
      <div
        className="grid grid-flow-col grid-rows-7 gap-[2px]"
        style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <div
            key={day.day}
            className={cn("aspect-square rounded-[2px]", day.km <= 0 && "bg-muted")}
            style={
              day.km > 0
                ? { background: "var(--st-main)", opacity: level(day.km, max) }
                : undefined
            }
            title={`${dayLabel(day.day)}: ${day.rides ? `${nl(day.km)} km, ${day.rides} rit${day.rides > 1 ? "ten" : ""}` : "geen rit"}`}
          />
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Weken op rij nu</dt>
          <dd className="st-kpi mt-1">{streaks.currentWeeks}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Langste reeks weken</dt>
          <dd className="st-kpi mt-1">{streaks.longestWeeks}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Langste reeks dagen</dt>
          <dd className="st-kpi mt-1">{streaks.longestDays}</dd>
        </div>
      </dl>
    </div>
  );
}

// ── Disciplines ───────────────────────────────────────────────────────────

export function DisciplineBars({ rows }: { rows: DisciplineTotals[] }) {
  const max = Math.max(1, ...rows.map((row) => row.hours));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.sportType}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{DISCIPLINE_LABELS[row.sportType] ?? row.sportType}</span>
            <span className="shrink-0 tabular-nums">{nl(row.hours)} u</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, (row.hours / max) * 100)}%`, background: "var(--st-main)" }} />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {nl(row.km)} km · {nl(row.rides)} ritten
          </p>
        </li>
      ))}
    </ul>
  );
}

// ── Records ───────────────────────────────────────────────────────────────

function recordValue(record: RideRecord) {
  if (record.label.includes("(tijd)")) return hoursMinutes(record.value);
  if (record.label.includes("(km)")) return `${nl(record.value, 1)} km`;
  if (record.label.includes("hoogte")) return `${nl(record.value)} m`;
  if (record.label.includes("NP")) return `${nl(record.value)} W`;
  if (record.label.includes("kJ")) return `${nl(record.value)} kJ`;
  return nl(record.value);
}

export function RecordsList({ rides, periods }: { rides: RideRecord[]; periods: PeriodRecord[] }) {
  return (
    <ul className="divide-y text-sm">
      {rides.map((record) => (
        <li key={record.label} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-medium">{record.label}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dayLabel(record.ride.day)} · {record.ride.name ?? "Rit"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="st-kpi st-sm">{recordValue(record)}</span>
            <ViewOnStrava activityId={record.ride.id} />
          </div>
        </li>
      ))}
      {periods.map((record) => (
        <li key={record.label} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-medium">{record.label}</p>
            <p className="truncate text-xs text-muted-foreground">{bucketTitle(record.key, record.per)}</p>
          </div>
          <span className="st-kpi st-sm shrink-0">{nl(record.km)} km</span>
        </li>
      ))}
    </ul>
  );
}

// ── Ritten ────────────────────────────────────────────────────────────────

const RIDE_COLUMNS: Array<ResponsiveColumn<PersonalRide>> = [
  {
    key: "name",
    header: "Rit",
    primary: true,
    cell: (ride) => (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{ride.name ?? "Rit"}</span>
        <ViewOnStrava activityId={ride.id} />
      </span>
    ),
  },
  { key: "day", header: "Datum", secondary: true, cell: (ride) => dayLabel(ride.day), cellClassName: "whitespace-nowrap" },
  { key: "km", header: "Km", align: "right", cell: (ride) => nl(ride.distanceKm, 1) },
  { key: "time", header: "Tijd", align: "right", cell: (ride) => hoursMinutes(ride.movingSeconds) },
  { key: "hm", header: "Hm", align: "right", cell: (ride) => nl(ride.elevationM) },
  { key: "avg", header: "Gem. W", align: "right", cell: (ride) => (ride.averageWatts ? nl(ride.averageWatts) : "-") },
  { key: "np", header: "NP", align: "right", cell: (ride) => (ride.normalizedWatts ? nl(ride.normalizedWatts) : "-") },
  { key: "if", header: "IF", align: "right", cell: (ride) => (ride.intensityFactor ? nl(ride.intensityFactor, 2) : "-") },
  { key: "tss", header: "TSS", align: "right", cell: (ride) => (ride.tss != null ? nl(ride.tss) : "-") },
  { key: "hr", header: "HR", align: "right", cell: (ride) => (ride.averageHr ? nl(ride.averageHr) : "-") },
];

export const RIDES_PER_PAGE = 25;

export function RidesTable({
  rides,
  page,
  pageHref,
}: {
  rides: PersonalRide[];
  page: number;
  pageHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(rides.length / RIDES_PER_PAGE));
  const current = Math.min(page, pages);
  const shown = rides.slice((current - 1) * RIDES_PER_PAGE, current * RIDES_PER_PAGE);
  if (rides.length === 0) return <EmptyState>Geen ritten in deze periode.</EmptyState>;
  return (
    <div className="space-y-3">
      <ResponsiveTable
        columns={RIDE_COLUMNS}
        rows={shown}
        rowKey={(ride) => String(ride.id)}
        minWidth={760}
      />
      {pages > 1 && (
        <nav aria-label="Pagina's" className="flex items-center justify-between gap-2 text-sm">
          <PageLink href={current > 1 ? pageHref(current - 1) : null} label="Nieuwer">
            <ChevronLeft className="size-4" />
          </PageLink>
          <span className="tabular-nums text-muted-foreground">
            {current} / {pages} · {nl(rides.length)} ritten
          </span>
          <PageLink href={current < pages ? pageHref(current + 1) : null} label="Ouder" trailing>
            <ChevronRight className="size-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({
  href,
  label,
  trailing,
  children,
}: {
  href: string | null;
  label: string;
  trailing?: boolean;
  children: ReactNode;
}) {
  const content = (
    <>
      {!trailing && children}
      {label}
      {trailing && children}
    </>
  );
  const className = "inline-flex min-h-10 items-center gap-1 rounded-md border px-3";
  return href ? (
    <Link href={href} scroll={false} className={cn(className, "hover:border-primary/40")}>
      {content}
    </Link>
  ) : (
    <span className={cn(className, "opacity-40")} aria-disabled>
      {content}
    </span>
  );
}
