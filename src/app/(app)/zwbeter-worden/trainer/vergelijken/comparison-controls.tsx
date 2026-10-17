"use client";

// Keuzelijst van generaties en het oordeelformulier. De herkomst van A en B zit
// hier niet in: die stuurt de pagina pas mee nadat het oordeel is opgeslagen.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Choice } from "@/lib/training/engine-comparison";
import { cn } from "@/lib/utils";
import { saveEngineComparison } from "./_actions";

export type GenerationOption = { id: string; label: string; judged: boolean };

export function GenerationPicker({ options, selectedId }: { options: GenerationOption[]; selectedId: string }) {
  const router = useRouter();
  return (
    <select
      aria-label="Generatie"
      value={selectedId}
      onChange={(event) => router.push(`/zwbeter-worden/trainer/vergelijken?g=${event.target.value}`)}
      className="min-w-0 max-w-full rounded-md border bg-background px-2 py-1.5 text-sm"
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.judged ? "✓ " : ""}
          {option.label}
        </option>
      ))}
    </select>
  );
}

const CHOICES: Array<{ value: Choice; label: string }> = [
  { value: "a", label: "A beter" },
  { value: "b", label: "B beter" },
  { value: "gelijk", label: "Gelijk" },
];

export function VerdictForm({ generationId, reasonMax }: { generationId: string; reasonMax: number }) {
  const router = useRouter();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!choice) return;
    const formData = new FormData();
    formData.set("generation_id", generationId);
    formData.set("choice", choice);
    formData.set("reason", reason);
    setError(null);
    startTransition(async () => {
      const result = await saveEngineComparison(formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Oordeel" className="flex gap-1.5">
        {CHOICES.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            onClick={() => setChoice(option.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition",
              choice === option.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={reasonMax}
        placeholder="Reden (optioneel)"
        aria-label="Reden"
        className="min-w-0 flex-1 basis-48 rounded-md border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!choice || pending}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Opslaan…" : "Opslaan"}
      </button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
