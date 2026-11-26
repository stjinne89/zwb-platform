"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, MonitorUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approveTvCode } from "@/app/tv/_actions";

export function PairForm({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await approveTvCode(code);
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <section className="space-y-3 rounded-lg border bg-card p-6">
        <p className="inline-flex items-center gap-2 font-medium">
          <Check className="size-4 text-primary" aria-hidden />
          Tv gekoppeld
        </p>
        <Link href="/profiel#tv" className="text-sm text-primary underline">
          Je tv&apos;s
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-6">
      <label htmlFor="tv-code" className="text-sm font-medium">
        Code op de tv
      </label>
      <input
        id="tv-code"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={7}
        placeholder="K7M 4QX"
        className="block w-full rounded-md border bg-background px-3 py-2 font-mono text-2xl tracking-widest uppercase"
      />
      <Button type="submit" disabled={pending || code.replace(/\s/g, "").length < 6}>
        <MonitorUp className="size-4" />
        Koppelen
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
