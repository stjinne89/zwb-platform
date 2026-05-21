"use client";

import { useState, useTransition } from "react";
import { createPost } from "./actions";
import { Button } from "@/components/ui/button";
import { CATEGORIES, POST_KINDS, type PostKind } from "@/lib/categories";
import { Markdown } from "@/components/markdown";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export function NewPostForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [kind, setKind] = useState<PostKind>("aanbod");

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createPost(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      {/* Type toggle: Aanbod / Vraag */}
      <div>
        <label className={LABEL}>Type</label>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
          {POST_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`rounded px-3 py-2 transition ${
                kind === k.value
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k.icon} {k.label}
            </button>
          ))}
        </div>
        <input type="hidden" name="kind" value={kind} />
        <p className="mt-1 text-xs text-muted-foreground">
          {kind === "aanbod"
            ? "Je hebt iets te koop, weg te geven of te ruilen."
            : "Je bent op zoek naar iets — andere leden kunnen reageren."}
        </p>
      </div>

      <div>
        <label className={LABEL}>Titel</label>
        <input
          name="title"
          required
          placeholder={
            kind === "aanbod"
              ? "Bv. Specialized Allez 56cm — 2022"
              : "Bv. Gezocht: Tacx Neo Smart"
          }
          className={FIELD}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Categorie</label>
          <select name="category" defaultValue="fiets" className={FIELD}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>
            {kind === "aanbod" ? "Vraagprijs" : "Budget (optioneel)"}
          </label>
          <input
            name="price"
            placeholder={kind === "aanbod" ? "€350 of bieden" : "rond de €500"}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Tags (komma-gescheiden)</label>
        <input
          name="tags"
          placeholder="bv. shimano, 11-speed, maat-56"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL}>Korte intro (optioneel, max 200 tekens)</label>
        <input
          name="excerpt"
          maxLength={200}
          placeholder="Eén regel die op de overzichtspagina komt"
          className={FIELD}
        />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className={LABEL}>Beschrijving (markdown)</label>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showPreview ? "← Bewerken" : "Preview →"}
          </button>
        </div>
        {showPreview ? (
          <div className="min-h-48 rounded-md border border-input bg-background p-3">
            {body ? <Markdown source={body} /> : <p className="text-sm text-muted-foreground">Niets om te tonen.</p>}
          </div>
        ) : (
          <textarea
            name="body_md"
            required
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === "aanbod"
                ? "Beschrijf de staat, kilometers, eventuele schade, contactinfo…"
                : "Wat zoek je precies? Maat, type, prijsklasse…"
            }
            className={`${FIELD} font-mono`}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Plaatsen…" : "Plaatsen"}
      </Button>
    </form>
  );
}
