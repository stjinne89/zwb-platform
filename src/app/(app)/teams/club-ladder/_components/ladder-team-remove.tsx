"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeFromLadderTeam, type PuzzleRiderRef } from "../_actions";

/** Kruisje in het teamprofiel, alleen bij teams die niet in de puzzel staan. */
export function LadderTeamRemoveButton({
  teamId,
  teamName,
  rider,
  riderName,
}: {
  teamId: string;
  teamName: string;
  rider: PuzzleRiderRef;
  riderName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onRemove() {
    if (!window.confirm(`${riderName} uit ${teamName} halen?`)) return;
    startTransition(async () => {
      const res = await removeFromLadderTeam(teamId, rider);
      if (!res.ok) window.alert(res.error);
    });
  }

  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      disabled={pending}
      onClick={onRemove}
      aria-label={`${riderName} uit ${teamName} halen`}
      className="max-sm:h-11 max-sm:w-auto max-sm:gap-1 max-sm:px-4"
    >
      <X />
      <span className="sm:hidden">Uit het team</span>
    </Button>
  );
}
