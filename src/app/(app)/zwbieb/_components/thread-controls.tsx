"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MESSAGE_MAX } from "@/lib/zwbieb/limits";
import { closeThread, deleteMyMessage, replyToThread } from "../_actions";

export function ReplyForm({ threadId }: { threadId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await replyToThread(threadId, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        rows={3}
        maxLength={MESSAGE_MAX}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Je antwoord"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button disabled={pending || body.trim().length === 0} onClick={send}>
        {pending ? "Versturen…" : "Versturen"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function CloseThreadButton({ threadId }: { threadId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Gesprek sluiten? Er kunnen dan geen berichten meer bij.")) return;
        startTransition(async () => {
          await closeThread(threadId);
          router.refresh();
        });
      }}
    >
      Sluiten
    </Button>
  );
}

export function DeleteMessageButton({ messageId, threadId }: { messageId: string; threadId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() => {
        if (!confirm("Dit bericht verwijderen?")) return;
        startTransition(async () => {
          await deleteMyMessage(messageId, threadId);
          router.refresh();
        });
      }}
    >
      Verwijderen
    </Button>
  );
}
