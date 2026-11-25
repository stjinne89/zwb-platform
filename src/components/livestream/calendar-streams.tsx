import Link from "next/link";
import { Radio } from "lucide-react";

// De streams van een race op de kalender (2026-11-20): één knop in het blok
// van de rij (sinds 2026-11-24, eerst eronder). Ook op de pagina van een
// raceweek.
// Eén stream: meteen naar de speler op de racepagina, met die stream gekozen.
// Meer streams die avond (van deze race of van andere, zoals vier Club
// Ladder-races): naar het streamcenter van de avond, waar ze allemaal tegelijk
// spelen (2026-11-24 per raceweek, sinds 2026-11-25 per dag; daarvoor klapte de
// knop een lijstje open).

export type CalendarStream = {
  id: string;
  /** /events/[id]?stream=…#stream */
  href: string;
  /** Wie, en bij een raceweek de teamrace: "ZRL A · Stijn". */
  label: string;
  live: boolean;
};

const CHIP = "inline-flex min-h-9 items-center gap-1.5 border bg-card px-3 text-xs font-medium hover:bg-muted";

function LiveDot() {
  return <span className="size-2 rounded-full bg-red-600" aria-hidden />;
}

export function CalendarStreams({
  streams,
  state,
  centerHref,
}: {
  streams: CalendarStream[];
  state: "live" | "gepland" | "afgelopen";
  /** /streams/[datum], bij 2 of meer streams die dag; anders null. */
  centerHref: string | null;
}) {
  if (streams.length === 0) return null;
  const label = state === "live" ? "Live" : state === "afgelopen" ? "Terugkijken" : "Stream";
  const icon = state === "live" ? <LiveDot /> : <Radio className="size-3.5" aria-hidden />;
  return (
    <Link href={centerHref ?? streams[0].href} className={CHIP}>
      {icon}
      {streams.length === 1 ? label : `${label} · ${streams.length}`}
    </Link>
  );
}
