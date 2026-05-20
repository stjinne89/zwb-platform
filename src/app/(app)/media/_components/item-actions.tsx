"use client";

import { useTransition } from "react";
import { deleteMediaItem, togglePinMedia } from "../_actions";
import { Button } from "@/components/ui/button";

export function MediaItemActions({
  id,
  pinned,
}: {
  id: string;
  pinned: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(async () => void togglePinMedia(id, !pinned))}
      >
        {pinned ? "Loskoppelen" : "Pin"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (!confirm("Item verwijderen?")) return;
          startTransition(async () => void deleteMediaItem(id));
        }}
      >
        Verwijder
      </Button>
    </div>
  );
}
