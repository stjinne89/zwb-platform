"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { activeHrefIn } from "../../_components/nav-config";
import type { PlaceTone } from "@/components/tegels/link-grid";
import { ScrollTabs, SCROLL_TAB_ITEM } from "@/components/ui/scroll-tabs";
import { cn } from "@/lib/utils";

export type SectionLink = {
  href: string;
  label: string;
  /** Query die meegaat bij het wisselen van tab, bv. "athlete=<id>". */
  query?: string;
  /** Telbadge achter het label, bv. het aantal te beoordelen workouts. */
  badge?: number;
};

export function SectionNav({
  items,
  /** Tab die alleen bij een exacte match actief is; standaard de eerste (de index). */
  exactHref,
  /** Design "tegels": de kleur van de tabs; standaard die van de plek waar je bent. */
  tone,
}: {
  items: SectionLink[];
  exactHref?: string;
  tone?: PlaceTone;
}) {
  const pathname = usePathname();
  const indexHref = exactHref ?? items[0]?.href;
  // De index telt alleen exact; verder wint de meest specifieke tab.
  const activeHref =
    pathname === indexHref
      ? indexHref
      : activeHrefIn(
          pathname,
          items.map((item) => item.href).filter((href) => href !== indexHref),
        );
  return (
    // tg-subnav en tg-link doen alleen iets in het design "tegels": daar zijn de
    // tabs vlakken in de kleur van de plek (kleur is klikbaar) en is de actieve het paneel met de
    // gouden lijn, net als bij de pijlers erboven.
    <ScrollTabs variant="panel" ariaLabel="Subnavigatie" className="tg-subnav">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.query ? `${item.href}?${item.query}` : item.href}
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              SCROLL_TAB_ITEM,
              "tg-link",
              tone ? `tg-${tone}` : "tg-here",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
            {item.badge ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-semibold tabular-nums",
                  active
                    ? "bg-primary-foreground/20"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </ScrollTabs>
  );
}
