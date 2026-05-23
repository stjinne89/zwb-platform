"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess } from "@/lib/auth/permissions";

async function requireMember() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  return { ok: true as const, userId: access.user.id, access, supabase };
}

async function requirePollAdmin() {
  const guard = await requireMember();
  if (!guard.ok) return guard;
  if (!guard.access.has("polls.manage")) {
    return { ok: false as const, error: "Geen recht om polls te beheren." };
  }
  return guard;
}

function revalidatePollPaths() {
  revalidatePath("/polls");
  revalidatePath("/community");
  revalidatePath("/dashboard");
}

export async function createPoll(formData: FormData) {
  const guard = await requirePollAdmin();
  if (!guard.ok) return guard;

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { ok: false as const, error: "Vraag is verplicht." };

  const description =
    String(formData.get("description_md") ?? "").trim() || null;
  const multiSelect = formData.get("multi_select") === "on";
  const closesAtRaw = String(formData.get("closes_at") ?? "").trim();
  const closesAt = closesAtRaw ? new Date(closesAtRaw).toISOString() : null;

  // Opties komen als opties[]-veld; minimaal 2 niet-lege.
  const rawOptions = formData
    .getAll("options")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);
  if (rawOptions.length < 2) {
    return {
      ok: false as const,
      error: "Een poll heeft minimaal 2 opties nodig.",
    };
  }

  const admin = createAdminClient();
  const { data: poll, error: pollErr } = await admin
    .from("polls")
    .insert({
      scope: "free",
      question,
      description_md: description,
      multi_select: multiSelect,
      closes_at: closesAt,
      created_by: guard.userId,
    })
    .select("id")
    .single();
  if (pollErr || !poll) {
    return {
      ok: false as const,
      error: pollErr?.message ?? "Poll aanmaken faalde.",
    };
  }

  const optionRows = rawOptions.map((label, idx) => ({
    poll_id: poll.id,
    label,
    display_order: (idx + 1) * 10,
  }));
  const { error: optErr } = await admin.from("poll_options").insert(optionRows);
  if (optErr) {
    // rollback
    await admin.from("polls").delete().eq("id", poll.id);
    return { ok: false as const, error: optErr.message };
  }

  revalidatePollPaths();
  return { ok: true as const, pollId: poll.id };
}

export async function closePoll(pollId: string) {
  const guard = await requirePollAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from("polls")
    .update({ active: false })
    .eq("id", pollId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePollPaths();
  return { ok: true as const };
}

export async function reopenPoll(pollId: string) {
  const guard = await requirePollAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin
    .from("polls")
    .update({ active: true })
    .eq("id", pollId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePollPaths();
  return { ok: true as const };
}

export async function deletePoll(pollId: string) {
  const guard = await requirePollAdmin();
  if (!guard.ok) return guard;

  const admin = createAdminClient();
  const { error } = await admin.from("polls").delete().eq("id", pollId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePollPaths();
  return { ok: true as const };
}

/**
 * Stem op een poll. Voor single-select polls wordt eerst de bestaande
 * stem verwijderd (zodat we "verander stem"-flow gratis krijgen) en
 * dan de nieuwe ingevoegd. Voor multi-select kun je elke optie los
 * aan/uit zetten — als de combinatie (poll, option, profile) al bestaat
 * verwijderen we 'm, anders insert.
 */
export async function castVote(formData: FormData) {
  const guard = await requireMember();
  if (!guard.ok) return guard;

  const pollId = String(formData.get("poll_id") ?? "").trim();
  const optionIds = formData
    .getAll("option_id")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  if (!pollId || optionIds.length === 0) {
    return { ok: false as const, error: "Geen optie gekozen." };
  }

  const { data: poll } = await guard.supabase
    .from("polls")
    .select("id, multi_select, active, closes_at")
    .eq("id", pollId)
    .single();
  if (!poll) return { ok: false as const, error: "Poll niet gevonden." };
  if (!poll.active) return { ok: false as const, error: "Poll is gesloten." };
  if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
    return { ok: false as const, error: "Poll is verlopen." };
  }

  if (!poll.multi_select) {
    // Single-select: verwijder oude stem(men), insert de nieuwe.
    await guard.supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("profile_id", guard.userId);

    const { error: insErr } = await guard.supabase
      .from("poll_votes")
      .insert({
        poll_id: pollId,
        option_id: optionIds[0],
        profile_id: guard.userId,
      });
    if (insErr) return { ok: false as const, error: insErr.message };
  } else {
    // Multi-select: bepaal welke al gekozen waren, toggle delta's.
    const { data: existing } = await guard.supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", pollId)
      .eq("profile_id", guard.userId);

    const existingSet = new Set(
      (existing ?? []).map((r) => r.option_id as string),
    );
    const incomingSet = new Set(optionIds);

    const toDelete = Array.from(existingSet).filter((id) => !incomingSet.has(id));
    const toInsert = Array.from(incomingSet).filter((id) => !existingSet.has(id));

    if (toDelete.length > 0) {
      await guard.supabase
        .from("poll_votes")
        .delete()
        .eq("poll_id", pollId)
        .eq("profile_id", guard.userId)
        .in("option_id", toDelete);
    }
    if (toInsert.length > 0) {
      const { error: insErr } = await guard.supabase
        .from("poll_votes")
        .insert(
          toInsert.map((option_id) => ({
            poll_id: pollId,
            option_id,
            profile_id: guard.userId,
          })),
        );
      if (insErr) return { ok: false as const, error: insErr.message };
    }
  }

  revalidatePollPaths();
  return { ok: true as const };
}

export async function clearMyVote(pollId: string) {
  const guard = await requireMember();
  if (!guard.ok) return guard;

  const { error } = await guard.supabase
    .from("poll_votes")
    .delete()
    .eq("poll_id", pollId)
    .eq("profile_id", guard.userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePollPaths();
  return { ok: true as const };
}
