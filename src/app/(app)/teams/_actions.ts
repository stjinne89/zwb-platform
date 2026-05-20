"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncTeamResults } from "@/lib/team-results/sync";
import { fetchLadderGraveyard, normalizeTeamName } from "@/lib/ladder";

export async function syncResultsNow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (error) return { ok: false as const, error: error.message };
  if (!me?.is_admin) {
    return { ok: false as const, error: "Alleen admins kunnen resultaten syncen." };
  }

  try {
    const summary = await syncTeamResults(supabase);
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return { ok: true as const, summary };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende sync-fout.",
    };
  }
}

export async function syncLadderGraveyard() {
  const cookie = process.env.LADDER_COOKIE;
  if (!cookie) {
    return {
      ok: false as const,
      error:
        "LADDER_COOKIE ontbreekt. Log in op ladder.cycleracing.club, kopieer de connect.sid cookie (DevTools → Application → Cookies) en zet hem in .env.local + Netlify env.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!me?.is_admin)
    return { ok: false as const, error: "Alleen admins kunnen syncen." };

  let result;
  try {
    result = await fetchLadderGraveyard(cookie);
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende ladder-fout.",
    };
  }

  // Haal alle ZWB-teams op, normaliseer namen voor matching.
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name, is_graveyard, type");
  if (teamsError) return { ok: false as const, error: teamsError.message };

  const graveyardNormalized = new Set(result.teamNames.map(normalizeTeamName));

  let toGraveyard = 0;
  let toActive = 0;
  const matched: string[] = [];

  for (const team of teams ?? []) {
    const normalized = normalizeTeamName(team.name);
    const inGraveyard = graveyardNormalized.has(normalized);

    if (inGraveyard) matched.push(team.name);

    // Update alleen ladder-type teams (anders zou een ZRL-team per ongeluk
    // gegraveyard worden als er een toevallige naam-match is).
    if (team.type !== "ladder") continue;

    if (inGraveyard && !team.is_graveyard) {
      const { error } = await supabase
        .from("teams")
        .update({ is_graveyard: true })
        .eq("id", team.id);
      if (!error) toGraveyard++;
    } else if (!inGraveyard && team.is_graveyard) {
      const { error } = await supabase
        .from("teams")
        .update({ is_graveyard: false })
        .eq("id", team.id);
      if (!error) toActive++;
    }
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    foundOnLadder: result.teamNames.length,
    matchedZwbTeams: matched,
    toGraveyard,
    toActive,
  };
}
