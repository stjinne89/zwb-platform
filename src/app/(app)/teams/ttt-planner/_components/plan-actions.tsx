"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Import, Megaphone, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteTttPlan,
  revokeTttPlanShare,
  setTttPlanPublished,
  shareTttPlan,
} from "../_actions";

export function TttPlanActions({
  planId,
  published: initialPublished,
  shared: initialShared,
}: {
  planId: string;
  published: boolean;
  /** Er staat een deellink voor de Discord-bot open. */
  shared: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(initialPublished);
  const [shared, setShared] = useState(initialShared);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function publish() {
    startTransition(async () => {
      const res = await setTttPlanPublished(planId, !published);
      if (res.ok) setPublished(!published);
      setMessage(res.ok ? { error: false, text: res.message ?? "" } : { error: true, text: res.error });
    });
  }

  function copyBotLink() {
    startTransition(async () => {
      const res = await shareTttPlan(planId);
      if (!res.ok) {
        setMessage({ error: true, text: res.error });
        return;
      }
      setShared(true);
      const link = `${window.location.origin}/api/ttt/plan/${res.token}`;
      try {
        await navigator.clipboard.writeText(link);
        setMessage({ error: false, text: "Botlink gekopieerd." });
      } catch {
        setMessage({ error: false, text: `Kopiëren lukte niet: ${link}` });
      }
    });
  }

  function revokeBotLink() {
    startTransition(async () => {
      const res = await revokeTttPlanShare(planId);
      if (res.ok) setShared(false);
      setMessage(res.ok ? { error: false, text: "Botlink ingetrokken." } : { error: true, text: res.error });
    });
  }

  function remove() {
    if (!window.confirm("Dit TTT-plan verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteTttPlan(planId);
      if (res.ok) router.push("/teams/ttt-planner");
      else setMessage({ error: true, text: res.error });
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={publish}>
          <Megaphone className="size-4" />
          {published ? "Publicatie intrekken" : "Publiceren"}
        </Button>
        <Link
          href={`/teams/ttt-planner?plan=${planId}`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <Import className="size-4" />
          Opnieuw importeren
        </Link>
        <Button size="sm" variant="outline" disabled={pending} onClick={copyBotLink}>
          <Copy className="size-4" />
          Botlink
        </Button>
        {shared && (
          <Button size="sm" variant="outline" disabled={pending} onClick={revokeBotLink}>
            <X className="size-4" />
            Link intrekken
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={pending} onClick={remove}>
          <Trash2 className="size-4" />
          Verwijderen
        </Button>
      </div>
      {message && (
        <p className={cn("text-sm", message.error ? "text-destructive" : "text-muted-foreground")}>
          {message.text}
        </p>
      )}
    </div>
  );
}
