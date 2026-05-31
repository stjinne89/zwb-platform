"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, Trash2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export type ChatMessage = {
  id: string;
  profileId: string | null;
  name: string;
  isGuest: boolean;
  body: string;
  createdAt: string;
  internal: boolean;
};

const QUICK_EMOJI = ["🔥", "💪", "👏", "🚴", "⛰️", "😅", "🎉", "❤️"];
const POLL_MS = 6000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export function EventChat({
  eventId,
  mode,
  currentUserId,
  isMember,
  isAdmin,
  initialMessages,
  readOnly = false,
}: {
  eventId: string;
  mode: "realtime" | "poll";
  currentUserId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  initialMessages: ChatMessage[];
  /** Archief-modus: alleen-lezen (geen invoer/realtime), als deel van het ritverslag. */
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const base = `/api/live/event/${eventId}/chat`;

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
    } catch {
      // stil; volgende tick
    }
  }, [base]);

  // Auto-scroll naar onderen bij nieuwe berichten.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // Realtime-modus (leden): subscribe als trigger → refetch (incl. interne +
  // namen). Poll-modus (publiek): elke 6s pollen. Beide: bij terugkeer tab.
  useEffect(() => {
    if (readOnly) return; // archief: geen live updates
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (mode === "poll") {
      const id = setInterval(refetch, POLL_MS);
      return () => {
        clearInterval(id);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refetch();
      }, 300);
    };
    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_chat_messages" },
        ping,
      )
      .subscribe();
    // Trage fallback-poll voor het geval realtime wegvalt.
    const fallback = setInterval(refetch, 20000);

    return () => {
      if (timer) clearTimeout(timer);
      clearInterval(fallback);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [mode, eventId, refetch, readOnly]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    if (!currentUserId && guestName.trim().length < 2) {
      setError("Vul een naam in om mee te chatten.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          guestName: currentUserId ? undefined : guestName.trim(),
          internalOnly: isMember ? internal : false,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setBody("");
        refetch();
      } else {
        setError(data.error ?? "Versturen faalde.");
      }
    } catch {
      setError("Versturen faalde.");
    } finally {
      setSending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bericht verwijderen?")) return;
    await fetch(`${base}?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageCircle className="size-4" />
        {readOnly ? "Live chat tijdens de rit" : "Live chat"}
      </h2>

      <div
        ref={listRef}
        className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-background p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nog geen berichten — moedig de renners aan!
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="group text-sm">
              <span className="text-xs text-muted-foreground">
                {fmtTime(m.createdAt)}
              </span>{" "}
              {m.profileId ? (
                <Link
                  href={`/leden/${m.profileId}`}
                  className="font-medium hover:underline"
                >
                  {m.name}
                </Link>
              ) : (
                <span className="font-medium">{m.name}</span>
              )}
              {m.isGuest && (
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] text-muted-foreground">
                  gast
                </span>
              )}
              {m.internal && (
                <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] text-secondary-foreground">
                  <Lock className="size-2.5" />
                  intern
                </span>
              )}
              <span className="text-muted-foreground"> · </span>
              <span className="whitespace-pre-wrap break-words">{m.body}</span>
              {(isAdmin || (currentUserId && m.profileId === currentUserId)) && (
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  title="Verwijder"
                  className="ml-1 opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 className="inline size-3 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {!readOnly && (
        <>
      {/* Snel-emoji */}
      <div className="flex flex-wrap gap-1">
        {QUICK_EMOJI.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setBody((b) => b + e)}
            className="rounded-md border bg-background px-2 py-1 text-base leading-none hover:border-primary/40"
            aria-label={`Emoji ${e}`}
          >
            {e}
          </button>
        ))}
      </div>

      {!currentUserId && (
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          maxLength={40}
          placeholder="Je naam"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-48"
        />
      )}

      <div className="flex items-center gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={500}
          placeholder="Moedig aan…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" size="sm" onClick={send} disabled={sending}>
          <Send className="size-4" />
        </Button>
      </div>

      {isMember && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={internal}
            onChange={(e) => setInternal(e.target.checked)}
          />
          Alleen voor leden (niet zichtbaar op de publieke pagina)
        </label>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}
