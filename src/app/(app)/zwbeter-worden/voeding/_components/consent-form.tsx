"use client";

// Iets aanzetten waarvoor het lid apart toestemming geeft: tekst herkennen
// (naar OpenAI) of de trainer laten meekijken.

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };

export function ConsentForm({
  action,
  text,
  children,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  /** Waarvoor het lid toestemming geeft. */
  text: string;
  /** De inhoud van de knop. */
  children: ReactNode;
}) {
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
          {text}{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacyverklaring
          </Link>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
          {pending ? "Bezig…" : children}
        </Button>
        {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
      </div>
    </form>
  );
}
