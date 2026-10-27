import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import {
  TIP_COLUMNS,
  loadColNames,
  loadEventTitles,
  loadMembers,
  loadTopicCatalog,
  type TipRow,
} from "@/lib/zwbieb/queries";
import { KnowledgeForm } from "../_components/knowledge-form";
import { TipItem } from "../_components/tip-item";

export default async function MijnZwbiebPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");

  const [{ data: consent }, { data: topicRows }, { data: tipRows }, catalog] = await Promise.all([
    supabase.from("member_knowledge").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    supabase.from("member_knowledge_topics").select("topic_slug, note").eq("profile_id", user.id),
    supabase
      .from("member_tips")
      .select(TIP_COLUMNS)
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
    loadTopicCatalog(supabase),
  ]);

  const tips = (tipRows ?? []) as TipRow[];
  const [members, eventTitles, colNames] = await Promise.all([
    loadMembers(supabase, [user.id]),
    loadEventTitles(supabase, tips.flatMap((t) => (t.event_id ? [t.event_id] : []))),
    loadColNames(supabase, tips.flatMap((t) => (t.col_slug ? [t.col_slug] : []))),
  ]);
  const initial = Object.fromEntries(
    ((topicRows ?? []) as { topic_slug: string; note: string | null }[]).map((t) => [t.topic_slug, t.note ?? ""]),
  );
  // Kiesbaar, plus wat je al had en inmiddels verborgen is.
  const options = catalog.all
    .filter((row) => row.status === "active" || row.slug in initial)
    .map(({ slug, label, kind }) => ({ slug, label, kind }));

  return (
    <div className="space-y-6">
      <BackLink href="/zwbieb" label="ZWBieb" />
      <PageHeader title="Mijn ZWBieb" />
      <KnowledgeForm options={options} initial={initial} joined={Boolean(consent)} />

      {tips.length > 0 && (
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">Mijn tips</h2>
          <ul className="space-y-2">
            {tips.map((tip) => (
              <TipItem
                key={tip.id}
                tip={tip}
                author={tip.profile_id ? members.get(tip.profile_id) : undefined}
                viewerId={user.id}
                canModerate={false}
                topicName={catalog.label(tip.topic_slug)}
                eventTitle={tip.event_id ? eventTitles.get(tip.event_id) : undefined}
                colName={tip.col_slug ? colNames.get(tip.col_slug) : undefined}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
