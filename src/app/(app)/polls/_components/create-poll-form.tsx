"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPoll } from "../_actions";

export function CreatePollForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>(["", ""]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length >= 10) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await createPoll(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      form.reset();
      setOptions(["", ""]);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        Nieuwe poll
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Nieuwe poll
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          <X className="size-4" />
        </Button>
      </header>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Vraag *
        </span>
        <input
          name="question"
          required
          maxLength={200}
          placeholder="Bv. Waar fietsen we zaterdag?"
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Toelichting
        </span>
        <textarea
          name="description_md"
          rows={2}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-muted-foreground">
          Opties (min. 2, max. 10)
        </span>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              name="options"
              value={opt}
              onChange={(e) => updateOption(idx, e.target.value)}
              placeholder={`Optie ${idx + 1}`}
              maxLength={120}
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
            />
            {options.length > 2 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(idx)}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addOption}
          >
            <Plus className="size-4" />
            Optie toevoegen
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="multi_select" />
          Meerdere keuzes toestaan
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            Sluit op (optioneel)
          </span>
          <input
            name="closes_at"
            type="datetime-local"
            className="w-full rounded-md border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Annuleer
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Aanmaken…" : "Poll aanmaken"}
        </Button>
      </div>
    </form>
  );
}
