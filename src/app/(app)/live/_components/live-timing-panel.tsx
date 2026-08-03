"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowUpRight, CheckCircle2, RefreshCw, Radio } from "lucide-react";
import type {
  LiveTimingOutcome,
  LiveTimingResult,
} from "@/lib/event-results/scrape";
import { Button } from "@/components/ui/button";
import { ResponsiveTable } from "@/components/ui/responsive-table";

type LiveTimingPanelProps = {
  eventId: string;
  eventTitle: string;
  initialOutcome: LiveTimingOutcome;
  /** Bron-URL van de live timing — link naar de site voor het volledige beeld. */
  sourceUrl?: string | null;
};

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "de bron";
  }
}

function TimingRows({ rows }: { rows: LiveTimingResult[] }) {
  return (
    <ResponsiveTable
      rows={rows}
      rowKey={(row) => row.profileId ?? `${row.scrapedName}-${row.bib ?? ""}`}
      minWidth={620}
      columns={[
        {
          key: "name",
          header: "ZWB'er",
          primary: true,
          cell: (row) => (
            <span className="flex items-center gap-2">
              {row.profileId ? (
                <Link href={`/leden/${row.profileId}`} className="font-medium hover:underline">
                  {row.scrapedName}
                </Link>
              ) : (
                <span className="font-medium">{row.scrapedName}</span>
              )}
              {row.bib && <span className="text-xs text-muted-foreground">nr. {row.bib}</span>}
            </span>
          ),
        },
        {
          key: "checkpoint",
          header: "Laatste punt",
          secondary: true,
          cell: (row) => (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              {row.finished ? (
                <CheckCircle2 className="size-3.5 text-emerald-600" />
              ) : (
                <Radio className="size-3.5 text-destructive" />
              )}
              {row.checkpoint ?? "Onderweg"}
            </span>
          ),
        },
        {
          key: "position",
          header: "#",
          cell: (row) => row.position ?? "—",
          cellClassName: "tabular-nums text-muted-foreground",
        },
        {
          key: "time",
          header: "Tijd",
          align: "right",
          cell: (row) => row.timeText ?? "—",
        },
        {
          key: "avg",
          header: "Gem.",
          align: "right",
          cell: (row) =>
            row.averageKmh != null
              ? `${row.averageKmh.toLocaleString("nl-NL", { maximumFractionDigits: 1 })} km/u`
              : "—",
        },
        {
          key: "category",
          header: "Cat.",
          align: "right",
          cell: (row) =>
            row.category
              ? `${row.category}${row.categoryRank != null ? ` · ${row.categoryRank}e` : ""}`
              : "—",
          cellClassName: "text-muted-foreground",
        },
      ]}
    />
  );
}

export function LiveTimingPanel({
  eventId,
  eventTitle,
  initialOutcome,
  sourceUrl,
}: LiveTimingPanelProps) {
  const [outcome, setOutcome] = useState(initialOutcome);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/live/timing/${eventId}`, {
          cache: "no-store",
        });
        const next = (await response.json()) as LiveTimingOutcome;
        setOutcome(next);
        if (response.ok) setUpdatedAt(new Date().toISOString());
      } catch {
        setOutcome((current) => ({
          ...current,
          error: "Live timing kon niet worden ververst.",
        }));
      }
    });
  }, [eventId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              Live timing
            </span>
            <h2 className="font-semibold">{eventTitle}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Alleen gematchte ZWB&apos;ers ·{" "}
            {updatedAt
              ? `bijgewerkt om ${new Date(updatedAt).toLocaleTimeString("nl-NL", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "zojuist bijgewerkt"}
          </p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Volledige live timing op {hostLabel(sourceUrl)}
              <ArrowUpRight className="size-3" />
            </a>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={pending}
        >
          <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
          Vernieuwen
        </Button>
      </header>

      {!outcome.ok ? (
        <p className="p-4 text-sm text-destructive">
          {outcome.error ?? "Live timing ophalen is mislukt."}
        </p>
      ) : outcome.results.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">
          Nog geen ZWB&apos;ers gevonden in de live timing.
        </p>
      ) : (
        <div className="p-4">
          <TimingRows rows={outcome.results} />
        </div>
      )}
    </section>
  );
}
