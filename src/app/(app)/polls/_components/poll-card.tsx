"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import {
  castVote,
  clearMyVote,
  closePoll,
  deletePoll,
  reopenPoll,
} from "../_actions";

export type PollCardData = {
  id: string;
  question: string;
  descriptionMd: string | null;
  multiSelect: boolean;
  active: boolean;
  closesAt: string | null;
  createdAt: string;
  createdBy: string | null;
  createdByName: string | null;
  options: Array<{
    id: string;
    label: string;
    voteCount: number;
  }>;
  totalVotes: number;
  myVoteOptionIds: string[];
};

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString("nl-NL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export function PollCard({
  poll,
  canManage,
}: {
  poll: PollCardData;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(poll.myVoteOptionIds),
  );

  const closed =
    !poll.active ||
    (poll.closesAt !== null && new Date(poll.closesAt) < new Date());

  const hasVoted = poll.myVoteOptionIds.length > 0;

  function toggleOption(optionId: string) {
    if (closed || pending) return;
    setSelected((prev) => {
      if (!poll.multiSelect) return new Set([optionId]);
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      setError("Kies eerst een optie.");
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set("poll_id", poll.id);
    for (const id of selected) fd.append("option_id", id);
    startTransition(async () => {
      const res = await castVote(fd);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function clear() {
    if (!confirm("Stem intrekken?")) return;
    setError(null);
    startTransition(async () => {
      const res = await clearMyVote(poll.id);
      if (!res.ok) setError(res.error);
      else {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function adminClose() {
    if (!confirm("Poll sluiten? Leden kunnen niet meer stemmen.")) return;
    startTransition(async () => {
      const res = await closePoll(poll.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function adminReopen() {
    startTransition(async () => {
      const res = await reopenPoll(poll.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function adminDelete() {
    if (!confirm("Poll definitief verwijderen? Alle stemmen gaan verloren."))
      return;
    startTransition(async () => {
      const res = await deletePoll(poll.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  const closesLabel = formatDateTime(poll.closesAt);

  return (
    <article className="space-y-3 rounded-lg border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{poll.question}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {poll.createdByName ?? "Onbekend"} ·{" "}
            {poll.totalVotes} {poll.totalVotes === 1 ? "stem" : "stemmen"}
            {poll.multiSelect && " · meerdere keuzes toegestaan"}
            {closesLabel && ` · sluit ${closesLabel}`}
            {closed && (
              <span className="ml-1 rounded bg-muted px-1.5 text-xs">
                gesloten
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            {poll.active ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={adminClose}
                title="Sluiten"
              >
                <Lock className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={adminReopen}
                title="Heropenen"
              >
                <Unlock className="size-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={adminDelete}
              title="Verwijderen"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )}
      </header>

      {poll.descriptionMd && (
        <div className="prose prose-sm dark:prose-invert">
          <Markdown source={poll.descriptionMd} />
        </div>
      )}

      <ul className="space-y-2">
        {poll.options.map((option) => {
          const pct =
            poll.totalVotes > 0
              ? Math.round((option.voteCount / poll.totalVotes) * 100)
              : 0;
          const isSelected = selected.has(option.id);
          const wasMyVote = poll.myVoteOptionIds.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => toggleOption(option.id)}
                disabled={closed || pending}
                className={`relative block w-full overflow-hidden rounded-md border p-3 text-left transition ${
                  isSelected
                    ? "border-foreground/40 bg-accent/40"
                    : "hover:bg-accent/20"
                } ${closed ? "cursor-default" : ""}`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-foreground/10"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {!closed && poll.multiSelect && (
                      <input
                        type="checkbox"
                        readOnly
                        checked={isSelected}
                        className="mr-2 align-middle"
                      />
                    )}
                    {!closed && !poll.multiSelect && (
                      <input
                        type="radio"
                        readOnly
                        checked={isSelected}
                        className="mr-2 align-middle"
                      />
                    )}
                    {option.label}
                    {wasMyVote && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (jouw stem)
                      </span>
                    )}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {option.voteCount} · {pct}%
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!closed && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={submit}
            disabled={pending || selected.size === 0}
          >
            {hasVoted ? "Stem bijwerken" : "Stem uitbrengen"}
          </Button>
          {hasVoted && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={pending}
            >
              Stem intrekken
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
