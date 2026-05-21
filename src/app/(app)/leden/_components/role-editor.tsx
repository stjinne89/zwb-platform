"use client";

import { useState, useTransition } from "react";
import {
  COMMUNITY_ROLE_META,
  COMMUNITY_ROLES,
  normalizeCommunityRoles,
} from "@/lib/community-roles";
import { Button } from "@/components/ui/button";
import { updateMemberRoles } from "../_actions";

export function RoleEditor({
  profileId,
  roles,
}: {
  profileId: string;
  roles: readonly string[] | null | undefined;
}) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => normalizeCommunityRoles(roles));
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saved" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });

  function toggle(role: string, checked: boolean) {
    setStatus({ kind: "idle" });
    setSelected((current) => {
      const next = checked
        ? [...current, role]
        : current.filter((item) => item !== role);
      return normalizeCommunityRoles(next);
    });
  }

  function save() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateMemberRoles(profileId, selected);
      setStatus(
        res.ok
          ? { kind: "saved" }
          : { kind: "error", msg: res.error ?? "Onbekende fout." },
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => setOpen((value) => !value)}
      >
        Rollen
      </Button>

      {open && (
        <div className="w-72 rounded-lg border bg-popover p-3 text-left shadow-sm">
          <div className="grid gap-2">
            {COMMUNITY_ROLES.map((role) => {
              const meta = COMMUNITY_ROLE_META[role];
              return (
                <label key={role} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(role)}
                    onChange={(event) => toggle(role, event.currentTarget.checked)}
                    className="mt-1 size-4"
                  />
                  <span>
                    <span className="block font-medium">{meta.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button type="button" size="xs" disabled={pending} onClick={save}>
              {pending ? "Opslaan..." : "Opslaan"}
            </Button>
            {status.kind === "saved" && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Opgeslagen
              </span>
            )}
            {status.kind === "error" && (
              <span className="text-xs text-destructive">{status.msg}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
