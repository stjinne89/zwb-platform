"use client";

// Het gesprek zelf. Eén component voor het lid en voor de trainer; wie kijkt
// bepaalt alleen of het vinkje "dit raakt mijn schema" er staat en wiens
// berechten rechts uitlijnen.
//
// Realtime werkt hier net als bij de live-chat op een event: de melding is
// alleen een seintje, de client haalt daarna zelf op. Nieuw is de snelle poll:
// zolang er een coach-antwoord bij OpenAI draait, kijken we elke paar seconden,
// want dan is er iets onderweg dat het lid staat af te wachten.

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export type CoachChatMessage = {
  id: string;
  role: "member" | "trainer" | "coach";
  authorId: string | null;
  name: string;
  body: string;
  status: "sent" | "pending" | "failed";
  affectsPlan: boolean;
  planNote: string | null;
  createdAt: string;
};

/** Trage ronde voor als realtime wegvalt. */
const FALLBACK_POLL_MS = 20_000;
/** Snelle ronde zolang er een antwoord onderweg is. */
const PENDING_POLL_MS = 3_000;
const MAX_BODY = 1000;

function fmtMoment(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

export function CoachChat({
  profileId,
  currentUserId,
  viewerRole,
  initialMessages,
  trainerNames,
}: {
  /** Van wie dit gesprek is. Voor de trainer is dat de gekozen renner. */
  profileId: string;
  currentUserId: string;
  viewerRole: "member" | "trainer";
  initialMessages: CoachChatMessage[];
  /** Namen van de aangewezen trainers; leeg = niemand leest mee. */
  trainerNames: string[];
}) {
  const [messages, setMessages] = useState<CoachChatMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [affectsPlan, setAffectsPlan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const base = `/api/training/chat?athlete=${profileId}`;
  const waiting = messages.some((message) => message.status === "pending");

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(base, { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: CoachChatMessage[] };
      if (data.messages) setMessages(data.messages);
    } catch {
      // stil; volgende ronde
    }
  }, [base]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refetch();
    };
    document.addEventListener("visibilitychange", onVisible);

    const supabase = createClient();
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const ping = () => {
      if (debounce) return;
      debounce = setTimeout(() => {
        debounce = null;
        refetch();
      }, 300);
    };
    const channel = supabase
      .channel(`training-chat-${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "training_chat_messages" },
        ping,
      )
      .subscribe();

    // Wacht er een antwoord, dan sneller kijken: dat komt niet via realtime
    // binnen, want het wordt door onze eigen GET afgerond.
    const poll = setInterval(refetch, waiting ? PENDING_POLL_MS : FALLBACK_POLL_MS);

    return () => {
      if (debounce) clearTimeout(debounce);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [profileId, refetch, waiting]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ body: text, affectsPlan }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setBody("");
        setAffectsPlan(false);
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
    await fetch(`/api/training/chat?id=${id}`, { method: "DELETE", credentials: "same-origin" });
    refetch();
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageCircle className="size-4" />
        Coachchat
      </h2>

      {viewerRole === "member" ? (
        <p className="text-xs text-muted-foreground">
          {trainerNames.length === 0 ? (
            <>
              Nog geen trainer gekoppeld — alleen jij leest dit.{" "}
              <a href="/zwbeter-worden/doelen" className="underline hover:text-primary">
                Trainer aanwijzen
              </a>
            </>
          ) : (
            <>Leest mee: {trainerNames.join(", ")}.</>
          )}
        </p>
      ) : null}

      <div
        ref={listRef}
        className="max-h-[28rem] space-y-3 overflow-y-auto rounded-md border bg-background p-3"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {viewerRole === "member"
              ? "Stel je vraag over je schema."
              : "Dit lid heeft nog niets gevraagd."}
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.authorId != null && message.authorId === currentUserId;
            return (
              <div key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    message.role === "coach"
                      ? "bg-primary/10 text-foreground"
                      : mine
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted/60"
                  }`}
                >
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {message.role === "coach" ? <Sparkles className="size-3" /> : null}
                    <span className="font-medium">{message.name}</span>
                    <span>·</span>
                    <span>{fmtMoment(message.createdAt)}</span>
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => remove(message.id)}
                        title="Verwijder"
                        className="opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 className="size-3 hover:text-destructive" />
                      </button>
                    ) : null}
                  </p>

                  {message.status === "pending" ? (
                    <p className="mt-1 animate-pulse text-muted-foreground">Coach denkt na…</p>
                  ) : (
                    <p
                      className={`mt-1 whitespace-pre-wrap break-words ${
                        message.status === "failed" ? "text-muted-foreground italic" : ""
                      }`}
                    >
                      {message.body}
                    </p>
                  )}

                  {message.planNote ? (
                    <p className="mt-1.5 text-xs font-medium text-primary">{message.planNote}</p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={MAX_BODY}
          placeholder={viewerRole === "member" ? "Je vraag…" : "Reactie voor het lid…"}
          className="flex-1 resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" size="sm" onClick={send} disabled={sending}>
          <Send className="size-4" />
        </Button>
      </div>

      {viewerRole === "member" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={affectsPlan}
            onChange={(event) => setAffectsPlan(event.target.checked)}
          />
          Dit raakt mijn schema
        </label>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </section>
  );
}
