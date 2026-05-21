import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AchievementBadge } from "@/components/achievement-badge";
import { CommunityRoleBadges } from "@/components/community-role-badges";
import { formatBadgeValue } from "@/lib/achievements/awards";
import { ProfileForm } from "./_components/profile-form";

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

export default async function ProfielPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: awards }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name, region, zwift_id, strava_id, zrl_category, ftp_watts, weight_kg, bio, is_admin, community_roles",
      )
      .eq("id", user.id)
      .single(),
    supabase
      .from("achievement_awards")
      .select(
        "id, period_start, value, metadata, achievement_badges(title, description, icon, color)",
      )
      .eq("profile_id", user.id)
      .order("period_start", { ascending: false }),
  ]);

  const awardList = (awards ?? []) as unknown as AwardRow[];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Profiel</h1>
        <p className="mt-1 text-muted-foreground">
          Deze gegevens zijn zichtbaar voor andere ZWB-leden.
        </p>
      </header>

      <ProfileForm
        email={user.email ?? ""}
        initial={{
          display_name: profile?.display_name ?? "",
          region: profile?.region ?? "",
          zwift_id: profile?.zwift_id ?? "",
          strava_id: profile?.strava_id ?? "",
          zrl_category: profile?.zrl_category ?? "",
          ftp_watts: profile?.ftp_watts?.toString() ?? "",
          weight_kg: profile?.weight_kg?.toString() ?? "",
          bio: profile?.bio ?? "",
        }}
      />

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Communityrollen
        </h2>
        <div className="mt-3">
          <CommunityRoleBadges
            roles={profile?.community_roles}
            isAdmin={profile?.is_admin ?? false}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Deze rollen worden beheerd door admins en vormen straks de basis voor
          fijnmazige rechten.
        </p>
      </section>

      <section className="rounded-lg border bg-card p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Behaalde badges
        </h2>
        {awardList.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nog geen vastgelegde weekbadges.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {awardList.map((award) => {
              const badge = awardBadge(award);
              if (!badge) return null;
              return (
                <li key={award.id} className="rounded-md border bg-background p-3">
                  <AchievementBadge
                    title={badge.title}
                    icon={badge.icon}
                    color={badge.color}
                  />
                  <p className="mt-2 text-sm font-medium">
                    {formatBadgeValue(award.value, award.metadata?.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Week van{" "}
                    {new Date(award.period_start).toLocaleDateString("nl-NL", {
                      dateStyle: "medium",
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
