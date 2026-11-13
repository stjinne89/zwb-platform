"use client";

// "Durability in ZWBriljant is veranderd": één keer, voor wie een steen heeft
// (tekst goedgekeurd door de eigenaar, 2026-11-13). Gezien onthoudt de browser;
// wie op een tweede apparaat kijkt, ziet hem daar nog één keer. Na NOTICE_UNTIL
// verschijnt hij niet meer, ook niet voor nieuwe leden.
//
// Opent pas na een tel en alleen als er geen andere dialoog openstaat. Dan komt
// hij bij een volgende pagina terug.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { hasBriljantStone } from "./durability-notice-actions";
import { ClubText } from "@/components/club-texts-provider";

const SEEN_KEY = "zwb-nieuw-durability-2026-11";
const NOTICE_UNTIL = Date.parse("2026-12-16T00:00:00+01:00");
const OPEN_DELAY_MS = 2000;

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Geen opslag (privévenster): liever geen melding dan elke pagina opnieuw.
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

const ITEMS = [
  {
    title: "Wat telt nu.",
    text: "Je vermogen ná lang werk, niet hoeveel je zakt. Een betere verse waarde kost je dus geen durability meer.",
  },
  {
    title: "Uit je ritten telt het voor de helft.",
    text: "Je beste 5 en 20 minuten na 1000 kJ, in W/kg. Na een lange rit ga je lang niet altijd nog voluit.",
  },
  {
    title: "Met de durability-test telt het helemaal.",
    text: "15 minuten inrijden, op 80% FTP door tot 1000 kJ, 5 minuten rustig, dan 20 minuten zo hard als je kunt (niet in ERG). Rij hem uitgerust. De uitslag geldt 90 dagen.",
  },
  {
    title: "Zo tellen we hem.",
    text: "Start het protocol vóór je rijdt en vink de test af op de dag zelf of de dag erna, ook als je een schema hebt. Van die dag halen we in intervals.icu je beste 20 minuten na 1000 kJ op. Gelukt? Dan staat bij durability “durability-test van” met de datum.",
  },
];

/** `testHref`: het protocol Durability-test, of null als de club die pagina niet heeft. */
export function DurabilityNoticeDialog({ testHref }: { testHref: string | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Date.now() >= NOTICE_UNTIL || seen()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (document.querySelector('[data-slot="dialog-content"]')) return;
      const show = await hasBriljantStone().catch(() => false);
      if (cancelled) return;
      if (!show) {
        // Geen steen: dan ook later niet meer vragen op dit apparaat.
        markSeen();
        return;
      }
      if (!document.querySelector('[data-slot="dialog-content"]')) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  function close() {
    markSeen();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <ClubText text="Durability in {m:rennersniveau} is veranderd" />
          </DialogTitle>
          <DialogDescription className="sr-only">Hoe durability nu telt en hoe je de durability-test doet.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          {ITEMS.map((item) => (
            <li key={item.title}>
              <span className="font-semibold">{item.title}</span> <ClubText text={item.text} />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant={testHref ? "outline" : "default"} size="sm" onClick={close}>
            Begrepen
          </Button>
          {testHref ? (
            <Link href={testHref} onClick={close} className={buttonVariants({ size: "sm" })}>
              Naar de test
            </Link>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
