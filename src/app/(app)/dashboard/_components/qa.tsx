import Link from "next/link";
import { AlertTriangle, MessageCircleQuestionMark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { InlineMoreLink, SectionHeader } from "@/components/app-ui";
import {
  QA_SELECT,
  answerSnippet,
  questionAnchor,
  toQaItem,
  type QuestionRow,
} from "@/lib/qa/data";
import { AskQuestionForm } from "../../qa/_components/ask-form";

/**
 * Q&A op het dashboard (migr. 0254): een vraag over de app stellen, de drie
 * vragen met de nieuwste activiteit, en voor wie antwoordt hoeveel er openstaan.
 * Bestaat de tabel nog niet, dan valt het blok weg in plaats van een
 * formulier te tonen dat niet kan opslaan.
 */
export async function QaDashboard() {
  const [supabase, access] = await Promise.all([createClient(), getRequestAccess()]);
  if (!access.user) return null;
  const canAnswer = access.has("qa.answer");

  const [{ data, error }, { count: openCount }] = await Promise.all([
    supabase
      .from("member_questions")
      .select(QA_SELECT)
      .order("activity_at", { ascending: false })
      .limit(3),
    canAnswer
      ? supabase
          .from("member_questions")
          .select("id", { count: "exact", head: true })
          .is("answered_at", null)
      : Promise.resolve({ count: 0 }),
  ]);
  if (error) return null;
  const items = ((data ?? []) as unknown as QuestionRow[]).map((row) =>
    toQaItem(row, access.user?.id ?? null),
  );

  return (
    <section>
      <SectionHeader
        icon={MessageCircleQuestionMark}
        title="Q&A"
        action={<InlineMoreLink href="/qa">Alle vragen</InlineMoreLink>}
      />
      <div className={items.length > 0 ? "grid items-start gap-3 lg:grid-cols-2" : "grid gap-3"}>
        <div className="space-y-3">
          <div className="rounded-lg border bg-card p-3">
            <AskQuestionForm compact />
          </div>
          {canAnswer && (openCount ?? 0) > 0 && (
            <Link
              href="/qa#open"
              className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 transition hover:border-amber-500/70 dark:text-amber-300"
            >
              <AlertTriangle className="size-4 shrink-0" />
              {openCount === 1 ? "1 vraag wacht op antwoord" : `${openCount} vragen wachten op antwoord`}
            </Link>
          )}
        </div>
        {items.length > 0 && (
          <ul className="divide-y rounded-lg border bg-card">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/qa#${questionAnchor(item.id)}`}
                  className="block p-3 transition hover:bg-muted/50"
                >
                  <p className="line-clamp-2 text-sm font-medium">{item.body}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.answer ? answerSnippet(item.answer) : "Wacht op antwoord"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
