import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";

/**
 * Ingang naar Q&A op het dashboard (migr. 0254, 0258): een tegel. Vragen
 * stellen en lezen gebeurt op /qa (wens eigenaar, 2026-10-20). Wie antwoordt,
 * ziet hoeveel vragen wachten; dat is dan goud, want het vraagt om actie.
 * Bestaat de tabel nog niet, dan valt de ingang weg.
 */
export async function QaDashboard() {
  const [supabase, access] = await Promise.all([createClient(), getRequestAccess()]);
  if (!access.user) return null;
  const canAnswer = access.has("qa.answer");

  const [{ error, count: openCount }, { count: faqCount }] = await Promise.all([
    supabase
      .from("member_questions")
      .select("id", { count: "exact", head: true })
      .is("answered_at", null),
    // Zonder 0258 faalt dit en telt het als nul.
    supabase
      .from("member_questions")
      .select("id", { count: "exact", head: true })
      .not("faq_at", "is", null),
  ]);
  if (error) return null;

  const waiting = canAnswer ? (openCount ?? 0) : 0;
  const waitingLabel = waiting === 1 ? "1 vraag wacht" : `${waiting} vragen wachten`;
  const faqLabel = faqCount ? `${faqCount} in de FAQ` : null;

  return (
    <Link href={waiting > 0 ? "/qa#open" : "/qa"} className={`tg-tile ${waiting > 0 ? "tg-vandaag" : "tg-club"}`}>
      <span className="tg-tile-small">Q&amp;A{faqLabel ? ` · ${faqLabel}` : ""}</span>
      <span className="tg-tile-title mt-0.5">
        {waiting > 0 ? waitingLabel : "Vraag over de app?"}
      </span>
    </Link>
  );
}
