import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildBoard, seedFor, type FieldRider } from "./odds";
import {
  brusselsToIso, fetchEvent, fetchRanking, fetchResult, fetchStartlist, parseEvent, parseRanking, parseResult,
  parseStartlist, type StartlistRider,
} from "./cyclingflash";
import { BONUS_KEYS, bonusAnswer, bonusQuestion, settleBet, type OpenBet, type ResultRow } from "./settle";
import { RACE_COLUMNS, type RaceRow } from "./server";
import { seasonOf, type Category } from "./rules";

// Beheer van voorZpWelBokaal. Alles hier draait met de service-rol; de
// server-actions controleren eerst het recht (zwbgame.manage, zie admin-areas).
// Waar een functie `html` krijgt, is dat de paginabron die beheer zelf plakte
// omdat CyclingFlash de server weigerde.

const DEFAULT_TIME: Record<Category, string> = { w: "13:45", m: "15:00" };

/** Ratings ophalen en vervangen; geeft het aantal renners terug. */
export async function refreshRatings(category: Category, html?: string): Promise<number> {
  const riders = html ? parseRanking(html) : await fetchRanking(category);
  if (riders.length < 20) throw new Error("Te weinig renners gevonden in de ranking.");
  const admin = createAdminClient();
  const fetchedAt = new Date().toISOString();
  const unique = [...new Map(riders.map((r) => [r.slug, r])).values()];
  const { error } = await admin.from("bokaal_ratings").upsert(
    unique.map((r) => ({ category, rider_slug: r.slug, rider_name: r.name, rating: r.rating, fetched_at: fetchedAt })),
    { onConflict: "category,rider_slug" },
  );
  if (error) throw new Error("Ratings opslaan mislukt.");
  // Wie uit de opgehaalde pagina's viel, heeft geen actuele rating meer.
  await admin.from("bokaal_ratings").delete().eq("category", category).lt("fetched_at", fetchedAt);
  return unique.length;
}

async function ratedField(category: Category, startlist: StartlistRider[]): Promise<FieldRider[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bokaal_ratings")
    .select("rider_slug, rating")
    .eq("category", category)
    .in("rider_slug", startlist.map((r) => r.slug));
  if (error) throw new Error("Ratings lezen mislukt.");
  const ratings = new Map((data ?? []).map((r) => [r.rider_slug as string, r.rating as number]));
  return startlist.map((r) => ({ slug: r.slug, name: r.name, rating: ratings.get(r.slug) ?? null }));
}

async function boardFor(category: Category, raceSlug: string, startlist: StartlistRider[]) {
  if (startlist.length < 5) throw new Error("De startlijst is nog leeg of te kort.");
  return buildBoard(await ratedField(category, startlist), { seed: seedFor(raceSlug) });
}

/** Een event van CyclingFlash: de elitewedstrijden van dames en heren als concept, met bord als de startlijst er is. */
export async function importEvent(slug: string, html?: string): Promise<number> {
  const event = html ? parseEvent(html, slug) : await fetchEvent(slug);
  if (event.races.length === 0) throw new Error("Geen elitewedstrijden gevonden in dit event.");
  const admin = createAdminClient();
  let created = 0;
  for (const race of event.races) {
    const date = race.date;
    if (!date) throw new Error("Geen datum gevonden in dit event.");
    const startsAt = brusselsToIso(date, race.time ?? DEFAULT_TIME[race.category]);
    let board = { riders: [], duels: [] } as Awaited<ReturnType<typeof boardFor>>;
    let oddsAt: string | null = null;
    try {
      board = await boardFor(race.category, race.slug, await fetchStartlist(race.slug));
      oddsAt = new Date().toISOString();
    } catch {
      // Startlijst nog niet bekend of geweigerd: het concept wacht erop.
    }
    const { error } = await admin.from("bokaal_races").upsert(
      {
        season: seasonOf(new Date(startsAt)),
        category: race.category,
        event_slug: event.slug,
        event_name: event.name,
        race_slug: race.slug,
        location: event.location,
        starts_at: startsAt,
        board,
        bonus: bonusQuestion(BONUS_KEYS[seedFor(race.slug) % BONUS_KEYS.length], race.category),
        odds_at: oddsAt,
      },
      { onConflict: "race_slug", ignoreDuplicates: true },
    );
    if (error) throw new Error("Koers opslaan mislukt.");
    created++;
  }
  return created;
}

async function getRace(id: string): Promise<RaceRow> {
  const { data, error } = await createAdminClient().from("bokaal_races").select(RACE_COLUMNS).eq("id", id).single();
  if (error || !data) throw new Error("Koers niet gevonden.");
  return data as RaceRow;
}

/** Startlijst opnieuw ophalen en quoteringen herberekenen. Briefjes die er al liggen, houden hun quotering. */
export async function refreshBoard(raceId: string, html?: string) {
  const race = await getRace(raceId);
  if (race.status === "afgerekend" || race.status === "geannuleerd") throw new Error("Deze koers is al afgesloten.");
  if (Date.parse(race.starts_at) <= Date.now()) throw new Error("De koers is al gestart.");
  const startlist = html ? parseStartlist(html) : await fetchStartlist(race.race_slug);
  const board = await boardFor(race.category, race.race_slug, startlist);
  const { error } = await createAdminClient()
    .from("bokaal_races")
    .update({ board, odds_at: new Date().toISOString() })
    .eq("id", raceId);
  if (error) throw new Error("Bord opslaan mislukt.");
  return board.riders.length;
}

export async function updateRace(raceId: string, patch: { startsAt?: string; status?: "concept" | "open"; bonusKey?: string }) {
  const race = await getRace(raceId);
  if (race.status === "afgerekend" || race.status === "geannuleerd") throw new Error("Deze koers is al afgesloten.");
  const update: Record<string, unknown> = {};
  if (patch.startsAt) update.starts_at = patch.startsAt;
  if (patch.status) {
    if (patch.status === "open" && race.board.riders.length === 0) throw new Error("Haal eerst de startlijst op.");
    update.status = patch.status;
  }
  if (patch.bonusKey !== undefined) update.bonus = patch.bonusKey ? bonusQuestion(patch.bonusKey, race.category) : null;
  const { error } = await createAdminClient().from("bokaal_races").update(update).eq("id", raceId);
  if (error) throw new Error("Koers opslaan mislukt.");
}

/**
 * Uitslag ophalen en alles afrekenen. Mag opnieuw: elke keer wordt alles
 * vanaf de uitslag opnieuw berekend, zo corrigeert beheer een fout.
 */
export async function settleRace(raceId: string, html?: string) {
  const race = await getRace(raceId);
  if (race.status === "geannuleerd") throw new Error("Deze koers is geannuleerd.");
  if (race.status === "concept") throw new Error("Deze koers stond niet op het bord.");
  if (Date.parse(race.starts_at) > Date.now()) throw new Error("De koers is nog niet gestart.");
  const result: ResultRow[] = html ? parseResult(html) : await fetchResult(race.race_slug);
  if (result.filter((r) => r.pos != null).length < 3) throw new Error("Nog geen uitslag gevonden.");
  let startlist: StartlistRider[] = [];
  try {
    startlist = await fetchStartlist(race.race_slug);
  } catch {
    // Zonder startlijst telt alleen de uitslag als gestart.
  }
  const starters = new Set([...startlist.map((r) => r.slug), ...result.map((r) => r.slug)]);
  const admin = createAdminClient();
  const { data: bets, error } = await admin
    .from("bokaal_bets")
    .select("id, market, rider_slug, vs_slug, stake, odds")
    .eq("race_id", raceId);
  if (error) throw new Error("Briefjes lezen mislukt.");
  const outcomes = ((bets ?? []) as OpenBet[]).map((b) => settleBet({ ...b, odds: Number(b.odds) }, result, starters));
  for (const o of outcomes) {
    const { error: e } = await admin.from("bokaal_bets").update({ outcome: o.outcome, payout: o.payout }).eq("id", o.id);
    if (e) throw new Error("Afrekenen mislukt; probeer opnieuw.");
  }
  const answer = race.bonus ? bonusAnswer(race.bonus.key, result) : null;
  if (race.bonus) {
    const { error: e1 } = await admin.from("bokaal_bonus_answers").update({ correct: answer == null ? null : false }).eq("race_id", raceId);
    const { error: e2 } = answer == null
      ? { error: null }
      : await admin.from("bokaal_bonus_answers").update({ correct: true }).eq("race_id", raceId).eq("choice", answer);
    if (e1 || e2) throw new Error("Bonusvraag nakijken mislukt; probeer opnieuw.");
  }
  const { error: raceError } = await admin
    .from("bokaal_races")
    .update({
      status: "afgerekend",
      result,
      bonus: race.bonus ? { ...race.bonus, answer } : null,
      settled_at: new Date().toISOString(),
    })
    .eq("id", raceId);
  if (raceError) throw new Error("Afrekenen mislukt; probeer opnieuw.");
  return { bets: outcomes.length, hits: outcomes.filter((o) => o.outcome === "raak").length, bonus: answer };
}

/** Koers gaat niet door: alle inzetten terug, de bonusvraag telt niet. */
export async function cancelRace(raceId: string) {
  const race = await getRace(raceId);
  if (race.status === "geannuleerd") return;
  const admin = createAdminClient();
  const { data: bets, error } = await admin.from("bokaal_bets").select("id, stake").eq("race_id", raceId);
  if (error) throw new Error("Briefjes lezen mislukt.");
  for (const b of bets ?? []) {
    const { error: e } = await admin.from("bokaal_bets").update({ outcome: "terug", payout: b.stake }).eq("id", b.id);
    if (e) throw new Error("Annuleren mislukt; probeer opnieuw.");
  }
  await admin.from("bokaal_bonus_answers").update({ correct: null }).eq("race_id", raceId);
  const { error: raceError } = await admin.from("bokaal_races").update({ status: "geannuleerd" }).eq("id", raceId);
  if (raceError) throw new Error("Annuleren mislukt; probeer opnieuw.");
}

/** Voor het beheerscherm: alle koersen van het seizoen, nieuwste eerst, plus de ratingdatum. */
export async function loadAdmin(season: string) {
  const admin = createAdminClient();
  const [races, ratings, bets] = await Promise.all([
    admin.from("bokaal_races").select(RACE_COLUMNS).eq("season", season).order("starts_at", { ascending: false }),
    admin.from("bokaal_ratings").select("category, fetched_at"),
    admin.from("bokaal_bets").select("race_id, stake").eq("season", season),
  ]);
  if (races.error || ratings.error || bets.error) throw new Error("Beheer kon niet worden geladen.");
  const ratingInfo = (category: Category) => {
    const rows = (ratings.data ?? []).filter((r) => r.category === category);
    return { count: rows.length, fetchedAt: rows[0]?.fetched_at as string | undefined };
  };
  const stakes = new Map<string, { count: number; balls: number }>();
  for (const b of bets.data ?? []) {
    const s = stakes.get(b.race_id) ?? { count: 0, balls: 0 };
    stakes.set(b.race_id, { count: s.count + 1, balls: s.balls + b.stake });
  }
  return { races: (races.data ?? []) as RaceRow[], ratings: { w: ratingInfo("w"), m: ratingInfo("m") }, stakes };
}
