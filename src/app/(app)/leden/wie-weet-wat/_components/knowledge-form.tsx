"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { KNOWLEDGE_TOPICS } from "@/lib/wie-weet-wat/topics";
import { MAX_TOPICS_PER_MEMBER, TOPIC_NOTE_MAX } from "@/lib/wie-weet-wat/limits";
import { saveMyKnowledge, stopMyKnowledge } from "../_actions";

export function KnowledgeForm({
  initial,
  joined,
}: {
  initial: Record<string, string>;
  joined: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>(initial);
  const [consent, setConsent] = useState(joined);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const count = Object.keys(selected).length;

  function toggle(slug: string) {
    setSaved(false);
    setSelected((current) => {
      const next = { ...current };
      if (slug in next) delete next[slug];
      else if (Object.keys(next).length < MAX_TOPICS_PER_MEMBER) next[slug] = "";
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveMyKnowledge({
        topics: Object.entries(selected).map(([slug, note]) => ({ slug, note })),
        consent,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function stop() {
    if (!confirm("Stoppen? Je onderwerpen verdwijnen. Je tips en gesprekken blijven.")) return;
    setError(null);
    startTransition(async () => {
      const res = await stopMyKnowledge();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSelected({});
      setConsent(false);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">Onderwerpen</h2>
        <span className="text-xs text-muted-foreground">
          {count}/{MAX_TOPICS_PER_MEMBER}
        </span>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {KNOWLEDGE_TOPICS.map((topic) => {
          const checked = topic.slug in selected;
          return (
            <li key={topic.slug} className="rounded-md border p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={checked}
                  disabled={!checked && count >= MAX_TOPICS_PER_MEMBER}
                  onChange={() => toggle(topic.slug)}
                />
                {topic.label}
              </label>
              {checked && (
                <input
                  type="text"
                  maxLength={TOPIC_NOTE_MAX}
                  value={selected[topic.slug]}
                  placeholder="Waarin precies (optioneel)"
                  onChange={(e) => {
                    setSaved(false);
                    setSelected((current) => ({ ...current, [topic.slug]: e.target.value }));
                  }}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </li>
          );
        })}
      </ul>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Ik ga akkoord met{" "}
          <Link href="/privacy#wie-weet-wat" className="underline underline-offset-2">
            Wie weet wat in de privacyverklaring
          </Link>
          .
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button disabled={pending || !consent} onClick={save}>
          {pending ? "Opslaan…" : "Opslaan"}
        </Button>
        {joined && (
          <Button variant="ghost" disabled={pending} onClick={stop}>
            Stoppen
          </Button>
        )}
        {saved && <span className="text-sm text-muted-foreground">Opgeslagen.</span>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
