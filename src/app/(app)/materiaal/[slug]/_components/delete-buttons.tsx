"use client";

import { useTransition } from "react";
import { deleteComment, deletePost } from "../_actions";
import { Button } from "@/components/ui/button";

export function DeleteCommentButton({
  commentId,
  slug,
}: {
  commentId: string;
  slug: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(async () => void deleteComment(commentId, slug))}
    >
      ✕
    </Button>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Post verwijderen? Reacties verdwijnen ook.")) return;
        startTransition(async () => void deletePost(postId));
      }}
    >
      Verwijderen
    </Button>
  );
}
