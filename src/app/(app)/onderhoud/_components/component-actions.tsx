"use client";

import { useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteComponent, replaceComponent } from "../_actions";

export function ComponentActions({ componentId }: { componentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await replaceComponent(componentId);
          })
        }
      >
        <RotateCcw className="size-4" />
        Vervangen
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await deleteComponent(componentId);
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
