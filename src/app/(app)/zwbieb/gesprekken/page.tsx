import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRequestAccess } from "@/lib/auth/request";
import { BackLink, EmptyState, PageHeader } from "@/components/app-ui";
import { buttonVariants } from "@/components/ui/button";
import { formatMoment, isUnreadFor } from "@/lib/zwbieb/data";
import { loadMembers, loadMyThreads, loadTopicCatalog } from "@/lib/zwbieb/queries";
import { MemberAvatar } from "../_components/member-chip";

export default async function GesprekkenPage() {
  const supabase = await createClient();
  const access = await getRequestAccess();
  const user = access.user;
  if (!user) redirect("/login");

  const [threads, catalog] = await Promise.all([
    loadMyThreads(supabase, user.id),
    loadTopicCatalog(supabase),
  ]);
  const members = await loadMembers(
    supabase,
    threads.map((t) => (t.asker_id === user.id ? t.expert_id : t.asker_id)),
  );

  // Ongelezen bovenaan, daarna op het laatste bericht.
  const rows = threads
    .map((thread) => ({
      thread,
      other: members.get(thread.asker_id === user.id ? thread.expert_id : thread.asker_id),
      unread: isUnreadFor(thread, user.id),
      asked: thread.asker_id === user.id,
    }))
    .sort((a, b) => Number(b.unread) - Number(a.unread));

  return (
    <div className="space-y-6">
      <BackLink href="/zwbieb" label="ZWBieb" />
      <PageHeader title="Gesprekken" />
      {rows.length === 0 ? (
        <EmptyState
          action={
            <Link href="/zwbieb" className={buttonVariants({ variant: "outline" })}>
              Naar ZWBieb
            </Link>
          }
        >
          Nog geen gesprekken.
        </EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {rows.map(({ thread, other, unread, asked }) => (
            <li key={thread.id}>
              <Link
                href={`/zwbieb/gesprekken/${thread.id}`}
                className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-muted/50"
              >
                <MemberAvatar member={other} />
                <div className="min-w-0 flex-1">
                  <p className={unread ? "truncate text-sm font-semibold" : "truncate text-sm"}>
                    {other?.display_name ?? "Oud-lid"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {asked ? "Jouw vraag" : "Vraag aan jou"} · {catalog.label(thread.topic_slug)}
                    {thread.status === "closed" ? " · gesloten" : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatMoment(thread.last_message_at)}
                </span>
                {unread && (
                  <span className="size-2.5 shrink-0 rounded-full bg-primary" aria-label="Ongelezen" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
