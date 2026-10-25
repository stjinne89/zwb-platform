"use client";

// De zweettest op de protocolpagina: invullen, en de eigen uitkomsten met een
// knop om te wissen (sweat.ts, 0273). Het gewicht gaat alleen naar de
// serveractie, die er het zweetverlies per uur van maakt; bewaard wordt het niet.

import Link from "next/link";
import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SweatTest } from "@/lib/nutrition/sweat";
import { deleteSweatTest, saveSweatTest } from "../../voeding/_actions";
import { LogActionButton } from "../../voeding/_components/log-controls";

const inputClass = "min-h-[44px] w-full rounded-md border bg-background px-3";

const day = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function liters(ml: number) {
  return (ml / 1000).toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export function SweatTestPanel({ tests, today }: { tests: SweatTest[]; today: string }) {
  const [state, submit, pending] = useActionState(
    async (_previous: Awaited<ReturnType<typeof saveSweatTest>> | null, formData: FormData) => saveSweatTest(formData),
    null,
  );

  return (
    <section className="max-w-2xl space-y-4">
      <form action={submit} className="space-y-4 rounded-lg border bg-card p-5">
        <h3 className="font-semibold">Zweettest invullen</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Datum</span>
            <input type="date" name="tested_on" defaultValue={today} max={today} required className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Duur (minuten)</span>
            <input type="number" name="duration_minutes" min={45} max={600} required inputMode="numeric" className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Gewicht voor (kg)</span>
            <input type="text" name="weight_before" required inputMode="decimal" className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Gewicht na (kg)</span>
            <input type="text" name="weight_after" required inputMode="decimal" className={inputClass} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Gedronken (ml)</span>
            <input type="number" name="drank_ml" min={0} max={5000} required inputMode="numeric" className={inputClass} />
          </label>
          <fieldset className="space-y-1 text-sm">
            <legend className="font-medium">Waar</legend>
            <div className="flex min-h-[44px] items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="binnen" defaultChecked /> Binnen
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="setting" value="buiten" /> Buiten
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="warm" value="ja" /> Warm
              </label>
            </div>
          </fieldset>
        </div>
        {tests.length === 0 ? (
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" value="ja" required className="mt-1 size-4 shrink-0" />
            <span>
              ZWB bewaart van elke test de datum, de duur, binnen of buiten, of het warm was en mijn zweetverlies
              per uur. Mijn gewicht bewaart ZWB niet. Alleen ik zie het, en ik kan elke test wissen.{" "}
              <Link href="/privacy#zweettest" className="text-primary hover:underline">
                Privacyverklaring
              </Link>
            </span>
          </label>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="min-h-[44px]" disabled={pending}>
            {pending ? "Bezig…" : "Opslaan"}
          </Button>
          {state && !state.ok ? <span className="text-sm text-destructive">{state.error}</span> : null}
        </div>
      </form>

      {tests.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Jouw zweettests</h3>
          <ul className="divide-y rounded-lg border bg-card px-4 text-sm">
            {tests.map((test) => (
              <li key={test.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {day.format(new Date(`${test.testedOn}T12:00:00Z`))} · {test.setting}
                  {test.warm ? ", warm" : ""} · {test.durationMinutes} min
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums font-medium">{liters(test.mlPerHour)} l per uur</span>
                  <LogActionButton
                    action={deleteSweatTest}
                    fields={{ id: test.id }}
                    variant="ghost"
                    size="sm"
                    ariaLabel="Test wissen"
                    confirm="Deze test wissen?"
                  >
                    <Trash2 className="size-4" />
                  </LogActionButton>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
