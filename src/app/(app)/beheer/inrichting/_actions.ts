"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  canCompleteSetup,
  parseClubIdentity,
  parseClubNames,
  parseRecognition,
  type ClubIdentityInput,
  type ClubNamesInput,
  type RecognitionInput,
} from "@/lib/club-setup";
import { requireClubOwner, writeClubSettings, type WriteResult } from "@/lib/club-settings-write";
import { loadSetupSnapshot } from "./_data";

/** Stap 1: naam, korte naam, leden-aanduiding en contact. */
export async function updateClubIdentity(input: ClubIdentityInput): Promise<WriteResult> {
  const guard = await requireClubOwner();
  if (!guard.ok) return guard;
  const parsed = parseClubIdentity(input);
  if (!parsed.ok) return parsed;
  return writeClubSettings(guard.userId, parsed.value);
}

/**
 * Stap 4: de naam per module (club_modules.label) en de eigen woorden (0319).
 * Het formulier stuurt één lijst: `m:<module>` is een modulenaam, de rest een woord.
 */
export async function updateClubNames(values: Record<string, string>): Promise<WriteResult> {
  const guard = await requireClubOwner();
  if (!guard.ok) return guard;
  const input: ClubNamesInput = { labels: {}, words: {} };
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("m:")) input.labels![key.slice(2)] = value;
    else (input.words as Record<string, string>)[key] = value;
  }
  const parsed = parseClubNames(input);
  if (!parsed.ok) return parsed;

  if (parsed.value.labels.length) {
    const now = new Date().toISOString();
    // Alleen de naam: de aan/uit-stand van /beheer/inrichting/modules blijft staan.
    const { error } = await createAdminClient()
      .from("club_modules")
      .upsert(
        parsed.value.labels.map((row) => ({ ...row, updated_at: now, updated_by: guard.userId })),
        { onConflict: "module_key" },
      );
    if (error) return { ok: false, error: error.message };
  }
  return writeClubSettings(guard.userId, parsed.value.words);
}

/** Stap 5: eventmarkers, teamtag en de social-handles. */
export async function updateClubRecognition(input: RecognitionInput): Promise<WriteResult> {
  const guard = await requireClubOwner();
  if (!guard.ok) return guard;
  const parsed = parseRecognition(input);
  if (!parsed.ok) return parsed;
  return writeClubSettings(guard.userId, parsed.value);
}

/** Afronden: de balk op het dashboard verdwijnt; alles blijft aan te passen. */
export async function completeClubSetup(): Promise<WriteResult> {
  const guard = await requireClubOwner();
  if (!guard.ok) return guard;
  const snapshot = await loadSetupSnapshot();
  if (!snapshot) return { ok: false, error: "Kon de inrichting niet laden." };
  if (!canCompleteSetup(snapshot)) return { ok: false, error: "Vul eerst de naam van de club in." };
  return writeClubSettings(guard.userId, { setup_completed_at: new Date().toISOString() });
}
