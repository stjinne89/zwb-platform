"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Send, ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

import { createTelegramLink, removeTelegramLink } from "../_actions";

export function TelegramPanel({ linked }: { linked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function link() {
    setError(null);
    startTransition(async () => {
      const res = await createTelegramLink();
      if (!res.ok) {
        setError(res.error ?? "Koppelen mislukt.");
        return;
      }
      setUrl(res.url);
    });
  }

  function unlink() {
    setError(null);
    startTransition(async () => {
      const res = await removeTelegramLink();
      if (!res.ok) setError(res.error ?? "Ontkoppelen mislukt.");
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Berichten via Telegram</h2>
      <p className="text-sm">{linked ? "Gekoppeld" : "Niet gekoppeld"}</p>
      <div className="flex flex-wrap gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants()}
          >
            <ArrowUpRight className="size-4" />
            Open Telegram
          </a>
        ) : (
          <Button type="button" onClick={link} disabled={pending}>
            <Send className="size-4" />
            {linked ? "Opnieuw koppelen" : "Koppelen"}
          </Button>
        )}
        {linked && (
          <Button type="button" variant="outline" onClick={unlink} disabled={pending}>
            <ShieldOff className="size-4" />
            Ontkoppelen
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
