"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { syncTeamResults } from "@/lib/team-results/sync";
import { fetchLadderGraveyard, normalizeTeamName } from "@/lib/ladder";
import { syncOnePowerProfile, type IntervalsConnectionRow } from "@/lib/teams/power-sync";

export async function syncResultsNow() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

  try {
    // Geen indeling op categorie meer (migr. 0172), niet voor leden en niet voor
    // rosternamen: lid word je door je aan te melden voor een race, door je
    // rosternaam te claimen of doordat een teambeheerder je toevoegt. De
    // teamkoppeling van een rosternaam komt hieronder uit de bron zelf.
    const summary = await syncTeamResults(supabase);
    revalidatePath("/teams");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {
      ok: true as const,
      summary,
    };
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
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

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

export async function syncRiderPowerProfiles(scope: "self" | "all" = "self") {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };

  const syncAll = scope === "all";
  if (syncAll && !access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om alle powerprofielen te syncen." };
  }

  const db = syncAll ? createAdminClient() : supabase;
  let query = db
    .from("intervals_connections")
    .select("profile_id, athlete_id, api_key, profiles(ftp_watts, weight_kg, auto_sync_physique)");

  if (!syncAll) query = query.eq("profile_id", access.user.id);

  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };

  const connections = (data ?? []) as unknown as IntervalsConnectionRow[];
  if (connections.length === 0) {
    return {
      ok: false as const,
      error: syncAll
        ? "Geen Intervals-koppelingen gevonden."
        : "Je hebt nog geen Intervals-koppeling.",
    };
  }

  let synced = 0;
  let partial = 0;
  let failed = 0;
  const errors: string[] = [];
  for (const connection of connections) {
    const result = await syncOnePowerProfile(db, connection);
    if (result.ok) synced += 1;
    else if (result.partial) {
      partial += 1;
      if (result.error) errors.push(result.error);
    } else {
      failed += 1;
      if (result.error) errors.push(result.error);
    }
  }

  revalidatePath("/teams");
  revalidatePath("/dashboard");
  revalidatePath("/zwbeter-worden/vermogen");
  revalidatePath("/profiel");
  return { ok: true as const, synced, partial, failed, errors: errors.slice(0, 3) };
}
