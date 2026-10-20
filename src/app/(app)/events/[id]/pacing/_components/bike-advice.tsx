"use client";

// Snelste fiets voor dit plan, met een knop om hem in de opzet te zetten.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { REFERENCE_FRAME, type BikeAdvice } from "@/lib/pacing/bike-advice";
import type { RideSetup } from "@/lib/pacing/zwift-setup";
import { BikeAdviceList, type BikeAdviceRow } from "../../_components/bike-advice-list";
import { savePacingSetup } from "../_actions";

const same = (a: BikeAdviceRow, b: BikeAdviceRow) => a.frame === b.frame && (a.wheels ?? null) === (b.wheels ?? null);

export function PacingBikeAdvice({
  eventId,
  setup,
  advice,
}: {
  eventId: string;
  setup: RideSetup;
  advice: BikeAdvice;
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
        stage: advice.stage,
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
      <p className="text-sm font-medium">
        Snelste fiets <span className="font-normal text-muted-foreground">· stage {advice.stage}</span>
      </p>
      <BikeAdviceList
        rows={rows}
        baseSeconds={advice.current.seconds}
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
