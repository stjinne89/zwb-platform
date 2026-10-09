import Link from "next/link";
import { Heart } from "lucide-react";
import { eventColorStyle, eventLabel } from "@/lib/event-types";
import type { EventProgram } from "@/lib/events/programs";

/** Het gekleurde label van een event: categorie, met het type erachter. */
export function EventBadge({ type, kind }: { type: string; kind?: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide"
      style={eventColorStyle(type, kind).badge}
    >
      {kind === "goed_doel" && <Heart className="size-3 fill-current" aria-hidden />}
      {eventLabel(type, kind)}
    </span>
  );
}

/** De programma's van een event, elk als link naar zijn pagina. */
export function ProgramBadges({ programs }: { programs: EventProgram[] }) {
  return programs.map((program) => (
    <Link
      key={program.id}
      href={`/programmas/${program.slug}`}
      className="rounded-full border border-foreground/30 px-2 py-0.5 text-xs font-medium hover:bg-secondary"
    >
      {program.name}
    </Link>
  ));
}
