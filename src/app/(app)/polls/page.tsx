import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { EmptyState, PageHeader } from "@/components/app-ui";
import { PollCard, type PollCardData } from "./_components/poll-card";
import { CreatePollForm } from "./_components/create-poll-form";

type PollRow = {
  id: string;
  question: string;
  description_md: string | null;
  multi_select: boolean;
  active: boolean;
  closes_at: string | null;
  created_at: string;
  created_by: string | null;
  profiles: { display_name: string } | { display_name: string }[] | null;
};

type OptionRow = {
  id: string;
  poll_id: string;
  label: string;
  display_order: number;
};

type VoteRow = {
  poll_id: string;
  option_id: string;
  profile_id: string;
};

function singleName(rel: PollRow["profiles"]): string | null {
  if (!rel) return null;
  const single = Array.isArray(rel) ? rel[0] : rel;
  return single?.display_name ?? null;
}

export default async function PollsPage() {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);

  if (!access.user) redirect("/login");

  const [{ data: pollRows }, { data: optionRows }, { data: voteRows }] =
    await Promise.all([
      supabase
        .from("polls")
        .select(
          "id, question, description_md, multi_select, active, closes_at, created_at, created_by, profiles(display_name)",
        )
        .eq("scope", "free")
        .order("active", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("poll_options")
        .select("id, poll_id, label, display_order")
        .order("display_order"),
      supabase.from("poll_votes").select("poll_id, option_id, profile_id"),
    ]);

  const polls = (pollRows ?? []) as PollRow[];
  const options = (optionRows ?? []) as OptionRow[];
  const votes = (voteRows ?? []) as VoteRow[];

  const canManage = access.has("polls.manage");
  const userId = access.user.id;

  const optionsByPoll = new Map<string, OptionRow[]>();
  for (const opt of options) {
    const list = optionsByPoll.get(opt.poll_id) ?? [];
    list.push(opt);
    optionsByPoll.set(opt.poll_id, list);
  }

  const votesByOption = new Map<string, number>();
  const myVotesByPoll = new Map<string, string[]>();
  const totalVotesByPoll = new Map<string, number>();
  for (const v of votes) {
    votesByOption.set(v.option_id, (votesByOption.get(v.option_id) ?? 0) + 1);
    totalVotesByPoll.set(
      v.poll_id,
      (totalVotesByPoll.get(v.poll_id) ?? 0) + 1,
    );
    if (v.profile_id === userId) {
      const arr = myVotesByPoll.get(v.poll_id) ?? [];
      arr.push(v.option_id);
      myVotesByPoll.set(v.poll_id, arr);
    }
  }

  const pollData: PollCardData[] = polls.map((p) => ({
    id: p.id,
    question: p.question,
    descriptionMd: p.description_md,
    multiSelect: p.multi_select,
    active: p.active,
    closesAt: p.closes_at,
    createdAt: p.created_at,
    createdBy: p.created_by,
    createdByName: singleName(p.profiles),
    options: (optionsByPoll.get(p.id) ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      voteCount: votesByOption.get(o.id) ?? 0,
    })),
    totalVotes: totalVotesByPoll.get(p.id) ?? 0,
    myVoteOptionIds: myVotesByPoll.get(p.id) ?? [],
  }));

  const activePolls = pollData.filter(
    (p) =>
      p.active &&
      (p.closesAt === null || new Date(p.closesAt) > new Date()),
  );
  const closedPolls = pollData.filter((p) => !activePolls.includes(p));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Polls"
        actions={canManage && <CreatePollForm />}
      />

      {pollData.length === 0 && (
        <EmptyState>Geen polls.</EmptyState>
      )}

      {activePolls.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Open polls
          </h2>
          <div className="space-y-3">
            {activePolls.map((p) => (
              <PollCard key={p.id} poll={p} canManage={canManage} />
            ))}
          </div>
        </section>
      )}

      {closedPolls.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Gesloten / verlopen
          </h2>
          <div className="space-y-3">
            {closedPolls.map((p) => (
              <PollCard key={p.id} poll={p} canManage={canManage} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
