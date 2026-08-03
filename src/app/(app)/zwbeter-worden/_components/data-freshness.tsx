import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Vanaf hoeveel dagen oud een bron als verouderd geldt. */
const STALE_DAYS = 3;

export type FreshnessSource = {
  label: string;
  /** Moment waarop deze bron voor het laatst iets opleverde. */
  at: string | Date | null;
  /** Waar het lid het ophalen zelf kan starten. */
  action?: { href: string; label: string };
};

function toDate(value: string | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function daysAgo(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

function formatMoment(date: Date) {
  const days = daysAgo(date);
  if (days <= 0) {
    return `vandaag ${date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (days === 1) return "gisteren";
  const stamp = date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
  return `${stamp} (${days} dagen geleden)`;
}

/**
 * Toont per bron wanneer er voor het laatst data binnenkwam, met een directe
 * ingang om het ophalen zelf te starten. Zonder dit leest een leeg paneel als
 * "kapot", terwijl de bron simpelweg al dagen niets meer levert.
 */
export function DataFreshness({ sources }: { sources: FreshnessSource[] }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <RefreshCw className="size-4" />
        Laatst opgehaald
      </h2>
      <ul className="mt-3 divide-y">
        {sources.map((source) => {
          const date = toDate(source.at);
          const stale = date ? daysAgo(date) >= STALE_DAYS : true;
          return (
            <li
              key={source.label}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0"
            >
              <span className="text-sm">{source.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    stale ? "font-medium text-destructive" : "text-muted-foreground",
                  )}
                >
                  {date ? formatMoment(date) : "nog niets opgehaald"}
                </span>
                {stale && <AlertTriangle className="size-4 shrink-0 text-destructive" />}
              </span>
              {source.action && (
                <Link
                  href={source.action.href}
                  className="inline-flex min-h-9 basis-full items-center text-sm text-primary underline-offset-2 hover:underline sm:basis-auto"
                >
                  {source.action.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Duurt het ophalen lang?{" "}
        <Link href="/hulp" className="text-primary underline-offset-2 hover:underline">
          Hulp bij synchroniseren
        </Link>
      </p>
    </section>
  );
}
