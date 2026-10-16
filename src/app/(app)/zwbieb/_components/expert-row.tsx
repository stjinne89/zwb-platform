import { MemberLink } from "@/components/member-link";
import type { ExpertTopicRow, MemberSummary } from "@/lib/zwbieb/queries";
import { AskLink } from "./ask-link";
import { MemberAvatar } from "./member-chip";

/** Een kenner met toelichting, en een knop om het te vragen (niet bij jezelf). */
export function ExpertRow({
  expert,
  member,
  self,
}: {
  expert: ExpertTopicRow;
  member: MemberSummary | undefined;
  self: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <MemberAvatar member={member} />
        <div className="min-w-0">
          <MemberLink id={member?.id} className="block truncate text-sm font-medium">
            {member?.display_name ?? "Lid"}
          </MemberLink>
          {expert.note && <p className="truncate text-xs text-muted-foreground">{expert.note}</p>}
        </div>
      </div>
      {!self && <AskLink expertId={expert.profile_id} topic={expert.topic_slug} />}
    </li>
  );
}
