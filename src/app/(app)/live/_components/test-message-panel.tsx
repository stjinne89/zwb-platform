"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

import { sendTestRideMessage } from "../_actions";

export function TestMessagePanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sendTest() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendTestRideMessage();
      if (!res.ok) {
        setError(res.error ?? "Versturen mislukt.");
        return;
      }
      setResult(res.reached > 0 ? "Testbericht verstuurd." : "Niet aangekomen.");
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Bericht op je fietscomputer</h2>
      <Button type="button" variant="outline" onClick={sendTest} disabled={pending}>
        <BellRing className="size-4" />
        Testbericht
      </Button>
      {result && <p className="text-sm">{result}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
