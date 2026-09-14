"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app-ui";
import { recomputeStandingsAction } from "../_actions";

export type StandingRow = {
  rider_id: string;
  league: string;
  prologue_points: number | string;
  scratch_points: number | string;
  sprint_points: number | string;
  crit_points: number | string;
  total_points: number | string;
  rank: number;
  rank_shared: boolean;
  is_provisional: boolean;
  omnium_riders: { display_name: string } | null;
};

function num(value: number | string): number {
  return typeof value === "number" ? value : Number(value) || 0;
}

export function StandingsPanel({
  editionId,
  standings,
}: {
  editionId: string;
  standings: StandingRow[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const leagues = [...new Set(standings.map((row) => row.league))];
  const provisional = standings.some((row) => row.is_provisional);

  function recompute() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await recomputeStandingsAction(editionId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Herberekend voor ${res.riders} renners.`);
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Stand{provisional ? " (tussenstand)" : ""}
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={recompute}
        >
          {pending ? "Bezig…" : "Herberekenen"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {standings.length === 0 ? (
        <EmptyState>Nog geen uitslagen ingevoerd.</EmptyState>
      ) : (
        leagues.map((league) => (
          <div key={league} className="space-y-1">
            <h3 className="text-xs font-medium uppercase text-muted-foreground">
              {league}
            </h3>
            <div className="overflow-x-auto rounded-md border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">#</th>
                    <th className="px-2 py-1.5">Renner</th>
                    <th className="px-2 py-1.5 text-right">Prol</th>
                    <th className="px-2 py-1.5 text-right">Scratch</th>
                    <th className="px-2 py-1.5 text-right">Sprint</th>
                    <th className="px-2 py-1.5 text-right">Crit</th>
                    <th className="px-2 py-1.5 text-right">Totaal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {standings
                    .filter((row) => row.league === league)
                    .map((row) => (
                      <tr key={row.rider_id}>
                        <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                          {row.rank}
                          {row.rank_shared && "="}
                        </td>
                        <td className="px-2 py-1.5">
                          {row.omnium_riders?.display_name ?? "Onbekend"}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {num(row.prologue_points)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {num(row.scratch_points)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {num(row.sprint_points)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          {num(row.crit_points)}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                          {num(row.total_points)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
