"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { syncTeamResults } from "@/lib/team-results/sync";
import { fetchLadderGraveyard, normalizeTeamName } from "@/lib/ladder";
import { withLadderSession } from "@/lib/club-ladder/session";
import { getClub } from "@/lib/club";
import { syncOnePowerProfile, type IntervalsConnectionRow } from "@/lib/teams/power-sync";
import { runLadderVeloSync } from "@/lib/zwiftracing/rider-sync";
import { runLadderZmapSync, ZMAP_BUTTON_FRESH_MS, type LadderZmapSyncResult } from "@/lib/club-ladder/zmap-sync";

// Na de teamuitslagen ververst de knop de legacy vELO (vELO1) van iedereen in
// de Ladderpuzzel, de oudste eerst (runLadderVeloSync); de rest doet de cron op
// /api/zwiftracing/sync. De pagina's hebben `maxDuration = 30`; Netlify liet bij
// de FRR-kalender rond 25-28 s nog toe. Na VELO_DEADLINE_MS begint hij aan geen
// nieuwe renner meer, en een renner kost een pagina van hooguit
// VELO_PAGE_TIMEOUT_MS plus een seconde pauze.
const VELO_DEADLINE_MS = 14_000;
const VELO_PAGE_TIMEOUT_MS = 8_000;
/** Minder tijd over dan dit: de vELO1 laten wachten op de cron. */
const VELO_MIN_MS = 2_000;

export type LegacyVeloSyncOutcome =
  | { legacy: number; fetched: number; remaining: number; stopped: string | null }
  | { skipped: string }
  | { error: string };

async function syncLegacyVelo(started: number): Promise<LegacyVeloSyncOutcome> {
  const deadline = started + VELO_DEADLINE_MS;
  if (deadline - Date.now() < VELO_MIN_MS) return { skipped: "geen tijd meer, volgt bij de volgende run" };
  try {
    const result = await runLadderVeloSync(createAdminClient(), deadline, VELO_PAGE_TIMEOUT_MS);
    return { legacy: result.legacy, fetched: result.fetched, remaining: result.remaining, stopped: result.stopped };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "onbekende fout" };
  }
}

// Daarna de zMAP van de ladder (0372) met de tijd die over is, tot
// ZMAP_DEADLINE_MS; de cron doet de rest.
const ZMAP_DEADLINE_MS = 20_000;
const ZMAP_PAGE_TIMEOUT_MS = 5_000;

async function syncLadderZmap(started: number): Promise<LadderZmapSyncResult | { skipped: string } | { error: string }> {
  const deadline = started + ZMAP_DEADLINE_MS;
  if (deadline - Date.now() < VELO_MIN_MS) return { skipped: "geen tijd meer, volgt bij de volgende run" };
  try {
    return await runLadderZmapSync(createAdminClient(), {
      deadline,
      freshMs: ZMAP_BUTTON_FRESH_MS,
      pageTimeoutMs: ZMAP_PAGE_TIMEOUT_MS,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "onbekende fout" };
  }
}

export async function syncResultsNow() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

  const started = Date.now();
  try {
    // Geen indeling op categorie meer (migr. 0172), niet voor leden en niet voor
    // rosternamen: lid word je door je aan te melden voor een race, door je
    // rosternaam te claimen of doordat een teambeheerder je toevoegt. De
    // teamkoppeling van een rosternaam komt hieronder uit de bron zelf.
    const summary = await syncTeamResults(supabase);
    const legacyVelo = await syncLegacyVelo(started);
    const ladderZmap = await syncLadderZmap(started);
    revalidatePath("/teams");
    revalidatePath("/teams/club-ladder");
    revalidatePath("/dashboard");
    revalidatePath("/");
    return {
      ok: true as const,
      summary,
      legacyVelo,
      ladderZmap,
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Onbekende sync-fout.",
    };
  }
}

export async function syncLadderGraveyard() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.sync_sources")) {
    return { ok: false as const, error: "Geen recht om teambronnen te syncen." };
  }

  let result;
  try {
    const club = await getClub();
    result = await withLadderSession((cookie) =>
      fetchLadderGraveyard(cookie, {
        shortName: club.texts.shortName,
        websiteUrl: club.settings.websiteUrl,
      }),
    );
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
