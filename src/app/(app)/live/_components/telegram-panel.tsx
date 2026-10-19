"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, BellRing, Send, ShieldOff } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

import { createTelegramLink, removeTelegramLink, sendTestRideMessage } from "../_actions";

export function TelegramPanel({ linked }: { linked: boolean }) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  function sendTest() {
    setError(null);
    setTestResult(null);
    startTransition(async () => {
      const res = await sendTestRideMessage();
      if (!res.ok) {
        setError(res.error ?? "Versturen mislukt.");
        return;
      }
      setTestResult(res.reached > 0 ? "Testbericht verstuurd." : "Niet aangekomen.");
    });
  }

  function unlink() {
    setError(null);
    setTestResult(null);
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
          <Button type="button" variant="outline" onClick={sendTest} disabled={pending}>
            <BellRing className="size-4" />
            Testbericht
          </Button>
        )}
        {linked && (
          <Button type="button" variant="outline" onClick={unlink} disabled={pending}>
            <ShieldOff className="size-4" />
            Ontkoppelen
          </Button>
        )}
      </div>
      {testResult && <p className="text-sm">{testResult}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
