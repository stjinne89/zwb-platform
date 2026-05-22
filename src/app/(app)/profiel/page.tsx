import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AchievementBadge } from "@/components/achievement-badge";
import { CommunityRoleBadges } from "@/components/community-role-badges";
import { ProfileForm } from "./_components/profile-form";
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

  const [{ data: profile }, { data: awards }, { data: stravaConn }] = await Promise.all([
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
    supabase
      .from("strava_connections")
      .select("athlete_name, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle(),
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

      <StravaSection connection={stravaConn ?? null} />

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
          (() => {
            // Groepeer awards per badge-titel zodat dezelfde badge met een
            // multiplier (2×, 3× …) wordt getoond i.p.v. één kaart per week.
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
              <ul className="mt-4 flex flex-wrap gap-2">
                {Array.from(grouped.values()).map(({ badge, count, latest }) => (
                  <li
                    key={badge.title}
                    className="relative"
                    title={`${badge.title} — laatst behaald in week van ${new Date(latest.period_start).toLocaleDateString("nl-NL", { dateStyle: "medium" })}`}
                  >
                    <AchievementBadge
                      title={badge.title}
                      icon={badge.icon}
                      color={badge.color}
                    />
                    {count > 1 && (
                      <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-bold leading-none text-primary-foreground tabular-nums">
                        {count}×
                      </span>
                    )}
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
