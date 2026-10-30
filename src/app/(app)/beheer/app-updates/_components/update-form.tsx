"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SUMMARY_MAX } from "@/lib/app-updates/schedule";
import { deleteAppUpdate, saveAppUpdate } from "../_actions";

const field = "w-full rounded-md border bg-background px-2 py-1 text-sm";
const labelText = "mb-1 block text-xs font-medium text-muted-foreground";

export type UpdateFormValues = {
  /** De donderdag van de week. */
  day: string;
  summary: string;
  changes: string;
  fixes: string;
};

/** Schrijven of aanpassen; dezelfde week opnieuw opslaan overschrijft hem. */
export function UpdateForm({ initial, editing }: { initial: UpdateFormValues; editing: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await saveAppUpdate(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult("Opgeslagen.");
      router.replace("/beheer/app-updates");
      router.refresh();
    });
  }

  return (
    <form
      key={`${initial.day}-${editing}`}
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <label className="block">
        <span className={labelText}>Donderdag</span>
        <input name="day" type="date" required defaultValue={initial.day} className={field} />
      </label>

      <label className="block">
        <span className={labelText}>Samenvatting in de pop-up (max {SUMMARY_MAX})</span>
        <textarea
          name="summary"
          required
          maxLength={SUMMARY_MAX}
          rows={3}
          defaultValue={initial.summary}
          className={field}
        />
      </label>

      <label className="block">
        <span className={labelText}>Nieuw (één per regel)</span>
        <textarea name="changes" rows={5} defaultValue={initial.changes} className={field} />
      </label>

      <label className="block">
        <span className={labelText}>Opgelost (één per regel)</span>
        <textarea name="fixes" rows={4} defaultValue={initial.fixes} className={field} />
      </label>

      <div className="flex items-center justify-between gap-3">
        {result && <p className="text-xs text-muted-foreground">{result}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending} className="ml-auto">
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteUpdateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    if (!confirm("Deze update verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteAppUpdate(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove}>
      Verwijderen
    </Button>
  );
}
