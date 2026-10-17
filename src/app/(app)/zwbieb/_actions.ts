"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { sendNotificationToMembers } from "@/lib/push/send";
import { MEMBER_KNOWLEDGE_CONSENT_VERSION } from "@/lib/zwbieb/consent";
import {
  KNOWLEDGE_QUESTIONS_PER_DAY,
  MAX_ITEMS_PER_MEMBER,
  MAX_TOPICS_PER_MEMBER,
  MESSAGE_MAX,
  QUESTION_MAX,
  TIP_MAX,
  TIP_MIN,
  TOPIC_NOTE_MAX,
  TOPICS_PER_DAY,
} from "@/lib/zwbieb/limits";
import { loadTopicCatalog } from "@/lib/zwbieb/queries";
import {
  TOPIC_LABEL_MAX,
  TOPIC_LABEL_MIN,
  isTopicKind,
  normalizeTopicLabel,
  slugifyTopic,
  type TopicKind,
  type TopicOption,
} from "@/lib/zwbieb/topics";

// Acties van ZWBieb. Alles loopt met de sessie van het lid zelf, dus
// RLS (0239) is de eerste grendel; de filters op profile_id hieronder zijn de
// tweede, zoals bij de citaten op het profiel.

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const BASE = "/zwbieb";

async function sessionClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshKnowledge(extra: string[] = []) {
  revalidatePath(BASE);
  revalidatePath(`${BASE}/spullen`);
  revalidatePath(`${BASE}/mijn`);
  revalidatePath(`${BASE}/gesprekken`);
  revalidatePath("/leden/[id]", "page");
  for (const path of extra) revalidatePath(path);
}

/** Zet de toestemmingsrij neer, of werkt de versie bij. */
async function ensureConsent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { error } = await supabase.from("member_knowledge").upsert(
    {
      profile_id: userId,
      consent_version: MEMBER_KNOWLEDGE_CONSENT_VERSION,
      consented_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  return error ? error.message : null;
}

export type TopicInput = { slug: string; note: string };

export async function saveMyKnowledge(input: {
  topics: TopicInput[];
  consent: boolean;
}): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  if (!input.consent) return { ok: false, error: "Zet eerst het vinkje voor toestemming." };

  // Een verborgen onderwerp dat je al had, mag je houden; nieuw kiezen niet.
  const [catalog, { data: current }] = await Promise.all([
    loadTopicCatalog(supabase),
    supabase.from("member_knowledge_topics").select("topic_slug").eq("profile_id", user.id),
  ]);
  const had = new Set(((current ?? []) as { topic_slug: string }[]).map((row) => row.topic_slug));

  const seen = new Set<string>();
  const topics: { slug: string; note: string | null }[] = [];
  const perKind: Record<TopicKind, number> = { kennis: 0, spullen: 0 };
  for (const topic of input.topics) {
    if (seen.has(topic.slug)) continue;
    if (!catalog.isActive(topic.slug) && !(had.has(topic.slug) && catalog.exists(topic.slug))) continue;
    seen.add(topic.slug);
    const note = topic.note.trim();
    if (note.length > TOPIC_NOTE_MAX) {
      return { ok: false, error: `Toelichting bij ${catalog.label(topic.slug)}: maximaal ${TOPIC_NOTE_MAX} tekens.` };
    }
    perKind[catalog.kindOf(topic.slug) ?? "kennis"] += 1;
    topics.push({ slug: topic.slug, note: note || null });
  }
  if (perKind.kennis > MAX_TOPICS_PER_MEMBER) {
    return { ok: false, error: `Kies maximaal ${MAX_TOPICS_PER_MEMBER} onderwerpen.` };
  }
  if (perKind.spullen > MAX_ITEMS_PER_MEMBER) {
    return { ok: false, error: `Kies maximaal ${MAX_ITEMS_PER_MEMBER} spullen.` };
  }

  const consentError = await ensureConsent(supabase, user.id);
  if (consentError) return { ok: false, error: consentError };

  const { error: deleteError } = await supabase
    .from("member_knowledge_topics")
    .delete()
    .eq("profile_id", user.id);
  if (deleteError) return { ok: false, error: deleteError.message };

  if (topics.length > 0) {
    const { error } = await supabase.from("member_knowledge_topics").insert(
      topics.map((t) => ({ profile_id: user.id, topic_slug: t.slug, note: t.note })),
    );
    if (error) return { ok: false, error: error.message };
  }

  refreshKnowledge();
  return { ok: true };
}

/**
 * Een onderwerp of spul toevoegen dat er nog niet tussen staat (0242). Bestaat
 * dezelfde naam al (hoofdletters en spaties tellen niet), dan komt dat terug.
 */
export async function addTopic(input: {
  label: string;
  kind: TopicKind;
}): Promise<Result<TopicOption>> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  if (!isTopicKind(input.kind)) return { ok: false, error: "Onbekende soort." };

  const label = normalizeTopicLabel(input.label);
  if (label.length < TOPIC_LABEL_MIN || label.length > TOPIC_LABEL_MAX) {
    return { ok: false, error: `Een naam van ${TOPIC_LABEL_MIN} tot ${TOPIC_LABEL_MAX} tekens.` };
  }
  const base = slugifyTopic(label);
  if (base.length < 2) return { ok: false, error: "Gebruik letters of cijfers in de naam." };

  const catalog = await loadTopicCatalog(supabase);
  const same = catalog.all.find((row) => row.label.toLowerCase() === label.toLowerCase());
  if (same) {
    if (same.status !== "active") return { ok: false, error: "Dit onderwerp is door de moderatie verborgen." };
    return { ok: true, data: { slug: same.slug, label: same.label, kind: same.kind } };
  }

  let slug = base;
  for (let n = 2; catalog.exists(slug); n += 1) {
    slug = `${base.slice(0, 37).replace(/-+$/, "")}-${n}`;
  }

  const { error } = await supabase
    .from("knowledge_topics")
    .insert({ slug, label, kind: input.kind, created_by: user.id });
  if (error) {
    if (/Daglimiet/.test(error.message)) {
      return { ok: false, error: `Je kunt ${TOPICS_PER_DAY} nieuwe onderwerpen per dag toevoegen.` };
    }
    return { ok: false, error: error.code === "23505" ? "Dit onderwerp bestaat al." : error.message };
  }

  refreshKnowledge();
  return { ok: true, data: { slug, label, kind: input.kind } };
}

/** Stoppen: de toestemming en de onderwerpen weg. Tips en gesprekken blijven. */
export async function stopMyKnowledge(): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { error } = await supabase.from("member_knowledge").delete().eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge();
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// Vragen en gesprekken
// ──────────────────────────────────────────────────────────────────────

async function notifyOther(threadId: string, recipientId: string, senderName: string, topicName: string) {
  await sendNotificationToMembers(
    "on_knowledge_message",
    {
      title: `${senderName} over ${topicName.toLowerCase()}`,
      body: "Nieuw bericht in ZWBieb.",
      url: `${BASE}/gesprekken/${threadId}`,
      tag: `knowledge-${threadId}`,
    },
    { profileIds: [recipientId] },
  ).catch(() => null);
}

async function displayName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? "Een lid";
}

export async function askQuestion(input: {
  expertId: string;
  topic: string;
  body: string;
  tipId?: string | null;
  consent: boolean;
}): Promise<Result<{ threadId: string }>> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const catalog = await loadTopicCatalog(supabase);
  if (!catalog.exists(input.topic)) return { ok: false, error: "Onbekend onderwerp." };
  if (input.expertId === user.id) return { ok: false, error: "Je kunt jezelf geen vraag stellen." };

  const body = input.body.trim();
  if (body.length < 1) return { ok: false, error: "Schrijf je vraag." };
  if (body.length > QUESTION_MAX) return { ok: false, error: `Maximaal ${QUESTION_MAX} tekens.` };

  const { data: consentRow } = await supabase
    .from("member_knowledge")
    .select("consent_version")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (consentRow?.consent_version !== MEMBER_KNOWLEDGE_CONSENT_VERSION) {
    if (!input.consent) return { ok: false, error: "Zet eerst het vinkje voor toestemming." };
    const consentError = await ensureConsent(supabase, user.id);
    if (consentError) return { ok: false, error: consentError };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("knowledge_threads")
    .select("id", { count: "exact", head: true })
    .eq("asker_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= KNOWLEDGE_QUESTIONS_PER_DAY) {
    return { ok: false, error: `Je kunt ${KNOWLEDGE_QUESTIONS_PER_DAY} nieuwe vragen per dag stellen.` };
  }

  const { data: thread, error } = await supabase
    .from("knowledge_threads")
    .insert({
      asker_id: user.id,
      expert_id: input.expertId,
      topic_slug: input.topic,
      tip_id: input.tipId || null,
    })
    .select("id")
    .single();
  if (error || !thread) {
    return { ok: false, error: "Dit lid is voor dit onderwerp niet (meer) te vragen." };
  }

  const { error: messageError } = await supabase
    .from("knowledge_messages")
    .insert({ thread_id: thread.id, author_id: user.id, body });
  if (messageError) return { ok: false, error: messageError.message };

  await notifyOther(
    thread.id as string,
    input.expertId,
    await displayName(supabase, user.id),
    catalog.label(input.topic),
  );
  refreshKnowledge();
  return { ok: true, data: { threadId: thread.id as string } };
}

export async function replyToThread(threadId: string, rawBody: string): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const body = rawBody.trim();
  if (body.length < 1) return { ok: false, error: "Schrijf een bericht." };
  if (body.length > MESSAGE_MAX) return { ok: false, error: `Maximaal ${MESSAGE_MAX} tekens.` };

  const { data: thread } = await supabase
    .from("knowledge_threads")
    .select("id, asker_id, expert_id, topic_slug, status")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return { ok: false, error: "Gesprek niet gevonden." };
  if (thread.status !== "open") return { ok: false, error: "Dit gesprek is gesloten." };

  const { error } = await supabase
    .from("knowledge_messages")
    .insert({ thread_id: threadId, author_id: user.id, body });
  if (error) return { ok: false, error: error.message };

  const recipient = thread.asker_id === user.id ? thread.expert_id : thread.asker_id;
  const catalog = await loadTopicCatalog(supabase);
  await notifyOther(
    threadId,
    recipient as string,
    await displayName(supabase, user.id),
    catalog.label(thread.topic_slug as string),
  );
  refreshKnowledge([`${BASE}/gesprekken/${threadId}`]);
  return { ok: true };
}

export async function closeThread(threadId: string): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { error } = await supabase.rpc("close_knowledge_thread", { thread: threadId });
  if (error) return { ok: false, error: error.message };
  refreshKnowledge([`${BASE}/gesprekken/${threadId}`]);
  return { ok: true };
}

export async function deleteMyMessage(messageId: string, threadId: string): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { error } = await supabase
    .from("knowledge_messages")
    .delete()
    .eq("id", messageId)
    .eq("author_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`${BASE}/gesprekken/${threadId}`);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// Tips
// ──────────────────────────────────────────────────────────────────────

function checkTipBody(raw: string): { body: string } | { error: string } {
  const body = raw.trim();
  if (body.length < TIP_MIN) return { error: "Een tip van niets kunnen we niet tonen." };
  if (body.length > TIP_MAX) return { error: `Maximaal ${TIP_MAX} tekens.` };
  return { body };
}

export async function addMyTip(input: {
  topic: string;
  body: string;
  eventId?: string | null;
  colSlug?: string | null;
}): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  if (!(await loadTopicCatalog(supabase)).isActive(input.topic)) return { ok: false, error: "Kies een onderwerp." };
  const checked = checkTipBody(input.body);
  if ("error" in checked) return { ok: false, error: checked.error };

  const { error } = await supabase.from("member_tips").insert({
    profile_id: user.id,
    topic_slug: input.topic,
    body: checked.body,
    event_id: input.eventId || null,
    col_slug: input.colSlug || null,
    source: "lid",
    created_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  refreshKnowledge(input.eventId ? [`/events/${input.eventId}`] : []);
  return { ok: true };
}

/**
 * Een bericht van de ander uit een gesprek bewaren als tip voor de club (0240).
 * De tip staat op naam van wie het schreef; die krijgt een melding en beheert
 * hem daarna zelf. Je eigen bericht kan niet: dat oordeel is aan de ontvanger.
 */
export async function saveMessageAsTip(input: {
  messageId: string;
  topic: string;
  body: string;
}): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  if (!(await loadTopicCatalog(supabase)).exists(input.topic)) return { ok: false, error: "Kies een onderwerp." };
  const checked = checkTipBody(input.body);
  if ("error" in checked) return { ok: false, error: checked.error };

  // RLS geeft het bericht alleen aan de twee deelnemers van het gesprek.
  const { data: message } = await supabase
    .from("knowledge_messages")
    .select("id, author_id, thread_id")
    .eq("id", input.messageId)
    .maybeSingle();
  if (!message || !message.author_id) return { ok: false, error: "Bericht niet gevonden." };
  if (message.author_id === user.id) {
    return { ok: false, error: "Je eigen bericht kan alleen de ander als tip bewaren." };
  }

  const { error } = await supabase.from("member_tips").insert({
    profile_id: message.author_id,
    topic_slug: input.topic,
    body: checked.body,
    source: "gesprek",
    message_id: message.id,
    created_by: user.id,
  });
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "Dit bericht is al als tip bewaard." : error.message,
    };
  }

  await sendNotificationToMembers(
    "on_knowledge_message",
    {
      title: `${await displayName(supabase, user.id)} bewaarde je antwoord als tip`,
      body: "Je kunt de tip zelf aanpassen of verwijderen.",
      url: `${BASE}/mijn`,
      tag: `knowledge-tip-${message.id}`,
    },
    { profileIds: [message.author_id as string] },
  ).catch(() => null);

  refreshKnowledge([`${BASE}/gesprekken/${message.thread_id}`]);
  return { ok: true };
}

export async function updateMyTip(id: string, rawBody: string): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const checked = checkTipBody(rawBody);
  if ("error" in checked) return { ok: false, error: checked.error };

  const { error } = await supabase
    .from("member_tips")
    .update({ body: checked.body })
    .eq("id", id)
    .eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge();
  revalidatePath("/events/[id]", "page");
  return { ok: true };
}

export async function deleteMyTip(id: string): Promise<Result> {
  const { supabase, user } = await sessionClient();
  if (!user) return { ok: false, error: "Niet ingelogd." };
  const { error } = await supabase.from("member_tips").delete().eq("id", id).eq("profile_id", user.id);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge();
  revalidatePath("/events/[id]", "page");
  return { ok: true };
}

async function moderatorClient() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  const allowed = access.has("community.manage") || access.has("content.moderate_posts");
  return { supabase, allowed: Boolean(access.user) && allowed };
}

export async function setTipStatus(id: string, status: "published" | "hidden"): Promise<Result> {
  const { supabase, allowed } = await moderatorClient();
  if (!allowed) return { ok: false, error: "Geen rechten." };
  const { error } = await supabase.from("member_tips").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge();
  revalidatePath("/events/[id]", "page");
  return { ok: true };
}

export async function deleteTip(id: string): Promise<Result> {
  const { supabase, allowed } = await moderatorClient();
  if (!allowed) return { ok: false, error: "Geen rechten." };
  const { error } = await supabase.from("member_tips").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge();
  revalidatePath("/events/[id]", "page");
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────
// Onderwerpen beheren (moderatie, 0242)
// ──────────────────────────────────────────────────────────────────────

export async function renameTopic(slug: string, rawLabel: string): Promise<Result> {
  const { supabase, allowed } = await moderatorClient();
  if (!allowed) return { ok: false, error: "Geen rechten." };
  const label = normalizeTopicLabel(rawLabel);
  if (label.length < TOPIC_LABEL_MIN || label.length > TOPIC_LABEL_MAX) {
    return { ok: false, error: `Een naam van ${TOPIC_LABEL_MIN} tot ${TOPIC_LABEL_MAX} tekens.` };
  }
  const { error } = await supabase.from("knowledge_topics").update({ label }).eq("slug", slug);
  if (error) return { ok: false, error: error.code === "23505" ? "Die naam bestaat al." : error.message };
  refreshKnowledge([`${BASE}/onderwerpen`]);
  revalidatePath("/events/[id]", "page");
  return { ok: true };
}

export async function setTopicStatus(slug: string, status: "active" | "hidden"): Promise<Result> {
  const { supabase, allowed } = await moderatorClient();
  if (!allowed) return { ok: false, error: "Geen rechten." };
  const { error } = await supabase.from("knowledge_topics").update({ status }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  refreshKnowledge([`${BASE}/onderwerpen`]);
  return { ok: true };
}

/** Lukt alleen als niemand het onderwerp gebruikt; anders verbergen. */
export async function deleteTopic(slug: string): Promise<Result> {
  const { supabase, allowed } = await moderatorClient();
  if (!allowed) return { ok: false, error: "Geen rechten." };
  const { error } = await supabase.from("knowledge_topics").delete().eq("slug", slug);
  if (error) {
    return {
      ok: false,
      error: error.code === "23503" ? "In gebruik; verberg het in plaats van verwijderen." : error.message,
    };
  }
  refreshKnowledge([`${BASE}/onderwerpen`]);
  return { ok: true };
}
