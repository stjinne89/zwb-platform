import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Naam van een lid, klikbaar naar /leden/[id]. Zonder id (gast, rosterregel
 * zonder account, renner van een andere club) blijft het platte tekst.
 *
 * Niet gebruiken binnen een kaart of rij die zelf al een link is: een <a> in
 * een <a> is ongeldige HTML.
 */
export function MemberLink({
  id,
  className,
  children,
}: {
  id: string | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (!id) return <span className={className}>{children}</span>;
  return (
    <Link href={`/leden/${id}`} className={cn("hover:underline", className)}>
      {children}
    </Link>
  );
}
