"use client";

// Foto en tekst herkennen aanzetten, met een eigen toestemming: de foto of
// omschrijving gaat naar OpenAI.

import Link from "next/link";
import { useActionState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };

export function RecognitionConsentForm({ action }: { action: (formData: FormData) => Promise<ActionResult> }) {
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  return (
    <form action={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <input type="hidden" name="on" value="1" />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 size-4 shrink-0" />
        <span>
          Mijn foto of omschrijving van een maaltijd gaat naar OpenAI, dat herkent wat erop staat en de
          hoeveelheden schat. ZWB bewaart de foto niet. Ik controleer elke hoeveelheid voor het bewaren.{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacyverklaring
          </Link>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
          <Camera className="size-4" />
          {pending ? "Bezig…" : "Foto en tekst aanzetten"}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
