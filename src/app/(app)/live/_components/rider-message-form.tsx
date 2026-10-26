"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RIDE_MESSAGE_MAX } from "@/lib/telegram/limits";

import { sendRiderMessage } from "../_actions";

/** Kort bericht naar de fietscomputer van één live renner. */
export function RiderMessageForm({ recipientId }: { recipientId: string }) {
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const res = await sendRiderMessage(recipientId, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      setStatus(res.reached > 0 ? "Verstuurd." : "Niet aangekomen: geen melding of Telegram.");
    });
  }

  return (
    <form action={send} className="mt-3 space-y-1">
      <div className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={RIDE_MESSAGE_MAX}
          placeholder="Bericht op de fietscomputer"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending || !body.trim()} aria-label="Verstuur">
          <Send className="size-4" />
        </Button>
      </div>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
