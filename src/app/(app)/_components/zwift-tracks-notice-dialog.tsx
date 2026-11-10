"use client";

// "Je Zwift-ritten tellen nog niet mee": voor wie veel virtuele ritten uit
// activities.csv heeft waarvan het routebestand nog in de Strava-export ligt
// (lib/zwblokken/missing-tracks.ts). Tekst goedgekeurd door de eigenaar,
// 2026-11-10.
//
// Geen tabel: na het uploaden heeft het lid de ritten niet meer, en verdwijnt
// de melding vanzelf. Sluiten (ook "Later" en "Uploaden") verbergt hem 30 dagen
// op dit apparaat. De vraag aan de server gaat hooguit één keer per
// browsersessie, en alleen als er geen andere dialoog openstaat.

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useModuleName } from "@/components/club-texts-provider";
import type { MissingZwiftTracks } from "@/lib/zwblokken/missing-tracks";
import { missingZwiftTracks } from "./zwift-tracks-notice-actions";

const SNOOZE_KEY = "zwb-zwift-routes-later";
const CHECKED_KEY = "zwb-zwift-routes-gevraagd";
const SNOOZE_MS = 30 * 86400_000;
const OPEN_DELAY_MS = 2500;

const nl = (n: number) => n.toLocaleString("nl-NL");

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    if (Number.isFinite(until) && until > Date.now()) return true;
    if (sessionStorage.getItem(CHECKED_KEY) === "1") return true;
    sessionStorage.setItem(CHECKED_KEY, "1");
    return false;
  } catch {
    // Geen opslag (privévenster): liever geen melding dan elke pagina opnieuw.
    return true;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {}
}

export function ZwiftTracksNoticeDialog() {
  const [missing, setMissing] = useState<MissingZwiftTracks | null>(null);
  const [open, setOpen] = useState(false);
  const blocksName = useModuleName("blokkenjacht");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (document.querySelector('[data-slot="dialog-content"]') || snoozed()) return;
      const result = await missingZwiftTracks().catch(() => null);
      if (cancelled || !result) return;
      if (document.querySelector('[data-slot="dialog-content"]')) return;
      setMissing(result);
      setOpen(true);
    }, OPEN_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  function close() {
    snooze();
    setOpen(false);
  }

  if (!missing) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Je Zwift-ritten tellen nog niet mee</DialogTitle>
          <DialogDescription className="text-sm">
            {nl(missing.rides)} Zwift-ritten ({nl(missing.km)} km) uit je Strava-export hebben nog geen
            route. Upload de bestanden uit de map activities van die export: dan tellen ze mee voor{" "}
            {blocksName} in Zwift en je coltijden.
          </DialogDescription>
        </DialogHeader>
        <Link
          href="/hulp/koppelen#strava-import"
          onClick={close}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <BookOpen className="size-4" aria-hidden />
          Uitleg
        </Link>
        <DialogFooter>
          <Button type="button" size="sm" variant="outline" onClick={close}>
            Later
          </Button>
          <Link href="/dashboard#strava-sync" onClick={close} className={buttonVariants({ size: "sm" })}>
            Uploaden
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
