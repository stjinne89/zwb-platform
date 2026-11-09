"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CLUB_FONTS, type ClubFont } from "@/lib/club-theme";
import { updateClubFont } from "../_actions";

type Status = { kind: "idle" } | { kind: "saved" } | { kind: "error"; msg: string };

export function FontPicker({ initial }: { initial: ClubFont }) {
  const [font, setFont] = useState<ClubFont>(initial);
  const [saved, setSaved] = useState<ClubFont>(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  function save() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateClubFont(font);
      if (res.ok) setSaved(font);
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error });
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Lettertype</h2>
      <div className="grid gap-2" role="radiogroup" aria-label="Lettertype">
        {CLUB_FONTS.map((option) => (
          <label
            key={option.key}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-2 ${
              font === option.key ? "border-primary bg-background" : "bg-background/60"
            }`}
          >
            <input
              type="radio"
              name="club-font"
              value={option.key}
              checked={font === option.key}
              onChange={() => {
                setStatus({ kind: "idle" });
                setFont(option.key);
              }}
              className="size-4"
            />
            <span className="min-w-0 flex-1">
              <span
                className="block text-lg leading-tight"
                style={{ fontFamily: `var(--font-tegels-${option.key}), system-ui, sans-serif` }}
              >
                {option.label}
              </span>
              <span
                className="block text-sm font-light text-muted-foreground"
                style={{ fontFamily: `var(--font-tegels-${option.key}), system-ui, sans-serif` }}
              >
                Samen fietsen 0123456789
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3">
        {status.kind === "saved" && (
          <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>
        )}
        {status.kind === "error" && <span className="text-sm text-destructive">{status.msg}</span>}
        <Button type="button" disabled={pending || font === saved} onClick={save}>
          {pending ? "Opslaan..." : "Lettertype opslaan"}
        </Button>
      </div>
    </section>
  );
}
