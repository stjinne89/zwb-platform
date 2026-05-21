import {
  COMMUNITY_ROLE_META,
  normalizeCommunityRoles,
} from "@/lib/community-roles";
import { cn } from "@/lib/utils";

export function CommunityRoleBadges({
  roles,
  isAdmin = false,
  compact = false,
}: {
  roles: readonly string[] | null | undefined;
  isAdmin?: boolean;
  compact?: boolean;
}) {
  const normalized = normalizeCommunityRoles(roles);

  return (
    <div className="flex flex-wrap gap-1">
      {isAdmin && (
        <span
          className={cn(
            "inline-flex items-center rounded-full border border-destructive/25 bg-destructive/10 font-medium text-destructive",
            compact ? "px-1.5 py-0.5 text-[0.7rem]" : "px-2 py-0.5 text-xs",
          )}
        >
          Systeemadmin
        </span>
      )}
      {normalized.map((role) => {
        const meta = COMMUNITY_ROLE_META[role];
        return (
          <span
            key={role}
            title={meta.description}
            className={cn(
              "inline-flex items-center rounded-full border font-medium",
              meta.className,
              compact ? "px-1.5 py-0.5 text-[0.7rem]" : "px-2 py-0.5 text-xs",
            )}
          >
            {compact ? meta.shortLabel : meta.label}
          </span>
        );
      })}
    </div>
  );
}
