"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { disconnectStrava } from "../../achievements/_actions";
import { refreshMyStravaProfile } from "../_actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import { cn } from "@/lib/utils";

export function StravaSection({
  connection,
}: {
  connection: { athlete_name: string | null; updated_at: string | null } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Strava
        </h2>
        <HelpLink href="/hulp#badges" />
      </div>

      {connection ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
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
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/achievements"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Naar achievements
            </Link>
            <Link
              href="/api/strava/connect"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Opnieuw koppelen
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const res = await refreshMyStravaProfile();
                  if (!res.ok) setError(res.error);
                  else
                    setMessage(
                      res.avatarUrl
                        ? "Profielfoto bijgewerkt vanuit Strava."
                        : "Strava heeft geen profielfoto voor jou — initials blijven zichtbaar.",
                    );
                });
              }}
            >
              {pending ? "Verversen…" : "Vernieuw foto"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (!confirm("Strava ontkoppelen? Je gesyncte ritten blijven bewaard.")) return;
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const res = await disconnectStrava();
                  if (!res.ok) setError(res.error);
                });
              }}
            >
              {pending ? "Ontkoppelen…" : "Ontkoppel Strava"}
            </Button>
          </div>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
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
