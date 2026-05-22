import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ProfileReadonlyView,
  type ReadonlyProfile,
  type WeeklyAwardView,
} from "@/components/profile-readonly-view";
import { createClient } from "@/lib/supabase/server";
import { type MilestoneBadgeRow } from "../../profiel/_components/badge-vault";

type PageProps = {
  params: Promise<{ id: string }>;
};

type ProfileRow = ReadonlyProfile & {
  profile_visibility: Record<string, boolean> | null;
};

function isVisible(profile: ProfileRow, key: string) {
  return profile.profile_visibility?.[key] ?? true;
}

function visibleProfile(profile: ProfileRow): ReadonlyProfile {
  return {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: isVisible(profile, "avatar") ? profile.avatar_url : null,
    region: isVisible(profile, "region") ? profile.region : null,
    zwift_id: isVisible(profile, "zwift_id") ? profile.zwift_id : null,
    strava_id: isVisible(profile, "strava_id") ? profile.strava_id : null,
    zrl_category: isVisible(profile, "zrl_category") ? profile.zrl_category : null,
    ftp_watts: isVisible(profile, "ftp_watts") ? profile.ftp_watts : null,
    weight_kg: isVisible(profile, "weight_kg") ? profile.weight_kg : null,
    bio: isVisible(profile, "bio") ? profile.bio : null,
    is_admin: isVisible(profile, "roles") ? profile.is_admin : false,
    community_roles: isVisible(profile, "roles") ? profile.community_roles : null,
    public_profile_enabled: profile.public_profile_enabled,
  };
}

export default async function LidProfielPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: milestoneBadges },
    { data: milestoneAwards },
    { data: weeklyAwards },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, region, zwift_id, strava_id, zrl_category, ftp_watts, weight_kg, bio, is_admin, community_roles, avatar_url, is_approved, public_profile_enabled, profile_visibility",
      )
      .eq("id", id)
      .eq("is_approved", true)
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
      .eq("profile_id", id)
      .eq("award_scope", "milestone"),
    supabase
      .from("achievement_awards")
      .select(
        "id, period_start, value, metadata, achievement_badges(title, description, icon, color)",
      )
      .eq("profile_id", id)
      .eq("award_scope", "weekly")
      .order("period_start", { ascending: false }),
  ]);

  if (!profile) notFound();

  const profileRow = profile as unknown as ProfileRow;
  const showBadges = isVisible(profileRow, "badges");
  const milestones = showBadges
    ? ((milestoneBadges ?? []) as unknown as MilestoneBadgeRow[])
    : [];
  const earnedMilestoneIds = showBadges
    ? (milestoneAwards ?? []).map((award) => award.badge_id)
    : [];
  const weeklyList = showBadges
    ? ((weeklyAwards ?? []) as unknown as WeeklyAwardView[])
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/leden"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Terug naar leden
      </Link>

      <ProfileReadonlyView
        profile={visibleProfile(profileRow)}
        milestones={milestones}
        earnedMilestoneIds={earnedMilestoneIds}
        weeklyAwards={weeklyList}
        publicUrl={
          profileRow.public_profile_enabled ? `/profielen/${profileRow.id}` : null
        }
      />
    </div>
  );
}
