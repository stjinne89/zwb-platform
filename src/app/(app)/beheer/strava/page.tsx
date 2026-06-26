import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/app-ui";
import { hasActivityScope } from "@/lib/strava/scope";
import { AdminStravaSync, type SyncMember } from "./_components/admin-strava-sync";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Gelijk aan /stats en de dashboard club-stats widget: alleen fietsdisciplines
// tellen mee voor de clubstatistieken.
const CYCLING_SPORTS = [
  "Ride",
  "VirtualRide",
  "MountainBikeRide",
  "EBikeRide",
  "GravelRide",
  "EMountainBikeRide",
  "Velomobile",
  "Handcycle",
];

type ConnectionRow = {
  profile_id: string;
  updated_at: string | null;
  strava_athlete_id: number | string | null;
  scope: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchWindowActivities(admin: any, sinceIso: string) {
  const PAGE = 1000;
  const counts = new Map<string, { count: number; last: string }>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("strava_activities")
      .select("profile_id, start_date")
      .gte("start_date", sinceIso)
      .in("sport_type", CYCLING_SPORTS)
      .order("start_date", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data as { profile_id: string; start_date: string }[]) {
      const current = counts.get(row.profile_id);
      if (current) {
        current.count += 1;
        if (row.start_date > current.last) current.last = row.start_date;
      } else {
        counts.set(row.profile_id, { count: 1, last: row.start_date });
      }
    }
    if (data.length < PAGE) break;
  }
  return counts;
}

export default async function BeheerStravaPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) redirect("/login");
  if (!access.has("community.manage")) redirect("/dashboard");

  const admin = createAdminClient();

  // Statistiekenvenster: laatste 12 maanden, identiek aan /stats.
  const windowStart = new Date();
  windowStart.setUTCDate(1);
  windowStart.setUTCHours(0, 0, 0, 0);
  windowStart.setUTCMonth(windowStart.getUTCMonth() - 11);

  const [{ data: connections }, windowCounts] = await Promise.all([
    admin
      .from("strava_connections")
      .select("profile_id, updated_at, strava_athlete_id, scope")
      .order("updated_at", { ascending: true }),
    fetchWindowActivities(admin, windowStart.toISOString()),
  ]);

  const connectionRows = (connections ?? []) as ConnectionRow[];
  const profileIds = connectionRows.map((c) => c.profile_id);

  const profilesById = new Map<string, string>();
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", profileIds);
    for (const p of (profiles ?? []) as {
      id: string;
      display_name: string | null;
    }[]) {
      profilesById.set(p.id, p.display_name ?? "");
    }
  }

  const members: SyncMember[] = connectionRows.map((c) => {
    const stats = windowCounts.get(c.profile_id);
    return {
      profileId: c.profile_id,
      name: profilesById.get(c.profile_id) || "Onbekend lid",
      activityCount: stats?.count ?? 0,
      lastActivity: stats?.last ?? null,
      connectedAt: c.updated_at,
      missingActivityScope: !hasActivityScope(c.scope),
    };
  });

  // Volgorde: eerst leden zonder activiteiten-recht (vereisen actie van het
  // lid), dan leden zonder ritten in het venster, daarna alfabetisch.
  const rank = (m: SyncMember) =>
    m.missingActivityScope ? 0 : m.activityCount === 0 ? 1 : 2;
  members.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, "nl");
  });

  const scopeIssueCount = members.filter((m) => m.missingActivityScope).length;
  const missingCount = members.filter(
    (m) => m.activityCount === 0 && !m.missingActivityScope,
  ).length;
  const inStatsCount = members.filter((m) => m.activityCount > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Beheer"
        title="Strava-sync"
        description="Start de Strava-sync voor leden zonder ritten in de statistieken, of herbereken badges en cols — het lid hoeft niets te doen."
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Gekoppeld" value={members.length} />
        <Metric label="In stats (12 mnd)" value={inStatsCount} />
        <Metric label="Niet zichtbaar" value={missingCount} highlight={missingCount > 0} />
        <Metric
          label="Geen activiteiten-recht"
          value={scopeIssueCount}
          highlight={scopeIssueCount > 0}
        />
      </section>

      <AdminStravaSync members={members} />
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          highlight ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
