"use client";

import { useState } from "react";

export type RaceTip = { finding: string; tip: string };

function compose(title: string, tips: RaceTip[]) {
  return [`Over ${title}:`, ...tips.map((t) => `- ${t.finding} ${t.tip}`)].join("\n");
}

/**
 * De tips van een race, aan te vinken en als bericht naar de coachchat van het
 * lid te sturen. Het bericht is aan te passen; er gaat niets weg zonder klik.
 */
export function SendRaceTips({ athleteId, title, tips }: { athleteId: string; title: string; tips: RaceTip[] }) {
  const [chosen, setChosen] = useState<boolean[]>(tips.map(() => true));
  const [text, setText] = useState(compose(title, tips));
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggle = (i: number) => {
    const next = chosen.map((c, j) => (j === i ? !c : c));
    setChosen(next);
    setText(compose(title, tips.filter((_, j) => next[j])));
  };

  const send = async () => {
    setState("sending");
    setError(null);
    try {
      const res = await fetch(`/api/training/chat?athlete=${encodeURIComponent(athleteId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || data.ok === false) {
        setState("error");
        setError(data.error ?? "Versturen lukte niet.");
        return;
      }
      setState("sent");
    } catch {
      setState("error");
      setError("Versturen lukte niet.");
    }
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {tips.map((t, i) => (
          <li key={t.finding}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3">
              <input type="checkbox" checked={chosen[i]} onChange={() => toggle(i)} className="mt-1" />
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">{t.finding}</span>
                <span className="mt-1 block font-medium">{t.tip}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label htmlFor="race-tips-message" className="sr-only">
        Bericht aan het lid
      </label>
      <textarea
        id="race-tips-message"
        rows={Math.min(10, 2 + chosen.filter(Boolean).length * 2)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={state === "sending" || state === "sent" || !text.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {state === "sending" ? "Versturen…" : state === "sent" ? "Verstuurd" : "Stuur naar coachchat"}
        </button>
        {state === "error" && error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
