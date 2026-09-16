"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveSeasonRules } from "../_actions";

export function SeasonRules({ seasonId, initial }: { seasonId: string; initial: string }) {
  const [rules, setRules] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return <section className="space-y-3 rounded-lg border bg-card p-4">
    <label htmlFor="season-rules" className="block font-semibold">Reglement (Markdown)</label>
    <textarea id="season-rules" rows={12} value={rules} onChange={(e) => setRules(e.target.value)} className="w-full rounded border bg-background p-3 font-mono text-sm" />
    <Button disabled={pending} onClick={() => startTransition(async () => {
      const result = await saveSeasonRules(seasonId, rules);
      setMessage(result.ok ? "Reglement opgeslagen." : result.error);
    })}>Opslaan</Button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
