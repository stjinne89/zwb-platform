import { MemberLink } from "@/components/member-link";
import type { MemberSummary } from "@/lib/wie-weet-wat/queries";

export function MemberAvatar({ member, size = 32 }: { member: MemberSummary | undefined; size?: number }) {
  const initial = (member?.display_name ?? "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {member?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  );
}

export function MemberChip({ member }: { member: MemberSummary | undefined }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <MemberAvatar member={member} size={24} />
      <MemberLink id={member?.id} className="truncate text-sm font-medium">
        {member?.display_name ?? "Oud-lid"}
      </MemberLink>
    </span>
  );
}
