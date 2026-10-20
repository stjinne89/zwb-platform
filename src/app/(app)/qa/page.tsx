import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { QA_SELECT, splitQuestions, toQaItem, type QuestionRow } from "@/lib/qa/data";
import { AskQuestionForm } from "./_components/ask-form";
import { QuestionCard } from "./_components/question-card";

// Q&A: vragen van leden over de app (migr. 0254). RLS bepaalt wat er in de
// lijst staat: clubvragen voor iedereen, bestuursvragen alleen voor de vrager
// en wie qa.answer heeft.

export default async function QaPage() {
  const [supabase, access] = await Promise.all([createClient(), getRequestAccess()]);
  if (!access.user) redirect("/login");
  const canAnswer = access.has("qa.answer");

  // Bij 35 leden blijft dit klein; 200 is ruim genoeg om niets te missen.
  const { data, error } = await supabase
    .from("member_questions")
    .select(QA_SELECT)
    .order("activity_at", { ascending: false })
    .limit(200);
  const items = ((data ?? []) as unknown as QuestionRow[]).map((row) =>
    toQaItem(row, access.user?.id ?? null),
  );
  const { open, answered } = splitQuestions(items);

  return (
    <div className="space-y-6">
      <PageHeader title="Q&A" />

      {error ? (
        <EmptyState>Q&A is nog niet beschikbaar.</EmptyState>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <AskQuestionForm />
          </section>

          {items.length === 0 && <EmptyState>Nog geen vragen.</EmptyState>}

          {open.length > 0 && (
            <section id="open" className="scroll-mt-20 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Open ({open.length})
              </h2>
              <ul className="space-y-3">
                {open.map((item) => (
                  <QuestionCard key={item.id} item={item} canAnswer={canAnswer} />
                ))}
              </ul>
            </section>
          )}

          {answered.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Beantwoord
              </h2>
              <ul className="space-y-3">
                {answered.map((item) => (
                  <QuestionCard key={item.id} item={item} canAnswer={canAnswer} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
