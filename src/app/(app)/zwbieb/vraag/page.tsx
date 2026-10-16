import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import { MEMBER_KNOWLEDGE_CONSENT_VERSION } from "@/lib/zwbieb/consent";
import { loadMembers, loadTopicCatalog } from "@/lib/zwbieb/queries";
import { MemberChip } from "../_components/member-chip";
import { QuestionForm } from "../_components/question-form";

type PageProps = {
  searchParams: Promise<{ aan?: string; onderwerp?: string; tip?: string }>;
};

export default async function VraagPage({ searchParams }: PageProps) {
  const { aan, onderwerp, tip } = await searchParams;
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");
  const catalog = await loadTopicCatalog(supabase);
  if (!aan || !catalog.exists(onderwerp) || aan === user.id) notFound();
  const topicName = catalog.label(onderwerp);

  const [{ data: expertTopic }, { data: consent }, { data: tipRow }, members] = await Promise.all([
    supabase
      .from("member_knowledge_topics")
      .select("profile_id, note")
      .eq("profile_id", aan)
      .eq("topic_slug", onderwerp)
      .maybeSingle(),
    supabase.from("member_knowledge").select("consent_version").eq("profile_id", user.id).maybeSingle(),
    tip
      ? supabase.from("member_tips").select("id, body").eq("id", tip).maybeSingle()
      : Promise.resolve({ data: null }),
    loadMembers(supabase, [aan]),
  ]);
  if (!expertTopic) notFound();

  return (
    <div className="space-y-6">
      <BackLink href={`/zwbieb?onderwerp=${onderwerp}`} label={topicName} />
      <PageHeader title="Vraag het aan" />
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="space-y-1">
          <MemberChip member={members.get(aan)} />
          <p className="text-sm text-muted-foreground">
            {topicName}
            {expertTopic.note ? ` · ${expertTopic.note}` : ""}
          </p>
        </div>
        {tipRow && (
          <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
            {(tipRow as { body: string }).body}
          </blockquote>
        )}
        <QuestionForm
          expertId={aan}
          topic={onderwerp}
          tipId={tipRow ? (tipRow as { id: string }).id : null}
          needsConsent={consent?.consent_version !== MEMBER_KNOWLEDGE_CONSENT_VERSION}
        />
      </section>
    </div>
  );
}
