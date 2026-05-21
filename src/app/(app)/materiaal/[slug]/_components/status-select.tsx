"use client";

import { useState, useTransition } from "react";
import {
  POST_STATUSES,
  type PostStatus,
} from "@/lib/categories";
import { updatePostStatus } from "../_actions";

const FIELD =
  "rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function StatusSelect({
  postId,
  slug,
  initialStatus,
}: {
  postId: string;
  slug: string;
  initialStatus: PostStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<PostStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <label className="text-xs font-medium text-muted-foreground">Status</label>
      <select
        value={status}
        disabled={pending}
        className={FIELD}
        onChange={(event) => {
          const previous = status;
          const next = event.target.value as PostStatus;
          setStatus(next);
          setError(null);
          startTransition(async () => {
            const res = await updatePostStatus(postId, slug, next);
            if (!res.ok) {
              setStatus(previous);
              setError(res.error);
            }
          });
        }}
      >
        {POST_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
