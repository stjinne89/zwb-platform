import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AchievementBadge } from "@/components/achievement-badge";
import { createClient } from "@/lib/supabase/server";
import { BadgeVault, type MilestoneBadgeRow } from "../../profiel/_components/badge-vault";
import { ProfileHeader } from "../../profiel/_components/profile-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

function awardBadge(row: AwardRow) {
  return Array.isArray(row.achievement_badges)
    ? row.achievement_badges[0]
    : row.achievement_badges;
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
        "id, display_name, region, zwift_id, strava_id, zrl_category, ftp_watts, weight_kg, bio, is_admin, community_roles, avatar_url, is_approved",
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

  const milestones = (milestoneBadges ?? []) as unknown as MilestoneBadgeRow[];
  const earnedMilestoneIds = (milestoneAwards ?? []).map((award) => award.badge_id);
  const weeklyList = (weeklyAwards ?? []) as unknown as AwardRow[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/leden"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Terug naar leden
      </Link>

      <ProfileHeader
        displayName={profile.display_name ?? ""}
        email=""
        region={profile.region ?? null}
        avatarUrl={profile.avatar_url ?? null}
        stravaUsername={profile.strava_id ?? null}
        stravaConnected={Boolean(profile.strava_id)}
        communityRoles={profile.community_roles}
        isAdmin={profile.is_admin ?? false}
        earnedCount={earnedMilestoneIds.length}
        totalCount={milestones.length}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoTile label="ZRL-categorie" value={profile.zrl_category ?? "-"} />
        <InfoTile label="Zwift-ID" value={profile.zwift_id ?? "-"} />
        <InfoTile
          label="FTP"
          value={profile.ftp_watts ? `${profile.ftp_watts} watt` : "-"}
        />
        <InfoTile
          label="Gewicht"
          value={profile.weight_kg ? `${profile.weight_kg} kg` : "-"}
        />
      </section>

      {profile.bio && (
        <section className="rounded-lg border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Over dit lid
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{profile.bio}</p>
        </section>
      )}

      {milestones.length > 0 && (
        <BadgeVault badges={milestones} earnedIds={earnedMilestoneIds} />
      )}

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Behaalde weekbadges
        </h2>
        {weeklyList.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen vastgelegde weekbadges.
          </p>
        ) : (
          <WeeklyBadges awards={weeklyList} />
        )}
      </section>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function WeeklyBadges({ awards }: { awards: AwardRow[] }) {
  const grouped = new Map<
    string,
    {
      badge: NonNullable<ReturnType<typeof awardBadge>>;
      count: number;
      latest: AwardRow;
    }
  >();

  for (const award of awards) {
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
}
