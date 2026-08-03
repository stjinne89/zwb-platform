"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActiveHref } from "../../_components/nav-config";
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
}: {
  items: SectionLink[];
  exactHref?: string;
}) {
  const pathname = usePathname();
  const indexHref = exactHref ?? items[0]?.href;
  return (
    <ScrollTabs variant="panel" ariaLabel="Subnavigatie">
      {items.map((item) => {
        const active =
          item.href === indexHref ? pathname === item.href : isActiveHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.query ? `${item.href}?${item.query}` : item.href}
            data-active={active ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              SCROLL_TAB_ITEM,
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
