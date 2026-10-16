import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import { loadTopicCatalog } from "@/lib/zwbieb/queries";
import { TopicAdminRow } from "../_components/topic-admin-row";

/**
 * Onderwerpen en spullen van ZWBieb beheren (0242): hernoemen, verbergen, of
 * verwijderen als niemand ze gebruikt. Voor de moderatie.
 */
export default async function OnderwerpenPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  if (!access.user) redirect("/login");
  if (!access.has("community.manage") && !access.has("content.moderate_posts")) redirect("/zwbieb");

  const [catalog, { data: used }, { data: tipped }, { data: makers }] = await Promise.all([
    loadTopicCatalog(supabase),
    supabase.from("member_knowledge_topics").select("topic_slug"),
    supabase.from("member_tips").select("topic_slug"),
    supabase.from("knowledge_topics").select("slug, created_by, profiles:created_by(display_name)"),
  ]);

  const count = new Map<string, number>();
  for (const row of [...(used ?? []), ...(tipped ?? [])] as { topic_slug: string }[]) {
    count.set(row.topic_slug, (count.get(row.topic_slug) ?? 0) + 1);
  }
  const makerOf = new Map(
    ((makers ?? []) as { slug: string; profiles: { display_name: string } | { display_name: string }[] | null }[]).map(
      (row) => [row.slug, (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles)?.display_name ?? null],
    ),
  );

  return (
    <div className="space-y-6">
      <BackLink href="/zwbieb" label="ZWBieb" />
      <PageHeader title="Onderwerpen beheren" />
      {(["kennis", "spullen"] as const).map((kind) => (
        <section key={kind} className="space-y-2 rounded-lg border bg-card p-4">
          <h2 className="text-base font-semibold">{kind === "spullen" ? "Spullen" : "Kennis"}</h2>
          <ul className="divide-y">
            {catalog.all
              .filter((row) => row.kind === kind)
              .map((row) => (
                <TopicAdminRow
                  key={row.slug}
                  slug={row.slug}
                  label={row.label}
                  status={row.status}
                  uses={count.get(row.slug) ?? 0}
                  maker={makerOf.get(row.slug) ?? null}
                />
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
