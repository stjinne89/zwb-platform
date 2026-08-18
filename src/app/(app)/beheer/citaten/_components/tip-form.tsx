"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  COMPONENT_TYPES,
  DISCIPLINES,
  disciplineLabel,
} from "@/lib/maintenance/component-types";
import { saveTip } from "../_actions";

const FIELD =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const LABEL = "mb-1 block text-sm font-medium";

/** Voor algemene kennis en samenvattingen van openbaar advies. */
export function TipForm() {
  const [body, setBody] = useState("");
  const [type, setType] = useState(COMPONENT_TYPES[0].slug);
  const [discipline, setDiscipline] = useState("");
  const [sourceType, setSourceType] = useState<"algemeen" | "pro">("algemeen");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveTip({
        body,
        componentType: type,
        discipline: discipline || null,
        sourceType,
        sourceName: sourceName || null,
        sourceUrl: sourceUrl || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setSourceName("");
      setSourceUrl("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="De tip, in eigen woorden"
        className={FIELD}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className={LABEL}>Onderdeel</label>
          <select className={FIELD} value={type} onChange={(e) => setType(e.target.value)}>
            {COMPONENT_TYPES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Fietstype</label>
          <select
            className={FIELD}
            value={discipline}
            onChange={(e) => setDiscipline(e.target.value)}
          >
            <option value="">Elk fietstype</option>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {disciplineLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL}>Bron</label>
          <select
            className={FIELD}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as "algemeen" | "pro")}
          >
            <option value="algemeen">Algemene kennis</option>
            <option value="pro">Pro, met bronlink</option>
          </select>
        </div>
      </div>

      {sourceType === "pro" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="Naam van de bron"
            className={FIELD}
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            className={FIELD}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" size="sm" disabled={pending || !body.trim()} onClick={submit}>
        {pending ? "Toevoegen…" : "Tip toevoegen"}
      </Button>
    </div>
  );
}
