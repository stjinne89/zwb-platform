"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { completeClubSetup } from "../_actions";

export function CompleteSetupButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      {error && <span className="max-w-72 text-sm text-destructive">{error}</span>}
      <Button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await completeClubSetup();
            if (res.ok) router.refresh();
            else setError(res.error);
          });
        }}
      >
        {pending ? "Afronden..." : "Inrichting afronden"}
      </Button>
    </div>
  );
}
