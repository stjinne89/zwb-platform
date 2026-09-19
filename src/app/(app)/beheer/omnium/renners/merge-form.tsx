"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { mergeRidersAction } from "../[editie]/uitslagen/_actions";

type Rider = {
  id: string;
  displayName: string;
  zwiftId: string | null;
  teamName: string | null;
};

export function MergeRidersForm({ riders }: { riders: Rider[] }) {
  const [from, setFrom] = useState("");
  const [into, setInto] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const label = (rider: Rider) =>
    `${rider.displayName}${rider.teamName ? ` · ${rider.teamName}` : ""}${rider.zwiftId ? ` · Zwift ${rider.zwiftId}` : ""}`;

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await mergeRidersAction({
            fromRiderId: from,
            intoRiderId: into,
          });
          if (!result.ok) {
            setMessage(result.error);
            return;
          }
          setFrom("");
          setInto("");
          setMessage("Renners samengevoegd.");
          router.refresh();
        });
      }}
    >
      <label className="block text-sm font-medium">
        Dubbele renner
        <select
          required
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="mt-1 w-full rounded-md border bg-background p-2"
        >
          <option value="">Kies renner</option>
          {riders.map((rider) => (
            <option key={rider.id} value={rider.id}>
              {label(rider)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium">
        Behouden renner
        <select
          required
          value={into}
          onChange={(event) => setInto(event.target.value)}
          className="mt-1 w-full rounded-md border bg-background p-2"
        >
          <option value="">Kies renner</option>
          {riders.map((rider) => (
            <option key={rider.id} value={rider.id} disabled={rider.id === from}>
              {label(rider)}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending || !from || !into || from === into}>
        {pending ? "Samenvoegen…" : "Samenvoegen"}
      </Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
