"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { pillarForPath, type PillarId } from "@/lib/zwbeter-pillars";
import { SectionNav, type SectionLink } from "./section-nav";

export type PillarNav = {
  id: PillarId;
  word: string;
  /** De onderdelen van deze pijler die dit lid mag zien. */
  sections: SectionLink[];
};

/** Kop en navigatie van ZWBeter in het design "tegels": de titel noemt de
 * pijler, de vier pijlers staan als tegels, en daaronder de onderdelen van de
 * pijler waar je bent. */
export function ZwbeterNav({ pillars, actions }: { pillars: PillarNav[]; actions?: ReactNode }) {
  const activeId = pillarForPath(usePathname());
  const active = pillars.find((pillar) => pillar.id === activeId) ?? pillars[0];
  if (!active) return null;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="tg-display">ZWBeter {active.word}</h1>
        {actions && <div className="pb-1">{actions}</div>}
      </header>

      <nav aria-label="ZWBeter" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {pillars.map((pillar) => (
          <Link
            key={pillar.id}
            href={pillar.sections[0].href}
            aria-current={pillar.id === active.id ? "page" : undefined}
            className="tg-pillar"
          >
            <span className="tg-tile-small">ZWBeter</span>
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
