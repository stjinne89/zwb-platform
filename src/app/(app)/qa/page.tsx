import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { answerSnippet, splitQuestions } from "@/lib/qa/data";
import { loadQuestions } from "@/lib/qa/load";
import { AskQuestionForm } from "./_components/ask-form";
import { FaqEntry } from "./_components/faq-entry";
import { QuestionCard } from "./_components/question-card";

// Q&A: vragen van leden over de app (migr. 0254), met "Ik ook" en de FAQ
// (migr. 0258). RLS bepaalt wat er in de lijst staat: clubvragen voor
// iedereen, bestuursvragen alleen voor de vrager en wie qa.answer heeft.

const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-muted-foreground";

export default async function QaPage() {
  const [supabase, access] = await Promise.all([createClient(), getRequestAccess()]);
  if (!access.user) redirect("/login");
  const canAnswer = access.has("qa.answer");

  // Bij 35 leden blijft dit klein; 200 is ruim genoeg om niets te missen.
  const { items, error } = await loadQuestions(supabase, access.user.id, 200);
  const { faq, open, answered } = splitQuestions(items);
  // Waar een open vraag mee samen kan: elke andere clubvraag, beantwoorde eerst.
  const mergeOptions = canAnswer
    ? [...faq, ...answered, ...open]
        .filter((item) => item.visibility === "club")
        .map((item) => ({ id: item.id, label: answerSnippet(item.body, 80) }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Q&A" />

      {error ? (
        <EmptyState>Q&A is nog niet beschikbaar.</EmptyState>
      ) : (
        <>
          {faq.length > 0 && (
            <section id="faq" className="scroll-mt-20 space-y-3">
              <h2 className={sectionTitle}>Veelgestelde vragen</h2>
              <ul className="divide-y rounded-lg border bg-card">
                {faq.map((item) => (
                  <FaqEntry key={item.id} item={item} canAnswer={canAnswer} />
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border bg-card p-4">
            <AskQuestionForm />
          </section>

          {items.length === 0 && <EmptyState>Nog geen vragen.</EmptyState>}

          {open.length > 0 && (
            <section id="open" className="scroll-mt-20 space-y-3">
              <h2 className={sectionTitle}>Open ({open.length})</h2>
              <ul className="space-y-3">
                {open.map((item) => (
                  <QuestionCard
                    key={item.id}
                    item={item}
                    canAnswer={canAnswer}
                    mergeOptions={mergeOptions}
                  />
                ))}
              </ul>
            </section>
          )}

          {answered.length > 0 && (
            <section className="space-y-3">
              <h2 className={sectionTitle}>Beantwoord</h2>
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
