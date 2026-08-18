"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { setSymptomTracking } from "../_actions";

export function OptInButton({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setSymptomTracking(!enabled);
          router.refresh();
        })
      }
    >
      {pending ? "Bezig…" : enabled ? "Logboek uitzetten" : "Logboek aanzetten"}
    </Button>
  );
}
