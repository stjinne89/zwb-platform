"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NOTE_MAX } from "@/lib/clubverhaal/story";
import { removeStory, reviewClubStory } from "../_actions";

const field = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Plaatsen of terugsturen, voor wie verhalen plaatst. */
export function StoryReviewPanel({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const decide = (decision: "geplaatst" | "teruggestuurd") =>
    start(async () => {
      setError(null);
      const reply = await reviewClubStory(storyId, decision, note);
      if (!reply.ok) return setError(reply.error);
      router.refresh();
    });
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notitie voor wie schreef</span>
        <textarea className={`${field} min-h-20`} value={note} maxLength={NOTE_MAX} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => decide("geplaatst")} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Plaatsen
        </Button>
        <Button type="button" variant="outline" onClick={() => decide("teruggestuurd")} disabled={pending || !note.trim()}>
          Terugsturen
        </Button>
      </div>
    </div>
  );
}

/** Weghalen: door wie schreef (ook als het geplaatst is) of door wie plaatst. */
export function RemoveStoryButton({ storyId, placed }: { storyId: string; placed: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const remove = () => {
    if (!window.confirm(placed ? "Dit verhaal van /verhaal halen en verwijderen?" : "Dit verhaal verwijderen?")) return;
    start(async () => {
      setError(null);
      const reply = await removeStory(storyId);
      if (!reply.ok) return setError(reply.error);
      router.refresh();
    });
  };
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending} className="text-destructive hover:text-destructive">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
        Verwijderen
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </>
  );
}
