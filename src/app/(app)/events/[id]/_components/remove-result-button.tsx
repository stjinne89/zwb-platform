"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { removeEventResult } from "../_actions";

export function RemoveResultButton({ resultId }: { resultId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      await removeEventResult(resultId);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Verwijder uit uitslag"
      className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      <X className="size-3.5" />
    </button>
  );
}
