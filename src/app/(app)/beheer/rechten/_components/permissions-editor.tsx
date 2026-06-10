"use client";

import { useMemo, useState, useTransition } from "react";
import {
  COMMUNITY_ROLE_META,
  COMMUNITY_ROLES,
  type CommunityRole,
} from "@/lib/community-roles";
import {
  DEFAULT_ROLE_PERMISSIONS,
  permissionsByCategory,
  type CommunityPermission,
} from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { updateRolePermissions } from "../_actions";

type Matrix = Record<CommunityRole, CommunityPermission[]>;

export function PermissionsEditor({ initial }: { initial: Matrix }) {
  const [matrix, setMatrix] = useState<Matrix>(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saved" }
    | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const groups = useMemo(() => permissionsByCategory(), []);

  function toggle(
    role: CommunityRole,
    permission: CommunityPermission,
    checked: boolean,
  ) {
    setStatus({ kind: "idle" });
    setMatrix((current) => {
      const currentPermissions = current[role] ?? [];
      const nextPermissions = checked
        ? Array.from(new Set([...currentPermissions, permission]))
        : currentPermissions.filter((item) => item !== permission);

      return { ...current, [role]: nextPermissions };
    });
  }

  function resetRole(role: CommunityRole) {
    setStatus({ kind: "idle" });
    setMatrix((current) => ({
      ...current,
      [role]: DEFAULT_ROLE_PERMISSIONS[role],
    }));
  }

  function save() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      const res = await updateRolePermissions(matrix);
      setStatus(
        res.ok
          ? { kind: "saved" }
          : { kind: "error", msg: res.error ?? "Onbekende fout." },
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Rechten per ledengroep</h2>
        <div className="flex items-center gap-3">
          {status.kind === "saved" && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Opgeslagen
            </span>
          )}
          {status.kind === "error" && (
            <span className="max-w-72 text-sm text-destructive">
              {status.msg}
            </span>
          )}
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Opslaan..." : "Rechten opslaan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {COMMUNITY_ROLES.map((role) => {
          const meta = COMMUNITY_ROLE_META[role];
          const selected = new Set(matrix[role] ?? []);
          return (
            <section key={role} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{meta.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => resetRole(role)}
                >
                  Standaard
                </Button>
              </div>

              <div className="mt-4 space-y-4">
                {groups.map((group) => (
                  <div key={group.category} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.category}
                    </p>
                    <div className="grid gap-2">
                      {group.permissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex gap-2 rounded-md border bg-background/60 p-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(permission.id)}
                            onChange={(event) =>
                              toggle(role, permission.id, event.currentTarget.checked)
                            }
                            className="mt-1 size-4"
                          />
                          <span>
                            <span className="block font-medium">
                              {permission.label}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {permission.description}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
