"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteEvent } from "@/app/(app)/kalender/nieuw/actions";

export function DeleteEventButton({
  eventId,
  eventTitle,
}: {
  eventId: string;
  eventTitle: string;
}) {
  const [pending, startTransition] = useTransition();

  function remove() {
    if (
      !confirm(
        `"${eventTitle}" definitief verwijderen? Aanmeldingen, foto's, chat en uitslagen van dit event verdwijnen mee. Dit kan niet ongedaan worden gemaakt.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      // Bij succes redirect de actie naar /kalender; alleen een fout keert terug.
      const res = await deleteEvent(eventId);
      if (res && !res.ok) alert(res.error);
    });
  }

  return (
    <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
      {pending ? "Verwijderen…" : "Verwijderen"}
    </Button>
  );
}
