"use client";

import { useState, useTransition } from "react";
import { ClipboardPaste } from "lucide-react";
import { connectIntervalsWithKey } from "../_actions";
import { HelpLink } from "@/components/app-ui";
import { Button } from "@/components/ui/button";

export function ConnectIntervalsForm() {
  const [apiKey, setApiKey] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  async function pasteFromClipboard() {
    setClipboardError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        setClipboardError("Clipboard is leeg.");
        return;
      }
      setApiKey(text.trim());
    } catch {
      setClipboardError(
        "Plakken lukte niet. Gebruik Ctrl+V.",
      );
    }
  }

  function submit() {
    if (!apiKey.trim()) {
      setError("Plak eerst een API-key.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await connectIntervalsWithKey(apiKey);
      if (!res.ok) setError(res.error);
      // op succes komt revalidatePath terug — pagina rendert opnieuw met dashboard
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">Koppel intervals.icu</h2>
        <HelpLink href="/hulp#trainingsruimte" />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Plak je intervals.icu API-key hier"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pasteFromClipboard}
            disabled={pending}
          >
            <ClipboardPaste className="size-4" />
            Plakken
          </Button>
        </div>
        {clipboardError && (
          <p className="text-xs text-muted-foreground">{clipboardError}</p>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" onClick={submit} disabled={pending || !apiKey.trim()}>
        {pending ? "Koppelen…" : "Koppelen"}
      </Button>
    </div>
  );
}
