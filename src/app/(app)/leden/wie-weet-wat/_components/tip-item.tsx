import Link from "next/link";
import { topicLabel } from "@/lib/wie-weet-wat/topics";
import type { MemberSummary, TipRow } from "@/lib/wie-weet-wat/queries";
import { MemberChip } from "./member-chip";
import { TipActions } from "./tip-actions";
import { TopicIcon } from "./topic-badge";

export function TipItem({
  tip,
  author,
  viewerId,
  canModerate,
  showTopic = false,
  eventTitle,
  colName,
}: {
  tip: TipRow;
  author: MemberSummary | undefined;
  viewerId: string;
  canModerate: boolean;
  showTopic?: boolean;
  eventTitle?: string;
  colName?: string;
}) {
  const hidden = tip.status === "hidden";
  return (
    <li className={hidden ? "rounded-md border border-dashed p-3 opacity-70" : "rounded-md border p-3"}>
      <p className="whitespace-pre-wrap text-sm leading-6">{tip.body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <MemberChip member={author} />
        {showTopic && (
          <Link
            href={`/leden/wie-weet-wat?onderwerp=${tip.topic_slug}`}
            className="inline-flex items-center gap-1 hover:text-primary hover:underline"
          >
            <TopicIcon slug={tip.topic_slug} className="size-3.5" />
            {topicLabel(tip.topic_slug)}
          </Link>
        )}
        {eventTitle && tip.event_id && (
          <Link href={`/events/${tip.event_id}`} className="hover:text-primary hover:underline">
            {eventTitle}
          </Link>
        )}
        {colName && <span>{colName}</span>}
        {hidden && <span>Verborgen</span>}
      </div>
      <TipActions
        tipId={tip.id}
        body={tip.body}
        status={tip.status}
        canEdit={tip.profile_id === viewerId}
        canModerate={canModerate}
      />
    </li>
  );
}
