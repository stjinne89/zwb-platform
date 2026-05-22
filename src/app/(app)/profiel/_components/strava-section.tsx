"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { disconnectStrava } from "../../achievements/_actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StravaSection({
  connection,
}: {
  connection: { athlete_name: string | null; updated_at: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Strava-koppeling
      </h2>

      {connection ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-lg" aria-hidden>
              ✅
            </span>
            <div className="min-w-0">
              <p className="text-sm">
                Gekoppeld als{" "}
                <strong>{connection.athlete_name ?? "Strava-atleet"}</strong>
              </p>
              {connection.updated_at && (
                <p className="text-xs text-muted-foreground">
                  Laatst gesynchroniseerd op{" "}
                  {new Date(connection.updated_at).toLocaleDateString("nl-NL", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Je fietsritten worden meegenomen in de wekelijkse achievement-badges
            (kilometervreter, klimmer, kudo-magneet, meest actief). Sync je
            laatste ritten via{" "}
            <Link
              href="/achievements"
              className="font-medium text-primary hover:underline"
            >
              Achievements
            </Link>
            .
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (!confirm("Strava ontkoppelen? Je gesyncte ritten blijven bewaard.")) return;
                setError(null);
                startTransition(async () => {
                  const res = await disconnectStrava();
                  if (!res.ok) setError(res.error);
                });
              }}
            >
              {pending ? "Ontkoppelen…" : "Ontkoppel Strava"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Koppel je Strava zodat je fietsritten meetellen voor de wekelijkse
            ZWB-achievement-badges: kilometervreter, klimmer van de week,
            kudo-magneet en meest actief. We lezen alleen je activiteiten —
            niks meer.
          </p>
          <Link
            href="/api/strava/connect"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            Koppel met Strava
          </Link>
        </div>
      )}
    </section>
  );
}
