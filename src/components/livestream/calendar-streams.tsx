"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

// De streams van een race op de kalender (2026-11-20): één knop in het blok
// van de rij (sinds 2026-11-24, eerst eronder).
// Eén stream: meteen naar de speler op de racepagina, met die stream gekozen.
// Meer streams (bij ZRL van alle teamraces van de raceweek): de knop klapt een
// lijstje open en je kiest welke.

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

export function CalendarStreams({ streams, state }: { streams: CalendarStream[]; state: "live" | "gepland" | "afgelopen" }) {
  const [open, setOpen] = useState(false);
  if (streams.length === 0) return null;
  const label = state === "live" ? "Live" : state === "afgelopen" ? "Terugkijken" : "Stream";
  const icon = state === "live" ? <LiveDot /> : <Radio className="size-3.5" aria-hidden />;

  if (streams.length === 1) {
    return (
      <Link href={streams[0].href} className={CHIP}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <div className="contents">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={CHIP}>
        {icon}
        {label} · {streams.length}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="flex basis-full flex-wrap gap-2">
          {streams.map((stream) => (
            <li key={stream.id}>
              <Link href={stream.href} className={CHIP}>
                {stream.live && <LiveDot />}
                {stream.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
