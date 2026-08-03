"use client";

import { useActionState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionResult = { ok: true } | { ok: false; error: string };

export function UndoSessionButton({
  sessionId,
  undoAction,
}: {
  sessionId: string;
  undoAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [state, submit, pending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => undoAction(formData),
    null,
  );

  return (
    <form action={submit} className="flex items-center gap-3">
      <input type="hidden" name="session_id" value={sessionId} />
      <Button type="submit" variant="outline" className="min-h-[44px]" disabled={pending}>
        <Undo2 className="size-4" />
        {pending ? "Bezig…" : "Terugdraaien"}
      </Button>
      {state && !state.ok && <span className="text-sm text-destructive">{state.error}</span>}
    </form>
  );
}
