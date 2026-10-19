"use client";

import Link from "next/link";

export type CarouselSponsor = {
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
};

// Continu scrollende logo-strip. De lijst wordt verdubbeld zodat de
// CSS-animatie (translateX -50%) naadloos doorloopt. Pauzeert bij hover.
export function SponsorCarousel({ sponsors }: { sponsors: CarouselSponsor[] }) {
  if (sponsors.length === 0) return null;

  // Bij weinig logo's vaker herhalen zodat de strip altijd gevuld is.
  const repeats = sponsors.length < 6 ? 3 : 2;
  const loop = Array.from({ length: repeats }, () => sponsors).flat();
  // Snelheid schaalt met het aantal logo's (±4s per logo).
  const durationSec = Math.max(18, sponsors.length * repeats * 4);

  return (
    <section aria-label="Onze sponsors" className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        Met dank aan onze sponsors
      </p>
      <div className="group relative overflow-hidden rounded-lg border bg-card py-3">
        {/* fade-randen */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-card to-transparent" />

        <style>{`@keyframes zwb-sponsor-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
        <ul
          className="flex w-max items-center gap-10 px-5 [animation:zwb-sponsor-marquee_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:[animation:none]"
          style={{ animationDuration: `${durationSec}s` }}
        >
          {loop.map((sponsor, i) => {
            const logo = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sponsor.logoUrl}
                alt={sponsor.name}
                title={sponsor.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-10 w-auto max-w-[140px] object-contain opacity-70 transition group-hover:opacity-100"
              />
            );
            return (
              <li key={`${sponsor.name}-${i}`} className="shrink-0">
                {sponsor.websiteUrl ? (
                  <a
                    href={sponsor.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={sponsor.name}
                  >
                    {logo}
                  </a>
                ) : (
                  logo
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-right text-xs">
        <Link href="/sponsors" className="text-muted-foreground hover:text-foreground">
          Alle sponsors &amp; ledenvoordeel →
        </Link>
      </p>
    </section>
  );
}
