"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PlaceTone } from "@/components/tegels/link-grid";
import { SectionNav, type SectionLink } from "../zwbeter-worden/_components/section-nav";
import { activeHrefIn } from "./nav-config";

export type BeheerNavCategory = { label: string; tone: PlaceTone; items: SectionLink[] };

/** Navigatie van het beheer in het design "tegels", zoals bij ZWBeter: de
 * categorieën als tegels, en daaronder de schermen van de categorie waar je
 * bent. Op een pagina buiten deze categorieën toont het niets. */
export function BeheerNav({ categories }: { categories: BeheerNavCategory[] }) {
  const pathname = usePathname();
  const index = pathname === "/beheer";
  const activeHref = activeHrefIn(
    pathname,
    categories.flatMap((category) => category.items.map((item) => item.href)),
  );
  const active = categories.find((category) =>
    category.items.some((item) => item.href === activeHref),
  );
  if (!index && !active) return null;

  return (
    <div className="space-y-3">
      {index && <h1 className="tg-display">Beheer</h1>}
      <nav
        aria-label="Beheer"
        className="grid grid-cols-2 gap-2 md:grid-cols-4 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1"
      >
        {categories.map((category) => (
          <Link
            key={category.label}
            href={category.items[0].href}
            aria-current={category === active ? "page" : undefined}
            className={`tg-pillar tg-pillar-tone tg-${category.tone}`}
          >
            <span className="tg-tile-small">Beheer</span>
            <span className="tg-tile-title">{category.label}</span>
          </Link>
        ))}
      </nav>
      {/* Geen enkel scherm is de index van de rij: ZRL-beheer heeft zelf
          subpagina's, dus elke tab telt ook op zijn subroutes. */}
      {active && active.items.length > 1 && <SectionNav items={active.items} exactHref="/beheer" />}
    </div>
  );
}
