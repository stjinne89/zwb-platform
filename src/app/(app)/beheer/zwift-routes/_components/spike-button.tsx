"use client";

import { useFormStatus } from "react-dom";
import { FlaskConical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpikeButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      <FlaskConical
        data-icon="inline-start"
        className={pending ? "animate-pulse" : undefined}
      />
      {pending ? "Bezig..." : "Test routeprofielen"}
    </Button>
  );
}

export function SyncButton({ label = "Routes ophalen" }: { label?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      <RefreshCw
        data-icon="inline-start"
        className={pending ? "animate-spin" : undefined}
      />
      {pending ? "Ophalen..." : label}
    </Button>
  );
}
