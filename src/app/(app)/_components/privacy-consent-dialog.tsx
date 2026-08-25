"use client";

// Twee gevallen, één dialoog. Er zijn leden die nooit iets is voorgelegd (zes
// van vóór het vinkje bestond, twee die via een magic link binnenkwamen), en
// leden die tekenden op een verklaring die daarna inhoudelijk is gewijzigd. Dat
// tweede geval is de grootste groep: de meesten staan nog op de allereerste
// versie, en die zegt niets over gezondheidsgegevens.
//
// De vraag komt elke sessie terug tot het akkoord er staat, maar blokkeert de
// app niet — toestemming moet vrij gegeven zijn, en een harde muur maakt dat
// betwistbaar.

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatPrivacyVersion } from "@/lib/privacy";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acceptPrivacyStatement } from "../_actions/privacy";

/** Uitstellen geldt voor deze browsersessie; volgende keer vraagt hij opnieuw. */
const SNOOZE_KEY = "zwb-privacy-snoozed";

const noopSubscribe = () => () => {};

export function PrivacyConsentDialog({ updated = false }: { updated?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // sessionStorage bestaat niet op de server; de server-snapshot zegt daarom
  // "uitgesteld", zodat de dialoog niet even opflitst voor de hydration.
  const snoozed = useSyncExternalStore(
    noopSubscribe,
    () => sessionStorage.getItem(SNOOZE_KEY) === "1",
    () => true,
  );
  const open = !snoozed && !dismissed;

  function onAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptPrivacyStatement();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDismissed(true);
      router.refresh();
    });
  }

  function onLater() {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setDismissed(true);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setDismissed(false) : onLater())}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <DialogTitle>
            {updated ? "De privacyverklaring is gewijzigd" : "Je akkoord ontbreekt nog"}
          </DialogTitle>
          <DialogDescription>
            Ik ga akkoord met de{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              privacyverklaring van {formatPrivacyVersion()}
            </Link>{" "}
            en met de verwerking van mijn gegevens. Je profiel is zichtbaar voor andere
            leden.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onLater}>
            Later
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={onAccept}>
            {pending ? "Bezig…" : "Akkoord"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
