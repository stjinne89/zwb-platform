import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/auth/request";
import { loadMembers, loadTopicCatalog, type ExpertTopicRow } from "@/lib/zwbieb/queries";
import { shelfForArticle } from "@/lib/zwbieb/shelves";
import { ExpertRow } from "./expert-row";

const MAX_EXPERTS = 5;

/**
 * Onder een kennisartikel: clubleden die zich in ZWBieb melden bij een
 * onderwerp van de plank waar het artikel op staat. Zonder kenners niets.
 */
export async function ArticleExperts({ articleHref }: { articleHref: string }) {
  const shelf = shelfForArticle(articleHref);
  if (!shelf || shelf.topics.length === 0) return null;

  const [supabase, user] = await Promise.all([createClient(), getRequestUser()]);
  if (!user) return null;

  const catalog = await loadTopicCatalog(supabase);
  const topics = shelf.topics.filter((slug) => catalog.isActive(slug));
  if (topics.length === 0) return null;

  const { data } = await supabase
    .from("member_knowledge_topics")
    .select("profile_id, topic_slug, note")
    .in("topic_slug", topics)
    .neq("profile_id", user.id);

  // Wie bij twee onderwerpen staat, komt één keer, bij het eerste.
  const seen = new Set<string>();
  const experts = ((data ?? []) as ExpertTopicRow[])
    .sort((a, b) => topics.indexOf(a.topic_slug) - topics.indexOf(b.topic_slug))
    .filter((row) => !seen.has(row.profile_id) && seen.add(row.profile_id));
  if (experts.length === 0) return null;

  const members = await loadMembers(
    supabase,
    experts.map((row) => row.profile_id),
  );
  const sorted = experts.sort((a, b) =>
    (members.get(a.profile_id)?.display_name ?? "").localeCompare(
      members.get(b.profile_id)?.display_name ?? "",
      "nl",
    ),
  );

  return (
    <section className="max-w-3xl space-y-3">
      <h3 className="font-semibold">Vraag een clublid</h3>
      <div className="rounded-lg border bg-card p-4">
        <ul className="space-y-2">
          {sorted.slice(0, MAX_EXPERTS).map((expert) => (
            <ExpertRow
              key={expert.profile_id}
              expert={expert}
              member={members.get(expert.profile_id)}
              self={false}
            />
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-sm">
          {topics.map((slug) => (
            <Link
              key={slug}
              href={`/zwbieb?onderwerp=${slug}`}
              className="inline-flex min-h-[44px] items-center text-muted-foreground hover:text-primary"
            >
              {catalog.label(slug)} in ZWBieb
            </Link>
          ))}
        </p>
      </div>
    </section>
  );
}
