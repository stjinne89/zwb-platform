"use client";

import { useState, useTransition } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { followFrrRider, unfollowFrrRider } from "../_frr-actions";

export function FrrFollowToggle({
  zwiftId,
  name,
  following,
}: {
  zwiftId: string;
  name: string;
  following: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <button
      type="button"
      disabled={pending}
      title={error ?? (following ? "Niet meer volgen" : "Volgen")}
      aria-label={following ? `${name} niet meer volgen` : `${name} volgen`}
      onClick={() =>
        startTransition(async () => {
          setError(null);
          const res = following
            ? await unfollowFrrRider(zwiftId)
            : await followFrrRider({ rider: zwiftId, name });
          if (!res.ok) setError(res.error);
        })
      }
      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {following ? <X className="size-4" /> : <Star className="size-4" />}
    </button>
  );
}

export function FrrFollowForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          setError(null);
          const res = await followFrrRider({ rider: value });
          if (!res.ok) setError(res.error);
          else setValue("");
        });
      }}
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Zwift-ID of ZwiftPower-link"
        aria-label="Renner volgen"
        className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending || !value.trim()}>
        Volgen
      </Button>
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}
