import Link from "next/link";
import { PageHeader } from "@/components/app-ui";
import { ScrollTabs } from "@/components/ui/scroll-tabs";
import { SCROLL_TAB_ITEM } from "@/components/ui/scroll-tab-item";
import { getDesign } from "@/lib/design";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/stats", label: "Club", word: "club", place: "tg-club" },
  { href: "/stats/ik", label: "Ik", word: "ik", place: "tg-zwbeter" },
  { href: "/stats/achievements", label: "Achievements", word: "achievements", place: "tg-meer" },
] as const;

type StatsTab = (typeof TABS)[number]["href"];

/**
 * Kop en navigatie van Stats: de club, je eigen cijfers en de achievements;
 * één item "Stats" in het menu. In het design "tegels" pijlers zoals bij
 * ZWBeter, in de kleur van hun soort: Club in sage (de club), Ik in teal (je
 * eigen cijfers), Achievements in donker petrol (spel); waar je bent het paneel
 * met de gouden lijn. Die pijlers zeggen al waar je bent, dus daar is de titel
 * alleen voor schermlezers (eigenaar, 2026-10-16). Klassiek houdt de
 * paginakop: daar staan alleen de kleine tabs.
 *
 * Zonder `title` geen kop: een pagina met eigen knoppen in de kop
 * (Achievements) zet zelf een PageHeader met `tg-repeats-nav`.
 */
export async function StatsTabs({ active, title }: { active: StatsTab; title?: string }) {
  if ((await getDesign()) === "tegels") {
    return (
      <>
        {title && <h1 className="sr-only">{title}</h1>}
        <nav aria-label="Statistieken" className="grid grid-cols-3 gap-2 md:max-w-2xl">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active === tab.href ? "page" : undefined}
              className={cn("tg-pillar", tab.place)}
            >
              <span className="tg-tile-small">Stats</span>
              <span className="tg-tile-title truncate">{tab.word}</span>
            </Link>
          ))}
        </nav>
      </>
    );
  }
  return (
    <>
      {title && <PageHeader title={title} />}
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
    </>
  );
}
