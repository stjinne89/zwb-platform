"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HelpLink } from "@/components/app-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveZwiftId, skipZwiftId } from "../_actions/zwift-id";

/** Uitstellen geldt voor deze browsersessie; volgende keer vraagt hij opnieuw. */
const SNOOZE_KEY = "zwb-zwift-id-snoozed";

const noopSubscribe = () => () => {};

export function ZwiftIdDialog() {
  const [dismissed, setDismissed] = useState(false);
  const [value, setValue] = useState("");
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
  const setOpen = (next: boolean) => setDismissed(!next);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveZwiftId(value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onSkip() {
    setError(null);
    startTransition(async () => {
      const res = await skipZwiftId();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function onLater() {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setDismissed(true);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : onLater())}>
      <DialogContent className="max-w-md" showClose={false}>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>Je Zwift-ID ontbreekt</DialogTitle>
            <HelpLink href="/hulp#zwift-id" />
          </div>
          <DialogDescription>
            Zonder Zwift-ID missen we je in de ZwiftPower- en ZwiftRacing-standen.
          </DialogDescription>
        </DialogHeader>

        <input
          autoFocus
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() && !pending) onSave();
          }}
          placeholder="bv. 1234567"
          aria-label="Zwift-ID"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onSkip}>
            Ik zwift niet
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onLater}>
            Later
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || !value.trim()}
            onClick={onSave}
          >
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
