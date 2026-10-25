"use client";

// ZWBriljant: een melding voor wie geen bruikbare kJ-standen in intervals.icu heeft
// (eigenaar, 2026-10-25). Zonder blijft durability leeg en telt die voor 0. De
// uitleg staat op /hulp; hier alleen wat er mis is en de link.
//
// Na "Later" of de link een week stil. Hij opent pas na een tel en alleen als er
// geen andere dialoog openstaat (het weekoverzicht opent zichzelf).

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
import { FACET_WEIGHTS } from "@/lib/briljant/norms";
import type { FatigueSetupIssue } from "@/lib/briljant/fatigue-setup";

const SNOOZE_KEY = "zwb-durability-melding";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const OPEN_DELAY_MS = 1200;

function snoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {}
}

export function DurabilitySetupDialog({ issue }: { issue: FatigueSetupIssue }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!snoozed() && !document.querySelector('[data-slot="dialog-content"]')) setOpen(true);
    }, OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  function close() {
    snooze();
    setOpen(false);
  }

  const share = `${(FACET_WEIGHTS.durability * 100).toLocaleString("nl-NL")}%`;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Durability ontbreekt in je ZWBriljant</DialogTitle>
          <DialogDescription>
            {issue.kind === "te-laag"
              ? `Je kJ-stand van ${issue.afterKj.toLocaleString("nl-NL")} kJ in intervals.icu is te laag voor je gewicht.`
              : "We krijgen uit intervals.icu geen vermoeide curve."}{" "}
            Zet de kJ-standen op 1000 en 2000 kJ. Zonder telt durability voor 0 en mis je {share} van je score.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={close}>
            Later
          </Button>
          <Link href="/hulp/training#zwbriljant" onClick={close} className={buttonVariants({ size: "sm" })}>
            Zo stel je het in
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
