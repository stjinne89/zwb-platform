import Link from "next/link";
import { topicLabel } from "@/lib/wie-weet-wat/topics";
import type { ExpertTopicRow, MemberSummary, TipRow } from "@/lib/wie-weet-wat/queries";
import { AskLink } from "./ask-link";
import { TipItem } from "./tip-item";

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
        <ul className="mt-3 space-y-2">
          {topics.map((topic) => (
            <li key={topic.topic_slug} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/leden/wie-weet-wat?onderwerp=${topic.topic_slug}`}
                  className="text-sm font-medium hover:underline"
                >
                  {topicLabel(topic.topic_slug)}
                </Link>
                {topic.note && <p className="text-xs text-muted-foreground">{topic.note}</p>}
              </div>
              {!self && <AskLink expertId={member.id} topic={topic.topic_slug} />}
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
