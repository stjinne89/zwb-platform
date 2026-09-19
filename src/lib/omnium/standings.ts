// Herberekent en bewaart de twee Omnium-klassementen.
//
// De standings zijn afgeleid van omnium_results, maar worden opgeslagen: de
// publieke pagina's moeten goedkoop zijn onder verkeer vanaf Zwift en YouTube,
// en de rangorde mét tiebreak past niet in één `order by`. Deze module is de
// enige plek die die tabellen vult.
//
// Belangrijk voor de uitzending: dit werkt ook met twee van de vier onderdelen.
// Na elk afgerond onderdeel draait dit opnieuw en staat de tussenstand publiek.

import type { createAdminClient } from "@/lib/supabase/admin";
import { resolveScoring } from "@/lib/omnium/scales";
import {
  DISCIPLINES,
  scoreSeason,
  scoreStoredEdition,
  type Discipline,
  type ScoredResult,
} from "@/lib/omnium/scoring";

type Admin = ReturnType<typeof createAdminClient>;
type Outcome = { ok: true; riders: number } | { ok: false; error: string };

type ResultRow = {
  id: string;
  rider_id: string;
  league: string;
  status: ScoredResult["status"];
  position: number | null;
  overall_position: number | null;
  time_seconds: number | string | null;
  time_text: string | null;
  segment_seconds: number | string | null;
  finish_points: string | number;
  sprint_points: string | number;
  points: string | number;
  points_raw: string | number;
  voided_reason: string | null;
  omnium_edition_events: { discipline: Discipline } | null;
};

/** Supabase levert numeric als string terug; dat mag niet stil 0 worden. */
function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Zelfde verhaal, maar voor een kolom die leeg mág zijn. Sinds 0134 zijn de
 * tijden numeric(9,3) en komen ze dus als string binnen; zonder deze omzetting
 * zou "1362.187" als tekst blijven staan en bij het sorteren vóór "1358" komen.
 */
function numOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function loadScoring(admin: Admin, seasonId: string) {
  const { data } = await admin
    .from("omnium_seasons")
    .select("scoring")
    .eq("id", seasonId)
    .maybeSingle();
  return resolveScoring(data?.scoring);
}

/**
 * Leest de opgeslagen uitslagen van één editie, past de crit-nulregel opnieuw
 * toe en schrijft zowel de bijgewerkte puntenkolommen als de editiestand terug.
 */
export async function recomputeEditionStandings(
  admin: Admin,
  editionId: string,
): Promise<Outcome> {
  const { data: edition, error: editionError } = await admin
    .from("omnium_editions")
    .select("id, season_id")
    .eq("id", editionId)
    .maybeSingle();
  if (editionError) return { ok: false, error: editionError.message };
  if (!edition) return { ok: false, error: "Editie niet gevonden." };

  const scoring = await loadScoring(admin, edition.season_id as string);

  const { data: rows, error } = await admin
    .from("omnium_results")
    .select(
      "id, rider_id, league, status, position, overall_position, time_seconds, time_text, segment_seconds, finish_points, sprint_points, points, points_raw, voided_reason, omnium_edition_events!inner(discipline)",
    )
    .eq("edition_id", editionId);
  if (error) return { ok: false, error: error.message };

  const stored = (rows ?? []) as unknown as ResultRow[];
  const results: ScoredResult[] = stored.map((row) => ({
    riderId: row.rider_id,
    discipline: (row.omnium_edition_events?.discipline ?? "crit") as Discipline,
    league: row.league,
    status: row.status,
    position: row.position,
    overallPosition: row.overall_position,
    timeSeconds: numOrNull(row.time_seconds),
    timeText: row.time_text,
    segmentSeconds: numOrNull(row.segment_seconds),
    finishPoints: num(row.finish_points),
    sprintPoints: num(row.sprint_points),
    points: num(row.points),
    pointsRaw: num(row.points_raw),
    voidedReason: row.voided_reason,
    raced: row.status === "finished" || row.status === "dnf",
  }));

  // Alleen onderdelen waarvoor daadwerkelijk uitslagen zijn ingevoerd tellen
  // mee; anders zou een lege Crit Royale de stand als compleet markeren.
  const { data: parts, error: partsError } = await admin.from("omnium_edition_events")
    .select("discipline, results_state").eq("edition_id", editionId);
  if (partsError) return { ok: false, error: partsError.message };
  const present = DISCIPLINES.filter((discipline) =>
    results.some((row) => row.discipline === discipline) &&
    parts?.some((p) => p.discipline === discipline && p.results_state === "final"),
  );

  const score = scoreStoredEdition(results, present, scoring);

  // De crit-nulregel kan punten hebben gewijzigd; die terugschrijven zodat de
  // publieke uitslagpagina en de stand hetzelfde verhaal vertellen.
  const byRiderDiscipline = new Map(
    score.results.map((row) => [`${row.riderId}|${row.discipline}`, row]),
  );
  for (const row of stored) {
    const discipline = row.omnium_edition_events?.discipline;
    if (!discipline) continue;
    const scored = byRiderDiscipline.get(`${row.rider_id}|${discipline}`);
    if (!scored) continue;
    if (
      num(row.points) === scored.points &&
      (row.voided_reason ?? null) === scored.voidedReason
    ) {
      continue;
    }
    const { error: updateError } = await admin
      .from("omnium_results")
      .update({ points: scored.points, voided_reason: scored.voidedReason })
      .eq("id", row.id);
    if (updateError) return { ok: false, error: updateError.message };
  }

  const { error: clearError } = await admin
    .from("omnium_edition_standings")
    .delete()
    .eq("edition_id", editionId);
  if (clearError) return { ok: false, error: clearError.message };

  if (score.standings.length > 0) {
    const { error: insertError } = await admin
      .from("omnium_edition_standings")
      .insert(
        score.standings.map((standing) => ({
          edition_id: editionId,
          rider_id: standing.riderId,
          league: standing.league,
          prologue_points: standing.prologuePoints,
          scratch_points: standing.scratchPoints,
          sprint_points: standing.sprintPoints,
          crit_points: standing.critPoints,
          total_points: standing.totalPoints,
          rank: standing.rank,
          rank_shared: standing.rankShared,
          wins: standing.wins,
          positions: standing.positions,
          is_provisional: standing.isProvisional,
        })),
      );
    if (insertError) return { ok: false, error: insertError.message };
  }

  const season = await recomputeSeasonStandings(
    admin,
    edition.season_id as string,
  );
  if (!season.ok) return season;

  return { ok: true, riders: score.standings.length };
}

/** Telt alle editiestanden van een seizoen op tot de GC. */
export async function recomputeSeasonStandings(
  admin: Admin,
  seasonId: string,
): Promise<Outcome> {
  const scoring = await loadScoring(admin, seasonId);

  const { data: editions, error: editionsError } = await admin
    .from("omnium_editions")
    .select("id, number")
    .eq("season_id", seasonId)
    .order("number");
  if (editionsError) return { ok: false, error: editionsError.message };
  if (!editions || editions.length === 0) return { ok: true, riders: 0 };

  const { data: rows, error } = await admin
    .from("omnium_edition_standings")
    .select(
      "edition_id, rider_id, league, prologue_points, scratch_points, sprint_points, crit_points, total_points, rank, rank_shared, wins, positions, is_provisional",
    )
    .in(
      "edition_id",
      editions.map((edition) => edition.id as string),
    );
  if (error) return { ok: false, error: error.message };

  const numberByEdition = new Map(
    editions.map((edition) => [edition.id as string, edition.number as number]),
  );
  const grouped = new Map<
    number,
    Array<{
      riderId: string;
      league: string;
      prologuePoints: number;
      scratchPoints: number;
      sprintPoints: number;
      critPoints: number;
      totalPoints: number;
      rank: number;
      rankShared: boolean;
      wins: number;
      positions: number[];
      isProvisional: boolean;
    }>
  >();

  for (const row of rows ?? []) {
    const number = numberByEdition.get(row.edition_id as string);
    if (number === undefined) continue;
    const list = grouped.get(number) ?? [];
    list.push({
      riderId: row.rider_id as string,
      league: row.league as string,
      prologuePoints: num(row.prologue_points as string),
      scratchPoints: num(row.scratch_points as string),
      sprintPoints: num(row.sprint_points as string),
      critPoints: num(row.crit_points as string),
      totalPoints: num(row.total_points as string),
      // wins en positions gaan over onderdelen, niet over editie-rangnummers:
      // de seizoenstiebreak telt gewonnen onderdelen en doet een countback op
      // de beste klasseringen.
      rank: row.rank as number,
      rankShared: row.rank_shared as boolean,
      wins: (row.wins as number) ?? 0,
      positions: ((row.positions as number[] | null) ?? []).slice(),
      isProvisional: row.is_provisional as boolean,
    });
    grouped.set(number, list);
  }

  const season = scoreSeason(
    [...grouped.entries()].map(([number, standings]) => ({ number, standings })),
    scoring,
  );

  const { error: clearError } = await admin
    .from("omnium_season_standings")
    .delete()
    .eq("season_id", seasonId);
  if (clearError) return { ok: false, error: clearError.message };

  if (season.length > 0) {
    const { error: insertError } = await admin
      .from("omnium_season_standings")
      .insert(
        season.map((standing) => ({
          season_id: seasonId,
          rider_id: standing.riderId,
          league: standing.league,
          points_by_edition: standing.pointsByEdition,
          prologue_points: standing.prologuePoints,
          scratch_points: standing.scratchPoints,
          sprint_points: standing.sprintPoints,
          crit_points: standing.critPoints,
          total_points: standing.totalPoints,
          editions_raced: standing.editionsRaced,
          rank: standing.rank,
          rank_shared: standing.rankShared,
        })),
      );
    if (insertError) return { ok: false, error: insertError.message };
  }

  return { ok: true, riders: season.length };
}
