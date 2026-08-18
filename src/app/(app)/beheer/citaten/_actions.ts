"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { componentType, isDiscipline } from "@/lib/maintenance/component-types";
import {
  parseWhatsappExport,
  toCandidates,
  type QuoteCandidate,
} from "@/lib/maintenance/whatsapp-export";

export type ImportProfile = { id: string; display_name: string };

/**
 * Plakken van een geëxporteerd gesprek levert kandidaten op, geen citaten. De
 * naamkoppeling is een voorstel dat de beheerder bevestigt — automatisch
 * toewijzen zou uitspraken aan de verkeerde persoon hangen.
 */
export async function parseExport(raw: string): Promise<
  | { ok: true; candidates: QuoteCandidate[]; profiles: ImportProfile[] }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("community.manage")) {
    return { ok: false, error: "Geen recht om citaten te beheren." };
  }
  if (raw.trim().length < 20) {
    return { ok: false, error: "Plak eerst een geëxporteerd gesprek." };
  }

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_approved", true)
    .order("display_name");
  const profiles = ((data ?? []) as ImportProfile[]).filter((p) => p.display_name);

  const candidates = toCandidates(parseWhatsappExport(raw), profiles);
  if (candidates.length === 0) {
    return {
      ok: false,
      error: "Geen bruikbare berichten gevonden. Klopt het formaat van de export?",
    };
  }
  return { ok: true, candidates, profiles };
}

export async function saveQuote(input: {
  body: string;
  profileId: string;
  componentType: string;
  discipline: string | null;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om citaten te beheren." };
  }

  const body = input.body.trim();
  if (body.length < 3 || body.length > 600) {
    return { ok: false as const, error: "Citaat moet tussen 3 en 600 tekens zijn." };
  }
  if (!componentType(input.componentType)) {
    return { ok: false as const, error: "Onbekend onderdeel." };
  }
  if (!input.profileId) {
    return { ok: false as const, error: "Kies bij wie dit citaat hoort." };
  }
  const discipline =
    input.discipline && isDiscipline(input.discipline) ? input.discipline : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", input.profileId)
    .maybeSingle();
  if (!profile) return { ok: false as const, error: "Lid niet gevonden." };

  const { error } = await supabase.from("maintenance_tips").insert({
    component_type: input.componentType,
    discipline,
    body,
    source_type: "lid",
    source_name: profile.display_name,
    profile_id: input.profileId,
    created_by: access.user.id,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/mijn-garage");
  revalidatePath("/profiel");
  return { ok: true as const };
}

/** Handmatig een tip toevoegen die niet uit een groepsapp komt. */
export async function saveTip(input: {
  body: string;
  componentType: string;
  discipline: string | null;
  sourceType: "pro" | "algemeen";
  sourceName: string | null;
  sourceUrl: string | null;
}) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user || !access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om tips te beheren." };
  }

  const body = input.body.trim();
  if (body.length < 3 || body.length > 600) {
    return { ok: false as const, error: "Tip moet tussen 3 en 600 tekens zijn." };
  }
  if (!componentType(input.componentType)) {
    return { ok: false as const, error: "Onbekend onderdeel." };
  }
  // Auteursrecht: van een pro nemen we een samenvatting op met bronlink, geen
  // overgenomen tekst.
  if (input.sourceType === "pro" && !input.sourceUrl?.trim()) {
    return { ok: false as const, error: "Een pro-tip heeft een bronlink nodig." };
  }

  const { error } = await supabase.from("maintenance_tips").insert({
    component_type: input.componentType,
    discipline:
      input.discipline && isDiscipline(input.discipline) ? input.discipline : null,
    body,
    source_type: input.sourceType,
    source_name: input.sourceName?.trim() || null,
    source_url: input.sourceUrl?.trim() || null,
    created_by: access.user.id,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/mijn-garage");
  return { ok: true as const };
}

export async function deleteTip(id: string) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.has("community.manage")) {
    return { ok: false as const, error: "Geen recht om tips te beheren." };
  }

  const { error } = await supabase.from("maintenance_tips").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/mijn-garage");
  revalidatePath("/profiel");
  return { ok: true as const };
}
