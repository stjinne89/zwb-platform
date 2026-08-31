"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { requestReplan } from "@/lib/training/replan";
import { SEASON_PERIOD_KINDS, SEASON_PRIORITIES } from "@/lib/training/season";

type SeasonActionState = { ok: boolean; error?: string } | null;

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function mustString(value: FormDataEntryValue | null, label: string) {
  const text = optionalString(value);
  if (!text) throw new Error(`${label} ontbreekt.`);
  return text;
}

/** 'YYYY-MM-DD' uit een date-input; alles anders is een fout, geen gok. */
function mustDate(value: FormDataEntryValue | null, label: string) {
  const text = mustString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} is geen geldige datum.`);
  return text;
}

function mustPriority(value: FormDataEntryValue | null) {
  const text = optionalString(value) ?? "b";
  if (!(SEASON_PRIORITIES as readonly string[]).includes(text)) {
    throw new Error("Ongeldige prioriteit.");
  }
  return text;
}

function mustPeriodKind(value: FormDataEntryValue | null) {
  const text = optionalString(value) ?? "rust";
  if (!(SEASON_PERIOD_KINDS as readonly string[]).includes(text)) {
    throw new Error("Ongeldig soort periode.");
  }
  return text;
}

async function currentUser() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) throw new Error("Niet ingelogd.");
  return { supabase, access, user: access.user };
}

/**
 * Elke wijziging in de jaarplanning is een verandering van de randvoorwaarden
 * waar het schema op gebouwd is — net als een gewijzigde beschikbaarheid. De
 * cooldown van vijf minuten in requestReplan() vangt op dat iemand er drie
 * periodes achter elkaar in zet.
 */
async function afterSeasonChange(profileId: string, reden: string) {
  const admin = createAdminClient();
  await requestReplan(admin, profileId, reden).catch(() => null);
  revalidatePath("/zwbeter-worden", "layout");
}

function mislukt(err: unknown, fallback: string): SeasonActionState {
  return { ok: false, error: err instanceof Error ? err.message : fallback };
}

// ---------------------------------------------------------------------------
// Mikpunten
// ---------------------------------------------------------------------------

export async function createSeasonTarget(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();

    const title = mustString(formData.get("title"), "Titel");
    const targetDate = mustDate(formData.get("target_date"), "Datum");
    const priority = mustPriority(formData.get("priority"));
    const eventId = optionalString(formData.get("event_id"));

    // Hetzelfde clubevent twee keer op de tijdlijn is geen mikpunt maar een
    // fout; de unieke index weigert het toch, dus vang het hier netjes af.
    if (eventId) {
      const { data: bestaand } = await admin
        .from("training_season_targets")
        .select("id")
        .eq("profile_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();
      if (bestaand) {
        revalidatePath("/zwbeter-worden", "layout");
        return { ok: true };
      }
    }

    const { error } = await admin.from("training_season_targets").insert({
      profile_id: user.id,
      event_id: eventId,
      title,
      target_date: targetDate,
      priority,
      note: optionalString(formData.get("note")),
      created_by: user.id,
      updated_by: user.id,
    });
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, `mikpunt "${title}" toegevoegd aan de jaarplanning`);
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Mikpunt opslaan faalde.");
  }
}

export async function updateSeasonTarget(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();

    const id = mustString(formData.get("id"), "Mikpunt");
    const patch: Record<string, unknown> = { updated_by: user.id };

    // Het formulier stuurt alles mee; de waarschuwing "zet op B" alleen de
    // prioriteit. Vandaar dat elk veld optioneel is.
    if (formData.get("title") != null) patch.title = mustString(formData.get("title"), "Titel");
    if (formData.get("target_date") != null) {
      patch.target_date = mustDate(formData.get("target_date"), "Datum");
    }
    if (formData.get("priority") != null) patch.priority = mustPriority(formData.get("priority"));
    if (formData.get("note") != null) patch.note = optionalString(formData.get("note"));

    const { error } = await admin
      .from("training_season_targets")
      .update(patch)
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, "mikpunt in de jaarplanning gewijzigd");
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Mikpunt bijwerken faalde.");
  }
}

export async function deleteSeasonTarget(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();
    const id = mustString(formData.get("id"), "Mikpunt");

    const { error } = await admin
      .from("training_season_targets")
      .delete()
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, "mikpunt uit de jaarplanning verwijderd");
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Mikpunt verwijderen faalde.");
  }
}

// ---------------------------------------------------------------------------
// Periodes
// ---------------------------------------------------------------------------

export async function createSeasonPeriod(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();

    const title = mustString(formData.get("title"), "Titel");
    const startDate = mustDate(formData.get("start_date"), "Begindatum");
    const endDate = mustDate(formData.get("end_date"), "Einddatum");
    if (endDate < startDate) throw new Error("De einddatum ligt vóór de begindatum.");
    const kind = mustPeriodKind(formData.get("kind"));

    const { error } = await admin.from("training_season_periods").insert({
      profile_id: user.id,
      title,
      start_date: startDate,
      end_date: endDate,
      kind,
      note: optionalString(formData.get("note")),
      created_by: user.id,
      updated_by: user.id,
    });
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, `periode "${title}" toegevoegd aan de jaarplanning`);
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Periode opslaan faalde.");
  }
}

export async function updateSeasonPeriod(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();

    const id = mustString(formData.get("id"), "Periode");
    const title = mustString(formData.get("title"), "Titel");
    const startDate = mustDate(formData.get("start_date"), "Begindatum");
    const endDate = mustDate(formData.get("end_date"), "Einddatum");
    if (endDate < startDate) throw new Error("De einddatum ligt vóór de begindatum.");

    const { error } = await admin
      .from("training_season_periods")
      .update({
        title,
        start_date: startDate,
        end_date: endDate,
        kind: mustPeriodKind(formData.get("kind")),
        note: optionalString(formData.get("note")),
        updated_by: user.id,
      })
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, "periode in de jaarplanning gewijzigd");
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Periode bijwerken faalde.");
  }
}

export async function deleteSeasonPeriod(formData: FormData): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();
    const id = mustString(formData.get("id"), "Periode");

    const { error } = await admin
      .from("training_season_periods")
      .delete()
      .eq("id", id)
      .eq("profile_id", user.id);
    if (error) throw new Error(error.message);

    await afterSeasonChange(user.id, "periode uit de jaarplanning verwijderd");
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Periode verwijderen faalde.");
  }
}

// ---------------------------------------------------------------------------
// Losse actie vanuit een signalering
// ---------------------------------------------------------------------------

/**
 * "Laat je schema herzien" bij de waarschuwing dat er trainingen in een
 * rustperiode staan. Dit is dezelfde herziening die een gewijzigde
 * beschikbaarheid aanvraagt; hij loopt in de achtergrond, dus het lid ziet het
 * resultaat pas op de schemapagina.
 */
export async function requestSeasonReplan(): Promise<SeasonActionState> {
  try {
    const { user } = await currentUser();
    const admin = createAdminClient();
    await requestReplan(admin, user.id, "jaarplanning gewijzigd");
    revalidatePath("/zwbeter-worden", "layout");
    return { ok: true };
  } catch (err) {
    return mislukt(err, "Herziening aanvragen faalde.");
  }
}
