"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PLACES, placeForPath, type PlaceId } from "@/lib/design-places";

/** De vier plekken van het design "tegels": onderin op de telefoon, bovenin op
 * een breed scherm. De actieve tab steekt uit. Een plek waarvan de module bij
 * deze club uit staat, valt weg. */
export function TegelsTabs({
  position,
  hiddenPlaces = [],
}: {
  position: "bottom" | "top";
  hiddenPlaces?: PlaceId[];
}) {
  const active = placeForPath(usePathname());
  const places = PLACES.filter((place) => !hiddenPlaces.includes(place.id));
  return (
    <nav
      aria-label="Hoofdmenu"
      className={
        position === "bottom"
          ? "tg-tabs-bottom md:hidden"
          : "tg-tabs-top hidden flex-1 items-end self-end md:flex"
      }
    >
      {places.map((place) => (
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
