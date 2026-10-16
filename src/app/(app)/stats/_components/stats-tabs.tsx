import Link from "next/link";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { SCROLL_TAB_ITEM } from "@/components/ui/scroll-tab-item";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/stats", label: "Club" },
  { href: "/stats/ik", label: "Ik" },
] as const;

/** Club- en eigen statistieken; één item "Stats" in het menu. */
export function StatsTabs({ active }: { active: "/stats" | "/stats/ik" }) {
  return (
    <ScrollTabs ariaLabel="Statistieken" variant="panel">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          data-active={active === tab.href ? "true" : undefined}
          aria-current={active === tab.href ? "page" : undefined}
          className={cn(
            SCROLL_TAB_ITEM,
            active === tab.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </ScrollTabs>
  );
}
