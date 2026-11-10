"use client";

import { useState, useTransition } from "react";
import { deleteMember } from "../_actions";
import { Button } from "@/components/ui/button";

/** Verwijdert een lid volledig; bevestigen door de naam over te typen. */
export function DeleteMemberButton({
  profileId,
  displayName,
}: {
  profileId: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matches =
    typed.trim().toLowerCase() === displayName.trim().toLowerCase();

  if (!open) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="xs"
        onClick={() => setOpen(true)}
      >
        Verwijderen
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col items-end gap-1">
      <input
        type="text"
        value={typed}
        onChange={(event) => {
          setError(null);
          setTyped(event.currentTarget.value);
        }}
        placeholder={displayName}
        aria-label={`Typ ${displayName} om te bevestigen`}
        autoComplete="off"
        autoFocus
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="xs"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setTyped("");
            setError(null);
          }}
        >
          Annuleren
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="xs"
          disabled={pending || !matches}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await deleteMember(profileId, typed);
              if (!res.ok) setError(res.error);
            });
          }}
        >
          {pending ? "Bezig..." : "Definitief verwijderen"}
        </Button>
      </div>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
