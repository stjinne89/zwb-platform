"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteRitverslag } from "../_actions";

export function DeleteRitverslagButton({
  eventId,
  className,
}: {
  eventId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    // Voorkom dat de omliggende kaart-link navigeert.
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Dit ritverslag (het hele event incl. foto's, verslagen en chat) verwijderen? Dit kan niet ongedaan worden gemaakt.",
      )
    )
      return;
    startTransition(async () => {
      await deleteRitverslag(eventId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="Ritverslag verwijderen"
      className={
        className ??
        "inline-flex items-center justify-center rounded-md bg-black/40 p-1.5 text-white/90 backdrop-blur transition hover:bg-destructive disabled:opacity-50"
      }
    >
      <Trash2 className="size-4" />
    </button>
  );
}
