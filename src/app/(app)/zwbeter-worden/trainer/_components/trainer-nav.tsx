"use client";

// Rennerkiezer plus tabbalk. Staat in de layout, die niet opnieuw rendert bij
// navigatie — daarom leest dit component de gekozen renner zelf uit de query.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRAINER_SECTIONS } from "../../../_components/nav-config";
import { SectionNav } from "../../_components/section-nav";
import type { TrainerRider } from "../_data";

/** De enige tab met een telbadge; het aantal hangt van de gekozen renner af. */
const REVIEW_HREF = "/zwbeter-worden/trainer/beoordelen";

export function TrainerNav({ riders }: { riders: TrainerRider[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Zelfde terugvalregel als resolveAthleteId op de server: een onbekende renner
  // in de URL valt terug op de eerste.
  const requested = searchParams.get("athlete");
  const selected = riders.find((rider) => rider.id === requested) ?? riders[0];
  if (!selected) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card p-2">
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
          }}
        >
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition hover:bg-accent"
          >
            {selected.name}
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
            />
          </button>

          {open ? (
            <div className="absolute left-0 top-full z-20 mt-1 max-h-96 w-80 overflow-y-auto rounded-lg border bg-card shadow-lg">
              <ul className="divide-y">
                {riders.map((rider) => (
                  <li key={rider.id}>
                    <Link
                      href={`${pathname}?athlete=${rider.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "block p-3 transition hover:bg-muted/50",
                        rider.id === selected.id && "bg-primary/10",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 truncate font-medium">
                          {rider.id === selected.id ? (
                            <Check className="size-3.5 shrink-0 text-primary" />
                          ) : null}
                          {rider.name}
                        </p>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {rider.zrlCategory ?? "-"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        FTP {rider.ftpLabel} - {rider.distanceLabel} - CTL {rider.ctlLabel} - Form{" "}
                        {rider.tsbLabel}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            rider.advicePill,
                          )}
                        >
                          {rider.adviceLabel}
                        </span>
                        {rider.pendingReviews > 0 ? (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                            {rider.pendingReviews} te beoordelen
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground">
          FTP {selected.ftpLabel} -{" "}
          {selected.zrlCategory ? `ZRL ${selected.zrlCategory}` : "Geen ZRL-categorie"} - CTL{" "}
          {selected.ctlLabel} - Form {selected.tsbLabel}
        </p>
        <span
          className={cn("rounded-full px-2 py-0.5 text-xs font-medium", selected.advicePill)}
        >
          {selected.adviceLabel}
        </span>
        <Link
          href={`/leden/${selected.id}`}
          className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Profiel <ExternalLink className="size-3" />
        </Link>
      </div>

      <SectionNav
        exactHref="/zwbeter-worden/trainer"
        items={TRAINER_SECTIONS.map((section) => ({
          href: section.href,
          label: section.label,
          query: `athlete=${selected.id}`,
          badge: section.href === REVIEW_HREF ? selected.pendingReviews : undefined,
        }))}
      />
    </div>
  );
}
