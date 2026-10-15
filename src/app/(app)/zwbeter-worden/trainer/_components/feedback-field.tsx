"use client";

import { useState } from "react";

export type FeedbackSuggestion = { finding: string; tip: string };

/**
 * Het feedbackveld bij een te beoordelen training, met de suggesties uit de
 * analyse erboven. "Overnemen" zet de suggestie in het veld; de trainer past hem
 * aan of laat hem weg. Er gaat niets naar het lid zonder dat de trainer opslaat.
 */
export function FeedbackField({ name, suggestions }: { name: string; suggestions: FeedbackSuggestion[] }) {
  const [text, setText] = useState("");
  const [used, setUsed] = useState<Set<number>>(new Set());

  const adopt = (i: number) => {
    const s = suggestions[i];
    setText((current) => (current.trim() ? `${current.trim()}\n\n${s.finding} ${s.tip}` : `${s.finding} ${s.tip}`));
    setUsed((prev) => new Set(prev).add(i));
  };

  return (
    <div className="space-y-2">
      {suggestions.length > 0 && (
        <ul className="space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={s.finding} className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-2 text-sm">
              <span className="min-w-0">
                <span className="text-muted-foreground">{s.finding}</span> <span className="font-medium">{s.tip}</span>
              </span>
              <button
                type="button"
                onClick={() => adopt(i)}
                disabled={used.has(i)}
                className="shrink-0 rounded-md border px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
              >
                {used.has(i) ? "Overgenomen" : "Overnemen"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        name={name}
        rows={suggestions.length ? 3 : 2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Feedback voor het lid"
        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
      />
    </div>
  );
}
