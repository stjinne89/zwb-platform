import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { PageHeader } from "@/components/app-ui";
import { countUnread } from "@/lib/zwbieb/data";
import { loadMyThreads, loadTopicCatalog } from "@/lib/zwbieb/queries";
import { COLLECTION_LABELS, shelves } from "@/lib/zwbieb/shelves";
import { TopicBadge } from "../_components/topic-badge";
import { ZwbiebActions, ZwbiebTabs } from "../_components/zwbieb-nav";
import { ShelfBrowser } from "./shelf-browser";

/**
 * ZWBieb, tab Leeszaal: de artikelen uit de kennisbanken trainen, voeding en
 * kracht, per onderwerp (src/lib/zwbieb/shelves.ts), met de kenners erbij.
 */
export default async function ZwbiebLeeszaalPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");
  const canModerate = access.has("community.manage") || access.has("content.moderate_posts");

  const all = shelves();
  const topicSlugs = Array.from(new Set(all.flatMap((shelf) => shelf.topics)));
  const [catalog, { data: expertRows }, { data: myConsent }, threads] = await Promise.all([
    loadTopicCatalog(supabase),
    supabase.from("member_knowledge_topics").select("topic_slug").in("topic_slug", topicSlugs),
    supabase.from("member_knowledge").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    loadMyThreads(supabase, user.id),
  ]);

  const expertCount = new Map<string, number>();
  for (const row of (expertRows ?? []) as { topic_slug: string }[]) {
    expertCount.set(row.topic_slug, (expertCount.get(row.topic_slug) ?? 0) + 1);
  }

  // Per plank de onderwerpen van ZWBieb erbij; een verborgen onderwerp niet.
  const topicLinks: Record<string, ReactNode> = {};
  for (const shelf of all) {
    const topics = shelf.topics.filter((slug) => catalog.isActive(slug));
    if (topics.length === 0) continue;
    topicLinks[shelf.slug] = (
      <ul className="mt-3 flex flex-wrap gap-2 border-t pt-3">
        {topics.map((slug) => {
          const count = expertCount.get(slug) ?? 0;
          return (
            <li key={slug}>
              <Link
                href={`/zwbieb?onderwerp=${slug}`}
                className="group inline-flex min-h-[44px] items-center gap-2 rounded-md border py-1 pr-3 pl-1 text-sm hover:bg-muted"
              >
                <TopicBadge slug={slug} kind="kennis" size="sm" />
                <span>{catalog.label(slug)}</span>
                <span className="text-xs text-muted-foreground">
                  {count === 1 ? "1 kenner" : `${count} kenners`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="ZWBieb"
        actions={
          <ZwbiebActions
            unread={countUnread(threads, user.id)}
            joined={Boolean(myConsent)}
            canModerate={canModerate}
          />
        }
      />
      <ZwbiebTabs current="leeszaal" />
      <ShelfBrowser
        shelves={all.map((shelf) => ({
          slug: shelf.slug,
          label: shelf.label,
          books: shelf.books.map((book) => ({
            href: book.href,
            title: book.title,
            summary: book.summary,
            collection: COLLECTION_LABELS[book.collection],
          })),
        }))}
        topicLinks={topicLinks}
      />
    </div>
  );
}
