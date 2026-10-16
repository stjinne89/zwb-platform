"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TopicKind, TopicOption } from "@/lib/zwbieb/topics";
import { MAX_ITEMS_PER_MEMBER, MAX_TOPICS_PER_MEMBER, TOPIC_NOTE_MAX } from "@/lib/zwbieb/limits";
import { saveMyKnowledge, stopMyKnowledge } from "../_actions";
import { AddTopic } from "./add-topic";
import { TopicBadge } from "./topic-badge";

const SECTIONS: { kind: TopicKind; title: string; max: number; notePlaceholder: string }[] = [
  { kind: "kennis", title: "Kennis", max: MAX_TOPICS_PER_MEMBER, notePlaceholder: "Waarin precies (optioneel)" },
  { kind: "spullen", title: "Spullen die ik uitleen", max: MAX_ITEMS_PER_MEMBER, notePlaceholder: "Toelichting (optioneel)" },
];

export function KnowledgeForm({
  options: initialOptions,
  initial,
  joined,
}: {
  options: TopicOption[];
  initial: Record<string, string>;
  joined: boolean;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [selected, setSelected] = useState<Record<string, string>>(initial);
  const [consent, setConsent] = useState(joined);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const kindOf = (slug: string) => options.find((o) => o.slug === slug)?.kind ?? "kennis";
  const countOf = (kind: TopicKind) => Object.keys(selected).filter((slug) => kindOf(slug) === kind).length;

  function toggle(slug: string, max: number) {
    setSaved(false);
    setSelected((current) => {
      const next = { ...current };
      if (slug in next) delete next[slug];
      else if (Object.keys(next).filter((s) => kindOf(s) === kindOf(slug)).length < max) next[slug] = "";
      return next;
    });
  }

  function added(topic: TopicOption, max: number) {
    setOptions((current) => (current.some((o) => o.slug === topic.slug) ? current : [...current, topic]));
    setSaved(false);
    setSelected((current) => {
      if (topic.slug in current) return current;
      const count = Object.keys(current).filter((s) => (options.find((o) => o.slug === s)?.kind ?? "kennis") === topic.kind).length;
      return count < max ? { ...current, [topic.slug]: "" } : current;
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
    if (!confirm("Stoppen? Je onderwerpen en spullen verdwijnen. Je tips en gesprekken blijven.")) return;
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
    <div className="space-y-4">
      {SECTIONS.map((section) => {
        const count = countOf(section.kind);
        return (
          <section key={section.kind} className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-semibold">{section.title}</h2>
              <span className="text-xs text-muted-foreground">
                {count}/{section.max}
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {options
                .filter((option) => option.kind === section.kind)
                .map((topic) => {
                  const checked = topic.slug in selected;
                  return (
                    <li key={topic.slug} className="rounded-md border p-3">
                      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="size-4"
                          checked={checked}
                          disabled={!checked && count >= section.max}
                          onChange={() => toggle(topic.slug, section.max)}
                        />
                        <TopicBadge slug={topic.slug} kind={topic.kind} size="md" />
                        {topic.label}
                      </label>
                      {checked && (
                        <input
                          type="text"
                          maxLength={TOPIC_NOTE_MAX}
                          value={selected[topic.slug]}
                          placeholder={section.notePlaceholder}
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
            <AddTopic kind={section.kind} options={options} onAdded={(topic) => added(topic, section.max)} />
          </section>
        );
      })}

      <section className="space-y-4 rounded-lg border bg-card p-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            Ik ga akkoord met{" "}
            <Link href="/privacy#zwbieb" className="underline underline-offset-2">
              ZWBieb in de privacyverklaring
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
    </div>
  );
}
