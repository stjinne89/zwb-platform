import Link from "next/link";
import type { ReactNode } from "react";
import { SCROLL_TAB_ITEM } from "@/components/ui/scroll-tab-item";
import { cn } from "@/lib/utils";

// De bediening bovenaan Club en Ik: per week/maand/jaar, het bereik, en een rij
// losse chips (disciplines of periodes). Links, geen knoppen: de keuze staat in
// de URL, zodat terug en delen gewoon werken.

export function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap rounded-md border bg-card p-0.5">
      {children}
    </div>
  );
}

export function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      data-active={active ? "true" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        SCROLL_TAB_ITEM,
        "whitespace-nowrap px-2.5",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

export function PillChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      data-active={active ? "true" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        SCROLL_TAB_ITEM,
        "whitespace-nowrap rounded-full border",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
