import { notFound } from "next/navigation";
import {
  ProfileReadonlyView,
  type ReadonlyProfile,
  type WeeklyAwardView,
} from "@/components/profile-readonly-view";
import { createClient } from "@/lib/supabase/server";
import { type MilestoneBadgeRow } from "../../../profiel/_components/badge-vault";
import { RiderStats } from "./rider-stats";
import { isBadgeVisibleInVault } from "@/lib/achievements/badge-policy";
import { bikeShownOnProfile, type StravaBikeRow } from "@/lib/strava/bikes";
import { getRequestAccess } from "@/lib/auth/request";
import { TIP_COLUMNS, loadTopicCatalog, type ExpertTopicRow, type TipRow } from "@/lib/zwbieb/queries";
import { topicInfo } from "@/lib/zwbieb/topics";
import { MemberKnowledgeSection } from "@/app/(app)/zwbieb/_components/member-knowledge-section";

type ProfileRow = ReadonlyProfile & {
  share_birthday: boolean | null;
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
    intervals_id: isVisible(profile, "intervals_id") ? profile.intervals_id : null,
    zrl_category: isVisible(profile, "zrl_category") ? profile.zrl_category : null,
    ftp_watts: isVisible(profile, "ftp_watts") ? profile.ftp_watts : null,
    weight_kg: isVisible(profile, "weight_kg") ? profile.weight_kg : null,
    bio: isVisible(profile, "bio") ? profile.bio : null,
    birth_date: profile.share_birthday ? profile.birth_date : null,
    is_admin: isVisible(profile, "roles") ? profile.is_admin : false,
    community_roles: isVisible(profile, "roles") ? profile.community_roles : null,
    public_profile_enabled: profile.public_profile_enabled,
  };
}

/**
 * Het ledenprofiel zoals een ander lid het ziet. Kijkt een lid naar zichzelf
 * (via /leden/[id] of de weergave op /profiel), dan toont het alleen wat een
 * ánder lid ziet: geen verborgen tips en geen eigen bewerkknoppen.
 */
export async function MemberProfile({
  profileId,
  viewerId,
}: {
  profileId: string;
  viewerId: string;
}) {
  const supabase = await createClient();
  const self = profileId === viewerId;

  const [
    { data: profile },
    { data: milestoneBadges },
    { data: milestoneAwards },
    { data: weeklyAwards },
    { data: bikes },
    { data: knowledgeTopics },
    { data: knowledgeTips },
    access,
    topicCatalog,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, region, zwift_id, strava_id, intervals_id, zrl_category, ftp_watts, weight_kg, bio, birth_date, share_birthday, is_admin, community_roles, avatar_url, is_approved, public_profile_enabled, profile_visibility",
      )
      .eq("id", profileId)
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
      .eq("profile_id", profileId)
      .eq("award_scope", "milestone"),
    supabase
      .from("achievement_awards")
      .select(
        "id, period_start, value, metadata, achievement_badges(title, description, icon, color)",
      )
      .eq("profile_id", profileId)
      .eq("award_scope", "weekly")
      .order("period_start", { ascending: false }),
    // Via een functie: strava_bikes zelf is alleen voor de eigenaar (0089, 0243).
    supabase.rpc("get_member_profile_bikes", { target_profile_id: profileId }),
    supabase
      .from("member_knowledge_topics")
      .select("profile_id, topic_slug, note")
      .eq("profile_id", profileId),
    (() => {
      const tips = supabase
        .from("member_tips")
        .select(TIP_COLUMNS)
        .eq("profile_id", profileId);
      return (self ? tips.eq("status", "published") : tips)
        .order("created_at", { ascending: false })
        .limit(5);
    })(),
    getRequestAccess(),
    loadTopicCatalog(supabase),
  ]);

  if (!profile) notFound();

  const profileRow = profile as unknown as ProfileRow;
  const shown = visibleProfile(profileRow);
  const showBadges = isVisible(profileRow, "badges");
  const earnedMilestoneIds = showBadges
    ? (milestoneAwards ?? []).map((award) => award.badge_id)
    : [];
  const earnedMilestoneSet = new Set(earnedMilestoneIds);
  const milestones = showBadges
    ? ((milestoneBadges ?? []) as unknown as MilestoneBadgeRow[])
        .filter((badge) => isBadgeVisibleInVault(badge, earnedMilestoneSet.has(badge.id)))
    : [];
  const weeklyList = showBadges
    ? ((weeklyAwards ?? []) as unknown as WeeklyAwardView[])
    : [];
  const shownBikes = ((bikes ?? []) as StravaBikeRow[]).filter(bikeShownOnProfile);

  return (
    <ProfileReadonlyView
      profile={shown}
      milestones={milestones}
      earnedMilestoneIds={earnedMilestoneIds}
      weeklyAwards={weeklyList}
      bikes={shownBikes}
      publicUrl={
        profileRow.public_profile_enabled ? `/profielen/${profileRow.id}` : null
      }
      extraBeforeBadges={
        <>
          <MemberKnowledgeSection
            member={{
              id: profileRow.id,
              display_name: profileRow.display_name ?? "",
              avatar_url: shown.avatar_url,
            }}
            topics={(knowledgeTopics ?? []) as ExpertTopicRow[]}
            tips={(knowledgeTips ?? []) as TipRow[]}
            viewerId={self ? "" : viewerId}
            canModerate={
              !self &&
              (access.has("community.manage") || access.has("content.moderate_posts"))
            }
            labels={topicInfo(topicCatalog)}
          />
          {showBadges && (
            <RiderStats
              profileId={profileRow.id}
              displayName={profileRow.display_name ?? "Dit lid"}
            />
          )}
        </>
      }
    />
  );
}
