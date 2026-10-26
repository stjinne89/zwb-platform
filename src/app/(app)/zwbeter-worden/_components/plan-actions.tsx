"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { setPlanStatus, publishTrainingPlan } from "../_actions";
import { planActionKind } from "./format";

type Msg = { kind: "ok" | "err"; text: string } | null;

// Eén knop voor één besluit: publiceren keurt het schema ook goed. "Naar
// review" en een losse "Goedkeuren" zijn weg (analyse 2026-10-26): de status
// review werd nergens gelezen, en goedkeuren zonder publiceren archiveerde het
// lopende schema terwijl de nieuwe trainingen nog niet in intervals.icu stonden.
// Alleen wie wel schema's mag maken maar niet publiceren, houdt "Goedkeuren".
// Een lopend schema heeft geen knop meer: wijzigingen gaan vanzelf naar
// intervals.icu. Alleen als er trainingen niet aankwamen, komt "Opnieuw versturen".
export function PlanActions({
  planId,
  status,
  mayApprove,
  mayPublish,
  unsent = 0,
}: {
  planId: string;
  status: string;
  mayApprove: boolean;
  mayPublish: boolean;
  /** Komende trainingen van dit schema die nog niet in intervals.icu staan. */
  unsent?: number;
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

  const kind = planActionKind({ status: current, mayApprove, mayPublish, unsent });
  if (!kind && !msg) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {kind === "publish" || kind === "resend" ? (
          <>
            {kind === "resend" ? (
              <span className="text-xs text-muted-foreground">
                {unsent === 1
                  ? "1 training niet in intervals.icu"
                  : `${unsent} trainingen niet in intervals.icu`}
              </span>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={runPublish}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="size-3" />
              {pending ? "Bezig…" : kind === "resend" ? "Opnieuw versturen" : "Publiceren"}
            </button>
          </>
        ) : kind === "approve" ? (
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
