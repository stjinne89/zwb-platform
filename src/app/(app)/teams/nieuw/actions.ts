"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { DISCORD_URL_ERROR, isValidDiscordUrl } from "@/lib/discord";
import { fetchWhatsAppGroupInfo, isChannelUrl, isValidInviteUrl } from "@/lib/whatsapp";

const TYPES = ["zrl", "ladder", "social", "outdoor"];

export async function createTeam(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("teams.create")) {
    return { ok: false as const, error: "Geen recht om teams aan te maken." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const division = String(formData.get("division") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const parentTeamId = String(formData.get("parent_team_id") ?? "").trim() || null;
  const discordUrl = String(formData.get("discord_url") ?? "").trim() || null;
  const whatsappUrl = String(formData.get("whatsapp_url") ?? "").trim() || null;

  if (!name) return { ok: false as const, error: "Naam is verplicht." };
  if (!TYPES.includes(type)) return { ok: false as const, error: "Ongeldig type." };
  if (discordUrl && !isValidDiscordUrl(discordUrl)) {
    return { ok: false as const, error: DISCORD_URL_ERROR };
  }
  if (whatsappUrl && !isValidInviteUrl(whatsappUrl)) {
    return {
      ok: false as const,
      error: "Gebruik een chat.whatsapp.com-groepslink of een whatsapp.com/channel-link.",
    };
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name,
      type,
      division,
      description,
      parent_team_id: parentTeamId,
      discord_url: discordUrl,
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  // WhatsApp blijft in whatsapp_groups staan, zodat de groep ook op /community
  // verschijnt. Via de admin-client: teams.create geeft nog geen schrijfrecht
  // op die tabel.
  if (whatsappUrl) {
    const info = await fetchWhatsAppGroupInfo(whatsappUrl).catch(() => null);
    await createAdminClient()
      .from("whatsapp_groups")
      .insert({
        name: info?.name ?? name,
        description: info?.description ?? null,
        invite_url: whatsappUrl,
        kind: isChannelUrl(whatsappUrl) ? "channel" : "group",
        team_id: data.id,
      });
  }

  redirect(`/teams/${data.id}`);
}
