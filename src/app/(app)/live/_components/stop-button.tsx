"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endSession } from "../_actions";
import { Button } from "@/components/ui/button";

export function StopLiveButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div id="stop-live" className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await endSession(sessionId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        {pending ? "Stop..." : "Stop live"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
