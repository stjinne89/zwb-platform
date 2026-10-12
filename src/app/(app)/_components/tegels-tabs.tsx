"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLACES, placeForPath } from "@/lib/design-places";

/** De vier plekken van het design "tegels": onderin op de telefoon, bovenin op
 * een breed scherm. De actieve tab steekt uit. */
export function TegelsTabs({ position }: { position: "bottom" | "top" }) {
  const active = placeForPath(usePathname());
  return (
    <nav
      aria-label="Hoofdmenu"
      className={
        position === "bottom"
          ? "tg-tabs-bottom md:hidden"
          : "tg-tabs-top hidden flex-1 items-end self-end md:flex"
      }
    >
      {PLACES.map((place) => (
        <Link
          key={place.id}
          href={place.href}
          aria-current={place.id === active ? "page" : undefined}
          className={`tg-tab tg-${place.id}`}
        >
          {place.label}
        </Link>
      ))}
    </nav>
  );
}
