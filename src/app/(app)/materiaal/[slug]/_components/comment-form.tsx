"use client";

import { useRef, useState, useTransition } from "react";
import { addComment } from "../_actions";
import { Button } from "@/components/ui/button";

export function CommentForm({ postId, slug }: { postId: string; slug: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await addComment(postId, slug, formData);
      if (!res.ok) setError(res.error);
      else formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <textarea
        name="body"
        rows={3}
        required
        placeholder="Reageer..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Versturen..." : "Plaatsen"}
      </Button>
    </form>
  );
}
