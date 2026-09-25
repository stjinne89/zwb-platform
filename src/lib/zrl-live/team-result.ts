// Teamuitslag van een gereden ZRL-race, voor de raceweekpagina (migr. 0188).
//
// De live stand bewaart niets: die rekent elke 15 seconden opnieuw uit
// Zwift-data. Voor een overzicht kan dat niet — één uitslag kost 16
// Zwift-aanroepen en ongeveer acht seconden, en zeven ploegen tegelijk knijpt
// Zwift het serviceaccount af (gemeten 2026-09-22). Daarom bevriezen we de
// plaats van ons team en leest de raceweek alleen nog die rij. Bevriezen
// gebeurt 90 minuten na de start (cron `/api/zrl/freeze` of een bezoek aan de
// live stand), of eerder met de knop "Uitslag vastzetten"; in alle gevallen
// alleen als alle Zwift-data binnen is (`checkTeamResult`).

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

/**
 * Minimale dekking: welk deel van de finishers we op élke passage moeten zien,
 * en over de hele race. Gemeten op 22 september: 559 van 560 passages, en bij
 * WTRL zelf hooguit één renner minder op een passage. Per passage is de
 * belangrijkste: ontbreekt één segment helemaal, dan lijkt het totaal nog ruim
 * voldoende, maar mist iedereen de punten van die passage.
 */
const MIN_PASS_COVERAGE = 0.9;
const MIN_COVERAGE = 0.95;

/** Een ZRL-race duurt ongeveer drie kwartier; daarna staat de uitslag vast. */
export const RACE_OVER_AFTER_MS = 90 * 60 * 1000;

export type TeamResultCheck =
  | { ok: true; result: ZrlTeamResult }
  | { ok: false; reason: string };

/**
 * De plaats van ons team uit een doorgerekende stand, of de reden waarom de
 * stand nog niet betrouwbaar genoeg is om te bewaren. Bevriezen gebeurt maar
 * één keer per bezoek of cronrun, dus liever wachten dan een keurige maar
 * verkeerde plaats wegschrijven: zonder passages telt alleen FIN mee en zou de
 * stand er kloppend uitzien terwijl hij het niet is.
 */
export function checkTeamResult(view: ZrlLiveView): TeamResultCheck {
  if (!view.complete) return { ok: false, reason: "Zwift gaf niet alle gegevens terug" };
  if (!view.score.final) return { ok: false, reason: "uitslag nog niet definitief" };
  if (!view.ownTeam) return { ok: false, reason: "geen eigen team" };
  const own = view.score.teams.find((team) => team.team === view.ownTeam);
  if (!own) return { ok: false, reason: "eigen team niet in de stand" };

  const finishers = new Set(view.score.riders.filter((rider) => !rider.void).map((rider) => rider.athleteId));
  if (finishers.size === 0 || view.score.passes.length === 0) {
    return { ok: false, reason: "geen finishers of geen passages op de route" };
  }
  let seen = 0;
  for (const pass of view.score.passes) {
    const onPass = pass.crossings.filter((crossing) => finishers.has(crossing.athleteId)).length;
    if (onPass / finishers.size < MIN_PASS_COVERAGE) {
      return { ok: false, reason: `${pass.name}: ${onPass} van ${finishers.size} finishers` };
    }
    seen += onPass;
  }
  const expected = finishers.size * view.score.passes.length;
  if (seen / expected < MIN_COVERAGE) {
    return { ok: false, reason: `${seen} van ${expected} passages van finishers` };
  }

  return {
    ok: true,
    result: { rank: own.rank, teams: view.score.teams.length, points: own.total, riders: own.riders },
  };
}

export function teamResultOf(view: ZrlLiveView): ZrlTeamResult | null {
  const check = checkTeamResult(view);
  return check.ok ? check.result : null;
}

/**
 * Bevriest de uitslag van een gereden race en zegt wat er gebeurde, voor de
 * cron. Een databasefout breekt niets: het invriezen mag de live stand nooit
 * breken, en de volgende bezoeker of cronrun probeert het opnieuw.
 */
export async function freezeZrlTeamResult(
  eventId: string,
  teamId: string | null,
  startAt: number,
  view: ZrlLiveView,
  { raceOver = false, now = Date.now() }: { raceOver?: boolean; now?: number } = {},
): Promise<string> {
  if (!raceOver && now - startAt < RACE_OVER_AFTER_MS) return "race nog niet voorbij";
  const check = checkTeamResult(view);
  if (!check.ok) return check.reason;
  const { result } = check;
  try {
    const { error } = await createAdminClient()
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
    return error ? `opslaan mislukt: ${error.message}` : "bevroren";
  } catch {
    // Tabel nog niet toegepast of database even weg: dan blijft de plaats leeg.
    return "opslaan mislukt";
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
