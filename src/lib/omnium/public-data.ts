// Leeslaag voor de publieke Omnium-pagina's.
//
// Alles hier gaat via de anon-client, dus de RLS-policies bepalen wat er te
// zien is: alleen gepubliceerde seizoenen en edities. Een concept dat per
// ongeluk gelinkt wordt levert een 404 op in plaats van een preview.

import { createPublicClient } from "@/lib/supabase/public";
import type { Discipline } from "@/lib/omnium/scoring";

/**
 * Een mislukte query mag er niet hetzelfde uitzien als een lege uitslag. Zonder
 * dit zou een ontbrekende tabel of een te strakke RLS-policy op de publieke
 * pagina's precies de tekst "nog niets gepubliceerd" opleveren — de stilste
 * manier om een storing te missen.
 */
function logQueryError(where: string, error: { message: string } | null) {
  if (!error) return;
  console.error(`[omnium] ${where} mislukt`, { error: error.message });
}

function num(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type PublicSeason = {
  id: string;
  slug: string;
  name: string;
  rulesMd: string | null;
  zwiftTag: string | null;
};

export type PublicEdition = {
  id: string;
  number: number;
  slug: string;
  title: string;
  subtitle: string | null;
  startsAt: string;
  preshowAt: string | null;
  introMd: string | null;
  youtubeUrl: string | null;
  status: string;
};

export type PublicPart = {
  id: string;
  discipline: Discipline;
  orderIndex: number;
  title: string;
  startsAt: string;
  routeName: string | null;
  routeUrl: string | null;
  world: string | null;
  distanceKm: number | null;
  laps: number | null;
  zwiftEventId: string | null;
  sprintCount: number;
  resultsState: string;
};

export type PublicStanding = {
  riderId: string;
  riderName: string;
  teamName: string | null;
  league: string;
  prologuePoints: number;
  scratchPoints: number;
  sprintPoints: number;
  critPoints: number;
  totalPoints: number;
  rank: number;
  rankShared: boolean;
  isProvisional: boolean;
};

export type PublicSeasonStanding = Omit<PublicStanding, "isProvisional"> & {
  pointsByEdition: Record<string, number>;
  editionsRaced: number;
};

export type PublicResult = {
  riderId: string;
  riderName: string;
  league: string;
  discipline: Discipline;
  status: string;
  position: number | null;
  timeText: string | null;
  segmentSeconds: number | null;
  points: number;
  pointsRaw: number;
  voidedReason: string | null;
};

export type PublicEntrant = {
  riderId: string;
  riderName: string;
  league: string | null;
  discipline: Discipline;
};

type RiderJoin = { display_name: string; team_name: string | null } | null;

/**
 * Supabase typeert een embedded join als array, ook bij een many-to-one.
 * Zelfde afhandeling als in kalender/beheer: pak de eerste als het er een is.
 */
function firstJoin<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

export async function loadCurrentSeason(): Promise<PublicSeason | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_seasons")
    .select("id, slug, name, rules_md, zwift_tag, is_current")
    .order("is_current", { ascending: false })
    .order("slug", { ascending: false })
    .limit(1)
    .maybeSingle();
  logQueryError("seizoen laden", error);
  if (!data) return null;
  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    rulesMd: (data.rules_md as string | null) ?? null,
    zwiftTag: (data.zwift_tag as string | null) ?? null,
  };
}

export async function loadSeasonEditions(
  seasonId: string,
): Promise<PublicEdition[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_editions")
    .select(
      "id, number, slug, title, subtitle, starts_at, preshow_at, intro_md, youtube_url, status",
    )
    .eq("season_id", seasonId)
    .order("number");
  logQueryError("edities laden", error);
  return (data ?? []).map(toEdition);
}

function toEdition(row: Record<string, unknown>): PublicEdition {
  return {
    id: row.id as string,
    number: row.number as number,
    slug: row.slug as string,
    title: row.title as string,
    subtitle: (row.subtitle as string | null) ?? null,
    startsAt: row.starts_at as string,
    preshowAt: (row.preshow_at as string | null) ?? null,
    introMd: (row.intro_md as string | null) ?? null,
    youtubeUrl: (row.youtube_url as string | null) ?? null,
    status: row.status as string,
  };
}

/**
 * Zoekt een editie op slug. De slug is uniek binnen een seizoen, dus bij een
 * botsing over seizoenen heen wint de meest recente — dat is wat iemand die
 * een gedeelde link opent verwacht.
 */
export async function loadEditionBySlug(
  slug: string,
): Promise<{ edition: PublicEdition; seasonId: string } | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_editions")
    .select(
      "id, season_id, number, slug, title, subtitle, starts_at, preshow_at, intro_md, youtube_url, status",
    )
    .eq("slug", slug)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  logQueryError("editie op slug laden", error);
  if (!data) return null;
  return { edition: toEdition(data), seasonId: data.season_id as string };
}

export async function loadEditionParts(editionId: string): Promise<PublicPart[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_edition_events")
    .select(
      "id, discipline, order_index, title, starts_at, route_name, route_url, world, distance_km, laps, zwift_event_id, sprint_count, results_state",
    )
    .eq("edition_id", editionId)
    .neq("discipline", "recon")
    .order("order_index");
  logQueryError("onderdelen laden", error);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    discipline: row.discipline as Discipline,
    orderIndex: row.order_index as number,
    title: row.title as string,
    startsAt: row.starts_at as string,
    routeName: (row.route_name as string | null) ?? null,
    routeUrl: (row.route_url as string | null) ?? null,
    world: (row.world as string | null) ?? null,
    distanceKm: row.distance_km === null ? null : num(row.distance_km),
    laps: (row.laps as number | null) ?? null,
    zwiftEventId: (row.zwift_event_id as string | null) ?? null,
    sprintCount: num(row.sprint_count),
    resultsState: row.results_state as string,
  }));
}

export async function loadEditionStandings(
  editionId: string,
): Promise<PublicStanding[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_edition_standings")
    .select(
      "rider_id, league, prologue_points, scratch_points, sprint_points, crit_points, total_points, rank, rank_shared, is_provisional, omnium_riders(display_name, team_name)",
    )
    .eq("edition_id", editionId)
    .order("league")
    .order("rank");
  logQueryError("editiestand laden", error);
  return (data ?? []).map((row) => {
    const rider = firstJoin<NonNullable<RiderJoin>>(row.omnium_riders);
    return {
      riderId: row.rider_id as string,
      riderName: rider?.display_name ?? "Unknown rider",
      teamName: rider?.team_name ?? null,
      league: row.league as string,
      prologuePoints: num(row.prologue_points),
      scratchPoints: num(row.scratch_points),
      sprintPoints: num(row.sprint_points),
      critPoints: num(row.crit_points),
      totalPoints: num(row.total_points),
      rank: row.rank as number,
      rankShared: row.rank_shared as boolean,
      isProvisional: row.is_provisional as boolean,
    };
  });
}

export async function loadSeasonStandings(
  seasonId: string,
): Promise<PublicSeasonStanding[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_season_standings")
    .select(
      "rider_id, league, points_by_edition, prologue_points, scratch_points, sprint_points, crit_points, total_points, editions_raced, rank, rank_shared, omnium_riders(display_name, team_name)",
    )
    .eq("season_id", seasonId)
    .order("league")
    .order("rank");
  logQueryError("seizoensklassement laden", error);
  return (data ?? []).map((row) => {
    const rider = firstJoin<NonNullable<RiderJoin>>(row.omnium_riders);
    return {
      riderId: row.rider_id as string,
      riderName: rider?.display_name ?? "Unknown rider",
      teamName: rider?.team_name ?? null,
      league: row.league as string,
      pointsByEdition: (row.points_by_edition as Record<string, number>) ?? {},
      prologuePoints: num(row.prologue_points),
      scratchPoints: num(row.scratch_points),
      sprintPoints: num(row.sprint_points),
      critPoints: num(row.crit_points),
      totalPoints: num(row.total_points),
      editionsRaced: num(row.editions_raced),
      rank: row.rank as number,
      rankShared: row.rank_shared as boolean,
    };
  });
}

export async function loadEditionResults(
  editionId: string,
): Promise<PublicResult[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("omnium_results")
    .select(
      "rider_id, league, status, position, time_text, segment_seconds, points, points_raw, voided_reason, omnium_riders(display_name, team_name), omnium_edition_events!inner(discipline, order_index)",
    )
    .eq("edition_id", editionId)
    .order("league")
    .order("position", { nullsFirst: false })
    // De Crit Royale kent geen klassering als de bron alleen punten geeft;
    // dan is aflopend op punten de enige zinnige volgorde.
    .order("points", { ascending: false });
  logQueryError("uitslagen laden", error);
  return (data ?? []).map((row) => {
    const rider = firstJoin<NonNullable<RiderJoin>>(row.omnium_riders);
    const part = firstJoin<{ discipline: Discipline }>(row.omnium_edition_events);
    return {
      riderId: row.rider_id as string,
      riderName: rider?.display_name ?? "Unknown rider",
      league: row.league as string,
      discipline: (part?.discipline ?? "crit") as Discipline,
      status: row.status as string,
      position: (row.position as number | null) ?? null,
      timeText: (row.time_text as string | null) ?? null,
      // numeric(9,3) sinds 0134: PostgREST levert dat als string aan.
      segmentSeconds:
        row.segment_seconds == null ? null : Number(row.segment_seconds) || null,
      points: num(row.points),
      pointsRaw: num(row.points_raw),
      voidedReason: (row.voided_reason as string | null) ?? null,
    };
  });
}

export async function loadEditionEntrants(
  editionId: string,
): Promise<PublicEntrant[]> {
  const supabase = createPublicClient();
  const { data: parts, error: partsError } = await supabase
    .from("omnium_edition_events")
    .select("id, discipline")
    .eq("edition_id", editionId);
  logQueryError("onderdelen voor startlijst laden", partsError);
  const partIds = (parts ?? []).map((part) => part.id as string);
  if (partIds.length === 0) return [];

  const disciplineByPart = new Map(
    (parts ?? []).map((part) => [part.id as string, part.discipline as Discipline]),
  );

  const { data, error } = await supabase
    .from("omnium_entrants")
    .select("edition_event_id, rider_id, league, omnium_riders(display_name, team_name)")
    .in("edition_event_id", partIds);
  logQueryError("startlijst laden", error);

  return (data ?? []).map((row) => {
    const rider = firstJoin<NonNullable<RiderJoin>>(row.omnium_riders);
    return {
      riderId: row.rider_id as string,
      riderName: rider?.display_name ?? "Unknown rider",
      league: (row.league as string | null) ?? null,
      discipline:
        disciplineByPart.get(row.edition_event_id as string) ?? "prologue",
    };
  });
}

/**
 * De editie die bovenaan de homepage hoort: de eerstvolgende, en als het
 * seizoen voorbij is de laatst gereden. De tijdvergelijking staat hier en niet
 * in de pagina, want een servercomponent hoort tijdens het renderen geen
 * onzuivere functie aan te roepen.
 */
export async function loadFeaturedEdition(
  seasonId: string,
): Promise<{ edition: PublicEdition; isUpcoming: boolean } | null> {
  const editions = await loadSeasonEditions(seasonId);
  if (editions.length === 0) return null;
  const now = Date.now();
  const upcoming = editions.find(
    (edition) => new Date(edition.startsAt).getTime() >= now,
  );
  if (upcoming) return { edition: upcoming, isUpcoming: true };
  return { edition: editions[editions.length - 1], isUpcoming: false };
}

/** Alleen de eerstvolgende editie; null als het seizoen voorbij is. */
export async function loadUpcomingEdition(
  seasonId: string,
): Promise<PublicEdition | null> {
  const featured = await loadFeaturedEdition(seasonId);
  return featured?.isUpcoming ? featured.edition : null;
}
