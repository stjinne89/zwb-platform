"use client";

import { useState, useTransition } from "react";
import { Radio } from "lucide-react";
import { prepareStream } from "@/app/(app)/_actions/livestream";
import { Button } from "@/components/ui/button";

export function PrepareStreamButton({ eventId }: { eventId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await prepareStream(eventId);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        <Radio className="size-3.5" />
        {pending ? "Bezig…" : "Stream klaarzetten"}
      </Button>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
