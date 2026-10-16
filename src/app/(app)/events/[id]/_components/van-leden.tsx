import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { MemberSummary, TipRow } from "@/lib/zwbieb/queries";
import { TipItem } from "@/app/(app)/zwbieb/_components/tip-item";

/** Tips van leden bij dit event en de cols op de route (ZWBieb). */
export function VanLeden({
  eventId,
  tips,
  authors,
  colNames,
  viewerId,
  canModerate,
  topicNames,
}: {
  eventId: string;
  tips: TipRow[];
  authors: Map<string, MemberSummary>;
  colNames: Map<string, string>;
  viewerId: string;
  canModerate: boolean;
  topicNames: Record<string, string>;
}) {
  const addLink = (
    <Link
      href={`/zwbieb/tip?event=${eventId}`}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
    >
      <Plus />
      Tip toevoegen
    </Link>
  );

  if (tips.length === 0) {
    return <div className="flex justify-end">{addLink}</div>;
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Van leden ({tips.length})
        </h2>
        {addLink}
      </header>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <TipItem
            key={tip.id}
            tip={tip}
            author={authors.get(tip.profile_id)}
            viewerId={viewerId}
            canModerate={canModerate}
            topicName={topicNames[tip.topic_slug] ?? tip.topic_slug}
            colName={tip.col_slug && tip.event_id !== eventId ? colNames.get(tip.col_slug) : undefined}
          />
        ))}
      </ul>
    </section>
  );
}
