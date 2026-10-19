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

// Acties van Q&A. Alles loopt met de sessie van het lid zelf, dus RLS (0254)
// is de eerste grendel; de rechtencheck hieronder is de tweede. De pushmelding
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
  if (!before.answered_at && before.profile_id !== guard.user.id) {
    await sendNotificationToMembers(
      "on_qa_answer",
      {
        title: "Je vraag is beantwoord",
        body: "Bekijk het antwoord in Q&A.",
        url: `/qa#${questionAnchor(id)}`,
        tag: `qa-${id}`,
      },
      { profileIds: [before.profile_id as string] },
    ).catch((err) => console.error("[qa] melding over antwoord faalde:", err));
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
