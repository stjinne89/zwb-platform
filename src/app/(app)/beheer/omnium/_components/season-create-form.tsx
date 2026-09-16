"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createOmniumSeason } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export function SeasonCreateForm() {
  const [slug, setSlug] = useState("2026-27");
  const [name, setName] = useState("ZWB Omnium 2026/27");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createOmniumSeason({ slug, name });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/beheer/omnium?seizoen=${res.seasonSlug}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={LABEL} htmlFor="omnium-season-slug">
            Slug
          </label>
          <input
            id="omnium-season-slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="omnium-season-name">
            Naam
          </label>
          <input
            id="omnium-season-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={FIELD}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={submit}>
        {pending ? "Bezig…" : "Seizoen toevoegen"}
      </Button>
    </div>
  );
}
