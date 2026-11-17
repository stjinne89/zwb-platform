"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAccess } from "@/lib/auth/permissions";
import { COMMUNITY_ROLES, type CommunityRole } from "@/lib/community-roles";
import {
  COMMUNITY_PERMISSION_IDS,
  normalizePermissions,
  type CommunityPermission,
} from "@/lib/permissions";
import { parseModuleKeys } from "@/lib/module-access";

type PermissionMatrixInput = Partial<Record<CommunityRole, string[]>>;

/**
 * De rechten per groep, en welke onderdelen elke groep dicht heeft (0336).
 * Zolang 0336 er niet is, blokkeert alleen iets dichtzetten het opslaan.
 */
export async function updateRolePermissions(
  input: PermissionMatrixInput,
  blockedInput: PermissionMatrixInput = {},
) {
  const supabase = await createClient();
  const access = await getCurrentUserAccess(supabase);
  if (!access.user) return { ok: false as const, error: "Niet ingelogd." };
  if (!access.has("roles.manage_permissions")) {
    return { ok: false as const, error: "Geen recht om rechten te wijzigen." };
  }

  const validPermissions = new Set<string>(COMMUNITY_PERMISSION_IDS);
  const rows = COMMUNITY_ROLES.map((role) => {
    const permissions = normalizePermissions(input[role]).filter((permission) =>
      validPermissions.has(permission),
    ) as CommunityPermission[];

    return {
      role,
      permissions,
      blocked_modules: parseModuleKeys(blockedInput[role]),
    };
  });

  let { error } = await supabase
    .from("community_role_permissions")
    .upsert(rows, { onConflict: "role" });
  if (error && rows.every((row) => row.blocked_modules.length === 0)) {
    // Zonder de kolom van 0336: de rechten zelf toch opslaan.
    ({ error } = await supabase
      .from("community_role_permissions")
      .upsert(
        rows.map(({ role, permissions }) => ({ role, permissions })),
        { onConflict: "role" },
      ));
  }

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/beheer/rechten");
  // Menu en tegels volgen de onderdelen per groep (0336).
  revalidatePath("/", "layout");
  return { ok: true as const };
}
