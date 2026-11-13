"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTeam } from "../_actions";
import { Button } from "@/components/ui/button";

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`${teamName} verwijderen?`)) return;
          setError(null);
          startTransition(async () => {
            const res = await deleteTeam(teamId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.replace(res.redirectTo);
          });
        }}
      >
        <Trash2 data-icon="inline-start" />
        {pending ? "Bezig…" : "Verwijderen"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
