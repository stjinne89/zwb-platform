import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  LinkIcon,
  Plus,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { SyncResultsButton } from "./_components/sync-results-button";

const TYPE_LABELS: Record<string, string> = {
  zrl: "ZRL",
  ladder: "Ladder",
  social: "Social",
  outdoor: "Outdoor",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type TeamRow = {
  id: string;
  name: string;
  type: string;
  division: string | null;
  description: string | null;
  is_graveyard: boolean;
  team_members: unknown;
};

type RosterRow = {
  id: string;
  name: string;
  pace_category: string | null;
  team_name: string | null;
  team_id?: string | null;
  claimed_by: string | null;
};

type ResultRow = {
  id: string;
  team_id: string;
  competition: string;
  round_label: string | null;
  round_at: string | null;
  position: number | null;
  points: number | null;
  total_teams: number | null;
  created_at: string;
  external_source?: string | null;
  synced_at?: string | null;
  source_url?: string | null;
};

type TeamCard = {
  id: string | null;
  name: string;
  type: string;
  division: string | null;
  description: string | null;
  isGraveyard: boolean;
  memberCount: number;
  claimedRosterCount: number;
  pendingRosterCount: number;
  rosterCount: number;
  latestResult: ResultRow | null;
  source: "team" | "roster";
};

function normalizeTeamName(name: string | null | undefined) {
  return name?.trim().toLowerCase() ?? "";
}

function relationCount(value: unknown) {
  if (Array.isArray(value)) {
    const first = value[0] as { count?: unknown } | undefined;
    return Number(first?.count ?? 0);
  }
  if (value && typeof value === "object" && "count" in value) {
    return Number((value as { count?: unknown }).count ?? 0);
  }
  return 0;
}

function formatResult(result: ResultRow | null) {
  if (!result) return "Nog geen resultaat";
  const rank = result.position
    ? `#${result.position}${result.total_teams ? `/${result.total_teams}` : ""}`
    : "uitslag";
  return `${result.competition}${result.round_label ? ` - ${result.round_label}` : ""} (${rank})`;
}

function latestByTeam(results: ResultRow[]) {
  const map = new Map<string, ResultRow>();
  for (const result of results) {
    if (!map.has(result.team_id)) map.set(result.team_id, result);
  }
  return map;
}

function buildCards(
  teams: TeamRow[],
  roster: RosterRow[],
  results: ResultRow[],
) {
  const rosterByTeamId = new Map<string, RosterRow[]>();
  const rosterByName = new Map<string, RosterRow[]>();

  for (const entry of roster) {
    if (entry.team_id) {
      rosterByTeamId.set(entry.team_id, [
        ...(rosterByTeamId.get(entry.team_id) ?? []),
        entry,
      ]);
    }
    const normalizedName = normalizeTeamName(entry.team_name);
    if (normalizedName) {
      rosterByName.set(normalizedName, [
        ...(rosterByName.get(normalizedName) ?? []),
        entry,
      ]);
    }
  }

  const latestResults = latestByTeam(results);
  const matchedRosterNames = new Set<string>();

  const activeCards = teams.map<TeamCard>((team) => {
    const byId = rosterByTeamId.get(team.id) ?? [];
    const normalizedName = normalizeTeamName(team.name);
    const byName = rosterByName.get(normalizedName) ?? [];
    if (byName.length > 0) matchedRosterNames.add(normalizedName);

    const rosterEntries = byId.length > 0 ? byId : byName;
    const claimedRosterCount = rosterEntries.filter((r) => r.claimed_by).length;
    const pendingRosterCount = rosterEntries.filter((r) => !r.claimed_by).length;

    return {
      id: team.id,
      name: team.name,
      type: team.type,
      division: team.division,
      description: team.description,
      isGraveyard: team.is_graveyard ?? false,
      memberCount: relationCount(team.team_members),
      claimedRosterCount,
      pendingRosterCount,
      rosterCount: rosterEntries.length,
      latestResult: latestResults.get(team.id) ?? null,
      source: "team",
    };
  });

  const rosterCards = Array.from(rosterByName.entries())
    .filter(([name]) => !matchedRosterNames.has(name))
    .map<TeamCard>(([, entries]) => {
      const first = entries[0];
      const claimedRosterCount = entries.filter((r) => r.claimed_by).length;
      const pendingRosterCount = entries.filter((r) => !r.claimed_by).length;

      return {
        id: null,
        name: first.team_name ?? "Onbekend team",
        type: "zrl",
        division: null,
        description: "Herkend uit de bestaande ledenlijst.",
        isGraveyard: false,
        memberCount: 0,
        claimedRosterCount,
        pendingRosterCount,
        rosterCount: entries.length,
        latestResult: null,
        source: "roster",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  return { activeCards, rosterCards };
}

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    teamsResult,
    meResult,
    resultsResult,
    rosterWithTeamIdResult,
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, type, division, description, is_graveyard, team_members(count)")
      .order("is_graveyard")
      .order("name"),
    user
      ? supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("team_results")
      .select("id, team_id, competition, round_label, round_at, position, points, total_teams, created_at")
      .order("round_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("roster_entries")
      .select("id, name, pace_category, team_name, team_id, claimed_by")
      .order("name"),
  ]);

  let teamsData = (teamsResult.data ?? []) as TeamRow[];
  let teamsError = teamsResult.error;
  const warnings: string[] = [];

  if (teamsResult.error) {
    warnings.push(
      "Teamleden-count kon niet worden gelezen; fallback zonder leden-count gebruikt.",
    );
    const fallbackTeamsResult = await supabase
      .from("teams")
      .select("id, name, type, division, description, is_graveyard")
      .order("is_graveyard")
      .order("name");
    teamsData = ((fallbackTeamsResult.data ?? []) as Omit<TeamRow, "team_members">[])
      .map((team) => ({ ...team, team_members: [] }));
    teamsError = fallbackTeamsResult.error;
  }

  let rosterData = (rosterWithTeamIdResult.data ?? []) as RosterRow[];
  let rosterError = rosterWithTeamIdResult.error;

  if (rosterWithTeamIdResult.error) {
    warnings.push(
      "Roster-team_id kon niet worden gelezen; fallback op team_name gebruikt.",
    );
    const fallbackRosterResult = await supabase
      .from("roster_entries")
      .select("id, name, pace_category, team_name, claimed_by")
      .order("name");
    rosterData = (fallbackRosterResult.data ?? []) as RosterRow[];
    rosterError = fallbackRosterResult.error;
  }

  const isAdmin = meResult.data?.is_admin ?? false;
  const errors = [
    teamsError,
    meResult.error,
    resultsResult.error,
    rosterError,
  ]
    .map((error) => error?.message)
    .filter((message): message is string => Boolean(message));

  const teams = teamsData;
  const roster = rosterData;
  const results = (resultsResult.data ?? []) as ResultRow[];
  const { activeCards, rosterCards } = buildCards(teams, roster, results);
  const allCards = [...activeCards, ...rosterCards];

  const knownRiders = allCards.reduce(
    (total, card) =>
      total +
      Math.max(card.memberCount, card.claimedRosterCount) +
      card.pendingRosterCount,
    0,
  );
  const claimedRiders = allCards.reduce(
    (total, card) => total + card.claimedRosterCount,
    0,
  );
  const pendingRoster = allCards.reduce(
    (total, card) => total + card.pendingRosterCount,
    0,
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Teams</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            ZRL- en Ladder-teams van ZWB, inclusief teams die al uit de
            bestaande ledenlijst herkend zijn.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <SyncResultsButton />
            <Link href="/teams/nieuw">
              <Button>
                <Plus data-icon="inline-start" />
                Nieuw team
              </Button>
            </Link>
          </div>
        )}
      </header>

      {(errors.length > 0 || warnings.length > 0) && (
        <section className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="font-medium">Een deel van de teamdata kon niet geladen worden.</p>
              <p className="text-muted-foreground">
                De pagina toont de beschikbare data en gebruikt waar mogelijk de
                ledenlijst als fallback.
              </p>
              {isAdmin && (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Users className="size-4" />}
          label="Teams zichtbaar"
          value={allCards.length}
        />
        <MetricCard
          icon={<UserCheck className="size-4" />}
          label="Bekende teamleden"
          value={knownRiders}
        />
        <MetricCard
          icon={<LinkIcon className="size-4" />}
          label="Geclaimde leden"
          value={claimedRiders}
        />
        <MetricCard
          icon={<Clock3 className="size-4" />}
          label="Open roster-koppelingen"
          value={pendingRoster}
        />
      </section>

      {allCards.length === 0 ? (
        <section className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
          Er zijn nog geen teams aangemaakt en er staan ook geen teamnamen in de
          ledenlijst.
        </section>
      ) : (
        <div className="space-y-8">
          {activeCards.length > 0 && (
            <TeamSection
              title="Actieve teams"
              description="Teams die als echt teamrecord bestaan en door kunnen klikken naar de detailpagina."
              cards={activeCards}
              isAdmin={isAdmin}
            />
          )}

          {rosterCards.length > 0 && (
            <TeamSection
              title="Uit roster herkend"
              description="Teams die al in de ledenlijst staan, maar nog geen gekoppeld teamrecord hebben."
              cards={rosterCards}
              isAdmin={isAdmin}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function TeamSection({
  title,
  description,
  cards,
  isAdmin,
}: {
  title: string;
  description: string;
  cards: TeamCard[];
  isAdmin: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {cards.map((card) => (
          <li key={`${card.source}-${card.id ?? card.name}`}>
            <TeamOverviewCard card={card} isAdmin={isAdmin} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamOverviewCard({
  card,
  isAdmin,
}: {
  card: TeamCard;
  isAdmin: boolean;
}) {
  const visibleMembers =
    Math.max(card.memberCount, card.claimedRosterCount) + card.pendingRosterCount;

  return (
    <article
      className={`flex h-full flex-col justify-between rounded-md border bg-card p-4 ${
        card.isGraveyard ? "opacity-75" : ""
      }`}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium">
              {card.isGraveyard && (
                <span className="mr-1.5" title="Graveyard team" aria-label="graveyard">
                  🪦
                </span>
              )}
              {card.name}
            </p>
            {card.description && (
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="w-fit rounded-full bg-secondary px-2 py-0.5 text-xs uppercase tracking-wide text-secondary-foreground">
              {TYPE_LABELS[card.type] ?? card.type}
              {card.division ? ` · ${card.division}` : ""}
            </span>
            {card.isGraveyard && (
              <span className="w-fit rounded-full bg-foreground/10 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                Graveyard
              </span>
            )}
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          <CardStat label="Leden" value={visibleMembers} />
          <CardStat label="Gekoppeld" value={card.claimedRosterCount} />
          <CardStat label="Open" value={card.pendingRosterCount} />
        </dl>

        <div className="rounded-md bg-muted p-3 text-sm">
          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
            <Trophy className="size-4" />
            <span>Laatste resultaat</span>
          </div>
          <p className="line-clamp-2">{formatResult(card.latestResult)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        {card.id ? (
          <Link
            href={`/teams/${card.id}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Open team
            <ArrowRight className="size-4" />
          </Link>
        ) : (
          <span className="text-muted-foreground">Nog niet gekoppeld</span>
        )}

        {!card.id && isAdmin && (
          <Link href="/teams/nieuw">
            <Button size="sm" variant="outline">
              <Plus data-icon="inline-start" />
              Team aanmaken
            </Button>
          </Link>
        )}
      </div>
    </article>
  );
}

function CardStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
