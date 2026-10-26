"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserAccess, profileIdsWithPermission } from "@/lib/auth/permissions";
import { sendNotificationToMembers } from "@/lib/push/send";
import { questionAnchor, type QaVisibility } from "@/lib/qa/data";
import {
  QA_ANSWER_MAX,
  QA_QUESTION_MAX,
  QA_QUESTION_MIN,
  QA_QUESTIONS_PER_DAY,
} from "@/lib/qa/limits";

// Acties van Q&A. Alles loopt met de sessie van het lid zelf, dus RLS (0254,
// 0258) is de eerste grendel; de rechtencheck hieronder is de tweede. De pushmelding
// noemt nooit de tekst van de vraag of het antwoord.

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function refreshQa() {
  revalidatePath("/qa");
  revalidatePath("/dashboard");
}

async function member() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  return { supabase, access, user: access.user };
}

/** Wie "Ik ook" tikte bij een vraag; leeg zolang 0258 er niet is. */
async function alsoAskers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("member_question_askers")
    .select("profile_id")
    .eq("question_id", questionId);
  return error ? [] : (data ?? []).map((row) => row.profile_id as string);
}

async function answerer() {
  const guard = await member();
  if (!guard.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!guard.access.has("qa.answer")) {
    return { ok: false as const, error: "Geen recht om vragen te beantwoorden." };
  }
  return { ok: true as const, ...guard, user: guard.user };
}

export async function askAppQuestion(input: {
  body: string;
  bestuurOnly: boolean;
}): Promise<Result<{ id: string }>> {
  const { supabase, user } = await member();
  if (!user) return { ok: false, error: "Niet ingelogd." };

  const body = input.body.trim();
  if (body.length < QA_QUESTION_MIN) return { ok: false, error: "Schrijf je vraag." };
  if (body.length > QA_QUESTION_MAX) return { ok: false, error: `Maximaal ${QA_QUESTION_MAX} tekens.` };
  const visibility: QaVisibility = input.bestuurOnly ? "bestuur" : "club";

  const { data, error } = await supabase
    .from("member_questions")
    .insert({ profile_id: user.id, body, visibility })
    .select("id")
    .single();
  if (error || !data) {
    if (error && /Daglimiet/.test(error.message)) {
      return { ok: false, error: `Je kunt ${QA_QUESTIONS_PER_DAY} vragen per dag stellen.` };
    }
    return { ok: false, error: error?.message ?? "Versturen mislukt." };
  }

  // Best effort: een mislukte melding mag de vraag niet raken.
  try {
    const admin = createAdminClient();
    const [recipients, { data: profile }] = await Promise.all([
      profileIdsWithPermission(admin, "qa.answer"),
      supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    ]);
    if (recipients.length > 0) {
      await sendNotificationToMembers(
        "on_qa_question",
        {
          title: "Nieuwe vraag in Q&A",
          body: `${(profile?.display_name as string | undefined) ?? "Een lid"} stelde een vraag over de app.`,
          url: `/qa#${questionAnchor(data.id)}`,
          tag: `qa-${data.id}`,
        },
        { profileIds: recipients, excludeProfileId: user.id },
      );
    }
  } catch (err) {
    console.error("[qa] melding over nieuwe vraag faalde:", err);
  }

  refreshQa();
  return { ok: true, data: { id: data.id as string } };
}

export async function answerAppQuestion(id: string, answer: string): Promise<Result> {
  const guard = await answerer();
  if (!guard.ok) return guard;
  const text = answer.trim();
  if (text.length === 0) return { ok: false, error: "Schrijf een antwoord." };
  if (text.length > QA_ANSWER_MAX) return { ok: false, error: `Maximaal ${QA_ANSWER_MAX} tekens.` };

  const { data: before } = await guard.supabase
    .from("member_questions")
    .select("profile_id, answered_at")
    .eq("id", id)
    .maybeSingle();
  if (!before) return { ok: false, error: "Vraag niet gevonden." };

  const { error } = await guard.supabase.from("member_questions").update({ answer: text }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  // Alleen bij het eerste antwoord; een verbetering hoeft geen nieuwe melding.
  // Wie "Ik ook" tikte, wacht op hetzelfde antwoord.
  if (!before.answered_at) {
    const recipients = [before.profile_id as string, ...(await alsoAskers(guard.supabase, id))].filter(
      (profileId) => profileId !== guard.user.id,
    );
    if (recipients.length > 0) {
      await sendNotificationToMembers(
        "on_qa_answer",
        {
          title: "Je vraag is beantwoord",
          body: "Bekijk het antwoord in Q&A.",
          url: `/qa#${questionAnchor(id)}`,
          tag: `qa-${id}`,
        },
        { profileIds: recipients },
      ).catch((err) => console.error("[qa] melding over antwoord faalde:", err));
    }
  }

  refreshQa();
  return { ok: true };
}

export async function setAppQuestionVisibility(id: string, visibility: QaVisibility): Promise<Result> {
  const guard = await answerer();
  if (!guard.ok) return guard;
  if (visibility !== "club" && visibility !== "bestuur") return { ok: false, error: "Onbekende keuze." };
  const { error } = await guard.supabase.from("member_questions").update({ visibility }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refreshQa();
  return { ok: true };
}

/** Eigen vraag, of elke vraag voor wie antwoordt; RLS beslist. */
export async function deleteAppQuestion(id: string): Promise<Result> {
  const { supabase, user } = await member();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { data, error } = await supabase.from("member_questions").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "Deze vraag kun je niet verwijderen." };
  refreshQa();
  return { ok: true };
}

/** "Ik ook" bij een clubvraag van een ander, of weer weghalen. */
export async function setAlsoAsked(id: string, alsoAsked: boolean): Promise<Result> {
  const { supabase, user } = await member();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { error } = alsoAsked
    ? await supabase
        .from("member_question_askers")
        .upsert({ question_id: id, profile_id: user.id }, { onConflict: "question_id,profile_id", ignoreDuplicates: true })
    : await supabase.from("member_question_askers").delete().eq("question_id", id).eq("profile_id", user.id);
  if (error) return { ok: false, error: "Dat lukte niet." };
  refreshQa();
  return { ok: true };
}

/** In of uit de FAQ; alleen een beantwoorde clubvraag kan erin (0258). */
export async function setAppQuestionFaq(id: string, inFaq: boolean): Promise<Result> {
  const guard = await answerer();
  if (!guard.ok) return guard;
  const { data, error } = await guard.supabase
    .from("member_questions")
    .update({ faq_at: inFaq ? new Date().toISOString() : null })
    .eq("id", id)
    .select("faq_at")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Vraag niet gevonden." };
  if (inFaq && !data.faq_at) {
    return { ok: false, error: "Alleen een beantwoorde vraag voor iedereen kan in de FAQ." };
  }
  refreshQa();
  return { ok: true };
}

/**
 * Een vraag die er al staat: de vrager (en wie bij de dubbele vraag "Ik ook"
 * tikte) telt mee bij het origineel, en de dubbele vraag verdwijnt.
 */
export async function mergeAppQuestion(duplicateId: string, originalId: string): Promise<Result> {
  const guard = await answerer();
  if (!guard.ok) return guard;
  if (duplicateId === originalId) return { ok: false, error: "Kies een andere vraag." };

  const { data: rows } = await guard.supabase
    .from("member_questions")
    .select("id, profile_id, visibility, answered_at")
    .in("id", [duplicateId, originalId]);
  const duplicate = rows?.find((row) => row.id === duplicateId);
  const original = rows?.find((row) => row.id === originalId);
  if (!duplicate || !original) return { ok: false, error: "Vraag niet gevonden." };
  if (original.visibility !== "club") {
    return { ok: false, error: "Voeg alleen samen met een vraag voor iedereen." };
  }

  const askers = [
    ...new Set([duplicate.profile_id as string, ...(await alsoAskers(guard.supabase, duplicateId))]),
  ].filter((profileId) => profileId !== original.profile_id);
  if (askers.length > 0) {
    const { error } = await guard.supabase.from("member_question_askers").upsert(
      askers.map((profileId) => ({ question_id: originalId, profile_id: profileId })),
      { onConflict: "question_id,profile_id", ignoreDuplicates: true },
    );
    if (error) return { ok: false, error: "Samenvoegen lukte niet." };
  }

  const { error: deleteError } = await guard.supabase
    .from("member_questions")
    .delete()
    .eq("id", duplicateId);
  if (deleteError) return { ok: false, error: deleteError.message };

  const recipients = askers.filter((profileId) => profileId !== guard.user.id);
  if (recipients.length > 0) {
    await sendNotificationToMembers(
      "on_qa_answer",
      original.answered_at
        ? {
            title: "Je vraag is beantwoord",
            body: "Hij stond al in Q&A. Bekijk het antwoord.",
            url: `/qa#${questionAnchor(originalId)}`,
            tag: `qa-${originalId}`,
          }
        : {
            title: "Je vraag stond al in Q&A",
            body: "Je krijgt een melding als hij beantwoord is.",
            url: `/qa#${questionAnchor(originalId)}`,
            tag: `qa-${originalId}`,
          },
      { profileIds: recipients },
    ).catch((err) => console.error("[qa] melding over samenvoegen faalde:", err));
  }

  refreshQa();
  return { ok: true };
}
