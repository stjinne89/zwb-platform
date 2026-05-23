"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { broadcastNotification } from "../_actions";

export function BroadcastForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setResult(null);
    setError(null);
    startTransition(async () => {
      const res = await broadcastNotification(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(
        `Verzonden naar ${res.sent} ${res.sent === 1 ? "apparaat" : "apparaten"}` +
          (res.pruned > 0 ? ` (${res.pruned} verlopen subscriptions opgeruimd)` : "") +
          ".",
      );
      form.reset();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Titel (max 100)
        </span>
        <input
          name="title"
          required
          maxLength={100}
          placeholder="Bv. Trainingsritje verzet naar zaterdag"
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Bericht (max 280)
        </span>
        <textarea
          name="body"
          required
          maxLength={280}
          rows={3}
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Doorklik-URL (default: /dashboard)
        </span>
        <input
          name="url"
          placeholder="/kalender"
          className="w-full rounded-md border bg-background px-2 py-1 text-sm"
        />
      </label>

      <div className="flex items-center justify-between">
        {result && <p className="text-xs text-muted-foreground">{result}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={pending} className="ml-auto">
          <Send className="size-4" />
          {pending ? "Verzenden…" : "Verstuur"}
        </Button>
      </div>
    </form>
  );
}
