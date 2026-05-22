import { notFound } from "next/navigation";
import {
  ProfileReadonlyView,
  type ReadonlyProfile,
  type WeeklyAwardView,
} from "@/components/profile-readonly-view";
import { createClient } from "@/lib/supabase/server";
import { type MilestoneBadgeRow } from "@/app/(app)/profiel/_components/badge-vault";

type PageProps = {
  params: Promise<{ id: string }>;
};

type PublicMilestoneRow = MilestoneBadgeRow & {
  earned: boolean;
};

type PublicWeeklyRow = {
  id: string;
  period_start: string;
  value: number | string | null;
  badge_title: string;
  badge_description: string | null;
  badge_icon: string | null;
  badge_color: string | null;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: profileRows },
    { data: milestoneRows },
    { data: weeklyRows },
  ] = await Promise.all([
    supabase.rpc("get_public_profile", { target_profile_id: id }),
    supabase.rpc("get_public_profile_milestone_badges", {
      target_profile_id: id,
    }),
    supabase.rpc("get_public_profile_weekly_awards", { target_profile_id: id }),
  ]);

  const profile = (profileRows?.[0] ?? null) as ReadonlyProfile | null;
  if (!profile) notFound();

  const publicMilestones = (milestoneRows ?? []) as unknown as PublicMilestoneRow[];
  const milestones = publicMilestones.map(
    (badge) =>
      ({
        id: badge.id,
        title: badge.title,
        description: badge.description,
        icon: badge.icon,
        color: badge.color,
        achievement_code: badge.achievement_code,
        tier: badge.tier,
        visual_hint: badge.visual_hint,
        trigger_source: badge.trigger_source,
        trigger_config: badge.trigger_config,
        sort_order: badge.sort_order,
      }) satisfies MilestoneBadgeRow,
  );
  const earnedMilestoneIds = publicMilestones
    .filter((badge) => badge.earned)
    .map((badge) => badge.id);
  const weeklyAwards = ((weeklyRows ?? []) as unknown as PublicWeeklyRow[]).map(
    (award) =>
      ({
        id: award.id,
        period_start: award.period_start,
        value: award.value,
        achievement_badges: {
          title: award.badge_title,
          description: award.badge_description,
          icon: award.badge_icon,
          color: award.badge_color,
        },
      }) satisfies WeeklyAwardView,
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          ZWB Cycling profiel
        </p>
        <ProfileReadonlyView
          profile={profile}
          milestones={milestones}
          earnedMilestoneIds={earnedMilestoneIds}
          weeklyAwards={weeklyAwards}
        />
      </div>
    </main>
  );
}
