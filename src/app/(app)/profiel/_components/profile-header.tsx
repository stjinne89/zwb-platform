import { CommunityRoleBadges } from "@/components/community-role-badges";

function initials(name: string): string {
  if (!name) return "??";
  const parts = name
    .replace(/\([^)]*\)|\[[^\]]*\]/g, "") // strip [ZWB] / (info) suffixes
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileHeader({
  displayName,
  email,
  region,
  avatarUrl,
  stravaUsername,
  stravaConnected,
  communityRoles,
  isAdmin,
  earnedCount,
  totalCount,
}: {
  displayName: string;
  email: string;
  region: string | null;
  avatarUrl: string | null;
  stravaUsername: string | null;
  stravaConnected: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  communityRoles: any;
  isAdmin: boolean;
  earnedCount: number;
  totalCount: number;
}) {
  const initialsText = initials(displayName || email);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      {/* Banner met petrol-gradient */}
      <div className="h-20 w-full bg-gradient-to-br from-zwb-petrol via-zwb-teal to-zwb-petrol-dark sm:h-24" />

      <div className="-mt-12 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          {/* Avatar */}
          <div className="relative">
            <div className="size-24 overflow-hidden rounded-full border-4 border-card bg-zwb-petrol shadow-lg sm:size-28">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  width={112}
                  height={112}
                  className="size-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-gradient-to-br from-zwb-petrol to-zwb-petrol-dark text-2xl font-semibold text-white sm:text-3xl">
                  {initialsText}
                </div>
              )}
            </div>
            {stravaConnected && (
              <span
                className="absolute -bottom-1 -right-1 inline-flex items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white shadow"
                title={stravaUsername ? `Strava: ${stravaUsername}` : "Gekoppeld met Strava"}
              >
                Strava
              </span>
            )}
          </div>

          {/* Naam + meta */}
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {displayName || email.split("@")[0]}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {region ? <span>{region}</span> : <span>Geen regio</span>}
              {stravaUsername && (
                <>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span>@{stravaUsername} op Strava</span>
                </>
              )}
            </p>
            {email && (
              <p className="mt-0.5 text-xs text-muted-foreground">{email}</p>
            )}
          </div>

          {/* Badge-counter */}
          {totalCount > 0 && (
            <div className="rounded-lg border bg-background px-4 py-2 text-center sm:text-right">
              <p className="text-2xl font-semibold tabular-nums">{earnedCount}</p>
              <p className="text-xs text-muted-foreground">
                / {totalCount} badges
              </p>
            </div>
          )}
        </div>

        {/* Rollen */}
        <div className="mt-4">
          <CommunityRoleBadges roles={communityRoles} isAdmin={isAdmin} />
        </div>
      </div>
    </section>
  );
}
