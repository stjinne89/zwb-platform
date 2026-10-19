import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { privacyConsentIsCurrent } from "@/lib/privacy";
import type { Board } from "./odds";
import type { BonusQuestion, ResultRow } from "./settle";
import { seasonOf, type Category, type Market } from "./rules";

export type RaceRow = {
  id: string;
  season: string;
  category: Category;
  event_slug: string;
  event_name: string;
  race_slug: string;
  location: string | null;
  starts_at: string;
  status: "concept" | "open" | "afgerekend" | "geannuleerd";
  board: Board;
  bonus: BonusQuestion | null;
  result: ResultRow[] | null;
  odds_at: string | null;
  settled_at: string | null;
};

export type BetRow = {
  id: string;
  race_id: string;
  market: Market;
  rider_slug: string;
  rider_name: string;
  vs_slug: string | null;
  vs_name: string | null;
  odds: number;
  stake: number;
  outcome: "open" | "raak" | "mis" | "terug";
  payout: number | null;
  created_at: string;
};

export type AnswerRow = { race_id: string; choice: number; correct: boolean | null };

export const RACE_COLUMNS =
  "id, season, category, event_slug, event_name, race_slug, location, starts_at, status, board, bonus, result, odds_at, settled_at";
export const BET_COLUMNS =
  "id, race_id, market, rider_slug, rider_name, vs_slug, vs_name, odds, stake, outcome, payout, created_at";

/** Ingelogd, goedgekeurd en privacyverklaring getekend; anders een melding voor het scherm. */
export async function requireBokaalMember() {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Log in om mee te spelen.");
  const { data: member, error } = await client
    .from("profiles")
    .select("id, display_name, is_approved, privacy_accepted_version")
    .eq("id", user.id)
    .single();
  if (error || !member?.is_approved) throw new Error("Alleen goedgekeurde ZWB-leden kunnen meespelen.");
  if (!privacyConsentIsCurrent(member.privacy_accepted_version)) throw new Error("Bevestig eerst de privacyverklaring.");
  return { client, member: member as { id: string; display_name: string | null } };
}

export const currentSeason = () => seasonOf(new Date());

const numberish = <T extends { odds: unknown; payout: unknown }>(row: T) => ({
  ...row,
  odds: Number(row.odds),
  payout: row.payout == null ? null : Number(row.payout),
});

export async function loadPlayer(client: SupabaseClient, profileId: string, season: string) {
  const [player, balance] = await Promise.all([
    client.from("bokaal_players").select("joined_at").eq("profile_id", profileId).eq("season", season).maybeSingle(),
    client.rpc("bokaal_balance", { p_profile: profileId, p_season: season }),
  ]);
  if (player.error || balance.error) throw new Error("voorZpWelBokaal is tijdelijk niet beschikbaar.");
  return { joined: Boolean(player.data), balance: Number(balance.data ?? 0) };
}

/**
 * Het bord: de wedstrijddag van de eerstvolgende open koers. Een koers die al
 * gestart is maar nog niet afgerekend, blijft tot 12 uur na de start staan,
 * zodat je je briefje ziet terwijl je kijkt.
 */
export async function loadBoardRaces(client: SupabaseClient): Promise<RaceRow[]> {
  const since = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data, error } = await client
    .from("bokaal_races")
    .select(RACE_COLUMNS)
    .eq("status", "open")
    .gte("starts_at", since)
    .order("starts_at");
  if (error) throw new Error("Het bord kon niet worden geladen.");
  const races = (data ?? []) as RaceRow[];
  if (races.length === 0) return [];
  const event = races[0].event_slug;
  return races.filter((r) => r.event_slug === event);
}

export async function loadBets(client: SupabaseClient, profileId: string, raceIds: string[]) {
  if (raceIds.length === 0) return { bets: [] as BetRow[], answers: [] as AnswerRow[] };
  const [bets, answers] = await Promise.all([
    client.from("bokaal_bets").select(BET_COLUMNS).eq("profile_id", profileId).in("race_id", raceIds).order("created_at"),
    client.from("bokaal_bonus_answers").select("race_id, choice, correct").eq("profile_id", profileId).in("race_id", raceIds),
  ]);
  if (bets.error || answers.error) throw new Error("Je briefjes konden niet worden geladen.");
  return { bets: (bets.data ?? []).map(numberish) as BetRow[], answers: (answers.data ?? []) as AnswerRow[] };
}

/** Al je briefjes van dit seizoen, met de koersen erbij. */
export async function loadHistory(client: SupabaseClient, profileId: string, season: string) {
  const [bets, answers] = await Promise.all([
    client.from("bokaal_bets").select(BET_COLUMNS).eq("profile_id", profileId).eq("season", season).order("created_at"),
    client.from("bokaal_bonus_answers").select("race_id, choice, correct").eq("profile_id", profileId).eq("season", season),
  ]);
  if (bets.error || answers.error) throw new Error("Je briefjes konden niet worden geladen.");
  const raceIds = [...new Set([...(bets.data ?? []).map((b) => b.race_id), ...(answers.data ?? []).map((a) => a.race_id)])];
  const races = raceIds.length
    ? await client.from("bokaal_races").select(RACE_COLUMNS).in("id", raceIds).order("starts_at", { ascending: false })
    : { data: [], error: null };
  if (races.error) throw new Error("Je briefjes konden niet worden geladen.");
  return {
    races: (races.data ?? []) as RaceRow[],
    bets: (bets.data ?? []).map(numberish) as BetRow[],
    answers: (answers.data ?? []) as AnswerRow[],
  };
}

export type Standing = { profile_id: string; display_name: string | null; balance: number; open_stake: number; hits: number; bets: number };

export async function loadStandings(client: SupabaseClient, season: string): Promise<Standing[]> {
  const { data, error } = await client.rpc("bokaal_standings", { p_season: season });
  if (error) throw new Error("De lei kon niet worden geladen.");
  return ((data ?? []) as Standing[])
    .map((s) => ({ ...s, balance: Number(s.balance), open_stake: Number(s.open_stake), hits: Number(s.hits), bets: Number(s.bets) }))
    .sort((a, b) => b.balance - a.balance || (a.display_name ?? "").localeCompare(b.display_name ?? ""));
}
