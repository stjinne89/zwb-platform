"use client";

import { useEffect, useState } from "react";

export type RotatorSponsor = { name: string; logoUrl: string };

/**
 * Eén sponsorlogo tegelijk in de overlay, elk even lang en even groot, wat voor
 * sponsoring het ook is (eigenaar, 2026-11-18). Alle logo's staan er al, over
 * elkaar; alleen de zichtbare wisselt, zodat er bij het wisselen niets hoeft te
 * laden. Blijft doorlopen als de pagina ververst, want de staat zit hier.
 */
export function SponsorRotator({ sponsors, seconds = 8 }: { sponsors: RotatorSponsor[]; seconds?: number }) {
  const [index, setIndex] = useState(0);
  const count = sponsors.length;

  useEffect(() => {
    if (count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), seconds * 1000);
    return () => clearInterval(id);
  }, [count, seconds]);

  if (count === 0) return null;
  const shown = index % count;
  return (
    <div className="stream-overlay-sponsor" aria-label="Sponsors">
      {sponsors.map((sponsor, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${sponsor.name}-${sponsor.logoUrl}`}
          src={sponsor.logoUrl}
          alt={sponsor.name}
          referrerPolicy="no-referrer"
          data-shown={i === shown ? "" : undefined}
        />
      ))}
    </div>
  );
}
