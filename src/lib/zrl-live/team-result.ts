// Teamuitslag van een gereden ZRL-race, voor de raceweekpagina (migr. 0188).
//
// De live stand bewaart niets: die rekent elke 15 seconden opnieuw uit
// Zwift-data. Voor een overzicht kan dat niet — één uitslag kost 16
// Zwift-aanroepen en ongeveer acht seconden, en zeven ploegen tegelijk knijpt
// Zwift het serviceaccount af (gemeten 2026-09-22). Daarom bevriezen we de
// uitslag: wie de live stand opent nadat de race is gereden, schrijft de plaats
// van ons team één keer weg, en de raceweek leest alleen nog die rij.

import { createAdminClient } from "@/lib/supabase/admin";
import type { ZrlLiveView } from "@/lib/zrl-live/snapshot";

export type ZrlTeamResult = {
  /** Plaats van ons team in de divisie. */
  rank: number;
  /** Aantal teams in de stand. */
  teams: number;
  points: number;
  riders: number;
};

/** Onder deze dekking van de verwachte doorkomsten rekenen we niet. */
const MIN_COVERAGE = 0.8;

/** Een ZRL-race duurt ongeveer drie kwartier; daarna staat de uitslag vast. */
export const RACE_OVER_AFTER_MS = 90 * 60 * 1000;

/**
 * De plaats van ons team uit een doorgerekende stand, of null als de stand niet
 * betrouwbaar genoeg is om te bewaren: nog niet definitief, ons team staat er
 * niet in, of Zwift gaf te weinig segmentpassages terug. Dat laatste is de
 * belangrijkste: zonder passages telt alleen FIN mee en zou de stand er kloppend
 * uitzien terwijl hij het niet is.
 */
export function teamResultOf(view: ZrlLiveView): ZrlTeamResult | null {
  if (!view.score.final || !view.ownTeam) return null;
  const own = view.score.teams.find((team) => team.team === view.ownTeam);
  if (!own) return null;

  const finishers = view.score.riders.filter((rider) => !rider.void).length;
  const expected = finishers * view.score.passes.length;
  const seen = view.score.passes.reduce((total, pass) => total + pass.crossings.length, 0);
  if (expected === 0 || seen / expected < MIN_COVERAGE) return null;

  return { rank: own.rank, teams: view.score.teams.length, points: own.total, riders: own.riders };
}

/**
 * Bevriest de uitslag van een gereden race. Stil bij een fout: het invriezen mag
 * de live stand nooit breken, en de volgende bezoeker probeert het opnieuw.
 */
export async function freezeZrlTeamResult(
  eventId: string,
  teamId: string | null,
  startAt: number,
  view: ZrlLiveView,
  now = Date.now(),
): Promise<void> {
  if (now - startAt < RACE_OVER_AFTER_MS) return;
  const result = teamResultOf(view);
  if (!result) return;
  try {
    await createAdminClient()
      .from("zrl_team_results")
      .upsert(
        {
          event_id: eventId,
          team_id: teamId,
          rank: result.rank,
          teams: result.teams,
          points: result.points,
          riders: result.riders,
          computed_at: new Date(now).toISOString(),
        },
        { onConflict: "event_id" },
      );
  } catch {
    // Tabel nog niet toegepast of database even weg: dan blijft de plaats leeg.
  }
}

/** De bevroren uitslagen van deze teamevents. Leest alleen; bevraagt Zwift niet. */
export async function loadZrlTeamResults(eventIds: string[]): Promise<Map<string, ZrlTeamResult>> {
  const results = new Map<string, ZrlTeamResult>();
  if (eventIds.length === 0) return results;
  try {
    const { data } = await createAdminClient()
      .from("zrl_team_results")
      .select("event_id, rank, teams, points, riders")
      .in("event_id", eventIds);
    for (const row of (data ?? []) as Array<{
      event_id: string;
      rank: number;
      teams: number;
      points: number;
      riders: number;
    }>) {
      results.set(row.event_id, {
        rank: row.rank,
        teams: row.teams,
        points: row.points,
        riders: row.riders,
      });
    }
  } catch {
    // Zonder tabel toont de raceweek gewoon geen plaats.
  }
  return results;
}
