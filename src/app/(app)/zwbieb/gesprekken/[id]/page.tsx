import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoment } from "@/lib/zwbieb/data";
import { THREAD_COLUMNS, loadMembers, loadTopicCatalog, type ThreadRow } from "@/lib/zwbieb/queries";
import { MemberChip } from "../../_components/member-chip";
import { CloseThreadButton, DeleteMessageButton, ReplyForm } from "../../_components/thread-controls";

type PageProps = {
  params: Promise<{ id: string }>;
};

type MessageRow = {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string;
};

export default async function GesprekPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");

  // RLS laat alleen de twee deelnemers het gesprek zien; voor ieder ander
  // bestaat het niet.
  const [{ data: threadRow }, { data: messageRows }] = await Promise.all([
    supabase.from("knowledge_threads").select(`${THREAD_COLUMNS}, tip_id`).eq("id", id).maybeSingle(),
    supabase
      .from("knowledge_messages")
      .select("id, author_id, body, created_at")
      .eq("thread_id", id)
      .order("created_at"),
  ]);
  if (!threadRow) notFound();
  const thread = threadRow as ThreadRow & { tip_id: string | null };
  const messages = (messageRows ?? []) as MessageRow[];
  const otherId = thread.asker_id === user.id ? thread.expert_id : thread.asker_id;

  const [members, { data: tip }, { data: savedRows }, , catalog] = await Promise.all([
    loadMembers(supabase, [thread.asker_id, thread.expert_id]),
    thread.tip_id
      ? supabase.from("member_tips").select("body").eq("id", thread.tip_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Welke berichten al als tip bewaard zijn (0240).
    messages.length > 0
      ? supabase
          .from("member_tips")
          .select("message_id")
          .in(
            "message_id",
            messages.map((m) => m.id),
          )
      : Promise.resolve({ data: [] }),
    supabase.rpc("mark_knowledge_thread_read", { thread: id }),
    loadTopicCatalog(supabase),
  ]);
  const saved = new Set(((savedRows ?? []) as { message_id: string }[]).map((row) => row.message_id));

  return (
    <div className="space-y-6">
      <BackLink href="/zwbieb/gesprekken" label="Gesprekken" />
      <PageHeader
        title={members.get(otherId)?.display_name ?? "Gesprek"}
        description={`${catalog.label(thread.topic_slug)}${thread.status === "closed" ? " · gesloten" : ""}`}
        actions={thread.status === "open" ? <CloseThreadButton threadId={thread.id} /> : undefined}
      />

      {tip && (
        <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
          {(tip as { body: string }).body}
        </blockquote>
      )}

      <ol className="space-y-3">
        {messages.map((message) => {
          const own = message.author_id === user.id;
          return (
            <li key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-lg border p-3", own ? "bg-primary/5" : "bg-card")}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <MemberChip member={message.author_id ? members.get(message.author_id) : undefined} />
                  <span>{formatMoment(message.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {saved.has(message.id) ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Lightbulb className="size-3.5" />
                      Bewaard als tip
                    </span>
                  ) : (
                    !own &&
                    message.author_id && (
                      <Link
                        href={`/zwbieb/tip?bericht=${message.id}`}
                        className={buttonVariants({ variant: "outline", size: "xs" })}
                      >
                        <Lightbulb />
                        Bewaar als tip
                      </Link>
                    )
                  )}
                  {own && <DeleteMessageButton messageId={message.id} threadId={thread.id} />}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {thread.status === "open" && (
        <section className="rounded-lg border bg-card p-4">
          <ReplyForm threadId={thread.id} />
        </section>
      )}
    </div>
  );
}
