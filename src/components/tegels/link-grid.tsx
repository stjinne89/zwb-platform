import Link from "next/link";

// Een plek als tegelveld: elke tegel is één onderdeel. Voor Club en Meer in het
// design "tegels".

export type PlaceLink = { href: string; label: string; external?: boolean };

export function TegelsLinkGrid({
  place,
  links,
  label,
}: {
  place: "club" | "meer" | "kalender";
  links: PlaceLink[];
  label?: string;
}) {
  if (links.length === 0) return null;
  return (
    <section className="space-y-2">
      {label && (
        <h2 className="text-sm font-semibold lowercase text-muted-foreground">{label}</h2>
      )}
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`tg-tile tg-${place} !min-h-24 justify-end`}
              {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              <span className="tg-tile-title">{link.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
