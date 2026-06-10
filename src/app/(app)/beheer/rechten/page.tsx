import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { HelpLink } from "@/components/app-ui";
import {
  COMMUNITY_ROLE_META,
  COMMUNITY_ROLES,
  type CommunityRole,
} from "@/lib/community-roles";
import {
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  type CommunityPermission,
} from "@/lib/permissions";
import { PermissionsEditor } from "./_components/permissions-editor";

type PermissionRow = {
  role: string;
  permissions: string[] | null;
};

type Matrix = Record<CommunityRole, CommunityPermission[]>;

export default async function RechtenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentUserAccess(supabase);

  if (!access.has("roles.manage_permissions")) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border bg-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Je hebt geen recht om rechten per ledengroep te beheren.
        </p>
      </div>
    );
  }

  const { data, error } = await supabase
    .from("community_role_permissions")
    .select("role, permissions")
    .order("role");

  const rows = ((data ?? []) as PermissionRow[]).filter((row) =>
    (COMMUNITY_ROLES as readonly string[]).includes(row.role),
  );
  const rowByRole = new Map(rows.map((row) => [row.role, row]));
  const matrix = COMMUNITY_ROLES.reduce((acc, role) => {
    acc[role] = normalizePermissions(
      rowByRole.get(role)?.permissions ?? DEFAULT_ROLE_PERMISSIONS[role],
    );
    return acc;
  }, {} as Matrix);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Beheer
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Rechten per ledengroep
          </h1>
        </div>
        <HelpLink href="/hulp#rollenbeheer" />
      </header>

      {error && (
        <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kon rechten niet laden.
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COMMUNITY_ROLES.map((role) => (
          <div key={role} className="rounded-lg border bg-card p-4">
            <p className="font-semibold">{COMMUNITY_ROLE_META[role].label}</p>
            <p className="mt-1 text-2xl font-semibold">
              {matrix[role].length}
            </p>
            <p className="text-sm text-muted-foreground">actieve rechten</p>
          </div>
        ))}
      </section>

      <PermissionsEditor initial={matrix} />
    </div>
  );
}
