"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { pillarForPath, type PillarId } from "@/lib/zwbeter-pillars";
import { cn } from "@/lib/utils";
import { SectionNav, type SectionLink } from "./section-nav";
import { ClubText, useClubTexts } from "@/components/club-texts-provider";

export type PillarNav = {
  id: PillarId;
  word: string;
  /** De onderdelen van deze pijler die dit lid mag zien. */
  sections: SectionLink[];
};

/** Brengt het actieve blok in beeld als het (deels) buiten de veegrij valt, met
 * het blok ervoor ernaast. Via de rij zelf: `scrollIntoView` schuift ook de
 * pagina. */
function showActiveTile(rail: HTMLElement, animate: boolean) {
  const tile = rail.querySelector<HTMLElement>('[aria-current="page"]');
  if (!tile || rail.scrollWidth <= rail.clientWidth) return;

  const box = rail.getBoundingClientRect();
  const rect = tile.getBoundingClientRect();
  if (rect.left >= box.left - 1 && rect.right <= box.right + 1) return;

  const anchor = (tile.previousElementSibling as HTMLElement | null) ?? tile;
  const inset = Number.parseFloat(getComputedStyle(rail).paddingLeft) || 0;
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  rail.scrollTo({
    left: rail.scrollLeft + anchor.getBoundingClientRect().left - box.left - inset,
    behavior: animate && !calm ? "smooth" : "auto",
  });
}

/** Kop en navigatie van ZWBeter in het design "tegels": de titel noemt de
 * pijler, de pijlers staan als tegels (op de telefoon een veegrij met twee
 * blokken en een rand van het derde), en daaronder de onderdelen van de pijler
 * waar je bent. */
export function ZwbeterNav({ pillars, actions }: { pillars: PillarNav[]; actions?: ReactNode }) {
  const clubTexts = useClubTexts();
  const activeId = pillarForPath(usePathname());
  const active = pillars.find((pillar) => pillar.id === activeId) ?? pillars[0];
  const railRef = useRef<HTMLElement>(null);
  const hasShown = useRef(false);

  useEffect(() => {
    if (railRef.current) showActiveTile(railRef.current, hasShown.current);
    hasShown.current = true;
  }, [active?.id]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-3">
      <header className="tg-repeats-nav flex flex-wrap items-end justify-end gap-3">
        <h1 className="tg-display"><ClubText text="{beter}" /> {active.word}</h1>
        {actions && <div>{actions}</div>}
      </header>

      <nav
        ref={railRef}
        aria-label={clubTexts.words.beter}
        className={cn(
          // De padding houdt de focusrand binnen de rij; de negatieve marge
          // laat de rij op de telefoon tot de schermrand doorlopen.
          "-mx-4 -my-1 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 py-1",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:mx-0 md:my-0 md:grid md:overflow-visible md:px-0 md:py-0",
          // Zes pijlers voor een trainer, vijf voor de rest: altijd één rij.
          pillars.length > 5 ? "md:grid-cols-6" : "md:grid-cols-5",
        )}
      >
        {pillars.map((pillar) => (
          <Link
            key={pillar.id}
            href={pillar.sections[0].href}
            aria-current={pillar.id === active.id ? "page" : undefined}
            className="tg-pillar w-[calc((100%-1.5rem)/2)] shrink-0 grow snap-start md:w-auto"
          >
            <span className="tg-tile-small"><ClubText text="{beter}" /></span>
            <span className="tg-tile-title">{pillar.word}</span>
          </Link>
        ))}
      </nav>

      {active.sections.length > 1 && (
        <SectionNav items={active.sections} exactHref="/zwbeter-worden" />
      )}
    </div>
  );
}
