"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  addBirthdayMessage,
  deleteBirthdayMessage,
} from "../_actions";

export type BirthdayMessage = {
  id: string;
  authorProfileId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export function BirthdayMessages({
  birthdayProfileId,
  celebrationYear,
  birthdayName,
  currentUserId,
  isAdmin,
  messages,
}: {
  birthdayProfileId: string;
  celebrationYear: number;
  birthdayName: string;
  currentUserId: string;
  isAdmin: boolean;
  messages: BirthdayMessage[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const message = body.trim();
    if (!message) return;
    setError(null);
    startTransition(async () => {
      const result = await addBirthdayMessage(
        birthdayProfileId,
        celebrationYear,
        message,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function remove(messageId: string) {
    if (!confirm("Felicitatie verwijderen?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBirthdayMessage(
        messageId,
        birthdayProfileId,
        celebrationYear,
      );
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-lg border border-zwb-gold/25 bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Felicitaties ({messages.length})
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Laat een bericht achter voor {birthdayName}.
        </p>
      </div>

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="group rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/leden/${message.authorProfileId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {message.authorName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {new Date(message.createdAt).toLocaleString("nl-NL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </p>
                </div>
                {(isAdmin ||
                  birthdayProfileId === currentUserId ||
                  message.authorProfileId === currentUserId) && (
                  <button
                    type="button"
                    onClick={() => remove(message.id)}
                    disabled={pending}
                    title="Verwijder felicitatie"
                    className="text-muted-foreground opacity-70 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">
                {message.body}
              </p>
            </article>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={500}
          rows={3}
          placeholder={`Feliciteer ${birthdayName}...`}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex items-center gap-3">
          <Button type="button" onClick={send} disabled={pending || !body.trim()}>
            <Send className="size-4" />
            {pending ? "Versturen..." : "Feliciteren"}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  );
}
