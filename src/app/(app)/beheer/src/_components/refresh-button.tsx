"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshSrcCalendar } from "../_actions";

export function RefreshButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            setMessage(null);
            const res = await refreshSrcCalendar();
            if (!res.ok) {
              setError(res.error);
            } else {
              const { sundaysCreated, racesCreated, updated, warnings } = res.result;
              setMessage(
                [
                  `${sundaysCreated} zondagen en ${racesCreated} races toegevoegd` +
                    (updated > 0 ? `, ${updated} bijgewerkt.` : "."),
                  ...warnings,
                ].join(" "),
              );
            }
            router.refresh();
          })
        }
      >
        {pending ? "Bezig…" : "Nu verversen"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
