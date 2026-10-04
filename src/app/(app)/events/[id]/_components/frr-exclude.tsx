"use client";

import { useState, useTransition } from "react";
import { RotateCcw, UserMinus } from "lucide-react";
import { excludeFrrRider, restoreFrrRider } from "../_frr-actions";

/** Renner uit je eigen voorlopige klassement halen, of terugzetten. */
export function FrrExcludeToggle({
  tourId,
  zwiftId,
  name,
  excluded,
}: {
  tourId: string;
  zwiftId: string;
  name: string;
  excluded: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pending}
      title={error ?? (excluded ? "Terugzetten" : "Verwijderen uit klassement")}
      aria-label={excluded ? `${name} terugzetten` : `${name} verwijderen uit klassement`}
      onClick={() =>
        startTransition(async () => {
          setError(null);
          const res = excluded
            ? await restoreFrrRider({ tourId, zwiftId })
            : await excludeFrrRider({ tourId, zwiftId, name });
          if (!res.ok) setError(res.error);
        })
      }
      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {excluded ? <RotateCcw className="size-4" /> : <UserMinus className="size-4" />}
    </button>
  );
}
