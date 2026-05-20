"use client";

import { useState, useTransition } from "react";
import { createPost } from "./actions";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
import { Markdown } from "@/components/markdown";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

export function NewPostForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createPost(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-4 rounded-2xl border bg-card p-6">
      <div>
        <label className={LABEL}>Titel</label>
        <input name="title" required className={FIELD} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Categorie</label>
          <select name="category" defaultValue="algemeen" className={FIELD}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Tags (komma-gescheiden)</label>
          <input
            name="tags"
            placeholder="b.v. bandenspanning, herfst, knaks"
            className={FIELD}
          />
        </div>
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
          <label className={LABEL}>Inhoud (markdown)</label>
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
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${FIELD} font-mono`}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Publiceren…" : "Publiceren"}
      </Button>
    </form>
  );
}
