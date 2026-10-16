"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TIP_MAX } from "@/lib/zwbieb/limits";
import { deleteMyTip, deleteTip, setTipStatus, updateMyTip } from "../_actions";

export function TipActions({
  tipId,
  body,
  status,
  canEdit,
  canModerate,
}: {
  tipId: string;
  body: string;
  status: "published" | "hidden";
  canEdit: boolean;
  canModerate: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!canEdit && !canModerate) return null;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Mislukt.");
        return;
      }
      after?.();
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          autoFocus
          rows={3}
          maxLength={TIP_MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(() => updateMyTip(tipId, draft), () => setEditing(false))}>
            {pending ? "Opslaan…" : "Opslaan"}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(false)}>
            Annuleren
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {canEdit && (
        <>
          <Button size="xs" variant="outline" disabled={pending} onClick={() => setEditing(true)}>
            Aanpassen
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirm("Deze tip verwijderen?")) run(() => deleteMyTip(tipId));
            }}
          >
            Verwijderen
          </Button>
        </>
      )}
      {canModerate && !canEdit && (
        <>
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => setTipStatus(tipId, status === "hidden" ? "published" : "hidden"))}
          >
            {status === "hidden" ? "Tonen" : "Verbergen"}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (confirm("Deze tip verwijderen?")) run(() => deleteTip(tipId));
            }}
          >
            Verwijderen
          </Button>
        </>
      )}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}
