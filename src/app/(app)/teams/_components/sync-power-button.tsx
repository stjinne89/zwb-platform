"use client";

import { useState, useTransition } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncRiderPowerProfiles } from "../_actions";

export function SyncPowerButton({
  scope,
}: {
  scope: "self" | "all";
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant={scope === "all" ? "outline" : "default"}
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await syncRiderPowerProfiles(scope);
            if (!res.ok) {
              setMessage(res.error);
              return;
            }
            const parts = [`${res.synced} volledig`];
            if (res.partial) parts.push(`${res.partial} gedeeltelijk`);
            if (res.failed) parts.push(`${res.failed} fout`);
            setMessage(
              `Powerprofielen: ${parts.join(", ")}.${res.errors?.length ? ` ${res.errors.join(" ")}` : ""}`,
            );
          });
        }}
      >
        {pending ? (
          <RefreshCw className="animate-spin" data-icon="inline-start" />
        ) : (
          <Activity data-icon="inline-start" />
        )}
        {scope === "all" ? "Alle waarden syncen" : "Mijn waarden syncen"}
      </Button>
      {message && <p className="max-w-56 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
