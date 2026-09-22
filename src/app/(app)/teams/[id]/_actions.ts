"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { DISCORD_URL_ERROR, isValidDiscordUrl } from "@/lib/discord";
import { fetchWhatsAppGroupInfo, isChannelUrl, isValidInviteUrl } from "@/lib/whatsapp";
import { syncEventWorkout } from "@/lib/training/events";
import { requestReplan } from "@/lib/training/replan";

const ROLES = ["member", "captain", "co-captain"] as const;
type Role = (typeof ROLES)[number];

async function canManageTeamRoster(teamId: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (access.has("teams.manage_roster")) {
    return { ok: true as const, userId: access.user.id };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id")
    .eq("team_id", teamId)
    .eq("profile_id", access.user.id)
    .in("role", ["captain", "co-captain"])
    .limit(1);
  if (error) return { ok: false as const, error: error.message };
  if ((data ?? []).length === 0) {
    return { ok: false as const, error: "Geen recht om dit team te beheren." };
  }
  return { ok: true as const, userId: access.user.id };
}

export async function addMember(
  teamId: string,
  profileId: string,
  role: Role,
) {
  if (!ROLES.includes(role)) return { ok: false as const, error: "Ongeldige rol." };
  const guard = await canManageTeamRoster(teamId);
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  await admin
    .from("team_member_seed_overrides")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  const { error } = await admin
    .from("team_members")
    .upsert({
      team_id: teamId,
      profile_id: profileId,
      role,
      assignment_source: "manual",
    });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true as const };
}

export async function removeMember(teamId: string, profileId: string) {
  const guard = await canManageTeamRoster(teamId);
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  await admin.from("team_member_seed_overrides").upsert(
    {
      team_id: teamId,
      profile_id: profileId,
      excluded: true,
      reason: "manual_remove",
      created_by: guard.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,profile_id" },
  );
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("profile_id", profileId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  return { ok: true as const };
}

export async function addResult(teamId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const competition = String(formData.get("competition") ?? "").trim();
  if (!competition) return { ok: false as const, error: "Competitie is verplicht." };

  const round_label = String(formData.get("round_label") ?? "").trim() || null;
  const round_at_raw = String(formData.get("round_at") ?? "").trim();
  const round_at = round_at_raw ? new Date(round_at_raw).toISOString() : null;

  const position = formData.get("position");
  const points = formData.get("points");
  const total_teams = formData.get("total_teams");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error } = await supabase.from("team_results").insert({
    team_id: teamId,
    competition,
    round_label,
    round_at,
    position: position ? Number(position) : null,
    points: points ? Number(points) : null,
    total_teams: total_teams ? Number(total_teams) : null,
    notes,
    created_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

export async function deleteResult(teamId: string, resultId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("team_results")
    .delete()
    .eq("id", resultId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/teams/${teamId}`);
  return { ok: true as const };
}

export async function toggleGraveyard(teamId: string, isGraveyard: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.manage_roster")) {
    return { ok: false as const, error: "Geen recht om teams te beheren." };
  }

  const { error } = await supabase
    .from("teams")
    .update({ is_graveyard: isGraveyard })
    .eq("id", teamId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * De chatkanalen van een team. Leeg opslaan haalt een link weer weg.
 *
 * Discord staat als kolom op teams, WhatsApp blijft in whatsapp_groups: die
 * groepen bestaan ook los van teams en staan op /community. Eén bron dus, dat
 * scheelt uit de pas lopende links. Alles via de admin-client, zodat ook een
 * captain zonder teams.manage_roster of community.manage het kan bijwerken.
 */
export async function setTeamChatLinks(
  teamId: string,
  whatsappUrl: string,
  discordUrl: string,
) {
  const guard = await canManageTeamRoster(teamId);
  if (!guard.ok) return guard;

  const discord = discordUrl.trim();
  const whatsapp = whatsappUrl.trim();
  if (discord && !isValidDiscordUrl(discord)) {
    return { ok: false as const, error: DISCORD_URL_ERROR };
  }
  if (whatsapp && !isValidInviteUrl(whatsapp)) {
    return {
      ok: false as const,
      error: "Gebruik een chat.whatsapp.com-groepslink of een whatsapp.com/channel-link.",
    };
  }

  const admin = createAdminClient();
  const { data: team, error: teamError } = await admin
    .from("teams")
    .update({ discord_url: discord || null })
    .eq("id", teamId)
    .select("name")
    .single();
  if (teamError) return { ok: false as const, error: teamError.message };

  // De eerste groep van dit team is de teamgroep; die werken we bij.
  const { data: existing } = await admin
    .from("whatsapp_groups")
    .select("id")
    .eq("team_id", teamId)
    .order("display_order")
    .order("name")
    .limit(1);
  const current = (existing ?? [])[0] ?? null;

  if (!whatsapp && current) {
    // Loskoppelen, niet verwijderen: de groep zelf is van de community en
    // blijft op /community staan.
    const { error } = await admin
      .from("whatsapp_groups")
      .update({ team_id: null })
      .eq("id", current.id);
    if (error) return { ok: false as const, error: error.message };
  } else if (whatsapp && current) {
    const { error } = await admin
      .from("whatsapp_groups")
      .update({ invite_url: whatsapp, kind: isChannelUrl(whatsapp) ? "channel" : "group" })
      .eq("id", current.id);
    if (error) return { ok: false as const, error: error.message };
  } else if (whatsapp) {
    // Naam komt van WhatsApp zelf, want die staat straks ook op /community.
    const info = await fetchWhatsAppGroupInfo(whatsapp).catch(() => null);
    const { error } = await admin.from("whatsapp_groups").insert({
      name: info?.name ?? team.name,
      description: info?.description ?? null,
      invite_url: whatsapp,
      kind: isChannelUrl(whatsapp) ? "channel" : "group",
      team_id: teamId,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/community");
  return { ok: true as const };
}

export async function setTeamAvailability(
  teamId: string,
  eventId: string,
  status: "available" | "maybe" | "unavailable",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Niet ingelogd." };

  const { error } = await supabase.from("team_event_availability").upsert(
    {
      team_id: teamId,
      event_id: eventId,
      profile_id: user.id,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id,team_id,profile_id" },
  );
  if (error) return { ok: false as const, error: error.message };

  // Beschikbaar melden voor een ZRL-race maakt je lid van het team van die race
  // (migr. 0171 doet dat in dezelfde transactie). Dat is niet altijd het team
  // waarvan je de pagina openhebt: een hoofdteam toont ook de races van zijn
  // subteams. Daarom de rooster-pagina's van beide teams verversen.
  if (status === "available") {
    const { data: event } = await supabase
      .from("events")
      .select("type, team_id")
      .eq("id", eventId)
      .maybeSingle();
    if (event?.type === "zrl" && event.team_id && event.team_id !== teamId) {
      revalidatePath(`/teams/${event.team_id}`);
    }
    revalidatePath("/teams");
    revalidatePath("/kalender");
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/events/${eventId}`);
  return { ok: true as const };
}

async function canManageTeamSelection(
  teamId: string,
  candidateTeamId?: string,
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd.", userId: null };
  if (access.has("teams.manage_roster")) {
    return { ok: true as const, userId: access.user.id };
  }

  const teamIds = candidateTeamId ? [teamId, candidateTeamId] : [teamId];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .select("team_id")
    .in("team_id", teamIds)
    .eq("profile_id", access.user.id)
    .in("role", ["captain", "co-captain"]);
  if (error) return { ok: false as const, error: error.message, userId: access.user.id };
  if ((data ?? []).length === 0) {
    return { ok: false as const, error: "Geen recht om deze lineup te beheren.", userId: access.user.id };
  }
  return { ok: true as const, userId: access.user.id };
}

export type LineupRider = { kind: "profile" | "roster"; id: string };

export async function setTeamLineup(
  parentTeamId: string,
  eventId: string,
  targetTeamId: string,
  rider: LineupRider,
) {
  const guard = await canManageTeamSelection(parentTeamId, targetTeamId);
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const admin = createAdminClient();
  const values = {
    parent_team_id: parentTeamId,
    event_id: eventId,
    team_id: targetTeamId,
    selected_by: guard.userId,
    updated_at: new Date().toISOString(),
  };

  // Eén regel per renner per team (migr. 0184): subteams starten op verschillende
  // tijden, dus een renner kan in dezelfde raceweek voor twee teams rijden.
  if (rider.kind === "profile") {
    const { error } = await admin
      .from("team_event_lineups")
      .upsert(
        { ...values, profile_id: rider.id },
        { onConflict: "event_id,parent_team_id,team_id,profile_id" },
      );
    if (error) return { ok: false as const, error: error.message };
    await syncLineupRsvp(admin, rider.id, eventId, targetTeamId, null);
  } else {
    // Renner zonder account (migr. 0182). De unieke index is gedeeltelijk, dus
    // geen upsert: eerst kijken of hij al voor dit team in deze raceweek staat.
    const { data: existing, error: readError } = await admin
      .from("team_event_lineups")
      .select("id")
      .eq("event_id", eventId)
      .eq("parent_team_id", parentTeamId)
      .eq("team_id", targetTeamId)
      .eq("roster_entry_id", rider.id)
      .maybeSingle();
    if (readError) return { ok: false as const, error: readError.message };
    const { error } = existing
      ? await admin.from("team_event_lineups").update(values).eq("id", existing.id)
      : await admin.from("team_event_lineups").insert({ ...values, roster_entry_id: rider.id });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/teams/${parentTeamId}`);
  revalidatePath(`/teams/${targetTeamId}`);
  return { ok: true as const };
}

export async function removeTeamLineup(parentTeamId: string, lineupId: string) {
  const guard = await canManageTeamSelection(parentTeamId);
  if (!guard.ok) return { ok: false as const, error: guard.error };

  const admin = createAdminClient();
  const { data: lineup } = await admin
    .from("team_event_lineups")
    .select("event_id, team_id, profile_id")
    .eq("id", lineupId)
    .maybeSingle();
  const { error } = await admin
    .from("team_event_lineups")
    .delete()
    .eq("id", lineupId);
  if (error) return { ok: false as const, error: error.message };
  if (lineup?.profile_id) {
    await syncLineupRsvp(admin, lineup.profile_id, lineup.event_id, null, lineup.team_id);
  }

  revalidatePath(`/teams/${parentTeamId}`);
  return { ok: true as const };
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * De race van dit team bij deze opstelling. De opstelling staat op de raceweek
 * (paraplu, migr. 0179) of op de race zelf (team zonder subteams).
 */
async function raceForLineup(admin: Admin, eventId: string, teamId: string) {
  const { data: event } = await admin
    .from("events")
    .select("id, team_id, parent_event_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;
  if (event.team_id === teamId) return event.id as string;
  const { data: race } = await admin
    .from("events")
    .select("id")
    .eq("parent_event_id", (event.parent_event_id ?? event.id) as string)
    .eq("team_id", teamId)
    .order("start_at")
    .limit(1)
    .maybeSingle();
  return (race?.id as string | undefined) ?? null;
}

/**
 * Opgesteld is een "ja" op de race van dat team, ook als de renner eerder nee
 * zei (keuze van de eigenaar, 2026-09-22). Weggehaald: de "ja" op die race
 * vervalt. (Sinds migr. 0184 is een tweede team een extra regel, geen
 * verplaatsing; oldTeamId komt dan alleen nog van het weghalen.) Net als bij een eigen ja gaat de race in of uit het
 * trainingsschema. Een renner zonder account heeft geen RSVP; die slaat dit over.
 */
async function syncLineupRsvp(
  admin: Admin,
  profileId: string,
  eventId: string,
  newTeamId: string | null,
  oldTeamId: string | null,
) {
  try {
    const newRace = newTeamId ? await raceForLineup(admin, eventId, newTeamId) : null;
    const oldRace =
      oldTeamId && oldTeamId !== newTeamId ? await raceForLineup(admin, eventId, oldTeamId) : null;
    let changed = false;

    if (newRace) {
      await admin.from("event_rsvps").upsert(
        {
          event_id: newRace,
          profile_id: profileId,
          status: "yes",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,profile_id" },
      );
      const result = await syncEventWorkout(admin, profileId, newRace, "yes");
      changed ||= result.inserted;
      revalidatePath(`/events/${newRace}`);
    }
    if (oldRace && oldRace !== newRace) {
      await admin.from("event_rsvps").delete().eq("event_id", oldRace).eq("profile_id", profileId);
      const result = await syncEventWorkout(admin, profileId, oldRace, "no");
      changed ||= result.removed;
      revalidatePath(`/events/${oldRace}`);
    }

    if (changed) {
      await requestReplan(admin, profileId, "Opstelling voor een ZRL-race gewijzigd.");
    }
    revalidatePath("/kalender");
    revalidatePath("/zwbeter-worden", "layout");
  } catch {
    // De opstelling zelf is opgeslagen; het schema haalt een volgende sync in.
  }
}
