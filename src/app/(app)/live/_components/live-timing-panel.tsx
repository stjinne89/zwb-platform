"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { CheckCircle2, RefreshCw, Radio } from "lucide-react";
import type {
  LiveTimingOutcome,
  LiveTimingResult,
} from "@/lib/event-results/scrape";
import { Button } from "@/components/ui/button";

type LiveTimingPanelProps = {
  eventId: string;
  eventTitle: string;
  initialOutcome: LiveTimingOutcome;
};

function TimingRows({ rows }: { rows: LiveTimingResult[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">ZWB&apos;er</th>
            <th className="py-2 pr-3 font-medium">Laatste punt</th>
            <th className="py-2 pr-3 font-medium">Tijd</th>
            <th className="py-2 pr-3 font-medium">Gem.</th>
            <th className="py-2 font-medium">Cat.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.profileId ?? `${row.scrapedName}-${row.bib ?? ""}`}
              className="border-b last:border-0"
            >
              <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                {row.position ?? "—"}
              </td>
              <td className="py-2 pr-3">
                <div className="flex min-w-44 items-center gap-2">
                  {row.profileId ? (
                    <Link
                      href={`/leden/${row.profileId}`}
                      className="font-medium hover:underline"
                    >
                      {row.scrapedName}
                    </Link>
                  ) : (
                    <span className="font-medium">{row.scrapedName}</span>
                  )}
                  {row.bib && (
                    <span className="text-xs text-muted-foreground">
                      nr. {row.bib}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 pr-3">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  {row.finished ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                  ) : (
                    <Radio className="size-3.5 text-destructive" />
                  )}
                  {row.checkpoint ?? "Onderweg"}
                </span>
              </td>
              <td className="py-2 pr-3 tabular-nums">
                {row.timeText ?? "—"}
              </td>
              <td className="py-2 pr-3 tabular-nums">
                {row.averageKmh != null
                  ? `${row.averageKmh.toLocaleString("nl-NL", {
                      maximumFractionDigits: 1,
                    })} km/u`
                  : "—"}
              </td>
              <td className="py-2 text-xs text-muted-foreground">
                {row.category
                  ? `${row.category}${row.categoryRank != null ? ` · ${row.categoryRank}e` : ""}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveTimingPanel({
  eventId,
  eventTitle,
  initialOutcome,
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
