import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { WhatsAppGroupBlock } from "@/components/whatsapp-link";
import { AdminPanel, DeleteResultButton } from "./_components/admin-panel";
import { GraveyardToggle } from "./_components/graveyard-toggle";

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  social: "Social",
  outdoor: "Outdoor",
};

const ROLE_LABELS: Record<string, string> = {
  captain: "Captain",
  "co-captain": "Co-captain",
  member: "Lid",
};

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: team } = await supabase
    .from("teams")
    .select("id, name, type, division, description, captain_id, is_graveyard")
    .eq("id", id)
    .single();

  if (!team) notFound();

  const [
    { data: members },
    { data: results },
    access,
    { data: allProfiles },
    { data: rosterPending },
    { data: waGroups },
  ] = await Promise.all([
    supabase
      .from("team_members")
      .select("profile_id, role, profiles(display_name, region, zrl_category)")
      .eq("team_id", id),
    supabase
      .from("team_results")
      .select("*")
      .eq("team_id", id)
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    getCurrentUserAccess(supabase),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("roster_entries")
      .select("id, name, pace_category, zwift_id")
      .eq("team_id", id)
      .is("claimed_by", null)
      .order("name"),
    supabase
      .from("whatsapp_groups")
      .select("id, name, invite_url, description")
      .eq("team_id", id)
      .order("display_order")
      .order("name"),
  ]);

  const canManageRoster = access.has("teams.manage_roster");
  const canManageResults = access.has("teams.manage_results");
  const isCaptain = !!members?.find(
    (m) =>
      m.profile_id === user?.id &&
      (m.role === "captain" || m.role === "co-captain"),
  );
  const canManage = canManageRoster || canManageResults || isCaptain;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flatMembers = (members ?? []).map((m: any) => ({
    profile_id: m.profile_id,
    role: m.role,
    display_name: m.profiles?.display_name ?? "Onbekend",
    region: m.profiles?.region as string | null,
    zrl_category: m.profiles?.zrl_category as string | null,
  }));

  const memberIds = new Set(flatMembers.map((m) => m.profile_id));
  const candidates = (allProfiles ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <div className="space-y-6">
      <Link
        href="/teams"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Teams
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
            {TYPE_LABELS[team.type] ?? team.type}
            {team.division ? ` · ${team.division}` : ""}
          </span>
          {team.is_graveyard && (
            <span className="inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              🪦 Graveyard
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {team.is_graveyard && <span className="mr-2">🪦</span>}
          {team.name}
        </h1>
        {team.description && (
          <p className="text-muted-foreground">{team.description}</p>
        )}
        {team.is_graveyard && (
          <p className="rounded-md border border-foreground/15 bg-muted p-3 text-sm text-muted-foreground">
            Dit team staat in de WTRL-graveyard — niet meer actief in de huidige
            competitie-rondes. Resultaten uit het verleden blijven zichtbaar.
          </p>
        )}
        {canManageRoster && (
          <div className="pt-2">
            <GraveyardToggle teamId={team.id} isGraveyard={team.is_graveyard ?? false} />
          </div>
        )}
      </header>

      <WhatsAppGroupBlock
        scope="team"
        groups={waGroups ?? []}
        canManage={canManage}
      />

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Leden ({flatMembers.length})
        </h2>
        {flatMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen leden.</p>
        ) : (
          <ul className="divide-y">
            {flatMembers.map((m) => (
              <li
                key={m.profile_id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  {m.display_name}
                  {m.zrl_category && (
                    <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      {m.zrl_category}
                    </span>
                  )}
                  {m.region && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {m.region}
                    </span>
                  )}
                </span>
                {m.role !== "member" && (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {rosterPending && rosterPending.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Nog niet geregistreerd ({rosterPending.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Bekend uit de teamlijst — worden automatisch lid zodra ze hun ZWB-account
            koppelen via{" "}
            <Link href="/leden" className="underline">
              Leden
            </Link>
            .
          </p>
          <ul className="divide-y">
            {rosterPending.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  {r.name}
                  {r.pace_category && (
                    <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                      {r.pace_category}
                    </span>
                  )}
                  {r.zwift_id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      Zwift {r.zwift_id}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">⏳</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resultaten
        </h2>
        {!results || results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog geen resultaten ingevoerd.</p>
        ) : (
          <ul className="divide-y">
            {results.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.competition}
                    {r.round_label ? ` — ${r.round_label}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.round_at
                      ? new Date(r.round_at).toLocaleDateString("nl-NL", {
                          dateStyle: "medium",
                        })
                      : "—"}
                    {r.position
                      ? ` · #${r.position}${r.total_teams ? `/${r.total_teams}` : ""}`
                      : ""}
                    {r.points !== null && r.points !== undefined
                      ? ` · ${r.points} pt`
                      : ""}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                {(canManageResults || isCaptain) && (
                  <DeleteResultButton teamId={team.id} resultId={r.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && (
        <AdminPanel
          teamId={team.id}
          candidates={candidates}
          members={flatMembers}
        />
      )}
    </div>
  );
}
