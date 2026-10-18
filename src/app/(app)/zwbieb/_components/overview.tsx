import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TopicKind } from "@/lib/zwbieb/topics";
import { countUnread } from "@/lib/zwbieb/data";
import { COLLECTION_LABELS, shelvesForTopic } from "@/lib/zwbieb/shelves";
import {
  TIP_COLUMNS,
  loadColNames,
  loadEventTitles,
  loadMembers,
  loadMyThreads,
  loadTopicCatalog,
  type ExpertTopicRow,
  type TipRow,
} from "@/lib/zwbieb/queries";
import { EvidenceBadge } from "@/components/evidence-badge";
import { MethodLabelBadge } from "@/components/method-label-badge";
import { ExpertRow } from "./expert-row";
import { TipItem } from "./tip-item";
import { TopicBadge } from "./topic-badge";
import { ZWBIEB_TABS, ZwbiebActions, ZwbiebTabs } from "./zwbieb-nav";

const TIPS_PER_TOPIC = 3;

const tabHref = (kind: TopicKind) => ZWBIEB_TABS.find((tab) => tab.tab === kind)!.href;

/**
 * Het overzicht van ZWBieb, per soort: wie weet wat (kennis) en wie heeft wat
 * (spullen). Met ?onderwerp= één onderwerp met alles wat erbij hoort.
 */
export async function ZwbiebOverview({
  kind,
  onderwerp,
}: {
  kind: TopicKind;
  onderwerp?: string;
}) {
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");
  const canModerate = access.has("community.manage") || access.has("content.moderate_posts");

  const catalog = await loadTopicCatalog(supabase);
  const focus = catalog.exists(onderwerp) ? onderwerp : null;
  // Een onderwerp hoort bij één tab; staat het in de andere, ga daarheen.
  const focusKind = focus ? catalog.kindOf(focus) : null;
  if (focus && focusKind && focusKind !== kind) {
    redirect(`${tabHref(focusKind)}?onderwerp=${focus}`);
  }

  const kindSlugs = catalog.all.filter((row) => row.kind === kind).map((row) => row.slug);
  let tipsQuery = supabase
    .from("member_tips")
    .select(TIP_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(focus ? 200 : 300);
  tipsQuery = focus ? tipsQuery.eq("topic_slug", focus) : tipsQuery.in("topic_slug", kindSlugs);

  const [{ data: topicRows }, { data: tipRows }, { data: myConsent }, threads] = await Promise.all([
    supabase
      .from("member_knowledge_topics")
      .select("profile_id, topic_slug, note")
      .in("topic_slug", focus ? [focus] : kindSlugs),
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

  // Verborgen onderwerpen alleen nog als je erop focust (een oude link).
  const source = focus
    ? catalog.all.filter((row) => row.slug === focus)
    : catalog.all.filter((row) => row.kind === kind && row.status === "active");
  const topics = source.map((topic) => ({
    ...topic,
    experts: (expertsByTopic.get(topic.slug) ?? []).sort((a, b) =>
      (members.get(a.profile_id)?.display_name ?? "").localeCompare(
        members.get(b.profile_id)?.display_name ?? "",
        "nl",
      ),
    ),
    tips: tipsByTopic.get(topic.slug) ?? [],
  }));
  const filled = topics
    .filter((t) => focus || t.experts.length > 0 || t.tips.length > 0)
    .sort((a, b) => b.experts.length - a.experts.length);
  const empty = focus ? [] : topics.filter((t) => t.experts.length === 0 && t.tips.length === 0);
  const base = tabHref(kind);
  const peopleHeading = kind === "spullen" ? "Leent uit" : "Kenners";
  // Bij een onderwerp de artikelen uit de leeszaal die erover gaan.
  const books = focus ? shelvesForTopic(focus).flatMap((shelf) => shelf.books) : [];

  return (
    <div className="space-y-6">
      {focus && <BackLink href={base} label={kind === "spullen" ? "Alle spullen" : "Alle onderwerpen"} />}
      <PageHeader
        title={focus ? catalog.label(focus) : "ZWBieb"}
        actions={<ZwbiebActions unread={unread} joined={joined} canModerate={canModerate} />}
      />

      {!focus && <ZwbiebTabs current={kind} />}

      {filled.length === 0 && (
        <EmptyState
          action={
            <Link href="/zwbieb/mijn" className={buttonVariants()}>
              Doe mee
            </Link>
          }
        >
          {kind === "spullen" ? "Nog niemand leent iets uit." : "Nog niemand heeft een onderwerp gekozen."}
        </EmptyState>
      )}

      <div className={cn("grid gap-4", !focus && "lg:grid-cols-2")}>
        {filled.map((topic) => (
          <section key={topic.slug} className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-base font-semibold">
                {focus ? (
                  <span className="flex items-center gap-3">
                    <TopicBadge slug={topic.slug} kind={topic.kind} />
                    {peopleHeading}
                  </span>
                ) : (
                  <Link
                    href={`${base}?onderwerp=${topic.slug}`}
                    className="group flex items-center gap-3 hover:underline"
                  >
                    <TopicBadge slug={topic.slug} kind={topic.kind} />
                    {topic.label}
                  </Link>
                )}
              </h2>
              <Link
                href={`/zwbieb/tip?onderwerp=${topic.slug}`}
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
              <p className="text-sm text-muted-foreground">
                {kind === "spullen" ? "Niemand leent dit nog uit." : "Nog geen kenners."}
              </p>
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
                    href={`${base}?onderwerp=${topic.slug}`}
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

      {books.length > 0 && (
        <section className="rounded-lg border bg-card p-4">
          <h2 className="mb-2 text-base font-semibold">
            <Link href="/zwbieb/leeszaal" className="hover:underline">
              In de leeszaal
            </Link>
          </h2>
          <ul className="divide-y">
            {books.map((book) => (
              <li key={book.href}>
                <Link
                  href={book.href}
                  className="flex min-h-[44px] items-center justify-between gap-3 text-sm hover:text-primary"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    {book.title}
                    <EvidenceBadge evidence={book.evidence} conclusion={book.conclusion} />
                    <MethodLabelBadge label={book.methodLabel} />
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {COLLECTION_LABELS[book.collection]}
                    <ChevronRight className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {empty.length > 0 && (
        <details className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">
            {kind === "spullen" ? "Nog door niemand uitgeleend" : "Nog zonder kenners"} ({empty.length})
          </summary>
          <ul className="mt-3 flex flex-wrap gap-2">
            {empty.map((topic) => (
              <li key={topic.slug}>
                <Link
                  href={`${base}?onderwerp=${topic.slug}`}
                  className="group inline-flex items-center gap-2 rounded-md border py-1 pr-3 pl-1 text-sm hover:bg-muted"
                >
                  <TopicBadge slug={topic.slug} kind={topic.kind} size="sm" />
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
