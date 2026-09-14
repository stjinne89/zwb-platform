"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { publishOmniumEdition, unpublishOmniumEdition } from "../_actions";

export type EditionRow = {
  id: string;
  number: number;
  slug: string;
  title: string;
  subtitle: string | null;
  starts_at: string;
  status: string;
  published_at: string | null;
  youtube_url: string | null;
  omnium_edition_events: Array<{
    discipline: string;
    route_name: string | null;
    zwift_event_id: string | null;
  }>;
};

/** Wat er nog ontbreekt voordat een editie de deur uit kan. */
function missingBits(edition: EditionRow): string[] {
  const parts = edition.omnium_edition_events.filter(
    (part) => part.discipline !== "recon",
  );
  const missing: string[] = [];
  if (parts.length < 4) missing.push("onderdelen");
  const withoutRoute = parts.filter((part) => !part.route_name).length;
  if (withoutRoute > 0) missing.push(`${withoutRoute}× route`);
  const withoutZwift = parts.filter((part) => !part.zwift_event_id).length;
  if (withoutZwift > 0) missing.push(`${withoutZwift}× Zwift-ID`);
  if (!edition.youtube_url) missing.push("stream");
  return missing;
}

export function EditionList({ editions }: { editions: EditionRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(edition: EditionRow) {
    setError(null);
    startTransition(async () => {
      const res = edition.published_at
        ? await unpublishOmniumEdition(edition.id)
        : await publishOmniumEdition(edition.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <ul className="divide-y rounded-lg border bg-card">
        {editions.map((edition) => {
          const missing = missingBits(edition);
          return (
            <li
              key={edition.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="tabular-nums text-muted-foreground">
                    {new Date(edition.starts_at).toLocaleString("nl-NL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </span>
                  <Link
                    href={`/beheer/omnium/${edition.id}`}
                    className="font-medium hover:underline"
                  >
                    {edition.title}
                  </Link>
                  {edition.published_at ? (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      gepubliceerd
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      concept
                    </span>
                  )}
                </div>
                {missing.length > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Ontbreekt nog: {missing.join(", ")}.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/beheer/omnium/${edition.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Bewerken
                </Link>
                <Link
                  href={`/beheer/omnium/${edition.id}/uitslagen`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Uitslagen
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant={edition.published_at ? "outline" : "default"}
                  disabled={pending}
                  onClick={() => toggle(edition)}
                >
                  {edition.published_at ? "Offline halen" : "Publiceren"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
