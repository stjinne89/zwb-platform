"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TopicOption } from "@/lib/zwbieb/topics";
import { TIP_MAX, TIP_MIN } from "@/lib/zwbieb/limits";
import { addMyTip, saveMessageAsTip } from "../_actions";

export function TipForm({
  options,
  topic: initialTopic,
  body: initialBody,
  eventId,
  colSlug,
  messageId = null,
  returnTo,
}: {
  options: TopicOption[];
  topic: string | null;
  body: string;
  eventId: string | null;
  colSlug: string | null;
  /** Bericht van de ander uit een gesprek; de tip komt op diens naam. */
  messageId?: string | null;
  returnTo: string;
}) {
  const [topic, setTopic] = useState(initialTopic ?? "");
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const length = body.trim().length;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = messageId
        ? await saveMessageAsTip({ messageId, topic, body })
        : await addMyTip({ topic, body, eventId, colSlug });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(returnTo);
    });
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">
        Onderwerp
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>
            Kies een onderwerp
          </option>
          {(["kennis", "spullen"] as const).map((kind) => (
            <optgroup key={kind} label={kind === "spullen" ? "Spullen" : "Kennis"}>
              {options
                .filter((t) => t.kind === kind)
                .map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Tip
        <textarea
          autoFocus
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>
      <p className={length > TIP_MAX ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
        {length}/{TIP_MAX}
      </p>
      <Button disabled={pending || !topic || length < TIP_MIN || length > TIP_MAX} onClick={save}>
        {pending ? "Opslaan…" : messageId ? "Bewaren" : "Plaatsen"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
