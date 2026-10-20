import type { SupabaseClient } from "@supabase/supabase-js";
import { QA_SELECT, QA_SELECT_0254, toQaItem, type QaItem, type QuestionRow } from "./data";

/**
 * De vragen die de kijker mag zien (RLS, 0254), met de FAQ en "Ik ook" (0258).
 * Staat 0258 nog niet op de database, dan valt het terug op de kolommen van
 * 0254: Q&A werkt dan gewoon, zonder FAQ en zonder teller.
 */
export async function loadQuestions(
  supabase: SupabaseClient,
  viewerId: string | null,
  limit: number,
): Promise<{ items: QaItem[]; error: boolean }> {
  const query = (columns: string) =>
    supabase
      .from("member_questions")
      .select(columns)
      .order("activity_at", { ascending: false })
      .limit(limit);

  let result = await query(QA_SELECT);
  if (result.error) result = await query(QA_SELECT_0254);
  if (result.error) return { items: [], error: true };

  const { data: alsoRows, error: alsoError } = viewerId
    ? await supabase.from("member_question_askers").select("question_id").eq("profile_id", viewerId)
    : { data: [], error: null };
  const alsoAskedIds = new Set(
    alsoError ? [] : (alsoRows ?? []).map((row) => row.question_id as string),
  );

  const items = ((result.data ?? []) as unknown as QuestionRow[]).map((row) =>
    toQaItem(row, viewerId, alsoAskedIds),
  );
  return { items, error: false };
}
