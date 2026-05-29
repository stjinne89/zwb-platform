"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { fetchWhatsAppGroupInfo, isValidInviteUrl } from "@/lib/whatsapp";

const CATEGORIES = [
  "algemeen",
  "bestuur",
  "zrl",
  "ladder",
  "outdoor",
  "klassiekers",
  "social",
  "training",
  "overig",
];

export async function fetchInvitePreview(inviteUrl: string) {
  const url = inviteUrl.trim();
  if (!isValidInviteUrl(url)) {
    return {
      ok: false as const,
      error: "Invite-URL moet eruitzien als https://chat.whatsapp.com/AbCdEf…",
    };
  }
  const info = await fetchWhatsAppGroupInfo(url);
  if (!info.name) {
    return {
      ok: false as const,
      error:
        "Kon de groepsnaam niet ophalen. Controleer of de invite-URL nog geldig is en de groep 'shareable via link' aan heeft.",
    };
  }
  return {
    ok: true as const,
    name: info.name,
    iconUrl: info.iconUrl,
    description: info.description,
  };
}

// Parse de "scope"-waarde uit het form: "team:<uuid>" / "event:<uuid>" / "none".
function parseScope(raw: string): { team_id: string | null; event_id: string | null } {
  const v = raw.trim();
  if (v.startsWith("team:")) return { team_id: v.slice(5), event_id: null };
  if (v.startsWith("event:")) return { team_id: null, event_id: v.slice(6) };
  return { team_id: null, event_id: null };
}

export async function addGroup(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : null;
  const invite_url = String(formData.get("invite_url") ?? "").trim();
  const display_order_raw = String(formData.get("display_order") ?? "").trim();
  const display_order = display_order_raw ? Number(display_order_raw) : 0;
  const { team_id, event_id } = parseScope(String(formData.get("scope") ?? "none"));

  if (!name) return { ok: false as const, error: "Naam is verplicht." };
  if (!isValidInviteUrl(invite_url)) {
    return {
      ok: false as const,
      error: "Invite-URL moet beginnen met https://chat.whatsapp.com/",
    };
  }

  const { error } = await supabase.from("whatsapp_groups").insert({
    name,
    description,
    category,
    invite_url,
    team_id,
    event_id,
    display_order: Number.isFinite(display_order) ? display_order : 0,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  if (team_id) revalidatePath(`/teams/${team_id}`);
  if (event_id) revalidatePath(`/events/${event_id}`);
  return { ok: true as const };
}

export async function bulkAddGroups(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const categoryRaw = String(formData.get("category") ?? "").trim();
  const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : null;
  const { team_id, event_id } = parseScope(String(formData.get("scope") ?? "none"));

  // Eén invite-URL per regel. Dedupe binnen de input + tegen wat al bestaat.
  const rawLines = String(formData.get("urls") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (rawLines.length === 0) {
    return { ok: false as const, error: "Plak minstens één invite-URL." };
  }
  const MAX = 40;
  const lines = rawLines.slice(0, MAX);

  const valid: string[] = [];
  let skippedInvalid = 0;
  const seen = new Set<string>();
  for (const line of lines) {
    if (!isValidInviteUrl(line)) {
      skippedInvalid += 1;
      continue;
    }
    const norm = line.replace(/\/$/, "");
    if (seen.has(norm)) continue;
    seen.add(norm);
    valid.push(line);
  }
  if (valid.length === 0) {
    return {
      ok: false as const,
      error: "Geen geldige invite-URL's gevonden (https://chat.whatsapp.com/…).",
    };
  }

  // Bestaande invite-URL's ophalen om duplicaten over te slaan.
  const { data: existingRows } = await supabase
    .from("whatsapp_groups")
    .select("invite_url");
  const existing = new Set(
    ((existingRows ?? []) as { invite_url: string }[]).map((r) =>
      r.invite_url.replace(/\/$/, ""),
    ),
  );

  const toFetch = valid.filter((u) => !existing.has(u.replace(/\/$/, "")));
  const skippedDuplicate = valid.length - toFetch.length;
  if (toFetch.length === 0) {
    return {
      ok: true as const,
      added: 0,
      skippedInvalid,
      skippedDuplicate,
    };
  }

  // OG-metadata parallel ophalen (naam/omschrijving) voor elke nieuwe URL.
  const infos = await Promise.all(
    toFetch.map(async (url) => {
      const info = await fetchWhatsAppGroupInfo(url).catch(() => null);
      const code = url.replace(/\/$/, "").split("/").pop() ?? "";
      return {
        invite_url: url,
        name: info?.name ?? `WhatsApp-groep ${code.slice(0, 6)}`,
        description: info?.description ?? null,
      };
    }),
  );

  const rows = infos.map((info, i) => ({
    name: info.name,
    description: info.description,
    category,
    invite_url: info.invite_url,
    team_id,
    event_id,
    display_order: i,
  }));

  const { error } = await supabase.from("whatsapp_groups").insert(rows);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/community");
  if (team_id) revalidatePath(`/teams/${team_id}`);
  if (event_id) revalidatePath(`/events/${event_id}`);
  return {
    ok: true as const,
    added: rows.length,
    skippedInvalid,
    skippedDuplicate,
  };
}

export async function deleteGroup(id: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const { error } = await supabase.from("whatsapp_groups").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  return { ok: true as const };
}

export async function addAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const body_md = String(formData.get("body_md") ?? "").trim();
  const pinned = formData.get("pinned") === "on";

  if (!title) return { ok: false as const, error: "Titel is verplicht." };
  if (!body_md) return { ok: false as const, error: "Bericht is verplicht." };

  const { error } = await supabase.from("announcements").insert({
    title,
    body_md,
    pinned,
    author_id: access.user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function togglePin(id: string, pinned: boolean) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({ pinned })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteAnnouncement(id: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om community te beheren." };
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
