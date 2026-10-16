import Link from "next/link";
import type { ExpertTopicRow, MemberSummary, TipRow } from "@/lib/zwbieb/queries";
import { AskLink } from "./ask-link";
import { cn } from "@/lib/utils";
import { TipItem } from "./tip-item";
import { TopicBadge } from "./topic-badge";

/** ZWBieb op het profiel van een lid: weet van, leent uit, en de laatste tips. */
export function MemberKnowledgeSection({
  member,
  topics,
  tips,
  viewerId,
  canModerate,
  labels,
}: {
  member: MemberSummary;
  topics: ExpertTopicRow[];
  tips: TipRow[];
  viewerId: string;
  canModerate: boolean;
  /** Naam per onderwerp, en welke soort het is. */
  labels: Record<string, { label: string; kind: "kennis" | "spullen" }>;
}) {
  if (topics.length === 0 && tips.length === 0) return null;
  const self = member.id === viewerId;

  const groups = [
    { heading: "Weet van", rows: topics.filter((t) => labels[t.topic_slug]?.kind !== "spullen") },
    { heading: "Leent uit", rows: topics.filter((t) => labels[t.topic_slug]?.kind === "spullen") },
  ].filter((group) => group.rows.length > 0);

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Link href="/zwbieb" className="hover:text-primary">
          ZWBieb
        </Link>
      </h2>

      {groups.map((group) => (
        <div key={group.heading} className="mt-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.heading}
          </h3>
          <ul className={cn("grid gap-2", self && "sm:grid-cols-2")}>
            {group.rows.map((topic) => (
              <li
                key={topic.topic_slug}
                className="flex items-center gap-2 rounded-md border bg-background/60 p-1.5 pr-2"
              >
                <Link
                  href={`/zwbieb?onderwerp=${topic.topic_slug}`}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <TopicBadge slug={topic.topic_slug} kind={labels[topic.topic_slug]?.kind} size="lg" />
                  <span className="min-w-0 py-1">
                    <span className="block text-sm font-medium leading-snug group-hover:underline">
                      {labels[topic.topic_slug]?.label ?? topic.topic_slug}
                    </span>
                    {topic.note && (
                      <span className="block text-xs text-muted-foreground">{topic.note}</span>
                    )}
                  </span>
                </Link>
                {!self && <AskLink expertId={member.id} topic={topic.topic_slug} compact />}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {tips.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tips
          </h3>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <TipItem
                key={tip.id}
                tip={tip}
                author={member}
                viewerId={viewerId}
                canModerate={canModerate}
                topicName={labels[tip.topic_slug]?.label ?? tip.topic_slug}
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
