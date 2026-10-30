"use client";

// De app-update van deze week (0293): vanaf donderdag 17:00 één keer, met een
// korte samenvatting en een link naar /updates. Gezien onthoudt de browser per
// update; wie op een tweede apparaat kijkt, ziet hem daar nog één keer. Een week
// na verschijnen opent hij niet meer vanzelf (zie inPopupWindow).
//
// Opent na een paar tellen en alleen als er geen andere dialoog openstaat; de
// melding "Nieuw in ZWBeter trainen" opent eerder en gaat dus voor. Dan komt
// deze bij een volgende pagina terug.

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

const SEEN_KEY = "zwb-app-update-gezien";
const OPEN_DELAY_MS = 3000;

function seen(id: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === id;
  } catch {
    // Geen opslag (privévenster): liever geen melding dan elke pagina opnieuw.
    return true;
  }
}

function markSeen(id: string) {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {}
}

export function AppUpdateDialog({
  id,
  title,
  summary,
  href,
}: {
  id: string;
  title: string;
  summary: string;
  href: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (seen(id)) return;
    const timer = setTimeout(() => {
      if (!document.querySelector('[data-slot="dialog-content"]')) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [id]);

  function close() {
    markSeen(id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuw in de app</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <p className="text-sm">{summary}</p>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={close}>
            Sluiten
          </Button>
          <Link href={href} onClick={close} className={buttonVariants({ size: "sm" })}>
            Lees de updates
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
