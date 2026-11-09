"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { removeClubImage, uploadClubImage } from "../_actions";

type Kind = "logo" | "mark";
type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; msg: string };

const ROWS: { kind: Kind; label: string; fallback: string; square: boolean }[] = [
  { kind: "logo", label: "Logo", fallback: "/zwb-logo.png", square: false },
  { kind: "mark", label: "Beeldmerk", fallback: "/icon-512.png", square: true },
];

export function ClubImages({ logoUrl, markUrl }: { logoUrl: string | null; markUrl: string | null }) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Logo en beeldmerk</h2>
      {ROWS.map((row) => (
        <ImageRow key={row.kind} {...row} url={row.kind === "logo" ? logoUrl : markUrl} />
      ))}
    </section>
  );
}

function ImageRow({
  kind,
  label,
  fallback,
  square,
  url,
}: {
  kind: Kind;
  label: string;
  fallback: string;
  square: boolean;
  url: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(url);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function upload(file: File) {
    setStatus({ kind: "idle" });
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      const res = await uploadClubImage(kind, data);
      if (res.ok) setCurrent(URL.createObjectURL(file));
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error });
      if (input.current) input.current.value = "";
    });
  }

  function remove() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await removeClubImage(kind);
      if (res.ok) setCurrent(null);
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`flex shrink-0 items-center justify-center rounded-md border bg-background p-2 ${
          square ? "size-20" : "h-20 w-40"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- een upload van de club, geen vaste afbeelding */}
        <img src={current ?? fallback} alt={label} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium">
          {label}
          {!current && <span className="ml-2 font-normal text-muted-foreground">standaard</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            id={`club-${kind}`}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) upload(file);
            }}
          />
          <Button type="button" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? "Bezig..." : "Uploaden"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" disabled={pending} onClick={remove}>
              Verwijderen
            </Button>
          )}
          {status.kind === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>
          )}
          {status.kind === "error" && <span className="text-sm text-destructive">{status.msg}</span>}
        </div>
      </div>
    </div>
  );
}
