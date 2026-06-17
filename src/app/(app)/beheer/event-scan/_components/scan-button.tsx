"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScanButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <RefreshCw
        data-icon="inline-start"
        className={pending ? "animate-spin" : undefined}
      />
      {pending ? "Scannen..." : "Scan bronnen"}
    </Button>
  );
}
