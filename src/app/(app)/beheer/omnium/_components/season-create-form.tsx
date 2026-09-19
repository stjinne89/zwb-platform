"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createOmniumSeason } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";
const SAVE_TIMEOUT_MS = 20_000;

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Opslaan duurt te lang.")), SAVE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export function SeasonCreateForm() {
  const [slug, setSlug] = useState("2026-27");
  const [name, setName] = useState("ZWB Omnium 2026/27");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function submit() {
    if (pending) return;
    setError(null);
    setPending(true);

    try {
      const res = await withTimeout(createOmniumSeason({ slug, name }));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace(`/beheer/omnium?seizoen=${res.seasonSlug}`);
    } catch {
      setError("Opslaan mislukt. Ververs de pagina en probeer opnieuw.");
    } finally {
      setPending(false);
    }
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
