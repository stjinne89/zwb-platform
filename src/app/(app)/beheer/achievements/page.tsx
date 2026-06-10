import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
import { ManualBadgeManager } from "./_components/manual-badge-manager";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
};

type BadgeRow = {
  id: string;
  title: string;
  description: string | null;
  achievement_code: string | null;
  tier: "bronze" | "silver" | "gold" | "platinum" | null;
  icon: string | null;
  color: string | null;
  trigger_source: "auto" | "manual" | "future";
};

type AwardRow = {
  badge_id: string;
  awarded_at: string;
};

export default async function AchievementBeheerPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedProfile = Array.isArray(params.profile)
    ? params.profile[0]
    : params.profile;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentUserAccess(supabase);
  if (!access.has("achievements.finalize")) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je hebt geen recht om achievements handmatig te beheren.
        </p>
      </div>
    );
  }

  const [{ data: profiles }, { data: badges }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("is_approved", true)
      .order("display_name"),
    supabase
      .from("achievement_badges")
      .select("id, title, description, achievement_code, tier, icon, color, trigger_source")
      .eq("kind", "milestone")
      .order("sort_order"),
  ]);

  const profileOptions = ((profiles ?? []) as ProfileRow[]).map((profile) => ({
    id: profile.id,
    display_name: profile.display_name ?? "Naamloos lid",
  }));
  const selectedProfileId =
    profileOptions.find((profile) => profile.id === requestedProfile)?.id ??
    profileOptions[0]?.id ??
    "";

  const { data: awards } = selectedProfileId
    ? await supabase
        .from("achievement_awards")
        .select("badge_id, awarded_at")
        .eq("profile_id", selectedProfileId)
        .eq("award_scope", "milestone")
        .order("awarded_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Beheer
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Achievementbadges beheren
          </h1>
        </div>
        <HelpLink href="/hulp#badgebeheer" />
      </header>

      {profileOptions.length === 0 ? (
        <section className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Er zijn nog geen goedgekeurde leden om badges aan toe te kennen.
        </section>
      ) : (
        <ManualBadgeManager
          profiles={profileOptions}
          badges={(badges ?? []) as BadgeRow[]}
          awards={(awards ?? []) as AwardRow[]}
          selectedProfileId={selectedProfileId}
        />
      )}
    </div>
  );
}
