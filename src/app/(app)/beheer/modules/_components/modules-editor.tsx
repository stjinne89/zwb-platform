"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resolveDisabled, type ModuleGroup, type ModuleKey } from "@/lib/modules";
import { updateClubModules } from "../_actions";

export type ModuleRow = {
  key: ModuleKey;
  label: string;
  neutralLabel: string;
  group: ModuleGroup;
  enabled: boolean;
  requires: { key: ModuleKey; label: string }[];
};

const GROUPS: { group: ModuleGroup; label: string }[] = [
  { group: "algemeen", label: "Algemeen" },
  { group: "zwift", label: "Zwift en online racen" },
];

export function ModulesEditor({ initial }: { initial: ModuleRow[] }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.map((row) => [row.key, row.enabled])),
  );
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saved" } | { kind: "error"; msg: string }
  >({ kind: "idle" });

  // Uit door een vereiste module die uit staat: wel aangevinkt, toch uit.
  const effectiveOff = useMemo(
    () => resolveDisabled(Object.keys(enabled).filter((key) => !enabled[key])),
    [enabled],
  );

  function save() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateClubModules(enabled);
      setStatus(res.ok ? { kind: "saved" } : { kind: "error", msg: res.error ?? "Onbekende fout." });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">
          {initial.length - effectiveOff.size} van {initial.length} aan
        </h2>
        <div className="flex items-center gap-3">
          {status.kind === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">Opgeslagen</span>
          )}
          {status.kind === "error" && (
            <span className="max-w-72 text-sm text-destructive">{status.msg}</span>
          )}
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Opslaan..." : "Modules opslaan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map(({ group, label }) => (
          <section key={group} className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold">{label}</h3>
            <div className="mt-3 grid gap-2">
              {initial
                .filter((row) => row.group === group)
                .map((row) => {
                  const blockedBy = row.requires.filter((dep) => effectiveOff.has(dep.key));
                  return (
                    <label
                      key={row.key}
                      className="flex gap-2 rounded-md border bg-background/60 p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={enabled[row.key] ?? true}
                        onChange={(event) => {
                          const checked = event.currentTarget.checked;
                          setStatus({ kind: "idle" });
                          setEnabled((current) => ({ ...current, [row.key]: checked }));
                        }}
                        className="mt-1 size-4"
                      />
                      <span>
                        <span className="block font-medium">{row.label}</span>
                        {row.label !== row.neutralLabel && (
                          <span className="block text-xs text-muted-foreground">
                            {row.neutralLabel}
                          </span>
                        )}
                        {blockedBy.length > 0 && (
                          <span className="block text-xs text-destructive">
                            Uit zolang {blockedBy.map((dep) => dep.label).join(" en ")} uit staat
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
