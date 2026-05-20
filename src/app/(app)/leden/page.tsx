import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AchievementBadge } from "@/components/achievement-badge";
import { ClaimButton } from "./_components/claim-button";

type Profile = {
  id: string;
  display_name: string;
  region: string | null;
  zwift_id: string | null;
  zrl_category: string | null;
};

type RosterEntry = {
  id: string;
  name: string;
  zwift_id: string | null;
  pace_category: string | null;
  team_name: string | null;
  claimed_by: string | null;
};

type AwardRow = {
  id: string;
  profile_id: string;
  achievement_badges:
    | { title: string; icon: string | null; color: string | null }
    | { title: string; icon: string | null; color: string | null }[]
    | null;
};

// Simple fuzzy match: strips bracketed annotations like "[ZWB]" / "(ZWB)" and
// lowercases for a loose contains-check both ways.
function normalize(s: string): string {
  return s
    .replace(/\[[^\]]*\]|\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function looksLikeMe(rosterName: string, myName: string): boolean {
  const a = normalize(rosterName);
  const b = normalize(myName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export default async function LedenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profiles },
    { data: roster },
    { data: me },
    { data: awards },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, region, zwift_id, zrl_category")
      .order("display_name"),
    supabase
      .from("roster_entries")
      .select("id, name, zwift_id, pace_category, team_name, claimed_by")
      .order("name"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("achievement_awards")
      .select("id, profile_id, achievement_badges(title, icon, color)")
      .order("awarded_at", { ascending: false })
      .limit(120),
  ]);

  const myName = me?.display_name ?? "";
  const profileList: Profile[] = profiles ?? [];
  const rosterList: RosterEntry[] = roster ?? [];
  const awardsByProfile = new Map<string, AwardRow[]>();
  for (const award of ((awards ?? []) as unknown as AwardRow[])) {
    const current = awardsByProfile.get(award.profile_id) ?? [];
    if (current.length < 3) current.push(award);
    awardsByProfile.set(award.profile_id, current);
  }

  const myClaimed = rosterList.filter((r) => r.claimed_by === user.id);
  const unclaimed = rosterList.filter((r) => r.claimed_by === null);
  const suggested = unclaimed.filter((r) => looksLikeMe(r.name, myName));
  const suggestedIds = new Set(suggested.map((r) => r.id));
  const otherUnclaimed = unclaimed.filter((r) => !suggestedIds.has(r.id));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Leden</h1>
        <p className="mt-1 text-muted-foreground">
          Geregistreerde leden en bekende ZWB&apos;ers die nog niet ingelogd zijn.
        </p>
      </header>

      {suggested.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-foreground/20 bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Mogelijk jij?
          </h2>
          <ul className="divide-y">
            {suggested.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <RosterRow entry={r} />
                <ClaimButton entryId={r.id} variant="suggested" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {myClaimed.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Door jou geclaimd
          </h2>
          <ul className="divide-y">
            {myClaimed.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <RosterRow entry={r} />
                <ClaimButton entryId={r.id} variant="unclaim" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Geregistreerd ({profileList.length})
        </h2>
        {profileList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog niemand.</p>
        ) : (
          <ul className="divide-y">
            {profileList.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="min-w-0">
                  <p>
                    {p.display_name}
                    {p.zrl_category && (
                      <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                        {p.zrl_category}
                      </span>
                    )}
                    {p.region && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.region}
                      </span>
                    )}
                  </p>
                  <MemberBadges awards={awardsByProfile.get(p.id) ?? []} />
                </div>
                {p.zwift_id && (
                  <span className="text-xs text-muted-foreground">
                    Zwift {p.zwift_id}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Nog niet geregistreerd ({otherUnclaimed.length})
        </h2>
        {otherUnclaimed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Alle bekende leden zijn geregistreerd 🎉</p>
        ) : (
          <ul className="divide-y">
            {otherUnclaimed.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <RosterRow entry={r} />
                <ClaimButton entryId={r.id} variant="claim" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MemberBadges({ awards }: { awards: AwardRow[] }) {
  if (awards.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {awards.map((award) => {
        const badge = Array.isArray(award.achievement_badges)
          ? award.achievement_badges[0]
          : award.achievement_badges;
        if (!badge) return null;
        return (
          <AchievementBadge
            key={award.id}
            title={badge.title}
            icon={badge.icon}
            color={badge.color}
            compact
          />
        );
      })}
    </div>
  );
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  return (
    <span>
      {entry.name}
      {entry.pace_category && (
        <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
          {entry.pace_category}
        </span>
      )}
      {entry.team_name && (
        <span className="ml-2 text-xs text-muted-foreground">
          {entry.team_name}
        </span>
      )}
      {entry.zwift_id && (
        <span className="ml-2 text-xs text-muted-foreground">
          Zwift {entry.zwift_id}
        </span>
      )}
    </span>
  );
}
