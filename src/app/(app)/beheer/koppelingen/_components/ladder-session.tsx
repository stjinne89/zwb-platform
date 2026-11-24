"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { LadderSessionStatus } from "@/lib/club-ladder/session";
import { saveLadderSession } from "../_actions";

function when(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Amsterdam",
  });
}

function statusLine(status: LadderSessionStatus): { text: string; tone: "ok" | "problem" | "off" } {
  if (status.expiredAt) return { text: `Verlopen sinds ${when(status.expiredAt)}`, tone: "problem" };
  if (status.source === "beheer") {
    return { text: status.savedAt ? `Geldig, geplakt ${when(status.savedAt)}` : "Geldig", tone: "ok" };
  }
  if (status.source === "env") return { text: "Uit LADDER_COOKIE", tone: "ok" };
  return { text: "Geen sessie", tone: "off" };
}

const TONE_CLASS = {
  ok: "bg-emerald-500",
  problem: "bg-destructive",
  off: "bg-muted-foreground/40",
} as const;

/** Club Ladder-sessie (connect.sid) plakken; de server controleert hem bij de ladder. */
export function LadderSession({ status }: { status: LadderSessionStatus }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const line = statusLine(status);

  function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await saveLadderSession(value);
      if (result.ok) {
        setValue("");
        setMessage({ ok: true, text: "Opgeslagen." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error });
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Club Ladder</h2>
        <span className="flex items-center gap-2 text-sm">
          <span className={`size-2 shrink-0 rounded-full ${TONE_CLASS[line.tone]}`} aria-hidden />
          {line.text}
        </span>
      </header>
      <form onSubmit={save} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="ladder-cookie">
          connect.sid
        </label>
        <input
          id="ladder-cookie"
          name="cookie"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="connect.sid"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-11 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
        />
        <Button type="submit" className="min-h-11 shrink-0" disabled={pending || !value.trim()}>
          {pending ? "Controleren…" : "Opslaan"}
        </Button>
      </form>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </section>
  );
}
