import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, EmptyState, HelpLink, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_TOPICS, isKnowledgeTopic, topicLabel } from "@/lib/wie-weet-wat/topics";
import { countUnread } from "@/lib/wie-weet-wat/data";
import {
  TIP_COLUMNS,
  loadColNames,
  loadEventTitles,
  loadMembers,
  loadMyThreads,
  type ExpertTopicRow,
  type MemberSummary,
  type TipRow,
} from "@/lib/wie-weet-wat/queries";
import { AskLink } from "./_components/ask-link";
import { MemberAvatar } from "./_components/member-chip";
import { MemberLink } from "@/components/member-link";
import { TipItem } from "./_components/tip-item";

type PageProps = {
  searchParams: Promise<{ onderwerp?: string }>;
};

const TIPS_PER_TOPIC = 3;

export default async function WieWeetWatPage({ searchParams }: PageProps) {
  const { onderwerp } = await searchParams;
  const focus = isKnowledgeTopic(onderwerp) ? onderwerp : null;

  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");
  const canModerate = access.has("community.manage") || access.has("content.moderate_posts");

  let tipsQuery = supabase
    .from("member_tips")
    .select(TIP_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(focus ? 200 : 300);
  if (focus) tipsQuery = tipsQuery.eq("topic_slug", focus);

  const [{ data: topicRows }, { data: tipRows }, { data: myConsent }, threads] = await Promise.all([
    supabase.from("member_knowledge_topics").select("profile_id, topic_slug, note"),
    tipsQuery,
    supabase.from("member_knowledge").select("profile_id").eq("profile_id", user.id).maybeSingle(),
    loadMyThreads(supabase, user.id),
  ]);

  const experts = (topicRows ?? []) as ExpertTopicRow[];
  const tips = (tipRows ?? []) as TipRow[];
  const [members, eventTitles, colNames] = await Promise.all([
    loadMembers(supabase, [...experts.map((e) => e.profile_id), ...tips.map((t) => t.profile_id)]),
    loadEventTitles(supabase, tips.flatMap((t) => (t.event_id ? [t.event_id] : []))),
    loadColNames(supabase, tips.flatMap((t) => (t.col_slug ? [t.col_slug] : []))),
  ]);

  const expertsByTopic = groupBy(experts, (e) => e.topic_slug);
  const tipsByTopic = groupBy(tips, (t) => t.topic_slug);
  const unread = countUnread(threads, user.id);
  const joined = Boolean(myConsent);

  const topics = (focus ? KNOWLEDGE_TOPICS.filter((t) => t.slug === focus) : KNOWLEDGE_TOPICS).map(
    (topic) => ({
      ...topic,
      experts: (expertsByTopic.get(topic.slug) ?? []).sort((a, b) =>
        (members.get(a.profile_id)?.display_name ?? "").localeCompare(
          members.get(b.profile_id)?.display_name ?? "",
          "nl",
        ),
      ),
      tips: tipsByTopic.get(topic.slug) ?? [],
    }),
  );
  const filled = topics
    .filter((t) => focus || t.experts.length > 0 || t.tips.length > 0)
    .sort((a, b) => b.experts.length - a.experts.length);
  const empty = focus ? [] : topics.filter((t) => t.experts.length === 0 && t.tips.length === 0);

  return (
    <div className="space-y-6">
      {focus && <BackLink href="/leden/wie-weet-wat" label="Alle onderwerpen" />}
      <PageHeader
        title={focus ? topicLabel(focus) : "Wie weet wat"}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/leden/wie-weet-wat/gesprekken"
              className={buttonVariants({ variant: "outline" })}
            >
              <MessagesSquare />
              Gesprekken{unread > 0 ? ` (${unread})` : ""}
            </Link>
            <Link href="/leden/wie-weet-wat/mijn" className={buttonVariants()}>
              {joined ? "Mijn onderwerpen" : "Doe mee"}
            </Link>
            <HelpLink href="/hulp#wie-weet-wat" />
          </div>
        }
      />

      {filled.length === 0 && (
        <EmptyState
          action={
            <Link href="/leden/wie-weet-wat/mijn" className={buttonVariants()}>
              Doe mee
            </Link>
          }
        >
          Nog niemand heeft een onderwerp gekozen.
        </EmptyState>
      )}

      <div className={cn("grid gap-4", !focus && "lg:grid-cols-2")}>
        {filled.map((topic) => (
          <section key={topic.slug} className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">
                {focus ? "Kenners" : (
                  <Link href={`/leden/wie-weet-wat?onderwerp=${topic.slug}`} className="hover:underline">
                    {topic.label}
                  </Link>
                )}
              </h2>
              <Link
                href={`/leden/wie-weet-wat/tip?onderwerp=${topic.slug}`}
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <Plus />
                Tip
              </Link>
            </div>

            {topic.experts.length > 0 ? (
              <ul className="space-y-2">
                {topic.experts.map((expert) => (
                  <ExpertRow
                    key={expert.profile_id}
                    expert={expert}
                    member={members.get(expert.profile_id)}
                    self={expert.profile_id === user.id}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nog geen kenners.</p>
            )}

            {topic.tips.length > 0 && (
              <>
                <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tips
                </h3>
                <ul className="space-y-2">
                  {(focus ? topic.tips : topic.tips.slice(0, TIPS_PER_TOPIC)).map((tip) => (
                    <TipItem
                      key={tip.id}
                      tip={tip}
                      author={members.get(tip.profile_id)}
                      viewerId={user.id}
                      canModerate={canModerate}
                      eventTitle={tip.event_id ? eventTitles.get(tip.event_id) : undefined}
                      colName={tip.col_slug ? colNames.get(tip.col_slug) : undefined}
                    />
                  ))}
                </ul>
                {!focus && topic.tips.length > TIPS_PER_TOPIC && (
                  <Link
                    href={`/leden/wie-weet-wat?onderwerp=${topic.slug}`}
                    className="mt-2 inline-block text-sm text-muted-foreground hover:text-primary"
                  >
                    Alle {topic.tips.length} tips
                  </Link>
                )}
              </>
            )}
          </section>
        ))}
      </div>

      {empty.length > 0 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Nog zonder kenners ({empty.length})
          </summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {empty.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={`/leden/wie-weet-wat?onderwerp=${topic.slug}`}
                  className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted"
                >
                  {topic.label}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ExpertRow({
  expert,
  member,
  self,
}: {
  expert: ExpertTopicRow;
  member: MemberSummary | undefined;
  self: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <MemberAvatar member={member} />
        <div className="min-w-0">
          <MemberLink id={member?.id} className="block truncate text-sm font-medium">
            {member?.display_name ?? "Lid"}
          </MemberLink>
          {expert.note && <p className="truncate text-xs text-muted-foreground">{expert.note}</p>}
        </div>
      </div>
      {!self && <AskLink expertId={expert.profile_id} topic={expert.topic_slug} />}
    </li>
  );
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}
