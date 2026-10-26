"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { setPlanStatus, publishTrainingPlan } from "../_actions";

type Msg = { kind: "ok" | "err"; text: string } | null;

// Eén knop voor één besluit: publiceren keurt het schema ook goed. "Naar
// review" en een losse "Goedkeuren" zijn weg (analyse 2026-10-26): de status
// review werd nergens gelezen, en goedkeuren zonder publiceren archiveerde het
// lopende schema terwijl de nieuwe trainingen nog niet in intervals.icu stonden.
// Alleen wie wel schema's mag maken maar niet publiceren, houdt "Goedkeuren".
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

  function fd(entries: Record<string, string>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) f.set(k, v);
    return f;
  }

  function runApprove() {
    setMsg(null);
    startTransition(async () => {
      const res = await setPlanStatus(fd({ plan_id: planId, status: "approved" }));
      if (res?.ok) {
        setCurrent("approved");
        setMsg({ kind: "ok", text: "Schema goedgekeurd." });
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
            text: `${res.failed} training(en) niet in intervals.icu. Probeer opnieuw.`,
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

  const running = current === "approved" || current === "published";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {mayPublish ? (
          <button
            type="button"
            disabled={pending}
            onClick={runPublish}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="size-3" />
            {pending ? "Bezig…" : running ? "Opnieuw publiceren" : "Publiceren"}
          </button>
        ) : mayApprove && !running ? (
          <button
            type="button"
            disabled={pending}
            onClick={runApprove}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs hover:bg-accent disabled:opacity-50"
          >
            <CheckCircle2 className="size-3" />
            {pending ? "Bezig…" : "Goedkeuren"}
          </button>
        ) : null}
      </div>
      {msg ? (
        <p className={`text-xs ${msg.kind === "ok" ? "text-primary" : "text-destructive"}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
