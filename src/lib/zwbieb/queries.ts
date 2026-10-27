import type { createClient } from "@/lib/supabase/server";
import { countUnread, type ThreadReadState } from "./data";
import {
  BUILT_IN_ITEMS,
  BUILT_IN_TOPICS,
  buildTopicCatalog,
  type TopicCatalog,
  type TopicRow,
} from "./topics";

// Queries van "ZWBieb", gedeeld door het overzicht, het profiel, de
// eventpagina en de kop. Altijd met de sessie van het lid: RLS (0239) bepaalt
// wat er terugkomt.

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type MemberSummary = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type ExpertTopicRow = {
  profile_id: string;
  topic_slug: string;
  note: string | null;
};

export type TipRow = {
  id: string;
  /** Null bij een tip met een externe bron (0283). */
  profile_id: string | null;
  topic_slug: string;
  event_id: string | null;
  col_slug: string | null;
  body: string;
  source: "lid" | "import" | "gesprek" | "bron";
  /** Alleen bij source 'bron': de naam en het artikel. */
  source_name: string | null;
  source_url: string | null;
  status: "published" | "hidden";
  created_at: string;
};

export const TIP_COLUMNS =
  "id, profile_id, topic_slug, event_id, col_slug, body, source, source_name, source_url, status, created_at";

export type ThreadRow = ThreadReadState & {
  id: string;
  topic_slug: string;
  status: "open" | "closed";
  created_at: string;
};

export const THREAD_COLUMNS =
  "id, asker_id, expert_id, topic_slug, status, last_message_at, last_author_id, asker_read_at, expert_read_at, created_at";

/** Naam en avatar per lid, voor een lijst id's. Null (een tip met een bron) valt weg. */
export async function loadMembers(
  supabase: Supabase,
  ids: Iterable<string | null>,
): Promise<Map<string, MemberSummary>> {
  const unique = Array.from(new Set(ids)).filter((id): id is string => id !== null);
  if (unique.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", unique);
  return new Map(((data ?? []) as MemberSummary[]).map((m) => [m.id, m]));
}

/** De gesprekken van het lid, als vrager of als kenner, nieuwste eerst. */
export async function loadMyThreads(supabase: Supabase, userId: string): Promise<ThreadRow[]> {
  const { data } = await supabase
    .from("knowledge_threads")
    .select(THREAD_COLUMNS)
    .or(`asker_id.eq.${userId},expert_id.eq.${userId}`)
    .order("last_message_at", { ascending: false })
    .limit(200);
  return (data ?? []) as ThreadRow[];
}

/** Namen van de cols, voor tips die aan een col hangen. */
export async function loadColNames(
  supabase: Supabase,
  slugs: Iterable<string>,
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(slugs));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("cols").select("slug, name").in("slug", unique);
  return new Map(((data ?? []) as { slug: string; name: string }[]).map((c) => [c.slug, c.name]));
}

/** Titels van events, voor tips die aan een event hangen. */
export async function loadEventTitles(
  supabase: Supabase,
  ids: Iterable<string>,
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return new Map();
  const { data } = await supabase.from("events").select("id, title").in("id", unique);
  return new Map(((data ?? []) as { id: string; title: string }[]).map((e) => [e.id, e.title]));
}

/**
 * Aantal gesprekken met iets ongelezens, voor het icoon in de kop. Draait op
 * elke pagina, dus alleen de gesprekken waarin een ander het laatst schreef,
 * via de indexen op asker_id en expert_id.
 */
export async function countUnreadThreads(supabase: Supabase, userId: string): Promise<number> {
  const { data } = await supabase
    .from("knowledge_threads")
    .select("asker_id, expert_id, last_author_id, last_message_at, asker_read_at, expert_read_at")
    .or(`asker_id.eq.${userId},expert_id.eq.${userId}`)
    .neq("last_author_id", userId)
    .limit(100);
  return countUnread((data ?? []) as ThreadReadState[], userId);
}

/**
 * De onderwerpen uit knowledge_topics (0242). Lukt dat niet, bijvoorbeeld
 * zolang 0242 nog niet is toegepast, dan de startlijst uit code.
 */
export async function loadTopicCatalog(supabase: Supabase): Promise<TopicCatalog> {
  const { data, error } = await supabase
    .from("knowledge_topics")
    .select("slug, label, kind, sort_order, status");
  if (error || !data) {
    return buildTopicCatalog([
      ...BUILT_IN_TOPICS.map((topic, index) => ({
        ...topic,
        kind: "kennis" as const,
        sort_order: index + 1,
        status: "active" as const,
      })),
      ...BUILT_IN_ITEMS.map((topic, index) => ({
        ...topic,
        kind: "spullen" as const,
        sort_order: 101 + index,
        status: "active" as const,
      })),
    ]);
  }
  return buildTopicCatalog(data as TopicRow[]);
}
