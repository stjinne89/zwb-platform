"use client";

import { useState, useTransition } from "react";
import { approveUser } from "../_actions";
import { Button } from "@/components/ui/button";

export function ApproveButton({ profileId }: { profileId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await approveUser(profileId);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        {pending ? "Bezig..." : "Goedkeuren"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
