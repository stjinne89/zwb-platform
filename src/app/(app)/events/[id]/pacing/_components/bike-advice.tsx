"use client";

// Snelste fiets voor dit plan, met een knop om hem in de opzet te zetten.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { REFERENCE_FRAME, type BikeAdvice } from "@/lib/pacing/bike-advice";
import type { RideSetup } from "@/lib/pacing/zwift-setup";
import { BikeAdviceList, type BikeAdviceRow } from "../../_components/bike-advice-list";
import { savePacingSetup } from "../_actions";

const same = (a: BikeAdviceRow, b: BikeAdviceRow) =>
  a.frame === b.frame && (a.wheels ?? null) === (b.wheels ?? null) && a.stage === b.stage;

export function PacingBikeAdvice({
  eventId,
  setup,
  advice,
  garage,
}: {
  eventId: string;
  setup: RideSetup;
  advice: BikeAdvice;
  /**
   * "alle": alle fietsen, die uit de garage op hun eigen stage en de rest op
   * stage 0; "alleen": alleen de garage; null: geen garage ingevuld.
   */
  garage: "alle" | "alleen" | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current: BikeAdviceRow = { ...advice.current, label: "Nu" };
  const rows: BikeAdviceRow[] = advice.best.some((row) => same(row, current))
    ? advice.best.map((row) => (same(row, current) ? current : row))
    : [...advice.best, current];

  function choose(row: BikeAdviceRow) {
    setError(null);
    start(async () => {
      const result = await savePacingSetup(eventId, {
        ...setup,
        frame: row.frame === REFERENCE_FRAME ? null : row.frame,
        wheels: row.wheels,
        stage: row.stage,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium">
          Snelste fiets{" "}
          <span className="font-normal text-muted-foreground">
            · {garage === "alleen" ? "uit je garage" : garage === "alle" ? "met je garage" : `stage ${advice.stage ?? 0}`}
          </span>
        </p>
        <p className="text-sm">
          {garage === "alle" && (
            <Link href={`/events/${eventId}/pacing?fietsen=garage`} scroll={false} className="underline underline-offset-2">
              Alleen mijn garage
            </Link>
          )}
          {garage === "alleen" && (
            <Link href={`/events/${eventId}/pacing`} scroll={false} className="underline underline-offset-2">
              Alle fietsen
            </Link>
          )}
          {garage === null && (
            <Link href="/mijn-garage/zwift" className="underline underline-offset-2">
              Garage invullen
            </Link>
          )}
        </p>
      </div>
      <BikeAdviceList
        rows={rows}
        baseSeconds={advice.current.seconds}
        showStage={advice.stage === null}
        action={(row) =>
          row.label ? (
            <span className="w-16" />
          ) : (
            <Button type="button" size="sm" variant="outline" className="w-16" disabled={pending} onClick={() => choose(row)}>
              Kies
            </Button>
          )
        }
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
