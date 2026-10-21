import "server-only";

// ZWBriljant: de ZRS van vroeger in de terugblik. ZRS heeft bij Zwift geen
// historie, maar elke race-uitslag geeft per renner de score na die race
// (`scoreHistory`). Per terugblikmaand nemen we de score na de laatste race tot het
// maandeinde, of de score vóór de eerste race erna; niet elke race heeft er een.
//
// Langzaam en daarom in de wekelijkse job, per run zoveel als het budget toelaat:
// de activiteitenlijst gaat per 20, en de uitslagen zijn bij Zwift twee vragen per
// seconde voor het hele serviceaccount. De voortgang staat in de terugblik zelf
// (`provenance.racen`); de ZRS zelf bewaren we niet, alleen het niveau.

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  ACTIVITIES_PER_PAGE,
  fetchActivitySubgroup,
  fetchRiderRacePage,
  fetchRiderScoreChange,
  type RaceScoreChange,
  type RiderRaceActivity,
} from "@/lib/events/zwift-club";
import { amsterdamDayKey } from "@/lib/training/zwbeterworden";
import { SCALE_VERSION, ZRS_ANCHORS } from "./norms";
import { FACETS, levelAt, scoreFor, type Facet } from "./score";
import { monthEndOfWeek, raceCandidates, type BriljantSources } from "./snapshot";

type Admin = ReturnType<typeof createAdminClient>;

/** Zoveel races proberen we per maand als een uitslag geen score geeft. */
const TRIES_PER_MONTH = 4;
/** Tussen twee vragen naar activiteiten of details; de uitslagen hebben hun eigen wachtrij. */
const SPACING_MS = 300;

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PendingRow = {
  week: string;
  facets: Partial<Record<Facet, number | null>>;
  consistency: number | string | null;
  provenance: BriljantSources;
};

/** Leden met een terugblik waarin racen nog niet is opgezocht, oudste aanmelding eerst. */
export async function membersWithPendingZrs(admin: Admin, terugblikSpan: string): Promise<string[]> {
  const { data } = await admin
    .from("zwbriljant_snapshots")
    .select("profile_id")
    .eq("source", "terugblik")
    .eq("provenance->>scale", SCALE_VERSION)
    .eq("provenance->>terugblik", terugblikSpan)
    .is("provenance->>racen", null)
    .limit(1000);
  return [...new Set(((data ?? []) as Array<{ profile_id: string }>).map((row) => row.profile_id))];
}

/** Zwift weigert de lijst of het lid bestaat niet: niet blijven proberen. */
const refused = (error: unknown) => error instanceof Error && /status (401|403|404)\b/.test(error.message);

/**
 * Vult voor één lid de ZRS van vroeger in, nieuwste maand eerst, tot het budget op
 * is. Geeft het aantal maanden dat is afgehandeld (gevonden of "geen").
 */
export async function fillZrsHistory(
  admin: Admin,
  profileId: string,
  terugblikSpan: string,
  options: { budgetMs: number },
): Promise<number> {
  const started = Date.now();
  const left = () => options.budgetMs - (Date.now() - started);

  const [{ data: profile }, { data: rows }] = await Promise.all([
    admin.from("profiles").select("zwift_id").eq("id", profileId).maybeSingle(),
    admin
      .from("zwbriljant_snapshots")
      .select("week, facets, consistency, provenance")
      .eq("profile_id", profileId)
      .eq("source", "terugblik")
      .eq("provenance->>scale", SCALE_VERSION)
      .eq("provenance->>terugblik", terugblikSpan)
      .is("provenance->>racen", null)
      .order("week", { ascending: false }),
  ]);
  const pending = (rows ?? []) as PendingRow[];
  if (pending.length === 0) return 0;

  const mark = async (row: PendingRow, zrs: number | null) => {
    const facets = { ...row.facets };
    if (zrs != null) facets.racen = Math.round(levelAt(ZRS_ANCHORS, zrs) * 100) / 100;
    const levels = Object.fromEntries(FACETS.map((facet) => [facet, facets[facet] ?? null])) as Record<Facet, number | null>;
    const consistency = row.consistency == null ? null : Number(row.consistency);
    await admin
      .from("zwbriljant_snapshots")
      .update({
        facets,
        score: scoreFor(levels, consistency),
        provenance: { ...row.provenance, racen: zrs != null ? "historie" : "geen" },
      })
      .eq("profile_id", profileId)
      .eq("week", row.week)
      .eq("source", "terugblik");
  };

  const zwiftId = String((profile as { zwift_id: string | null } | null)?.zwift_id ?? "").trim();
  if (!/^\d+$/.test(zwiftId)) {
    // Zonder Zwift-ID valt er niets op te zoeken.
    for (const row of pending) await mark(row, null);
    return pending.length;
  }

  // De races komen nieuw naar oud binnen; per maand (nieuwste eerst) de races tot
  // het maandeinde, de laatste eerst.
  const races: Array<RiderRaceActivity & { day: string }> = [];
  let start = 0;
  let ended = false;
  const scores = new Map<string, RaceScoreChange | null>();
  let handled = 0;

  for (const row of pending) {
    const monthEnd = monthEndOfWeek(row.week);
    // Genoeg van de lijst lezen tot er een race op of vóór het maandeinde is.
    while (!ended && !races.some((race) => race.day <= monthEnd)) {
      if (left() < 2_000) return handled;
      try {
        const page = await fetchRiderRacePage(zwiftId, start);
        races.push(...page.races.map((race) => ({ ...race, day: amsterdamDayKey(new Date(race.startedAt)) })));
        start += ACTIVITIES_PER_PAGE;
        if (page.count < ACTIVITIES_PER_PAGE) ended = true;
      } catch (error) {
        if (!refused(error)) return handled;
        ended = true;
        races.length = 0;
      }
      await pause(SPACING_MS);
    }

    let zrs: number | null = null;
    for (const { race, use } of raceCandidates(races, monthEnd, TRIES_PER_MONTH)) {
      if (!scores.has(race.activityId)) {
        if (left() < 6_000) return handled;
        try {
          const subgroup = await fetchActivitySubgroup(race.activityId);
          await pause(SPACING_MS);
          scores.set(race.activityId, subgroup ? await fetchRiderScoreChange(subgroup, zwiftId) : null);
        } catch (error) {
          if (!refused(error)) return handled;
          scores.set(race.activityId, null);
        }
      }
      zrs = scores.get(race.activityId)?.[use] ?? null;
      if (zrs != null) break;
    }
    // Geen race tot dit maandeinde, of geen score in de laatste paar: "geen".
    await mark(row, zrs);
    handled += 1;
  }
  return handled;
}
