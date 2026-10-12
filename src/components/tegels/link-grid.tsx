import Link from "next/link";

// Een plek als tegelveld: elke tegel is één onderdeel. Tegels kunnen een eigen
// tenuekleur en formaat krijgen, zodat het veld geen egaal rooster is.

export type PlaceTone = "vandaag" | "kalender" | "zwbeter" | "club" | "meer";

export type PlaceLink = {
  href: string;
  label: string;
  external?: boolean;
  /** Tenuekleur van deze tegel; standaard die van de plek. */
  tone?: PlaceTone;
  /** "wide" is twee kolommen breed, "big" ook twee rijen hoog. */
  size?: "wide" | "big";
};

const SIZE_CLASS = {
  wide: "col-span-2",
  big: "col-span-2 row-span-2",
} as const;

export function TegelsLinkGrid({
  place,
  links,
  label,
}: {
  place: PlaceTone;
  links: PlaceLink[];
  label?: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className="space-y-2">
      {label && <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>}
      <ul className="grid auto-rows-[6.5rem] grid-flow-dense grid-cols-2 gap-2 md:grid-cols-4">
        {links.map((link) => (
          <li key={link.href} className={link.size ? SIZE_CLASS[link.size] : undefined}>
            <Link
              href={link.href}
              className={`tg-tile tg-${link.tone ?? place} h-full !min-h-0 justify-end`}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span
                className={
                  link.size === "big"
                    ? "text-[2.5rem] font-light leading-none tracking-tight"
                    : "tg-tile-title"
                }
              >
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
