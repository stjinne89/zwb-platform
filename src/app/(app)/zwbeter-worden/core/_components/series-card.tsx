// Kaart per serie op het overzicht. Server component: er zit geen interactie in
// behalve de link zelf.

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MobilitySeries } from "@/lib/training/mobility";
import { formatWellnessDate } from "../../_components/format";

const TIMING_LABELS: Record<MobilitySeries["timing"], string> = {
  pre_ride: "Voor de rit",
  post_ride: "Na de rit",
  rustdag: "Rustdag",
};

export function SeriesCard({
  series,
  lastDone,
  suggested,
}: {
  series: MobilitySeries;
  lastDone: string | null;
  suggested?: boolean;
}) {
  return (
    <Link
      href={`/zwbeter-worden/core/${series.slug}`}
      className={`flex min-h-[44px] items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:border-primary ${
        suggested ? "border-primary" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{series.title}</h3>
          {suggested && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Vandaag
            </span>
          )}
        </div>
        {series.subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{series.subtitle}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {series.duration_minutes} min · {TIMING_LABELS[series.timing]}
          {lastDone ? ` · laatst ${formatWellnessDate(lastDone)}` : ""}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
