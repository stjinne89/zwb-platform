"use client";

import { useState, useTransition } from "react";
import { createTeam } from "./actions";
import { Button } from "@/components/ui/button";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

const LABEL = "mb-1 block text-sm font-medium";

const TYPES = [
  { value: "zrl", label: "ZRL" },
  { value: "ladder", label: "Ladder" },
  { value: "social", label: "Social" },
  { value: "outdoor", label: "Outdoor" },
];

export function NewTeamForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createTeam(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <label className={LABEL}>Naam</label>
        <input name="name" required className={FIELD} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Type</label>
          <select name="type" defaultValue="zrl" className={FIELD}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Divisie / poule</label>
          <input
            name="division"
            placeholder="Bv. Div 3, Pool B"
            className={FIELD}
          />
        </div>
      </div>
      <div>
        <label className={LABEL}>Korte omschrijving</label>
        <textarea name="description" rows={2} className={FIELD} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Aanmaken…" : "Aanmaken"}
      </Button>
    </form>
  );
}
