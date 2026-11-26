"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MonitorUp, Unplug } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { unpairTv } from "../_actions/tv-devices";

// Gekoppelde tv's (0374): wanneer gekoppeld en laatst gekeken, en ontkoppelen.

export type TvDevice = { id: string; created_at: string; last_seen_at: string };

const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Amsterdam" });

export function TvDevices({ initial }: { initial: TvDevice[] }) {
  const [devices, setDevices] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function unpair(id: string) {
    if (!window.confirm("Deze tv ontkoppelen?")) return;
    setError(null);
    startTransition(async () => {
      const res = await unpairTv(id);
      if (!res.ok) setError(res.error);
      else setDevices((list) => list.filter((device) => device.id !== id));
    });
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tv&apos;s</h2>
      {devices.length > 0 && (
        <ul className="divide-y text-sm">
          {devices.map((device, index) => (
            <li key={device.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">Tv {index + 1}</p>
                <p className="text-xs text-muted-foreground">
                  Gekoppeld {when(device.created_at)} · laatst gekeken {when(device.last_seen_at)}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => unpair(device.id)} disabled={pending}>
                <Unplug className="size-4" />
                Ontkoppelen
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Link href="/tv/koppel" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <MonitorUp className="size-4" />
        Tv koppelen
      </Link>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}
