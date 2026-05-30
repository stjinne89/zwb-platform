"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adjustTodayPlan } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const FEELINGS: { value: string; label: string }[] = [
  { value: "tired", label: "Moe" },
  { value: "normal", label: "Normaal" },
  { value: "fresh", label: "Fris" },
];

export function AdjustTodayForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feeling, setFeeling] = useState("normal");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    setResult(null);
    formData.set("feeling", feeling);
    startTransition(async () => {
      const res = await adjustTodayPlan(formData);
      if (res.ok) {
        setResult("Voorstel klaargezet — bekijk het bij je schema's hieronder.");
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error ?? "Aanpassing maken faalde.");
      }
    });
  }

  if (!open) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-5 text-primary" />
              Pas je training van vandaag aan
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Te moe, weinig tijd of juist fris? Laat de AI je schema van vandaag
              bijsturen.
            </p>
          </div>
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            Aanpassen
          </Button>
        </div>
        {result && <p className="mt-2 text-sm text-primary">{result}</p>}
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-5 text-primary" />
        Pas je training van vandaag aan
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Beschikbare tijd vandaag (min)
          </span>
          <input
            name="available_minutes"
            type="number"
            min={0}
            max={600}
            placeholder="bv. 60"
            className={FIELD}
          />
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Hoe voel je je?
          </span>
          <div className="flex gap-1.5">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                className={`flex-1 rounded-md border px-2 py-2 text-sm transition ${
                  feeling === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/40"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notitie (optioneel)
        </span>
        <input
          name="note"
          placeholder="bv. benen zwaar van gisteren"
          className={FIELD}
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Bezig…" : "Maak voorstel"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
        >
          Annuleer
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Het voorstel verschijnt als concept bij je schema&apos;s; je trainer (of
        jijzelf) kan het goedkeuren en publiceren.
      </p>
    </form>
  );
}
