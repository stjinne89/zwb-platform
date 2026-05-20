"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "../_actions";
import { Button } from "@/components/ui/button";

export function LikeButton({
  postId,
  slug,
  initialLiked,
  initialCount,
}: {
  postId: string;
  slug: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  function onClick() {
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setCount((c) => c + (optimisticLiked ? 1 : -1));
    startTransition(async () => {
      const res = await toggleLike(postId, slug);
      if (!res.ok) {
        setLiked(!optimisticLiked);
        setCount((c) => c + (optimisticLiked ? -1 : 1));
      }
    });
  }

  return (
    <Button
      type="button"
      variant={liked ? "default" : "outline"}
      size="sm"
      disabled={pending}
      onClick={onClick}
    >
      ♥ {count}
    </Button>
  );
}
