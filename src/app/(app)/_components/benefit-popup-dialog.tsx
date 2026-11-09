"use client";

// Ledenvoordeel dat dit apparaat nog niet zag (src/lib/benefits/popup.ts). Een
// nieuw lid krijgt bij binnenkomst alles te zien, een bestaand lid alleen wat er
// later bijkomt. Gezien onthoudt de browser, net als bij de app-update.
//
// Opent na een paar tellen en alleen als er geen andere dialoog openstaat; de
// andere meldingen openen eerder en gaan voor. Dan komt deze bij een volgende
// pagina terug.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { POPUP_MAX, parseSeenIds, unseenBenefits, type PopupBenefit } from "@/lib/benefits/popup";

const SEEN_KEY = "zwb-ledenvoordeel-gezien";
const OPEN_DELAY_MS = 4500;

function readSeen(): string[] | null {
  try {
    return parseSeenIds(localStorage.getItem(SEEN_KEY));
  } catch {
    // Geen opslag (privévenster): liever geen melding dan elke pagina opnieuw.
    return null;
  }
}

function markSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {}
}

function CodeRow({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2 rounded-md border-2 border-dashed border-foreground/30 bg-muted/40 py-1 pr-1 pl-2">
      <code className="flex-1 font-mono text-sm font-semibold">{code}</code>
      <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label={`Code ${code} kopiëren`}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Gekopieerd" : "Kopieer"}
      </Button>
    </div>
  );
}

export function BenefitPopupDialog({ benefits }: { benefits: PopupBenefit[] }) {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState<PopupBenefit[]>([]);

  useEffect(() => {
    const seen = readSeen();
    if (!seen) return;
    const fresh = unseenBenefits(benefits, seen);
    if (fresh.length === 0) return;
    const timer = setTimeout(() => {
      if (document.querySelector('[data-slot="dialog-content"]')) return;
      setUnseen(fresh);
      setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [benefits]);

  function close() {
    // Alleen wat er nu is: een voordeel dat verdwijnt, hoeft niet bewaard.
    markSeen(benefits.map((benefit) => benefit.id));
    setOpen(false);
  }

  const shown = unseen.slice(0, POPUP_MAX);
  const more = unseen.length - shown.length;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuw ledenvoordeel</DialogTitle>
          <DialogDescription className="sr-only">Voordelen van de sponsors voor leden.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {shown.map((benefit) => (
            <li key={benefit.id} className="space-y-1.5">
              <div>
                <p className="font-semibold">{benefit.title}</p>
                {benefit.sponsorName ? (
                  <p className="text-xs text-muted-foreground">via {benefit.sponsorName}</p>
                ) : null}
              </div>
              {benefit.discountCode ? <CodeRow code={benefit.discountCode} /> : null}
            </li>
          ))}
        </ul>
        {more > 0 ? (
          <p className="text-sm text-muted-foreground">
            En nog {more} {more === 1 ? "voordeel" : "voordelen"}.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={close}>
            Sluiten
          </Button>
          <Link href="/sponsors" onClick={close} className={buttonVariants({ size: "sm" })}>
            Alle voordelen
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
