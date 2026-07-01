import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { CommunityRoleBadges } from "@/components/community-role-badges";
import { ApproveButton } from "./_components/approve-button";
import { ClaimButton } from "./_components/claim-button";
import {
  MemberList,
  type MemberAwardBadge,
  type MemberListProfile,
  type MemberZwb,
} from "./_components/member-list";
import { isBadgeVisibleInVault } from "@/lib/achievements/badge-policy";
import { fetchIntervalsWellness } from "@/lib/intervals/client";
import { computeZwbStatus } from "@/lib/training/zwbeterworden";
import type { WellnessDevice } from "@/lib/training/wellness";

type Profile = {
  id: string;
  display_name: string;
  region: string | null;
  zwift_id: string | null;
  zrl_category: string | null;
  zrl_division: string | null;
  wellness_device: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  is_admin: boolean;
  community_roles: string[] | null;
  created_at: string;
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
  award_scope: string;
  achievement_badges:
    | {
        id: string;
        title: string;
        icon: string | null;
        color: string | null;
        kind: string;
        trigger_source: "auto" | "manual" | "future";
      }
    | {
        id: string;
        title: string;
        icon: string | null;
        color: string | null;
        kind: string;
        trigger_source: "auto" | "manual" | "future";
      }[]
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
    access,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, region, zwift_id, zrl_category, zrl_division, wellness_device, avatar_url, is_approved, is_admin, community_roles, created_at",
      )
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
      .select("id, profile_id, award_scope, achievement_badges(id, title, icon, color, kind, trigger_source)")
      .order("awarded_at", { ascending: false })
      .limit(120),
    getCurrentUserAccess(supabase),
  ]);

  const myName = me?.display_name ?? "";
  const canApproveMembers = access.has("members.approve");
  const canManageRoles = access.has("members.manage_roles");
  const allProfiles: Profile[] = profiles ?? [];
  const pendingProfiles = allProfiles.filter((p) => !p.is_approved);
  const profileList = allProfiles.filter((p) => p.is_approved);
  const rosterList: RosterEntry[] = roster ?? [];
  const awardsByProfile = new Map<string, AwardRow[]>();
  for (const award of ((awards ?? []) as unknown as AwardRow[])) {
    const current = awardsByProfile.get(award.profile_id) ?? [];
    if (current.length < 3) current.push(award);
    awardsByProfile.set(award.profile_id, current);
  }

  // ZWBeterWorden-ring per lid dat intervals.icu heeft gekoppeld. De kleur volgt
  // hetzelfde niveau als in het trainingsblok (belasting + gedeeld herstel).
  // Andermans intervals-koppeling valt buiten RLS, dus via de service-role.
  const zwbByProfile = new Map<string, MemberZwb>();
  const profileById = new Map(profileList.map((p) => [p.id, p]));
  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("intervals_connections")
    .select("profile_id, api_key, athlete_id, wellness_opt_in")
    .in(
      "profile_id",
      profileList.map((p) => p.id),
    );
  await Promise.all(
    (
      (connections ?? []) as Array<{
        profile_id: string;
        api_key: string | null;
        athlete_id: string | null;
        wellness_opt_in: boolean | null;
      }>
    ).map(async (conn) => {
      if (!conn.api_key || !conn.athlete_id) return;
      try {
        const wellness = await fetchIntervalsWellness(conn.api_key, conn.athlete_id, 30);
        const prof = profileById.get(conn.profile_id);
        const { advice } = computeZwbStatus(wellness, {
          wellnessOptIn: Boolean(conn.wellness_opt_in),
          zrlDivision: prof?.zrl_division ?? null,
          wellnessDevice: (prof?.wellness_device ?? null) as WellnessDevice | null,
        });
        if (advice.level > 0) {
          zwbByProfile.set(conn.profile_id, {
            level: advice.level,
            ring: advice.ring,
            title: advice.title,
          });
        }
      } catch {
        // intervals.icu onbereikbaar voor dit lid → geen ring
      }
    }),
  );

  const myClaimed = rosterList.filter((r) => r.claimed_by === user.id);
  const unclaimed = rosterList.filter((r) => r.claimed_by === null);
  const suggested = unclaimed.filter((r) => looksLikeMe(r.name, myName));
  const suggestedIds = new Set(suggested.map((r) => r.id));
  const otherUnclaimed = unclaimed.filter((r) => !suggestedIds.has(r.id));

  return (
    <div className="space-y-8">
      <PageHeader title="Leden" />

      {canApproveMembers && pendingProfiles.length > 0 && (
        <section className="space-y-3 rounded-2xl border-2 border-accent bg-card p-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              Wachten op goedkeuring ({pendingProfiles.length})
            </h2>
          </div>
          <ul className="divide-y">
            {pendingProfiles.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{p.display_name}</p>
                  <div className="mt-1">
                    <CommunityRoleBadges
                      roles={p.community_roles}
                      isAdmin={p.is_admin}
                      compact
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Geregistreerd{" "}
                    {new Date(p.created_at).toLocaleString("nl-NL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Amsterdam",
                    })}
                  </p>
                </div>
                <ApproveButton profileId={p.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {(() => {
        const regions = Array.from(
          new Set(
            profileList
              .map((p) => p.region)
              .filter((r): r is string => Boolean(r)),
          ),
        ).sort((a, b) => a.localeCompare(b, "nl"));

        const memberData: MemberListProfile[] = profileList.map((p) => ({
          id: p.id,
          display_name: p.display_name,
          region: p.region,
          zwift_id: p.zwift_id,
          zrl_category: p.zrl_category,
          avatar_url: p.avatar_url,
          is_admin: p.is_admin,
          community_roles: p.community_roles,
          zwb: zwbByProfile.get(p.id) ?? null,
          awards: (awardsByProfile.get(p.id) ?? [])
            .map((a) => {
              const badge = Array.isArray(a.achievement_badges)
                ? a.achievement_badges[0]
                : a.achievement_badges;
              if (!badge) return null;
              if (
                a.award_scope === "milestone" &&
                !isBadgeVisibleInVault(badge, true)
              ) {
                return null;
              }
              return {
                id: a.id,
                title: badge.title,
                icon: badge.icon,
                color: badge.color,
              } satisfies MemberAwardBadge;
            })
            .filter((x): x is MemberAwardBadge => x !== null),
        }));

        return (
          <MemberList
            profiles={memberData}
            regions={regions}
            canManageRoles={canManageRoles}
          />
        );
      })()}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Nog niet geregistreerd ({otherUnclaimed.length})
        </h2>
        {otherUnclaimed.length === 0 ? (
          <EmptyState>Alle bekende leden zijn geregistreerd.</EmptyState>
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
