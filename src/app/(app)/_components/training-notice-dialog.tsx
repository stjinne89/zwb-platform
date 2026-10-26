"use client";

// "Nieuw in ZWBeter trainen": één keer, voor wie ZWBeter voor de training
// gebruikt (tekst goedgekeurd door de eigenaar, 2026-10-26). Gezien onthoudt de
// browser; wie op een tweede apparaat kijkt, ziet hem daar nog één keer. Na
// NOTICE_UNTIL verschijnt hij niet meer, ook niet voor nieuwe leden.
//
// Opent pas na een tel en alleen als er geen andere dialoog openstaat (het
// weekoverzicht en de durability-melding openen zichzelf). Dan komt hij bij een
// volgende pagina terug.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usesZwbeterTraining } from "./training-notice-actions";

const SEEN_KEY = "zwb-nieuw-zwbeter-trainen-2026-10";
const NOTICE_UNTIL = Date.parse("2026-12-01T00:00:00+01:00");
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
    title: "Je schema volgt wat je aankunt.",
    text: "Je beschikbare uren zijn een grens, geen doel. De belasting komt uit je fitheid (CTL), met meer intensiteit en kortere, stevigere ritten binnen. Een race vervangt je andere sleuteltrainingen niet meer.",
  },
  {
    title: "Een nieuwe AI-coach.",
    text: "Schema's, dagaanpassingen, de coachchat en het weekoverzicht draaien nu op Claude van Anthropic. In onze test hield die zich beter aan de trainingsregels. Je gegevens worden niet gebruikt om AI-modellen te trainen.",
  },
  {
    title: "Zelf je schema maken.",
    text: "Coach je jezelf, dan maak je je schema nu met één knop bij je doel (ZWBeter Worden → Doelen).",
  },
];

export function TrainingNoticeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (Date.now() >= NOTICE_UNTIL || seen()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (document.querySelector('[data-slot="dialog-content"]')) return;
      const show = await usesZwbeterTraining().catch(() => false);
      if (cancelled) return;
      if (!show) {
        // Geen ZWBeter-training: dan ook later niet meer vragen op dit apparaat.
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuw in ZWBeter trainen</DialogTitle>
          <DialogDescription className="sr-only">Wat er veranderd is in je trainingsschema en de AI-coach.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          {ITEMS.map((item) => (
            <li key={item.title}>
              <span className="font-semibold">{item.title}</span> {item.text}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" size="sm" onClick={close}>
            Begrepen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
