import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AchievementBadge } from "@/components/achievement-badge";
import { AvatarUpload } from "./_components/avatar-upload";
import { BadgeVault, type MilestoneBadgeRow } from "./_components/badge-vault";
import { ProfileForm } from "./_components/profile-form";
import { ProfileHeader } from "./_components/profile-header";
import { PushToggle } from "./_components/push-toggle";
import { StravaSection } from "./_components/strava-section";

type AwardRow = {
  id: string;
  period_start: string;
  value: number | string;
  metadata: { unit?: string } | null;
  achievement_badges:
    | { title: string; icon: string | null; color: string | null; description: string | null }
    | { title: string; icon: string | null; color: string | null; description: string | null }[]
    | null;
};

const DEFAULT_VISIBILITY = {
  avatar: true,
  region: true,
  zwift_id: true,
  strava_id: true,
  zrl_category: true,
  ftp_watts: true,
  weight_kg: true,
  bio: true,
  roles: true,
  badges: true,
};

function awardBadge(row: AwardRow) {
  return Array.isArray(row.achievement_badges)
    ? row.achievement_badges[0]
    : row.achievement_badges;
}

export default async function ProfielPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: awards },
    { data: stravaConn },
    { data: stravaUser },
    { data: milestoneBadges },
    { data: milestoneAwards },
    { data: pushPrefs },
    { data: pushSubs },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, region, zwift_id, strava_id, zrl_category, ftp_watts, weight_kg, bio, is_admin, community_roles, avatar_url, public_profile_enabled, profile_visibility",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("achievement_awards")
      .select(
        "id, period_start, value, metadata, achievement_badges(title, description, icon, color)",
      )
      .eq("profile_id", user.id)
      .eq("award_scope", "weekly")
      .order("period_start", { ascending: false }),
    supabase
      .from("strava_connections")
      .select("athlete_name, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("strava_connections")
      .select("athlete_username")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("achievement_badges")
      .select(
        "id, title, description, icon, color, achievement_code, tier, visual_hint, trigger_source, trigger_config, sort_order",
      )
      .eq("kind", "milestone")
      .order("sort_order"),
    supabase
      .from("achievement_awards")
      .select("badge_id")
      .eq("profile_id", user.id)
      .eq("award_scope", "milestone"),
    supabase
      .from("notification_preferences")
      .select(
        "on_new_event, on_live_started, on_new_badge, on_training_plan, on_event_reminder, on_admin_broadcast",
      )
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id")
      .eq("profile_id", user.id)
      .limit(1),
  ]);

  const awardList = (awards ?? []) as unknown as AwardRow[];
  const milestones = (milestoneBadges ?? []) as unknown as MilestoneBadgeRow[];
  const earnedMilestoneIds = new Set(
    (milestoneAwards ?? []).map((a) => a.badge_id),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProfileHeader
        displayName={profile?.display_name ?? ""}
        email={user.email ?? ""}
        region={profile?.region ?? null}
        avatarUrl={(profile as { avatar_url?: string | null })?.avatar_url ?? null}
        stravaUsername={stravaUser?.athlete_username ?? null}
        stravaConnected={Boolean(stravaConn)}
        communityRoles={profile?.community_roles}
        isAdmin={profile?.is_admin ?? false}
        earnedCount={earnedMilestoneIds.size}
        totalCount={milestones.length}
      />

      <ProfileForm
        email={user.email ?? ""}
        initial={{
          id: profile?.id ?? user.id,
          display_name: profile?.display_name ?? "",
          region: profile?.region ?? "",
          zwift_id: profile?.zwift_id ?? "",
          strava_id: profile?.strava_id ?? "",
          zrl_category: profile?.zrl_category ?? "",
          ftp_watts: profile?.ftp_watts?.toString() ?? "",
          weight_kg: profile?.weight_kg?.toString() ?? "",
          bio: profile?.bio ?? "",
          public_profile_enabled: profile?.public_profile_enabled ?? false,
          profile_visibility: {
            ...DEFAULT_VISIBILITY,
            ...((profile?.profile_visibility as Record<string, boolean> | null) ??
              {}),
          },
        }}
      />

      <AvatarUpload
        currentAvatarUrl={
          (profile as { avatar_url?: string | null })?.avatar_url ?? null
        }
      />

      <StravaSection connection={stravaConn ?? null} />

      <PushToggle
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        initialPreferences={{
          on_new_event: pushPrefs?.on_new_event ?? true,
          on_live_started: pushPrefs?.on_live_started ?? true,
          on_new_badge: pushPrefs?.on_new_badge ?? false,
          on_training_plan: pushPrefs?.on_training_plan ?? true,
          on_event_reminder: pushPrefs?.on_event_reminder ?? true,
          on_admin_broadcast: pushPrefs?.on_admin_broadcast ?? true,
        }}
        hasSubscriptionInDb={(pushSubs?.length ?? 0) > 0}
      />

      {milestones.length > 0 && (
        <BadgeVault
          badges={milestones}
          earnedIds={Array.from(earnedMilestoneIds)}
        />
      )}

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Behaalde weekbadges
        </h2>
        {awardList.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen vastgelegde weekbadges.
          </p>
        ) : (
          (() => {
            // Groepeer awards per badge-titel zodat dezelfde badge met een
            // multiplier (2x, 3x, ...) wordt getoond i.p.v. een kaart per week.
            const grouped = new Map<
              string,
              {
                badge: NonNullable<ReturnType<typeof awardBadge>>;
                count: number;
                latest: AwardRow;
              }
            >();
            for (const award of awardList) {
              const badge = awardBadge(award);
              if (!badge) continue;
              const existing = grouped.get(badge.title);
              if (existing) {
                existing.count += 1;
                if (award.period_start > existing.latest.period_start) {
                  existing.latest = award;
                }
              } else {
                grouped.set(badge.title, { badge, count: 1, latest: award });
              }
            }
            return (
              <ul className="mt-4 flex flex-wrap gap-3">
                {Array.from(grouped.values()).map(({ badge, count, latest }) => (
                  <li
                    key={badge.title}
                    title={`${badge.title} - laatst behaald in week van ${new Date(latest.period_start).toLocaleDateString("nl-NL", { dateStyle: "medium" })}`}
                  >
                    <AchievementBadge
                      title={badge.title}
                      icon={badge.icon}
                      color={badge.color}
                      size="lg"
                      count={count}
                    />
                  </li>
                ))}
              </ul>
            );
          })()
        )}
      </section>
    </div>
  );
}
