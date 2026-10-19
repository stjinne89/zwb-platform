"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentSeason, requireBokaalMember } from "@/lib/bokaal/server";
import { BOKAAL_CONSENT_VERSION, PER_RACE } from "@/lib/bokaal/rules";

type Reply = { ok: true; placed?: number } | { ok: false; error: string };

function failure(error: unknown): Reply {
  if (error instanceof z.ZodError) return { ok: false, error: "Ongeldige invoer." };
  return { ok: false, error: error instanceof Error ? error.message : "Opslaan mislukt. Probeer opnieuw." };
}

// Een databasefout van de inzetfuncties is een spelregel ("Dit bord is dicht.");
// die tekst mag het lid zien. Andere fouten niet.
const RULE_MESSAGE = /^(Dit |Deze |Je |Per |Hier |Doe |Kies |Alleen |Onbekende )/;
const ruleError = (message: string | undefined, fallback: string) =>
  new Error(message && RULE_MESSAGE.test(message) ? message : fallback);

function refresh() {
  revalidatePath("/voorzpwelbokaal");
  revalidatePath("/voorzpwelbokaal/briefjes");
  revalidatePath("/voorzpwelbokaal/lei");
}

export async function joinBokaal(): Promise<Reply> {
  try {
    const { client, member } = await requireBokaalMember();
    const { error } = await client
      .from("bokaal_players")
      .upsert(
        { profile_id: member.id, season: currentSeason(), consent_version: BOKAAL_CONSENT_VERSION },
        { onConflict: "profile_id,season", ignoreDuplicates: true },
      );
    if (error) throw new Error("Meedoen mislukt. Probeer opnieuw.");
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

/** Stoppen wist je deelname van dit seizoen, met al je briefjes en antwoorden. */
export async function leaveBokaal(): Promise<Reply> {
  try {
    const { client, member } = await requireBokaalMember();
    const { error } = await client.from("bokaal_players").delete().eq("profile_id", member.id).eq("season", currentSeason());
    if (error) throw new Error("Stoppen mislukt. Probeer opnieuw.");
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

const betSchema = z.object({
  raceId: z.string().uuid(),
  market: z.enum(["win", "pod", "top", "duel"]),
  rider: z.string().regex(/^[a-z0-9-]{1,160}$/),
  vs: z.string().regex(/^[a-z0-9-]{1,160}$/).nullable(),
  stake: z.number().int().min(1).max(PER_RACE),
});

/** Zet de briefjes één voor één; de database bewaakt quotering, limiet en saldo. */
export async function placeBets(input: unknown): Promise<Reply> {
  try {
    const bets = z.array(betSchema).min(1).max(20).parse(input);
    const { client } = await requireBokaalMember();
    let placed = 0;
    for (const bet of bets) {
      const { error } = await client.rpc("bokaal_place_bet", {
        p_race: bet.raceId, p_market: bet.market, p_rider: bet.rider, p_vs: bet.vs, p_stake: bet.stake,
      });
      if (error) {
        refresh();
        const reason = ruleError(error.message, "Inzetten mislukt. Probeer opnieuw.").message;
        return { ok: false, error: placed ? `${placed} gezet. ${reason}` : reason };
      }
      placed++;
    }
    refresh();
    return { ok: true, placed };
  } catch (error) {
    return failure(error);
  }
}

export async function cancelBet(betId: unknown): Promise<Reply> {
  try {
    const id = z.string().uuid().parse(betId);
    const { client } = await requireBokaalMember();
    const { error } = await client.rpc("bokaal_cancel_bet", { p_bet: id });
    if (error) throw ruleError(error.message, "Intrekken mislukt. Probeer opnieuw.");
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}

export async function answerBonus(input: unknown): Promise<Reply> {
  try {
    const { raceId, choice } = z.object({ raceId: z.string().uuid(), choice: z.number().int().min(0).max(5) }).parse(input);
    const { client } = await requireBokaalMember();
    const { error } = await client.rpc("bokaal_answer_bonus", { p_race: raceId, p_choice: choice });
    if (error) throw ruleError(error.message, "Antwoorden mislukt. Probeer opnieuw.");
    refresh();
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
