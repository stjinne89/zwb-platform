import Link from "next/link";
import { topicLabel } from "@/lib/wie-weet-wat/topics";
import type { ExpertTopicRow, MemberSummary, TipRow } from "@/lib/wie-weet-wat/queries";
import { cn } from "@/lib/utils";
import { AskLink } from "./ask-link";
import { TipItem } from "./tip-item";
import { TopicBadge } from "./topic-badge";

/** "Weet van" en de laatste tips, op het profiel van een lid. */
export function MemberKnowledgeSection({
  member,
  topics,
  tips,
  viewerId,
  canModerate,
}: {
  member: MemberSummary;
  topics: ExpertTopicRow[];
  tips: TipRow[];
  viewerId: string;
  canModerate: boolean;
}) {
  if (topics.length === 0 && tips.length === 0) return null;
  const self = member.id === viewerId;

  return (
    <section className="rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Link href="/leden/wie-weet-wat" className="hover:text-primary">
          Weet van
        </Link>
      </h2>

      {topics.length > 0 && (
        <ul className={cn("mt-3 grid gap-2", self && "sm:grid-cols-2")}>
          {topics.map((topic) => (
            <li
              key={topic.topic_slug}
              className="flex items-center gap-2 rounded-md border bg-background/60 p-1.5 pr-2"
            >
              <Link
                href={`/leden/wie-weet-wat?onderwerp=${topic.topic_slug}`}
                className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <TopicBadge slug={topic.topic_slug} size="lg" />
                <span className="min-w-0 py-1">
                  <span className="block text-sm font-medium leading-snug group-hover:underline">
                    {topicLabel(topic.topic_slug)}
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
      )}

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
                showTopic
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
