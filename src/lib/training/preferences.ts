// Persoonlijke voorkeuren van een renner (0230): wat het lid van zichzelf weet
// en wat een trainer over hem weet, in gewone taal. Ze gaan mee in elke
// schemageneratie en staan op het tabblad Uitgangspunten.
//
// Schrijven loopt altijd via de service-role, na canWritePreferences(): RLS
// kent alleen een select-policy, net als bij de coachchat.

import type { createAdminClient } from "@/lib/supabase/admin";
import { canCoach } from "@/lib/training/coach-access";

type Admin = ReturnType<typeof createAdminClient>;

/** Langste voorkeur; gelijk aan een chatbericht, zodat dat er altijd in past. */
export const MAX_PREFERENCE_CHARS = 1000;
/**
 * Hoeveel voorkeuren een lid kan hebben. Ze gaan allemaal mee in de prompt; een
 * lijst zonder einde zou de rest van de invoer wegdrukken en elkaar tegenspreken.
 */
export const MAX_PREFERENCES = 12;

export type PreferenceRole = "member" | "trainer";

export type TrainingPreference = {
  id: string;
  authorId: string | null;
  authorRole: PreferenceRole;
  authorName: string;
  body: string;
  source: "manual" | "chat";
  createdAt: string;
};

type PreferenceRow = {
  id: string;
  author_id: string | null;
  author_role: PreferenceRole;
  body: string;
  source: "manual" | "chat";
  created_at: string;
  profiles: { display_name: string | null } | null;
};

const SELECT =
  "id, author_id, author_role, body, source, created_at, " +
  "profiles!training_preferences_author_id_fkey(display_name)";

/** De voorkeuren van één lid, oudste eerst. */
export async function loadPreferences(admin: Admin, profileId: string): Promise<TrainingPreference[]> {
  const { data, error } = await admin
    .from("training_preferences")
    .select(SELECT)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(MAX_PREFERENCES);
  // De tabel kan er nog niet zijn als de migratie niet is uitgevoerd; dan is er
  // gewoon niets vastgelegd.
  if (error) return [];
  return ((data ?? []) as unknown as PreferenceRow[]).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    authorRole: row.author_role,
    authorName: row.profiles?.display_name ?? (row.author_role === "trainer" ? "Trainer" : "Lid"),
    body: row.body,
    source: row.source,
    createdAt: row.created_at,
  }));
}

/** Zoals de voorkeuren naar het model gaan: zonder namen. */
export type PreferenceForAi = { by: "lid" | "trainer"; date: string; text: string };

export function preferencesToAi(
  preferences: Pick<TrainingPreference, "authorRole" | "createdAt" | "body">[],
): PreferenceForAi[] {
  return preferences.map((preference) => ({
    by: preference.authorRole === "trainer" ? "trainer" : "lid",
    date: String(preference.createdAt).slice(0, 10),
    text: preference.body,
  }));
}

/**
 * De voorkeuren voor de AI-invoer. Mislukt stil: een schema zonder voorkeuren
 * is beter dan geen schema.
 */
export async function preferencesForAi(admin: Admin, profileId: string): Promise<PreferenceForAi[]> {
  return preferencesToAi(await loadPreferences(admin, profileId).catch(() => []));
}

/** Tekst uit een formulier of chatbericht, klaar om op te slaan. */
export function cleanPreferenceBody(value: unknown): string {
  return String(value ?? "").trim().slice(0, MAX_PREFERENCE_CHARS);
}

/** Het lid zelf, of een trainer die het lid heeft aangewezen. */
export async function preferenceRoleFor(
  admin: Admin,
  userId: string,
  profileId: string,
): Promise<PreferenceRole | null> {
  if (userId === profileId) return "member";
  return (await canCoach(admin, userId, profileId)) ? "trainer" : null;
}

export type AddPreferenceResult = { ok: true; id: string } | { ok: false; error: string };

export async function addPreference(
  admin: Admin,
  input: {
    profileId: string;
    authorId: string;
    authorRole: PreferenceRole;
    body: string;
    source?: "manual" | "chat";
  },
): Promise<AddPreferenceResult> {
  const body = cleanPreferenceBody(input.body);
  if (!body) return { ok: false, error: "Voorkeur is leeg." };

  const { count } = await admin
    .from("training_preferences")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", input.profileId);
  if ((count ?? 0) >= MAX_PREFERENCES) {
    return { ok: false, error: `Hooguit ${MAX_PREFERENCES} voorkeuren; haal er eerst een weg.` };
  }

  const { data, error } = await admin
    .from("training_preferences")
    .insert({
      profile_id: input.profileId,
      author_id: input.authorId,
      author_role: input.authorRole,
      body,
      source: input.source ?? "manual",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

/**
 * Mag deze gebruiker deze voorkeur weghalen? Het lid mag alles weg wat over hem
 * is vastgelegd, ook wat een trainer schreef: het zijn zijn gegevens. Een
 * trainer alleen wat hij zelf schreef.
 */
export function canRemovePreference(
  userId: string,
  preference: { profileId: string; authorId: string | null },
): boolean {
  return userId === preference.profileId || (preference.authorId != null && userId === preference.authorId);
}
