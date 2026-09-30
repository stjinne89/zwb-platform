"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { linkSrcRider } from "../_actions";

export type SrcUnlinkedRider = {
  userId: string;
  name: string;
  teamName: string | null;
  races: number;
  suggestedProfileId: string | null;
};

const FIELD =
  "rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Renners uit SRC-uitslagen zonder gekoppeld lid, met een voorstel op naam. */
export function LinkRiders({
  riders,
  members,
}: {
  riders: SrcUnlinkedRider[];
  members: Array<{ id: string; name: string }>;
}) {
  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(riders.map((rider) => [rider.userId, rider.suggestedProfileId ?? ""])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function link(rider: SrcUnlinkedRider) {
    const profileId = choice[rider.userId];
    if (!profileId) return;
    setError(null);
    setBusy(rider.userId);
    startTransition(async () => {
      const res = await linkSrcRider(rider.userId, profileId);
      setBusy(null);
      if (!res.ok) {
        setError(`${rider.name}: ${res.error}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-lg border text-sm">
        {riders.map((rider) => (
          <li key={rider.userId} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{rider.name}</p>
              <p className="text-muted-foreground">
                {[rider.teamName, `${rider.races} ${rider.races === 1 ? "race" : "races"}`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <select
              aria-label={`Lid voor ${rider.name}`}
              value={choice[rider.userId] ?? ""}
              onChange={(e) => setChoice({ ...choice, [rider.userId]: e.target.value })}
              className={FIELD}
            >
              <option value="">Lid kiezen…</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy !== null || !choice[rider.userId]}
              onClick={() => link(rider)}
            >
              {busy === rider.userId ? "Koppelen…" : "Koppelen"}
            </Button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
