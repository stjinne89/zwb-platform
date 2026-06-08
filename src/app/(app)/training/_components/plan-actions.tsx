"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { setPlanStatus, publishTrainingPlan } from "../_actions";

type Msg = { kind: "ok" | "err"; text: string } | null;

// Knoppen voor schema-status + publiceren MET zichtbare terugkoppeling
// (bezig / gelukt / fout). Vervangt de oude kale form-actions die hun
// resultaat weggooiden waardoor het leek of er niets gebeurde.
export function PlanActions({
  planId,
  status,
  mayApprove,
  mayPublish,
}: {
  planId: string;
  status: string;
  mayApprove: boolean;
  mayPublish: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [current, setCurrent] = useState(status);

  const canPublishNow = mayPublish && ["approved", "published"].includes(current);

  function fd(entries: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  }

  function runStatus(newStatus: string, okText: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await setPlanStatus(fd({ plan_id: planId, status: newStatus }));
      if (res?.ok) {
        setCurrent(newStatus);
        setMsg({ kind: "ok", text: okText });
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res?.error ?? "Actie faalde." });
      }
    });
  }

  function runPublish() {
    setMsg(null);
    startTransition(async () => {
      const res = await publishTrainingPlan(fd({ plan_id: planId }));
      if (res?.ok) {
        if (typeof res.failed === "number" && res.failed > 0) {
          setMsg({
            kind: "err",
            text: `${res.failed} workout(s) niet gepubliceerd — zie de workouts hieronder.`,
          });
        } else {
          setCurrent("published");
          setMsg({ kind: "ok", text: "Gepubliceerd naar intervals.icu." });
        }
        router.refresh();
      } else {
        setMsg({ kind: "err", text: res?.error ?? "Publiceren faalde." });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {mayApprove && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => runStatus("review", "Naar review gezet.")}
              className="rounded-md border px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
            >
              Naar review
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => runStatus("approved", "Schema goedgekeurd.")}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
            >
              <CheckCircle2 className="size-3" />
              {pending ? "Bezig…" : "Goedkeuren"}
            </button>
          </>
        )}
        {mayPublish && (
          <button
            type="button"
            disabled={pending || !canPublishNow}
            onClick={runPublish}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-3" />
            {pending ? "Bezig…" : current === "published" ? "Opnieuw publiceren" : "Publiceren"}
          </button>
        )}
      </div>
      {mayPublish && !canPublishNow && current !== "published" ? (
        <p className="text-xs text-muted-foreground">
          Keur het schema eerst goed voordat je publiceert.
        </p>
      ) : null}
      {msg ? (
        <p className={`text-xs ${msg.kind === "ok" ? "text-primary" : "text-destructive"}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
